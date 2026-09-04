/**
 * Flatten a PPTX slide's pictures + drawingML shapes/connectors into one JPEG.
 * LibreOffice is not required — this is an in-browser canvas paint of xfrm boxes,
 * solid fills, straight connectors, and embedded rasters (z-order = XML order).
 */

const EMU_PER_PX = 9525;
const MAX_CANVAS_EDGE = 1600;
const MAX_DRAW_CMDS = 600;
const MAX_FLATTEN_SLIDES = 48;

type ZipReader = {
  files: Record<string, { dir?: boolean; async: (type: 'string') => Promise<string> } | undefined>;
};

export type FlattenedSlideImage = {
  dataUrl: string;
  width: number;
  height: number;
  contentScore: number;
  sourceSlideIndex: number;
  sourceContextText?: string;
  mediaName: string;
  memberMedia: string[];
};

type Xfrm = {
  x: number;
  y: number;
  cx: number;
  cy: number;
  chX: number;
  chY: number;
  chCx: number;
  chCy: number;
  rot: number;
  flipH: boolean;
  flipV: boolean;
};

type DrawPic = { kind: 'pic'; media: string; x: number; y: number; cx: number; cy: number; rot: number };
type DrawShape = {
  kind: 'shape';
  x: number;
  y: number;
  cx: number;
  cy: number;
  rot: number;
  fill?: string;
  stroke?: string;
  strokeW: number;
  geom: string;
  text?: string;
};
type DrawLine = {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeW: number;
  arrow: boolean;
};
type DrawCmd = DrawPic | DrawShape | DrawLine;

const SCHEME: Record<string, string> = {
  dk1: '#1f1f1f',
  tx1: '#1f1f1f',
  lt1: '#ffffff',
  bg1: '#ffffff',
  dk2: '#44546a',
  tx2: '#44546a',
  lt2: '#e7e6e6',
  bg2: '#e7e6e6',
  accent1: '#4472c4',
  accent2: '#ed7d31',
  accent3: '#a5a5a5',
  accent4: '#ffc000',
  accent5: '#5b9bd5',
  accent6: '#70ad47',
};

function xfrmFrom(el: Element | null): Xfrm | null {
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
  const rot = parseInt(xfrm.getAttribute('rot') || '0', 10) / 60000;
  const flipH = xfrm.getAttribute('flipH') === '1';
  const flipV = xfrm.getAttribute('flipV') === '1';
  return { x, y, cx, cy, chX, chY, chCx, chCy, rot, flipH, flipV };
}

function colorFrom(el: Element | null): string | undefined {
  if (!el) return undefined;
  const srgb = Array.from(el.getElementsByTagName('*')).find((n) => n.localName === 'srgbClr') as Element | undefined;
  const val = srgb?.getAttribute('val');
  if (val && /^[0-9a-fA-F]{6}$/.test(val)) return `#${val}`;
  const scheme = Array.from(el.getElementsByTagName('*')).find((n) => n.localName === 'schemeClr') as Element | undefined;
  const name = scheme?.getAttribute('val') || '';
  return SCHEME[name];
}

function skipPlaceholder(el: Element): boolean {
  const ph = Array.from(el.getElementsByTagName('*')).find((n) => n.localName === 'ph') as Element | undefined;
  const type = ph?.getAttribute('type') || '';
  return (
    type === 'sldNum' ||
    type === 'ftr' ||
    type === 'hdr' ||
    type === 'dt' ||
    type === 'title' ||
    type === 'ctrTitle' ||
    type === 'subTitle' ||
    type === 'body'
  );
}

function solidFillColor(from: Element | null | undefined): string | undefined {
  if (!from) return undefined;
  const solid = Array.from(from.getElementsByTagName('*')).find((n) => n.localName === 'solidFill') as
    | Element
    | undefined;
  return colorFrom(solid || null);
}

function shapeText(el: Element): string {
  return Array.from(el.getElementsByTagName('*'))
    .filter((n) => n.localName === 't')
    .map((n) => (n.textContent || '').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 280);
}

