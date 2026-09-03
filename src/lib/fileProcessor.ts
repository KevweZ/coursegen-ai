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

function loadImageProps(
  dataUrl: string,
  flattenTransparent: boolean,
  byteLengthHint?: number
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
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({
            width: img.width,
            height: img.height,
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
        ctx.drawImage(img, 0, 0);
        // Score before trim so white-field theme waves keep their signature
        const verdict = isLikelyThemeDecorativeArt(canvas, byteLengthHint);
        if (verdict.decorative) {
          canvas.width = 0;
          canvas.height = 0;
          resolve({
            width: img.width,
            height: img.height,
            src: '',
            decorative: true,
            reason: verdict.reason,
            contentScore: verdict.contentScore,
          });
          return;
        }
        const trimmed = trimImageMargins(canvas);
        resolve({
          width: trimmed.width,
          height: trimmed.height,
          src: trimmed.toDataURL('image/jpeg', 0.92),
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
 * No-ops when the content already spans most of the canvas.
 */
function trimImageMargins(source: HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w < 8 || h < 8) return source;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;
  const { data } = ctx.getImageData(0, 0, w, h);

  // Corner consensus → optional solid-bg trim (molecular models on blue, logos on black)
  const corners = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4,
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

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!isEmptyMarginPixel(data, i, bg)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return source;

  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
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
  octx.drawImage(source, minX, minY, cw, ch, 0, 0, cw, ch);
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
 * Conservative: ink-heavy diagrams and full-bleed photos are kept.
 */
function isLikelyThemeDecorativeArt(
  canvas: HTMLCanvasElement,
  byteLengthHint?: number
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
  const bpp = byteLengthHint && w * h > 0 ? byteLengthHint / (w * h) : 0.2;

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
  if (hueDrift > 28 && gbRatio > 0.25 && inkRatio < 0.2 && whiteRatio > 0.4) {
    themeHits += 3;
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

  if (themeHits >= 3) {
    contentScore = Math.min(contentScore, 8);
    return { decorative: true, reason: reason || 'theme-geo', contentScore };
  }

  contentScore = Math.max(1, Math.min(100, contentScore));
  tmp.width = 0;
  tmp.height = 0;
  return { decorative: false, reason: '', contentScore };
}

async function getPptxThemeOnlyMediaNames(zip: JSZip): Promise<Set<string>> {
  const layoutMedia = new Set<string>();
  const slideMedia = new Set<string>();

  const scan = async (name: string, into: Set<string>) => {
    try {
      const xml = await zip.files[name].async('string');
      const re = /media\/([^"]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml))) into.add(m[1]);
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
        const re = /Target="([^"]*media\/([^"]+))"/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(relXml))) {
          const shortName = m[2];
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
      const keptLog: string[] = [];
      const skippedLog: string[] = [];
      const skippedDecorativeLog: string[] = [];

      for (const filename of mediaFiles) {
        const ext = filename.split('.').pop()?.toLowerCase();
        // EMF/WMF/WDP need server-side conversion — P1. Keep GIF/PNG/JPEG/WebP in-browser.
        if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
          skippedUnsupported++;
          continue;
        }

        const shortName = filename.replace(/^ppt\/media\//, '');

        // Structural: slideLayout / slideMaster-only theme assets (waves, triangles, logos)
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

        if (ext === 'gif') {
          // Keep animated GIF as-is (no canvas flatten / trim). Dims from header when possible.
          const raw = await zip.files[filename].async('uint8array');
          byteHint = raw.byteLength;
          const hdr = gifHeaderDims(raw);
          const fileData = await zip.files[filename].async('base64');
          const dataUrl = `data:image/gif;base64,${fileData}`;
          if (hdr && hdr.width >= 120 && hdr.height >= 120) {
            imgProps = { width: hdr.width, height: hdr.height, src: dataUrl, contentScore: Math.min(100, Math.round(40 + Math.min(byteHint / 50000, 40))) };
          } else {
            // Dims-only decode — never flatten/trim (preserves animation)
            const dims = await new Promise<{ width: number; height: number }>((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ width: img.width, height: img.height });
              img.onerror = () => resolve({ width: 0, height: 0 });
              img.src = dataUrl;
            });
            imgProps = {
              width: dims.width,
              height: dims.height,
              src: dataUrl,
              contentScore: Math.min(100, Math.round(40 + Math.min(byteHint / 50000, 40))),
            };
          }
        } else {
          const raw = await zip.files[filename].async('uint8array');
          byteHint = raw.byteLength;
          const fileData = await zip.files[filename].async('base64');
          const mimeType =
            (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
            : `image/${ext}`;
          const dataUrl = `data:${mimeType};base64,${fileData}`;
          // Flatten transparent PNG → JPEG; score theme art; trim margins
          imgProps = await loadImageProps(dataUrl, ext === 'png' || ext === 'webp', byteHint);
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
      }
      console.log(
        `[extractImagesFromFile] PPTX "${file.name}": ${images.length} kept from ${mediaFiles.length} media ` +
        `(gif ${keptGif}; with-slide-context ${withContext}; skipped slide-canvas ${skippedSlideShots}, small ${skippedSmall}, ` +
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
          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

          const verdict = isLikelyThemeDecorativeArt(canvas);
          if (verdict.decorative) {
            skippedDecorative++;
            canvas.width = 0;
            canvas.height = 0;
            continue;
          }

          const trimmed = trimImageMargins(canvas);
          images.push({
            pageIndex: imgIndex++,
            dataUrl: trimmed.toDataURL('image/jpeg', 0.9),
            width: trimmed.width,
            height: trimmed.height,
            contentScore: verdict.contentScore,
          });
          if (trimmed !== canvas) {
            trimmed.width = 0;
            trimmed.height = 0;
          }
          canvas.width = 0;
          canvas.height = 0;
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
