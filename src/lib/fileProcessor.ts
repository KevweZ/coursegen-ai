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
  /**
   * Higher = more diagram/photo-like for placement ranking.
   * Theme/layout decorations are excluded before this is used.
   */
  contentScore?: number;
  /**
   * 1-based PPTX slide index that references this media (first if shared).
   * Used with sourceContextText for relevance-aware placement.
   */
  sourceSlideIndex?: number;
  /**
   * Text from the source slide(s) (+ notes when present) that reference this media.
   * Enables keyword overlap vs course panel title/body without vision API cost.
   */
  sourceContextText?: string;
  /** Original ppt/media filename (e.g. image121.jpeg) */
  mediaName?: string;
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
 * Common PowerPoint / Keynote slide canvas sizes. Only near-exact matches are
 * treated as full-slide captures — large ~16:9 diagrams must stay extractable.
 */
const SLIDE_CAPTURE_SIZES: Array<[number, number]> = [
  // 16:9
  [1920, 1080], [1280, 720], [960, 540], [1600, 900], [1366, 768],
  [1024, 576], [2560, 1440], [3840, 2160],
  // 4:3
  [1024, 768], [800, 600], [1600, 1200], [2048, 1536], [1280, 960], [1440, 1080],
  // 16:10
  [1920, 1200], [1680, 1050], [1440, 900], [1280, 800],
];

function nearExactSize(w: number, h: number, tw: number, th: number, tol = 0.02): boolean {
  if (tw <= 0 || th <= 0) return false;
  return Math.abs(w - tw) / tw <= tol && Math.abs(h - th) / th <= tol;
}

/**
 * True only for near-exact common slide backgrounds / exported slide screenshots.
 * Wide process diagrams at arbitrary sizes (even ~16:9) are kept.
 */
function isLikelyFullSlideCapture(width: number, height: number): boolean {
  if (width < 600 || height < 400) return false;
  for (const [tw, th] of SLIDE_CAPTURE_SIZES) {
    if (nearExactSize(width, height, tw, th) || nearExactSize(width, height, th, tw)) {
      return true;
    }
  }
  return false;
}

/** Cap working canvas size so theme/trim/toDataURL stays responsive on 100+ media PPTX. */
const MAX_PROCESS_EDGE = 1600;

function loadImageProps(
  dataUrl: string,
  flattenTransparent: boolean,
  byteLengthHint?: number,
  /** When false, skip pixel theme heuristic (content-slide media — layout/master already filtered). */
  runDecorativeCheck = true
): Promise<{
  width: number;
  height: number;
  src: string;
  decorative: boolean;
  reason: string;
  contentScore: number;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= 0 || img.height <= 0) {
        resolve({ width: 0, height: 0, src: '', decorative: false, reason: '', contentScore: 1 });
        return;
      }
      try {
        const naturalW = img.width;
        const naturalH = img.height;
        // Size check on originals — downscaled working canvas can land on 1600×900 etc.
        if (isLikelyFullSlideCapture(naturalW, naturalH)) {
          resolve({
            width: naturalW,
            height: naturalH,
            src: '',
            decorative: false,
            reason: 'slide-canvas',
            contentScore: 1,
          });
          return;
        }
        const scale = Math.min(1, MAX_PROCESS_EDGE / Math.max(naturalW, naturalH));
        const dw = Math.max(1, Math.round(naturalW * scale));
        const dh = Math.max(1, Math.round(naturalH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = dw;
        canvas.height = dh;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({
            width: naturalW,
            height: naturalH,
            src: dataUrl,
            decorative: false,
            reason: '',
            contentScore: 50,
          });
          return;
        }
        if (flattenTransparent) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, dw, dh);
        // Score before trim so white-field theme waves keep their signature.
        // bpp uses natural pixels (not downscaled canvas) so compressibility stays stable.
        const verdict = runDecorativeCheck
          ? isLikelyThemeDecorativeArt(canvas, byteLengthHint, naturalW, naturalH)
          : { decorative: false, reason: '', contentScore: 50 };
        if (verdict.decorative) {
          canvas.width = 0;
          canvas.height = 0;
          resolve({
            width: naturalW,
            height: naturalH,
            src: '',
            decorative: true,
            reason: verdict.reason,
            contentScore: verdict.contentScore,
          });
          return;
        }
        const trimmed = trimImageMargins(canvas);
        // Report size in natural coordinate space so slide-capture / ranking stay correct
        const reportW = scale < 1 ? Math.max(1, Math.round(trimmed.width / scale)) : trimmed.width;
        const reportH = scale < 1 ? Math.max(1, Math.round(trimmed.height / scale)) : trimmed.height;
        resolve({
          width: reportW,
          height: reportH,
          src: trimmed.toDataURL('image/jpeg', 0.85),
          decorative: false,
          reason: '',
          contentScore: verdict.contentScore,
        });
        if (trimmed !== canvas) {
          trimmed.width = 0;
          trimmed.height = 0;
        }
        canvas.width = 0;
        canvas.height = 0;
        return;
      } catch { /* fall through */ }
      resolve({
        width: img.width,
        height: img.height,
        src: dataUrl,
        decorative: false,
        reason: '',
        contentScore: 50,
      });
    };
    img.onerror = () =>
      resolve({ width: 0, height: 0, src: '', decorative: false, reason: '', contentScore: 1 });
    img.src = dataUrl;
  });
}

