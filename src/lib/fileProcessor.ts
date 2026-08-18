import * as mammoth from 'mammoth';
import JSZip from 'jszip';

// Safari < 17.4 / older iOS WebKit: modern pdf.js calls Promise.withResolvers().
if (typeof Promise.withResolvers !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Legacy build is required for iOS Safari/Edge — modern build assumes newer WebKit APIs.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-ignore — Vite URL import for the matching legacy worker
import PdfJsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = PdfJsWorker;

export interface SourceImage {
  /** Ordinal index among extracted content images */
  pageIndex: number;
  /** JPEG/PNG data URL of the embedded image (not a full-slide screenshot) */
  dataUrl: string;
  width: number;
  height: number;
}

export interface ParsedDocumentMetadata {
  type: 'pdf' | 'pptx' | 'docx';
  pageCount?: number;
  slideCount?: number;
  wordCount: number;
}

// ─── Server-Side Parser (primary path) ───────────────────────────────────────

/**
 * Send the file to the Express server for structured Markdown extraction.
 * The server uses pdf-parse / JSZip / mammoth to produce:
 *   - PPTX: ## Slide N: [Title] + bullet body + speaker notes
 *   - PDF:  heading detection (ALL CAPS, Chapter N, numbered sections)
 *   - DOCX: full Markdown with # headings, **bold**, - lists
 *
 * Returns the structured markdown string on success, throws on failure.
 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

async function parseDocumentViaServer(file: File): Promise<{ markdown: string; metadata: ParsedDocumentMetadata }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max upload size is 50MB. Compress or split the file, then try again.`
    );
  }
  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch('/api/parse-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-File-Size': String(file.size),
    },
    body: arrayBuffer,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Server parse failed (${response.status}): ${errData.error}`);
  }

  const data = await response.json();
  return { markdown: data.markdown, metadata: data.metadata };
}

// ─── Client-Side Fallback Parsers ────────────────────────────────────────────
// These are retained for when the server is unreachable (dev without server, etc.)

async function loadPdfDocument(data: Uint8Array) {
  try {
    return await pdfjs.getDocument({ data }).promise;
  } catch (workerErr) {
    // Module workers can fail on some iOS WebViews — retry on the main thread.
    console.warn('[FileProcessor] pdf.js worker failed, retrying without worker:', workerErr);
    return await pdfjs.getDocument({ data: data.slice(0), disableWorker: true } as any).promise;
  }
}

async function extractPdfTextClient(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await loadPdfDocument(data);
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return text;
}

async function extractDocxTextClient(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPptxTextClient(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
      return numA - numB;
    });

  let text = '';
  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async('string');
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
    const slideText = matches
      .map(m => m.replace(/<[^>]*>/g, '').trim())
      .filter(Boolean)
      .join(' ');
    if (slideText) text += slideText + '\n';
  }

  if (!text.trim()) throw new Error('No readable text found in the PowerPoint file.');
  return text;
}

// ─── Primary Export ───────────────────────────────────────────────────────────

/**
 * Extract text from a user-uploaded file.
 *
 * Strategy:
 *  1. For PDF / PPTX / DOCX → try server-side parser first (returns structured Markdown)
 *  2. If server is unavailable or errors → fall back to client-side extraction
 *  3. For .txt → always use client-side (no server benefit)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Plain text — no server needed
  if (extension === 'txt') {
    return await file.text();
  }

  // For PDF / PPTX / DOCX — try server first
  if (extension === 'pdf' || extension === 'pptx' || extension === 'docx') {
    let serverError: string | null = null;
    try {
      const { markdown } = await parseDocumentViaServer(file);
      // Accept any non-empty server result. Short docs are valid; forcing a client
      // fallback used to crash iOS when modern pdf.js APIs were missing.
      if (markdown && markdown.trim().length > 0) {
        console.log(`[FileProcessor] Server parse succeeded for ${file.name} (${markdown.length} chars)`);
        return markdown;
      }
      serverError = 'Server returned empty text';
    } catch (serverErr) {
      serverError = (serverErr as Error).message || String(serverErr);
      console.warn(`[FileProcessor] Server parse failed, falling back to client-side:`, serverErr);
    }

    // Client-side fallback
    try {
      if (extension === 'pdf')  return await extractPdfTextClient(file);
      if (extension === 'docx') return await extractDocxTextClient(file);
      if (extension === 'pptx') return await extractPptxTextClient(file);
    } catch (clientErr) {
      const clientMsg = (clientErr as Error).message || String(clientErr);
      throw new Error(
        serverError
          ? `Could not extract text from ${file.name}: ${clientMsg} (server: ${serverError})`
          : `Could not extract text from ${file.name}: ${clientMsg}`
      );
    }
  }

  throw new Error('Unsupported file format. Please upload a PDF, Word, PowerPoint, or Text file.');
}

/**
 * True when an image looks like a full slide screenshot / slide background
 * (wide slide aspect + large dimensions) rather than a content photo/diagram.
 */
function isLikelyFullSlideCapture(width: number, height: number): boolean {
  if (width < 700 || height < 400) return false;
  const ar = width / Math.max(1, height);
  const is169 = ar >= 1.55 && ar <= 1.95;
  const is43 = ar >= 1.25 && ar <= 1.45;
  return is169 || is43;
}

function loadImageProps(dataUrl: string, flattenTransparent: boolean): Promise<{ width: number; height: number; src: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (flattenTransparent && img.width > 0 && img.height > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve({ width: img.width, height: img.height, src: canvas.toDataURL('image/jpeg', 0.92) });
            return;
          }
        } catch { /* fall through */ }
      }
      resolve({ width: img.width, height: img.height, src: dataUrl });
    };
    img.onerror = () => resolve({ width: 0, height: 0, src: '' });
    img.src = dataUrl;
  });
}