function parseRels(relXml: string): Map<string, string> {
  const rels = new Map<string, string>();
  const relRe = /Id="([^"]+)"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="([^"]+)"/gi;
  let rm: RegExpExecArray | null;
  while ((rm = relRe.exec(relXml))) {
    const id = rm[1] || rm[4];
    const target = (rm[2] || rm[3] || '').replace(/\\/g, '/');
    const media = target.split('/').pop()?.split('?')[0] || '';
    if (id && media && /media\//i.test(target)) rels.set(id, media);
  }
  return rels;
}

function walkDrawables(
  el: Element,
  ridToMedia: Map<string, string>,
  acc: DrawCmd[],
  ox: number,
  oy: number,
  sx: number,
  sy: number
): void {
  if (acc.length >= MAX_DRAW_CMDS) return;
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
        kind: 'pic',
        media,
        x: ox + xf.x * sx,
        y: oy + xf.y * sy,
        cx: xf.cx * sx,
        cy: xf.cy * sy,
        rot: xf.rot,
      });
    }
    return;
  }

  if (name === 'cxnSp') {
    const xf = xfrmFrom(el);
    if (xf && (xf.cx > 0 || xf.cy > 0)) {
      const x = ox + xf.x * sx;
      const y = oy + xf.y * sy;
      const w = xf.cx * sx;
      const h = xf.cy * sy;
      let x1 = x;
      let y1 = y;
      let x2 = x + w;
      let y2 = y + h;
      if (xf.flipH) {
        x1 = x + w;
        x2 = x;
      }
      if (xf.flipV) {
        y1 = y + h;
        y2 = y;
      }
      const spPr = Array.from(el.children).find((n) => n.localName === 'spPr') as Element | undefined;
      const ln = spPr
        ? (Array.from(spPr.getElementsByTagName('*')).find((n) => n.localName === 'ln') as Element | undefined)
        : undefined;
      const hasArrow = Array.from(el.getElementsByTagName('*')).some(
        (n) => n.localName === 'headEnd' || n.localName === 'tailEnd'
      );
      acc.push({
        kind: 'line',
        x1,
        y1,
        x2,
        y2,
        stroke: solidFillColor(ln) || solidFillColor(spPr) || '#333333',
        strokeW: Math.max(1, parseInt(ln?.getAttribute('w') || '12700', 10) / EMU_PER_PX),
        arrow: hasArrow,
      });
    }
    return;
  }

  if (name === 'sp') {
    if (skipPlaceholder(el)) return;
    const xf = xfrmFrom(el);
    if (xf && xf.cx > 0 && xf.cy > 0) {
      const spPr = Array.from(el.children).find((n) => n.localName === 'spPr') as Element | undefined;
      const prst = Array.from(el.getElementsByTagName('*')).find((n) => n.localName === 'prstGeom') as Element | undefined;
      const ln = spPr
        ? (Array.from(spPr.getElementsByTagName('*')).find((n) => n.localName === 'ln') as Element | undefined)
        : undefined;
      const noFill = !!(spPr && Array.from(spPr.getElementsByTagName('*')).some((n) => n.localName === 'noFill'));
      const text = shapeText(el) || undefined;
      const fill = noFill ? undefined : solidFillColor(spPr);
      const stroke = solidFillColor(ln);
      const strokeW = ln ? Math.max(1, parseInt(ln.getAttribute('w') || '9525', 10) / EMU_PER_PX) : 0;
      if (!fill && !stroke && !text) return;
      acc.push({
        kind: 'shape',
        x: ox + xf.x * sx,
        y: oy + xf.y * sy,
        cx: xf.cx * sx,
        cy: xf.cy * sy,
        rot: xf.rot,
        fill,
        stroke,
        strokeW,
        geom: prst?.getAttribute('prst') || 'rect',
        text,
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
      for (const child of Array.from(el.children)) {
        walkDrawables(child as Element, ridToMedia, acc, nx - xf.chX * nsx, ny - xf.chY * nsy, nsx, nsy);
      }
      return;
    }
  }

  for (const child of Array.from(el.children)) {
    walkDrawables(child as Element, ridToMedia, acc, ox, oy, sx, sy);
  }
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

function paintShape(ctx: CanvasRenderingContext2D, cmd: DrawShape, scale: number): void {
  const x = cmd.x * scale;
  const y = cmd.y * scale;
  const w = Math.max(1, cmd.cx * scale);
  const h = Math.max(1, cmd.cy * scale);
  ctx.save();
  if (cmd.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((cmd.rot * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  ctx.beginPath();
  const g = cmd.geom;
  if (g === 'ellipse' || g === 'circle') {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (g === 'roundRect' || g === 'round1Rect') {
    const r = Math.min(w, h) * 0.12;
    const rr = (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
    if (typeof rr === 'function') rr.call(ctx, 0, 0, w, h, r);
    else ctx.rect(0, 0, w, h);
  } else if (g === 'rightArrow' || g === 'leftArrow' || g === 'downArrow' || g === 'upArrow') {
    ctx.rect(0, h * 0.28, w * 0.62, h * 0.44);
    ctx.moveTo(w * 0.58, 0);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w * 0.58, h);
    ctx.closePath();
  } else {
    ctx.rect(0, 0, w, h);
  }
  if (cmd.fill) {
    ctx.fillStyle = cmd.fill;
    ctx.fill();
  }
  if (cmd.stroke && cmd.strokeW > 0) {
    ctx.strokeStyle = cmd.stroke;
    ctx.lineWidth = Math.max(1, cmd.strokeW * scale);
    ctx.stroke();
  }
  if (cmd.text) {
    ctx.fillStyle = cmd.fill && cmd.fill !== '#ffffff' && cmd.fill !== '#FFFFFF' ? '#ffffff' : '#1f1f1f';
    if (cmd.fill && /^#([0-9a-f]{6})$/i.test(cmd.fill)) {
      const n = parseInt(cmd.fill.slice(1), 16);
      const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
      ctx.fillStyle = lum < 140 ? '#ffffff' : '#1a1a1a';
    }
    const fontPx = Math.max(9, Math.min(22, h * 0.38));
    ctx.font = `600 ${fontPx}px system-ui, Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxW = w - 6;
    let t = cmd.text;
    if (ctx.measureText(t).width > maxW) {
      while (t.length > 4 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
      t = `${t}…`;
    }
    ctx.fillText(t, w / 2, h / 2, maxW);
  }
  ctx.restore();
}

/**
 * DrawingML flowsheets/tables we cannot paint faithfully (elbow arrows, a:tbl).
 * Skip these rather than attaching a broken sketch. Real ppt/media rasters still extract.
 */
export function slideIsSpaghettiSketch(slideXml: string): boolean {
  const pics = (slideXml.match(/<p:pic[\s>]/g) || []).length;
  const connectors = (slideXml.match(/<p:cxnSp[\s>]/g) || []).length;
  if (/<a:tbl[\s>]/.test(slideXml)) return true;
  return connectors >= 8 && pics < 2;
}

export function slideLooksLikeIllustration(slideXml: string): boolean {
  if (slideIsSpaghettiSketch(slideXml)) return false;
  const pics = (slideXml.match(/<p:pic[\s>]/g) || []).length;
  const shapes = (slideXml.match(/<p:sp[\s>]/g) || []).length;
  const connectors = (slideXml.match(/<p:cxnSp[\s>]/g) || []).length;
  const groups = (slideXml.match(/<p:grpSp[\s>]/g) || []).length;
  return pics >= 3 || connectors >= 1 || (pics >= 1 && (shapes >= 8 || groups >= 2));
}

export async function flattenOnePptxSlide(
  slideXml: string,
  relXml: string,
  byMedia: Map<string, { dataUrl: string }>,
  slideIndex: number,
  slideText: string
): Promise<FlattenedSlideImage | null> {
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') return null;
  const rels = parseRels(relXml);
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(slideXml, 'application/xml');
  } catch {
    return null;
  }
  const root = doc.documentElement;
  if (!root || root.localName === 'parsererror') return null;
  const cmds: DrawCmd[] = [];
  walkDrawables(root, rels, cmds, 0, 0, 1, 1);
  const pics = cmds.filter((c): c is DrawPic => c.kind === 'pic');
  const drawn = cmds.filter((c) => c.kind !== 'pic');
  const lines = cmds.filter((c) => c.kind === 'line');
  if (pics.length + drawn.length < 2) return null;
  // Straight-line connectors cannot reconstruct elbow PFDs — don't emit a sketch.
  if (lines.length >= 8 && pics.length < 2) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number, cx: number, cy: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + cx);
    maxY = Math.max(maxY, y + cy);
  };
  for (const c of cmds) {
    if (c.kind === 'pic' || c.kind === 'shape') include(c.x, c.y, c.cx, c.cy);
    else include(Math.min(c.x1, c.x2), Math.min(c.y1, c.y2), Math.abs(c.x2 - c.x1) || 1, Math.abs(c.y2 - c.y1) || 1);
  }
  if (!Number.isFinite(minX) || maxX - minX < 20000) return null;

  const emuW = Math.max(1, maxX - minX);
  const emuH = Math.max(1, maxY - minY);
  const pxW = Math.min(MAX_CANVAS_EDGE, Math.max(280, Math.round(emuW / EMU_PER_PX)));
  const scale = pxW / emuW;
  const pxH = Math.max(160, Math.round(emuH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pxW, pxH);

  const toX = (v: number) => (v - minX) * scale;
  const toY = (v: number) => (v - minY) * scale;

  for (const c of cmds) {
    if (c.kind === 'shape') {
      paintShape(ctx, { ...c, x: c.x - minX, y: c.y - minY }, scale);
    } else if (c.kind === 'line') {
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = Math.max(1, c.strokeW * scale);
      ctx.beginPath();
      ctx.moveTo(toX(c.x1), toY(c.y1));
      ctx.lineTo(toX(c.x2), toY(c.y2));
      ctx.stroke();
      if (c.arrow) {
        const ang = Math.atan2(c.y2 - c.y1, c.x2 - c.x1);
        const ah = 8;
        ctx.beginPath();
        ctx.moveTo(toX(c.x2), toY(c.y2));
        ctx.lineTo(toX(c.x2) - ah * Math.cos(ang - 0.45), toY(c.y2) - ah * Math.sin(ang - 0.45));
        ctx.lineTo(toX(c.x2) - ah * Math.cos(ang + 0.45), toY(c.y2) - ah * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fillStyle = c.stroke;
        ctx.fill();
      }
    } else {
      const src = byMedia.get(c.media);
      if (!src?.dataUrl) continue;
      const img = await loadHtmlImage(src.dataUrl);
      if (!img) continue;
      const x = toX(c.x);
      const y = toY(c.y);
      const w = Math.max(1, c.cx * scale);
      const h = Math.max(1, c.cy * scale);
      try {
        ctx.save();
        if (c.rot) {
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate((c.rot * Math.PI) / 180);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
        ctx.restore();
      } catch {
        ctx.restore();
      }
    }
  }

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return null;
  }
  const members = [...new Set(pics.map((p) => p.media))];
  return {
    dataUrl,
    width: pxW,
    height: pxH,
    contentScore: 96,
    sourceSlideIndex: slideIndex,
    sourceContextText: slideText.slice(0, 6000) || undefined,
    mediaName: `flatten-s${slideIndex}`,
    memberMedia: members,
  };
}

export async function flattenPptxSlideIllustrations(
  zip: ZipReader,
  images: Array<{ mediaName?: string; dataUrl: string; sourceContextText?: string }>,
  themeOnly: Set<string>,
  deadlineAt: number
): Promise<FlattenedSlideImage[]> {
  if (typeof DOMParser === 'undefined' || images.length < 1) return [];
  const byMedia = new Map<string, { dataUrl: string }>();
  for (const img of images) {
    if (img.mediaName && !themeOnly.has(img.mediaName)) byMedia.set(img.mediaName, img);
  }
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name) && !zip.files[name]?.dir)
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)?.[1] ?? '0', 10);
      const nb = parseInt(b.match(/slide(\d+)/)?.[1] ?? '0', 10);
      return na - nb;
    });

  const out: FlattenedSlideImage[] = [];
  let skippedSpaghetti = 0;
  for (const slidePath of slideFiles) {
    if (out.length >= MAX_FLATTEN_SLIDES) break;
    if (performance.now() > deadlineAt) break;
    const num = parseInt(slidePath.match(/slide(\d+)/)?.[1] ?? '0', 10);
    if (!num) continue;
    const relPath = `ppt/slides/_rels/slide${num}.xml.rels`;
    const slideFile = zip.files[slidePath];
    const relFile = zip.files[relPath];
    if (!slideFile || !relFile) continue;
    let slideXml: string;
    let relXml: string;
    try {
      slideXml = await slideFile.async('string');
      relXml = await relFile.async('string');
    } catch {
      continue;
    }
    if (slideIsSpaghettiSketch(slideXml)) {
      skippedSpaghetti++;
      continue;
    }
    if (!slideLooksLikeIllustration(slideXml)) continue;
    const notesPath = `ppt/notesSlides/notesSlide${num}.xml`;
    let text = (slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [])
      .map((m) => m.replace(/<[^>]*>/g, ' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (zip.files[notesPath]) {
      try {
        const notesXml = await zip.files[notesPath]!.async('string');
        const nt = (notesXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [])
          .map((m) => m.replace(/<[^>]*>/g, ' '))
          .join(' ');
        if (nt.trim()) text = `${text} ${nt}`.replace(/\s+/g, ' ');
      } catch {
        /* ignore */
      }
    }
    try {
      const flat = await flattenOnePptxSlide(slideXml, relXml, byMedia, num, text);
      if (flat) out.push(flat);
    } catch (err) {
      console.warn(`[pptxSlideFlatten] slide ${num} failed:`, err);
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  if (skippedSpaghetti) {
    console.log(`[pptxSlideFlatten] skipped ${skippedSpaghetti} spaghetti sketch slide(s) (connectors/tables)`);
  }
  return out;
}