/** Sample RGBA from ImageData; treat near-white / transparent as empty margin. */
function isEmptyMarginPixel(data: Uint8ClampedArray, i: number, bg: { r: number; g: number; b: number } | null): boolean {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (a < 40) return true;
  if (r > 245 && g > 245 && b > 245) return true;
  // Uniform solid backgrounds (e.g. corporate blue) — trim only when clearly empty margin
  if (bg) {
    const dr = Math.abs(r - bg.r);
    const dg = Math.abs(g - bg.g);
    const db = Math.abs(b - bg.b);
    if (dr + dg + db <= 18) return true;
  }
  return false;
}

/**
 * Crop near-white (and optional uniform corner-color) margins so diagrams fill the frame.
 * Bounds are detected on a downscaled copy (max ~640px edge) then applied to the source —
 * avoids O(full-res) getImageData/pixel scans that freeze the UI on 100+ media PPTX files.
 */
function trimImageMargins(source: HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w < 8 || h < 8) return source;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;

  const maxProbe = 640;
  const probeScale = Math.min(1, maxProbe / Math.max(w, h));
  const pw = Math.max(1, Math.round(w * probeScale));
  const ph = Math.max(1, Math.round(h * probeScale));

  let probe: HTMLCanvasElement = source;
  let probeCtx = ctx;
  let ownProbe = false;
  if (pw < w || ph < h) {
    const tmp = document.createElement('canvas');
    tmp.width = pw;
    tmp.height = ph;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    if (!tctx) return source;
    tctx.drawImage(source, 0, 0, pw, ph);
    probe = tmp;
    probeCtx = tctx;
    ownProbe = true;
  }

  const { data } = probeCtx.getImageData(0, 0, pw, ph);

  // Corner consensus → optional solid-bg trim (molecular models on blue, logos on black)
  const corners = [
    0,
    (pw - 1) * 4,
    (ph - 1) * pw * 4,
    ((ph - 1) * pw + (pw - 1)) * 4,
  ].map((i) => ({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] }));
  let bg: { r: number; g: number; b: number } | null = null;
  if (corners.every((c) => c.a > 200)) {
    const avg = {
      r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
      g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
      b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
    };
    const cornerSpread = corners.reduce(
      (s, c) => s + Math.abs(c.r - avg.r) + Math.abs(c.g - avg.g) + Math.abs(c.b - avg.b),
      0
    );
    // Only treat as solid bg when corners agree and aren't near-white (white handled above)
    if (cornerSpread <= 36 && !(avg.r > 240 && avg.g > 240 && avg.b > 240)) {
      bg = avg;
    }
  }

  let minX = pw;
  let minY = ph;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      if (!isEmptyMarginPixel(data, i, bg)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (ownProbe) {
    probe.width = 0;
    probe.height = 0;
  }
  if (maxX < minX || maxY < minY) return source;

  const sx = w / pw;
  const sy = h / ph;
  const pad = Math.max(2, Math.round(6 * Math.max(sx, sy)));
  let outMinX = Math.max(0, Math.floor(minX * sx) - pad);
  let outMinY = Math.max(0, Math.floor(minY * sy) - pad);
  let outMaxX = Math.min(w - 1, Math.ceil((maxX + 1) * sx) - 1 + pad);
  let outMaxY = Math.min(h - 1, Math.ceil((maxY + 1) * sy) - 1 + pad);
  const cw = outMaxX - outMinX + 1;
  const ch = outMaxY - outMinY + 1;
  // Skip tiny trims; require meaningful shrink
  if (cw >= w * 0.92 && ch >= h * 0.92) return source;
  if (cw < 80 || ch < 80) return source;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  if (!octx) return source;
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, cw, ch);
  octx.drawImage(source, outMinX, outMinY, cw, ch, 0, 0, cw, ch);
  return out;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/**
 * Heuristic for PowerPoint Design-theme decorations (green→blue waves/triangles on white).
 * Conservative safety net only — prefer structural layout/master exclusion.
 * Softened: hue-drift alone is weaker; mid/large rasters are protected; need ≥4 hits.
 */