/**
 * Extract embedded content images from PPTX/PDF.
 * PPTX: individual files under ppt/media/ (not full-slide screenshots).
 * PDF: embedded XObject images (not full-page screen captures).
 */
export async function extractImagesFromFile(file: File): Promise<SourceImage[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const images: SourceImage[] = [];

  if (extension === 'pptx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFiles = Object.keys(zip.files).filter(
        name => name.startsWith('ppt/media/') && !zip.files[name].dir
      );

      let imgIndex = 0;
      let skippedSlideShots = 0;
      for (const filename of mediaFiles) {
        const ext = filename.split('.').pop()?.toLowerCase();
        // EMF/WMF are common in corporate decks but not decodable in-browser — skip
        if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) continue;

        const fileData = await zip.files[filename].async('base64');
        const mimeType =
          (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
          : `image/${ext}`;
        const dataUrl = `data:${mimeType};base64,${fileData}`;
        const imgProps = await loadImageProps(dataUrl, ext === 'png');

        if (!imgProps.src || imgProps.width < 120 || imgProps.height < 120) continue;

        // Drop full-slide backgrounds / exported slide screenshots
        if (isLikelyFullSlideCapture(imgProps.width, imgProps.height)) {
          skippedSlideShots++;
          continue;
        }

        images.push({
          pageIndex: imgIndex++,
          dataUrl: imgProps.src,
          width: imgProps.width,
          height: imgProps.height,
        });
      }
      console.log(
        `[extractImagesFromFile] PPTX "${file.name}": ${images.length} content image(s) ` +
        `from ${mediaFiles.length} media file(s) (skipped ${skippedSlideShots} slide-sized)`
      );
    } catch (err) {
      console.warn('[extractImagesFromFile] Failed to extract PPTX images:', err);
    }
    return images;
  }

  if (extension !== 'pdf') return [];

  // PDF: pull embedded images only — never full-page raster screenshots
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await loadPdfDocument(data);
    let imgIndex = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const ops = await page.getOperatorList();
      const names = new Set<string>();

      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        if (fn === (pdfjs as any).OPS.paintImageXObject || fn === (pdfjs as any).OPS.paintInlineImageXObject) {
          const n = ops.argsArray[i]?.[0];
          if (typeof n === 'string') names.add(n);
        }
      }

      for (const name of names) {
        try {
          const imgData: any = await new Promise((resolve) => {
            let settled = false;
            const done = (v: any) => { if (!settled) { settled = true; resolve(v); } };
            try {
              const existing = (page as any).objs?.get?.(name);
              if (existing && existing.data) { done(existing); return; }
            } catch { /* async path */ }
            try {
              (page as any).objs.get(name, done);
            } catch {
              done(null);
            }
            setTimeout(() => done(null), 800);
          });

          if (!imgData?.width || !imgData?.height || !imgData?.data) continue;
          if (imgData.width < 120 || imgData.height < 120) continue;
          if (isLikelyFullSlideCapture(imgData.width, imgData.height)) continue;

          const canvas = document.createElement('canvas');
          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const imageData = ctx.createImageData(imgData.width, imgData.height);
          // pdf.js image data may be RGB or RGBA
          const src = imgData.data;
          const channels = src.length / (imgData.width * imgData.height);
          if (channels >= 4) {
            imageData.data.set(src.subarray(0, imageData.data.length));
          } else if (channels === 3) {
            for (let p = 0, q = 0; p < src.length; p += 3, q += 4) {
              imageData.data[q] = src[p];
              imageData.data[q + 1] = src[p + 1];
              imageData.data[q + 2] = src[p + 2];
              imageData.data[q + 3] = 255;
            }
          } else {
            continue;
          }
          ctx.putImageData(imageData, 0, 0);
          images.push({
            pageIndex: imgIndex++,
            dataUrl: canvas.toDataURL('image/jpeg', 0.9),
            width: imgData.width,
            height: imgData.height,
          });
          canvas.width = 0;
          canvas.height = 0;
        } catch {
          /* skip undecodable image object */
        }
      }
    }
    console.log(`[extractImagesFromFile] PDF "${file.name}": ${images.length} embedded image(s)`);
  } catch (err) {
    console.warn('[extractImagesFromFile] Failed to extract PDF images:', err);
  }

  return images;
}
