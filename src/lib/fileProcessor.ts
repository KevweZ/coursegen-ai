import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';

// Use the local worker bundled with pdfjs-dist to avoid CDN/import failures in Vite
// @ts-ignore
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = PdfJsWorker;

export interface SourceImage {
  /** 0-based index of the source page this image came from */
  pageIndex: number;
  /** JPEG data URL of the rendered page */
  dataUrl: string;
  /** Width in pixels at the rendering scale */
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
async function parseDocumentViaServer(file: File): Promise<{ markdown: string; metadata: ParsedDocumentMetadata }> {
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

async function extractPdfTextClient(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
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
    try {
      const { markdown } = await parseDocumentViaServer(file);
      if (markdown && markdown.trim().length > 50) {
        console.log(`[FileProcessor] Server parse succeeded for ${file.name} (${markdown.length} chars)`);
        return markdown;
      }
    } catch (serverErr) {
      console.warn(`[FileProcessor] Server parse failed, falling back to client-side:`, serverErr);
    }

    // Client-side fallback
    try {
      if (extension === 'pdf')  return await extractPdfTextClient(file);
      if (extension === 'docx') return await extractDocxTextClient(file);
      if (extension === 'pptx') return await extractPptxTextClient(file);
    } catch (clientErr) {
      throw new Error(`Could not extract text from ${file.name}: ${(clientErr as Error).message}`);
    }
  }

  throw new Error('Unsupported file format. Please upload a PDF, Word, PowerPoint, or Text file.');
}

/**
 * Extract page-level images from a PDF file by rendering each page to a canvas.
 * Returns an array of SourceImages (one per page), skipping blank/tiny renders.
 * PPT files cannot be rendered client-side — this function returns [] for non-PDF inputs.
 */
export async function extractImagesFromFile(file: File): Promise<SourceImage[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  const images: SourceImage[] = [];

  if (extension === 'pptx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/') && !zip.files[name].dir);
      
      let imgIndex = 0;
      for (const filename of mediaFiles) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (!['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) continue;
        
        const fileData = await zip.files[filename].async('base64');
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        const dataUrl = `data:${mimeType};base64,${fileData}`;
        
        const imgProps = await new Promise<{width: number, height: number, src: string}>((resolve) => {
           const img = new Image();
           img.onload = () => resolve({ width: img.width, height: img.height, src: dataUrl });
           img.onerror = () => resolve({ width: 0, height: 0, src: '' }); 
           img.src = dataUrl;
        });

        // Filter out decorative marks and tiny borders
        if (imgProps.width > 150 && imgProps.height > 150) {
          images.push({
            pageIndex: imgIndex++,
            dataUrl: imgProps.src,
            width: imgProps.width,
            height: imgProps.height,
          });
        }
      }
    } catch (err) {
      console.warn('[extractImagesFromFile] Failed to extract PPTX images:', err);
    }
    return images;
  }

  // Only PDFs can be rendered client-side
  if (extension !== 'pdf') return [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.2 }); // 1.2× for readable quality

      // Skip pages smaller than 100×100 (likely blank or decorative)
      if (viewport.width < 100 || viewport.height < 100) continue;

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      images.push({
        pageIndex: i - 1, // convert to 0-based
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      });

      // Cleanup
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch (err) {
    console.warn('[extractImagesFromFile] Failed to extract images:', err);
  }

  return images;
}