function isLikelyThemeDecorativeArt(
  canvas: HTMLCanvasElement,
  byteLengthHint?: number,
  naturalW?: number,
  naturalH?: number
): { decorative: boolean; reason: string; contentScore: number } {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || w < 40 || h < 40) {
    return { decorative: false, reason: '', contentScore: 1 };
  }

  const tw = Math.min(w, 160);
  const th = Math.max(1, Math.round((h * tw) / w));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  if (!tctx) return { decorative: false, reason: '', contentScore: 1 };
  tctx.drawImage(canvas, 0, 0, tw, th);
  const { data } = tctx.getImageData(0, 0, tw, th);
  const n = tw * th;

  let whiteish = 0;
  let content = 0;
  let ink = 0;
  let chroma = 0;
  let greenBlueSoft = 0;
  let horizEdges = 0;
  let vertEdges = 0;
  let hChecks = 0;
  let vChecks = 0;

  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 40 || (r > 245 && g > 245 && b > 245)) {
        whiteish++;
        continue;
      }
      content++;
      const { h: hue, s, v } = rgbToHsv(r, g, b);
      const isInk = (s < 0.15 && v < 0.5) || (r < 40 && g < 40 && b < 40);
      if (isInk) ink++;
      else if (s > 0.2 && v > 0.3) {
        chroma++;
        if (hue >= 100 && hue <= 240 && s > 0.25 && v > 0.4) greenBlueSoft++;
      }
      if (x > 0) {
        const j = i - 4;
        const l1 = 0.299 * r + 0.587 * g + 0.114 * b;
        const l0 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        if (Math.abs(l1 - l0) > 22) horizEdges++;
        hChecks++;
      }
      if (y > 0) {
        const j = ((y - 1) * tw + x) * 4;
        const l1 = 0.299 * r + 0.587 * g + 0.114 * b;
        const l0 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        if (Math.abs(l1 - l0) > 22) vertEdges++;
        vChecks++;
      }
    }
  }

  // Left→right hue drift on mid row (wave gradients)
  const midY = Math.floor(th / 2);
  let leftH = 0;
  let leftN = 0;
  let rightH = 0;
  let rightN = 0;
  for (let x = 0; x < tw; x++) {
    const i = (midY * tw + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 40 || (r > 245 && g > 245 && b > 245)) continue;
    const { h: hue, s } = rgbToHsv(r, g, b);
    if (s < 0.2) continue;
    if (x < tw / 3) { leftH += hue; leftN++; }
    if (x > (2 * tw) / 3) { rightH += hue; rightN++; }
  }
  const hueDrift = leftN > 5 && rightN > 5 ? Math.abs(leftH / leftN - rightH / rightN) : 0;

  const whiteRatio = whiteish / n;
  const contentRatio = content / n;
  const inkRatio = content ? ink / content : 0;
  const chromaRatio = content ? chroma / content : 0;
  const gbRatio = content ? greenBlueSoft / content : 0;
  const hEdge = hChecks ? horizEdges / hChecks : 0;
  const vEdge = vChecks ? vertEdges / vChecks : 0;
  const pxW = naturalW && naturalW > 0 ? naturalW : w;
  const pxH = naturalH && naturalH > 0 ? naturalH : h;
  const bpp = byteLengthHint && pxW * pxH > 0 ? byteLengthHint / (pxW * pxH) : 0.2;

  // Content score for ranking (diagrams/photos score high; theme bands low)
  let contentScore =
    Math.round(
      (1 - whiteRatio) * 40 +
        inkRatio * 35 +
        Math.min(hEdge, 0.35) * 80 +
        Math.min(bpp, 0.5) * 40
    );

  // Soft green→blue geometric bands / triangles on white fields
  let themeHits = 0;
  let reason = '';
  if (gbRatio > 0.35 && inkRatio < 0.15 && chromaRatio > 0.5 && bpp < 0.22 && whiteRatio > 0.35) {
    themeHits += 2;
    reason = 'gb-wave-sparse';
  }
  // Softened: hue-drift alone used to add +3 and zero out photos — require stronger signal
  if (hueDrift > 40 && gbRatio > 0.35 && inkRatio < 0.12 && whiteRatio > 0.5 && bpp < 0.18) {
    themeHits += 2;
    reason = reason || `hue-drift-${Math.round(hueDrift)}`;
  }
  if (whiteRatio > 0.55 && gbRatio > 0.3 && inkRatio < 0.12 && hEdge < 0.18 && vEdge > hEdge * 1.2) {
    themeHits += 2;
    reason = reason || 'band-anisotropy';
  }
  // Extreme whitespace + tiny chromatic motif (layout corner decorations)
  if (whiteRatio > 0.78 && contentRatio < 0.22 && gbRatio > 0.4 && inkRatio < 0.1) {
    themeHits += 2;
    reason = reason || 'tiny-gb-motif';
  }

  // Protect real content
  if (inkRatio > 0.25 || (hEdge > 0.14 && inkRatio > 0.08)) {
    themeHits = 0;
  }
  // Full-bleed solid backgrounds with complex centers (molecule renders)
  if (whiteRatio < 0.08 && contentRatio > 0.85 && hueDrift < 20) {
    themeHits = 0;
  }
  // Never drop mid/large rasters on pixel heuristic alone (masters/layouts already excluded)
  if (Math.min(pxW, pxH) >= 200 && pxW * pxH >= 80000) {
    themeHits = 0;
  }

  if (themeHits >= 4) {
    contentScore = Math.min(contentScore, 8);
    return { decorative: true, reason: reason || 'theme-geo', contentScore };
  }

  contentScore = Math.max(1, Math.min(100, contentScore));
  tmp.width = 0;
  tmp.height = 0;
  return { decorative: false, reason: '', contentScore };
}

/**
 * Media referenced ONLY from slideLayouts / slideMasters (theme waves, triangles, logos).
 * Never excludes media that also appears on a content slide.
 */
async function getPptxThemeOnlyMediaNames(zip: JSZip): Promise<Set<string>> {
  const layoutMedia = new Set<string>();
  const slideMedia = new Set<string>();

  const normalizeMediaName = (raw: string): string => {
    const cleaned = raw.replace(/\\/g, '/').split('?')[0].split('#')[0];
    try {
      return decodeURIComponent(cleaned);
    } catch {
      return cleaned;
    }
  };

  const scan = async (name: string, into: Set<string>) => {
    try {
      const xml = await zip.files[name].async('string');
      // Targets look like "../media/image1.png" or "media/image1.png"
      const re = /media\/([^"]+)/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml))) {
        const short = normalizeMediaName(m[1]);
        if (short) into.add(short);
      }
    } catch { /* ignore */ }
  };

  await Promise.all(
    Object.keys(zip.files).map(async (name) => {
      if (zip.files[name].dir) return;
      if (/^ppt\/(slideLayouts|slideMasters)\/_rels\//.test(name)) {
        await scan(name, layoutMedia);
      } else if (/^ppt\/slides\/_rels\//.test(name)) {
        await scan(name, slideMedia);
      }
    })
  );

  const themeOnly = new Set<string>();
  for (const m of layoutMedia) {
    // Exclusive: also used on a content slide → keep
    if (!slideMedia.has(m)) themeOnly.add(m);
  }
  return themeOnly;
}

function extractPptxXmlText(xml: string): string {
  return (xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [])
    .map((m) => m.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map ppt/media filenames → slide indices + concatenated slide/notes text.
 * Uses ppt/slides/_rels/slideN.xml.rels Target="…/media/…" links (no vision API).
 */
async function buildPptxMediaSlideContext(zip: JSZip): Promise<{
  mediaToSlides: Map<string, number[]>;
  slideTexts: Map<number, string>;
}> {
  const mediaToSlides = new Map<string, number[]>();
  const slideTexts = new Map<number, string>();

  const slideFiles = Object.keys(zip.files).filter(
    (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name) && !zip.files[name].dir
  );

  await Promise.all(
    slideFiles.map(async (slidePath) => {
      const num = parseInt(slidePath.match(/slide(\d+)/)?.[1] ?? '0', 10);
      if (!num) return;

      try {
        const slideXml = await zip.files[slidePath].async('string');
        let text = extractPptxXmlText(slideXml);
        const notesPath = `ppt/notesSlides/notesSlide${num}.xml`;
        if (zip.files[notesPath]) {
          try {
            const notesXml = await zip.files[notesPath].async('string');
            const notesText = extractPptxXmlText(notesXml);
            if (notesText) text = text ? `${text} ${notesText}` : notesText;
          } catch { /* ignore notes */ }
        }
        if (text) slideTexts.set(num, text.slice(0, 6000));
      } catch { /* ignore slide text */ }

      const relPath = `ppt/slides/_rels/slide${num}.xml.rels`;
      if (!zip.files[relPath]) return;
      try {
        const relXml = await zip.files[relPath].async('string');
        const re = /Target="([^"]*media\/([^"]+))"/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(relXml))) {
          let shortName = (m[2] || '').replace(/\\/g, '/').split('?')[0].split('#')[0];
          try {
            shortName = decodeURIComponent(shortName);
          } catch { /* keep raw */ }
          if (!shortName) continue;
          const list = mediaToSlides.get(shortName) || [];
          if (!list.includes(num)) list.push(num);
          mediaToSlides.set(shortName, list);
        }
      } catch { /* ignore rels */ }
    })
  );

  return { mediaToSlides, slideTexts };
}

function contextForMedia(
  shortName: string,
  mediaToSlides: Map<string, number[]>,
  slideTexts: Map<number, string>
): { sourceSlideIndex?: number; sourceContextText?: string } {
  const slides = mediaToSlides.get(shortName) || [];
  if (!slides.length) return {};
  const sourceSlideIndex = slides[0];
  const sourceContextText = slides
    .map((n) => slideTexts.get(n) || '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
  return {
    sourceSlideIndex,
    ...(sourceContextText ? { sourceContextText } : {}),
  };
}

const EMU_PER_PX = 9525; // 914400 EMU/in at 96dpi

type SlidePic = {
  media: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  groupId?: string;
};

function xfrmFrom(el: Element | null): { x: number; y: number; cx: number; cy: number; chX: number; chY: number; chCx: number; chCy: number } | null {
  if (!el) return null;
  const xfrm = Array.from(el.getElementsByTagName('*')).find((n) => n.localName === 'xfrm') as Element | undefined;
  if (!xfrm) return null;
  const off = Array.from(xfrm.children).find((n) => n.localName === 'off') as Element | undefined;
  const ext = Array.from(xfrm.children).find((n) => n.localName === 'ext') as Element | undefined;
  const chOff = Array.from(xfrm.children).find((n) => n.localName === 'chOff') as Element | undefined;
  const chExt = Array.from(xfrm.children).find((n) => n.localName === 'chExt') as Element | undefined;
  const x = parseInt(off?.getAttribute('x') || '0', 10);
  const y = parseInt(off?.getAttribute('y') || '0', 10);
  const cx = parseInt(ext?.getAttribute('cx') || '0', 10);
  const cy = parseInt(ext?.getAttribute('cy') || '0', 10);
  const chX = parseInt(chOff?.getAttribute('x') || '0', 10);
  const chY = parseInt(chOff?.getAttribute('y') || '0', 10);
  const chCx = parseInt(chExt?.getAttribute('cx') || String(cx || 1), 10) || 1;
  const chCy = parseInt(chExt?.getAttribute('cy') || String(cy || 1), 10) || 1;
  return { x, y, cx, cy, chX, chY, chCx, chCy };
}

function walkSlidePics(
  el: Element,
  ridToMedia: Map<string, string>,
  acc: SlidePic[],
  ox: number,
  oy: number,
  sx: number,
  sy: number,
  groupId?: string
): void {
  const name = el.localName;
  if (name === 'pic') {
    const blip = Array.from(el.getElementsByTagName('*')).find((n) => n.localName === 'blip') as Element | undefined;
    const rid =
      blip?.getAttribute('r:embed') ||
      blip?.getAttribute('embed') ||
      blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ||
      '';
    const media = ridToMedia.get(rid);
    const xf = xfrmFrom(el);
    if (media && xf && xf.cx > 0 && xf.cy > 0) {
      acc.push({
        media,
        x: ox + xf.x * sx,
        y: oy + xf.y * sy,
        cx: xf.cx * sx,
        cy: xf.cy * sy,
        groupId,
      });
    }
    return;
  }
  if (name === 'grpSp') {
    const xf = xfrmFrom(el);
    if (xf) {
      const nx = ox + xf.x * sx;
      const ny = oy + xf.y * sy;
      const nsx = sx * (xf.cx / xf.chCx);
      const nsy = sy * (xf.cy / xf.chCy);
      // Keep the outermost group id so a grouped illustration stays one image.
      const gid = groupId || `g${Math.round(xf.x)}_${Math.round(xf.y)}_${Math.round(xf.cx)}`;
      for (const child of Array.from(el.children)) {
        walkSlidePics(child as Element, ridToMedia, acc, nx - xf.chX * nsx, ny - xf.chY * nsy, nsx, nsy, gid);
      }
      return;
    }
  }
  for (const child of Array.from(el.children)) {
    walkSlidePics(child as Element, ridToMedia, acc, ox, oy, sx, sy, groupId);
  }
}

function parseSlidePictureBoxes(slideXml: string, relXml: string): SlidePic[] {
  if (typeof DOMParser === 'undefined') return [];
  const rels = new Map<string, string>();
  const relRe = /Id="([^"]+)"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="([^"]+)"/gi;
  let rm: RegExpExecArray | null;
  while ((rm = relRe.exec(relXml))) {
    const id = rm[1] || rm[4];
    const target = (rm[2] || rm[3] || '').replace(/\\/g, '/');
    const media = target.split('/').pop()?.split('?')[0] || '';
    if (id && media && /media\//i.test(target)) rels.set(id, media);
  }
  if (!rels.size) return [];
  try {
    const doc = new DOMParser().parseFromString(slideXml, 'application/xml');
    const root = doc.documentElement;
    if (!root || root.localName === 'parsererror') return [];
    const acc: SlidePic[] = [];
    walkSlidePics(root, rels, acc, 0, 0, 1, 1);
    return acc;
  } catch {
    return [];
  }
}

const SLIDE_W_EMU = 12192000; // 13.333" 16:9
const SLIDE_H_EMU = 6858000;

function clusterPics(pics: SlidePic[], padEmu: number): SlidePic[][] {
  const n = pics.length;
  if (n < 2) return pics.map((p) => [p]);
  const parent = pics.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };
  const byGroup = new Map<string, number[]>();
  pics.forEach((p, i) => {
    if (!p.groupId) return;
    const list = byGroup.get(p.groupId) || [];
    list.push(i);
    byGroup.set(p.groupId, list);
  });
  for (const idxs of byGroup.values()) {
    for (let k = 1; k < idxs.length; k++) union(idxs[0], idxs[k]);
  }
  const inflated = pics.map((p) => ({
    x1: p.x - padEmu,
    y1: p.y - padEmu,
    x2: p.x + p.cx + padEmu,
    y2: p.y + p.cy + padEmu,
  }));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = inflated[i];
      const b = inflated[j];
      if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) union(i, j);
    }
  }
  const groups = new Map<number, SlidePic[]>();
  pics.forEach((p, i) => {
    const r = find(i);
    const list = groups.get(r) || [];
    list.push(p);
    groups.set(r, list);
  });
  return mergeSameVisualColumn([...groups.values()]);
}

/** Text-left / photos-right SME layouts: keep the photo column as one illustration. */
function mergeSameVisualColumn(groups: SlidePic[][]): SlidePic[][] {
  if (groups.length < 2) return groups;
  const meta = groups.map((g) => {
    const cx = g.reduce((s, p) => s + p.x + p.cx / 2, 0) / g.length;
    return { g, cx };
  });
  const right = meta.filter((m) => m.cx >= SLIDE_W_EMU * 0.38);
  const left = meta.filter((m) => m.cx < SLIDE_W_EMU * 0.38);
  const out: SlidePic[][] = [];
  if (right.length >= 2) out.push(right.flatMap((m) => m.g));
  else out.push(...right.map((m) => m.g));
  if (left.length >= 2) {
    const xs = left.flatMap((m) => m.g.map((p) => [p.x, p.x + p.cx])).flat();
    const ys = left.flatMap((m) => m.g.map((p) => [p.y, p.y + p.cy])).flat();
    const compact =
      Math.max(...xs) - Math.min(...xs) < SLIDE_W_EMU * 0.5 &&
      Math.max(...ys) - Math.min(...ys) < SLIDE_H_EMU * 0.85;
    if (compact) out.push(left.flatMap((m) => m.g));
    else out.push(...left.map((m) => m.g));
  } else {
    out.push(...left.map((m) => m.g));
  }
  return out.filter((g) => g.length);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function compositePicCluster(
  cluster: SlidePic[],
  byMedia: Map<string, SourceImage>
): Promise<SourceImage | null> {
  if (typeof document === 'undefined') return null;
  const members = cluster
    .map((p) => ({ pic: p, src: byMedia.get(p.media) }))
    .filter((m): m is { pic: SlidePic; src: SourceImage } => !!m.src?.dataUrl);
  if (members.length < 2) return null;
  const minX = Math.min(...members.map((m) => m.pic.x));
  const minY = Math.min(...members.map((m) => m.pic.y));
  const maxX = Math.max(...members.map((m) => m.pic.x + m.pic.cx));
  const maxY = Math.max(...members.map((m) => m.pic.y + m.pic.cy));
  const emuW = Math.max(1, maxX - minX);
  const emuH = Math.max(1, maxY - minY);
  const pxW = Math.min(1600, Math.max(160, Math.round(emuW / EMU_PER_PX)));
  const scale = pxW / emuW;
  const pxH = Math.max(120, Math.round(emuH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pxW, pxH);
  for (const m of members) {
    const img = await loadHtmlImage(m.src.dataUrl);
    if (!img) continue;
    const dx = (m.pic.x - minX) * scale;
    const dy = (m.pic.y - minY) * scale;
    const dw = Math.max(1, m.pic.cx * scale);
    const dh = Math.max(1, m.pic.cy * scale);
    try {
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch { /* skip */ }
  }
  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    return null;
  }
  const first = members[0].src;
  return {
    pageIndex: 0,
    dataUrl,
    width: pxW,
    height: pxH,
    contentScore: 92,
    sourceSlideIndex: first.sourceSlideIndex,
    sourceContextText: first.sourceContextText,
    mediaName: `composite-s${first.sourceSlideIndex || 0}-${members.map((m) => m.pic.media).join('+').slice(0, 80)}`,
  };
}

/**
 * SME decks often build one illustration from many ppt/media pictures (molecules,
 * coil photos, exploded diagrams). Cluster overlapping/nearby pictures per slide
 * and emit one composite so we don't place a lone molecule out of context.
 */
async function mergeClusteredSlidePictures(
  zip: JSZip,
  images: SourceImage[],
  themeOnly: Set<string>
): Promise<SourceImage[]> {
  if (images.length < 2 || typeof DOMParser === 'undefined') return images;
  const byMedia = new Map<string, SourceImage>();
  for (const img of images) {
    if (img.mediaName) byMedia.set(img.mediaName, img);
  }
  const usedInCluster = new Set<string>();
  const composites: SourceImage[] = [];
  const slideFiles = Object.keys(zip.files).filter(
    (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name) && !zip.files[name].dir
  );

  for (const slidePath of slideFiles) {
    const num = parseInt(slidePath.match(/slide(\d+)/)?.[1] ?? '0', 10);
    if (!num) continue;
    const relPath = `ppt/slides/_rels/slide${num}.xml.rels`;
    if (!zip.files[relPath]) continue;
    let slideXml: string;
    let relXml: string;
    try {
      slideXml = await zip.files[slidePath].async('string');
      relXml = await zip.files[relPath].async('string');
    } catch {
      continue;
    }
    const pics = parseSlidePictureBoxes(slideXml, relXml).filter(
      (p) => byMedia.has(p.media) && !themeOnly.has(p.media)
    );
    if (pics.length < 2) continue;
    const pad = 914400; // 1" — nearby pieces / photo grids of one illustration
    const groups = clusterPics(pics, pad);
    for (const g of groups) {
      if (g.length < 2) continue;
      const names = [...new Set(g.map((p) => p.media))];
      if (names.length < 2) continue;
      const composed = await compositePicCluster(g, byMedia);
      if (!composed) continue;
      const slideText = extractPptxXmlText(slideXml).slice(0, 6000);
      composed.sourceSlideIndex = num;
      if (slideText) composed.sourceContextText = slideText;
      composites.push(composed);
      names.forEach((n) => usedInCluster.add(n));
    }
  }

  if (!composites.length) return images;
  const leftovers = images.filter((img) => !img.mediaName || !usedInCluster.has(img.mediaName));
  const merged = [...composites, ...leftovers];
  console.log(
    `[extractImagesFromFile] slide composites: ${composites.length} illustration(s) from clustered pictures; ` +
    `hid ${usedInCluster.size} piece(s)`
  );
  return merged.slice(0, MAX_KEPT_SOURCE_IMAGES);
}

/** GIF logical screen size from header — avoids decoding large animated GIFs just for dims. */
function gifHeaderDims(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 10) return null;
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width < 1 || height < 1) return null;
  return { width, height };
}

/** PNG IHDR dims — no decode. */
function pngHeaderDims(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null;
  const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
  const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
  if (width < 1 || height < 1 || width > 30000 || height > 30000) return null;
  return { width, height };
}

/** JPEG SOF dims — scan markers, no decode. */
function jpegHeaderDims(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) break;
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && i + 8 < bytes.length) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      if (width >= 1 && height >= 1) return { width, height };
      return null;
    }
    i += 2 + len;
  }
  return null;
}

function rasterHeaderDims(bytes: Uint8Array, ext: string): { width: number; height: number } | null {
  if (ext === 'png') return pngHeaderDims(bytes);
  if (ext === 'jpg' || ext === 'jpeg') return jpegHeaderDims(bytes);
  if (ext === 'gif') return gifHeaderDims(bytes);
  return null;
}

function uint8ToBase64(bytes: Uint8Array): string {
  // Keep chunks small — spreading 32k+ args into fromCharCode can throw on some engines
  const chunk = 0x2000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Large decks: skip canvas trim/decorative — header dims + raw data URLs only. */
const FAST_EXTRACT_MEDIA_THRESHOLD = 36;
/** Never block cover/preview longer than this (ms) on a single extract pass. */
export const EXTRACT_DEADLINE_MS = 22_000;
/** Cap pool size so attach/rank stays cheap. */
const MAX_KEPT_SOURCE_IMAGES = 64;

/** Deduplicate concurrent + repeated extracts for the same File (upload effect + finalize). */
const extractInFlight = new WeakMap<File, Promise<SourceImage[]>>();
const extractCompleted = new WeakMap<File, SourceImage[]>();

/**
 * Extract embedded content images from PPTX/PDF.
 * PPTX: individual files under ppt/media/ (not full-slide screenshots).
 * PDF: embedded XObject images (not full-page screen captures).
 */
export async function extractImagesFromFile(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<SourceImage[]> {
  const cached = extractCompleted.get(file);
  if (cached) {
    onProgress?.(1, 1);
    return cached;
  }
  const existing = extractInFlight.get(file);
  if (existing) return existing;

  const run = doExtractImagesFromFile(file, onProgress)
    .then((imgs) => {
      // Never cache empty — a hung/aborted/partial failure must not sticky-toast "0 images"
      if (imgs.length > 0) extractCompleted.set(file, imgs);
      return imgs;
    })
    .finally(() => {
      extractInFlight.delete(file);
    });
  extractInFlight.set(file, run);
  return run;
}

async function doExtractImagesFromFile(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<SourceImage[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const images: SourceImage[] = [];

  if (extension === 'pptx') {
    try {
      const startedAt = performance.now();
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFiles = Object.keys(zip.files).filter(
        name => name.startsWith('ppt/media/') && !zip.files[name].dir
      );
      const themeOnlyMedia = await getPptxThemeOnlyMediaNames(zip);
      const { mediaToSlides, slideTexts } = await buildPptxMediaSlideContext(zip);

      let imgIndex = 0;
      let skippedSlideShots = 0;
      let skippedSmall = 0;
      let skippedUnsupported = 0;
      let skippedThemeLayout = 0;
      let skippedDecorative = 0;
      let keptGif = 0;
      let withContext = 0;
      let timedOut = false;
      let usedFastPath = 0;
      const keptLog: string[] = [];
      const skippedLog: string[] = [];
      const skippedDecorativeLog: string[] = [];
      const totalMedia = mediaFiles.length;
      // Steam-cracker-class decks: canvas trim/decode per file = multi-minute main-thread freeze.
      const forceFastPath =
        totalMedia >= FAST_EXTRACT_MEDIA_THRESHOLD || file.size >= 8 * 1024 * 1024;
      let processed = 0;

      for (const filename of mediaFiles) {
        if (performance.now() - startedAt > EXTRACT_DEADLINE_MS) {
          timedOut = true;
          onProgress?.(processed, totalMedia);
          break;
        }
        if (images.length >= MAX_KEPT_SOURCE_IMAGES) break;

        processed++;
        onProgress?.(processed, totalMedia);
        await yieldToMain();

        try {
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          // EMF/WMF/WDP need server-side conversion — P1. Keep GIF/PNG/JPEG/WebP in-browser.
          if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            skippedUnsupported++;
            continue;
          }

          const shortName = filename.replace(/^ppt\/media\//, '');

          // Structural: ONLY layout/master-exclusive theme assets (never slide-also-used media)
          if (themeOnlyMedia.has(shortName)) {
            skippedThemeLayout++;
            if (skippedDecorativeLog.length < 16) {
              skippedDecorativeLog.push(`${shortName} (layout/master)`);
            }
            continue;
          }

          let imgProps: {
            width: number;
            height: number;
            src: string;
            decorative?: boolean;
            reason?: string;
            contentScore?: number;
          };
          let byteHint = 0;
          // Pixel decorative check only for orphans — content-slide media is never theme-only
          const onContentSlide = (mediaToSlides.get(shortName)?.length ?? 0) > 0;
          const remainingMs = EXTRACT_DEADLINE_MS - (performance.now() - startedAt);
          // Fast path: header dims + raw bytes. No Image()/canvas/trim (seconds vs minutes).
          const useFast =
            forceFastPath ||
            remainingMs < 8_000 ||
            ext === 'gif' ||
            (onContentSlide && ext !== 'webp');

          const raw = await zip.files[filename].async('uint8array');
          byteHint = raw.byteLength;
          const mimeType =
            (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
            : `image/${ext}`;
          const dataUrl = `data:${mimeType};base64,${uint8ToBase64(raw)}`;

          if (useFast) {
            usedFastPath++;
            const hdr = rasterHeaderDims(raw, ext);
            let width = hdr?.width ?? 0;
            let height = hdr?.height ?? 0;
            // WebP / rare bad headers: one Image() dim read, never trim
            if ((!width || !height) && typeof Image !== 'undefined') {
              const dims = await new Promise<{ width: number; height: number }>((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.width, height: img.height });
                img.onerror = () => resolve({ width: 0, height: 0 });
                img.src = dataUrl;
              });
              width = dims.width;
              height = dims.height;
            }
            imgProps = {
              width,
              height,
              src: dataUrl,
              contentScore: Math.min(100, Math.round(40 + Math.min(byteHint / 50000, 40))),
            };
          } else {
            // Small decks / orphans: flatten + optional decorative + margin trim
            imgProps = await loadImageProps(
              dataUrl,
              ext === 'png' || ext === 'webp',
              byteHint,
              !onContentSlide
            );
            if (imgProps.reason === 'slide-canvas') {
              skippedSlideShots++;
              if (skippedLog.length < 12) {
                skippedLog.push(`${shortName} ${imgProps.width}×${imgProps.height}`);
              }
              continue;
            }
            if (imgProps.decorative) {
              skippedDecorative++;
              if (skippedDecorativeLog.length < 16) {
                skippedDecorativeLog.push(`${shortName} (${imgProps.reason || 'theme-geo'})`);
              }
              continue;
            }
          }

          if (!imgProps.src || imgProps.width < 120 || imgProps.height < 120) {
            skippedSmall++;
            continue;
          }

          // Drop only near-exact slide canvases — keep large diagrams (incl. ~16:9)
          if (isLikelyFullSlideCapture(imgProps.width, imgProps.height)) {
            skippedSlideShots++;
            if (skippedLog.length < 12) {
              skippedLog.push(`${shortName} ${imgProps.width}×${imgProps.height}`);
            }
            continue;
          }

          const contentScore = imgProps.contentScore ?? 50;
          const ctx = contextForMedia(shortName, mediaToSlides, slideTexts);
          if (ctx.sourceContextText) withContext++;

          if (ext === 'gif') keptGif++;
          if (keptLog.length < 12) {
            const slideHint = ctx.sourceSlideIndex ? ` slide=${ctx.sourceSlideIndex}` : '';
            keptLog.push(`${shortName} ${imgProps.width}×${imgProps.height} score=${contentScore}${slideHint}`);
          }
          images.push({
            pageIndex: imgIndex++,
            dataUrl: imgProps.src,
            width: imgProps.width,
            height: imgProps.height,
            contentScore,
            mediaName: shortName,
            ...ctx,
          });
        } catch (fileErr) {
          console.warn(`[extractImagesFromFile] skip ${filename}:`, fileErr);
        }
      }
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.log(
        `[extractImagesFromFile] PPTX "${file.name}": ${images.length} kept from ${mediaFiles.length} media ` +
        `in ${elapsedMs}ms (fastPath ${usedFastPath}${forceFastPath ? ' forced' : ''}` +
        `${timedOut ? '; DEADLINE partial' : ''}; gif ${keptGif}; with-slide-context ${withContext}; ` +
        `skipped slide-canvas ${skippedSlideShots}, small ${skippedSmall}, ` +
        `unsupported ${skippedUnsupported}, theme-layout ${skippedThemeLayout}, decorative ${skippedDecorative})`
      );
      if (keptLog.length) console.log(`[extractImagesFromFile] kept sample: ${keptLog.join(' | ')}`);
      if (skippedLog.length) console.log(`[extractImagesFromFile] skipped slide-canvas sample: ${skippedLog.join(' | ')}`);
      if (skippedDecorativeLog.length) {
        console.log(
          `[extractImagesFromFile] skipped-as-decorative (${skippedThemeLayout + skippedDecorative}): ` +
          skippedDecorativeLog.join(' | ')
        );
      }
      if (timedOut && images.length > 0) {
        console.warn(
          `[extractImagesFromFile] Hit ${EXTRACT_DEADLINE_MS}ms deadline — returning ${images.length} partial image(s)`
        );
      }
      if (images.length >= 2 && performance.now() - startedAt < EXTRACT_DEADLINE_MS - 1500) {
        try {
          const merged = await mergeClusteredSlidePictures(zip, images, themeOnlyMedia);
          images.length = 0;
          images.push(...merged);
        } catch (compErr) {
          console.warn('[extractImagesFromFile] slide composite failed:', compErr);
        }
      }
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
    let skippedDecorative = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (pageNum % 2 === 0) {
        onProgress?.(pageNum, pdf.numPages);
        await yieldToMain();
      }
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
          // Same softened rule as PPTX — keep large diagrams; drop exact slide canvases
          if (isLikelyFullSlideCapture(imgData.width, imgData.height)) {
            console.log(
              `[extractImagesFromFile] PDF page ${pageNum}: skipped slide-canvas ${imgData.width}×${imgData.height}`
            );
            continue;
          }

          const canvas = document.createElement('canvas');
          const scale = Math.min(1, MAX_PROCESS_EDGE / Math.max(imgData.width, imgData.height));
          const dw = Math.max(1, Math.round(imgData.width * scale));
          const dh = Math.max(1, Math.round(imgData.height * scale));
          // Rasterize at native size first when downscaling (putImageData can't scale)
          const srcCanvas = scale < 1 ? document.createElement('canvas') : canvas;
          srcCanvas.width = imgData.width;
          srcCanvas.height = imgData.height;
          const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
          if (!srcCtx) continue;

          const imageData = srcCtx.createImageData(imgData.width, imgData.height);
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
          srcCtx.putImageData(imageData, 0, 0);

          let work = srcCanvas;
          if (scale < 1) {
            canvas.width = dw;
            canvas.height = dh;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
              srcCanvas.width = 0;
              srcCanvas.height = 0;
              continue;
            }
            ctx.drawImage(srcCanvas, 0, 0, dw, dh);
            srcCanvas.width = 0;
            srcCanvas.height = 0;
            work = canvas;
          }

          const verdict = isLikelyThemeDecorativeArt(work);
          if (verdict.decorative) {
            skippedDecorative++;
            work.width = 0;
            work.height = 0;
            continue;
          }

          const trimmed = trimImageMargins(work);
          images.push({
            pageIndex: imgIndex++,
            dataUrl: trimmed.toDataURL('image/jpeg', 0.85),
            width: trimmed.width,
            height: trimmed.height,
            contentScore: verdict.contentScore,
          });
          if (trimmed !== work) {
            trimmed.width = 0;
            trimmed.height = 0;
          }
          work.width = 0;
          work.height = 0;
        } catch {
          /* skip undecodable image object */
        }
      }
    }
    console.log(
      `[extractImagesFromFile] PDF "${file.name}": ${images.length} embedded image(s)` +
      (skippedDecorative ? `, skipped decorative ${skippedDecorative}` : '')
    );
  } catch (err) {
    console.warn('[extractImagesFromFile] Failed to extract PDF images:', err);
  }

  return images;
}
