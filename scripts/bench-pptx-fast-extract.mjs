/**
 * Wall-clock bench for the post-fix "fast path" PPTX extract
 * (header dims + base64, no canvas trim) — mirrors production for large decks.
 */
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const pptxPath =
  process.argv[2] ||
  'C:\\Users\\Lenovo\\Desktop\\Online Course\\Resources\\Content Documents for Testing\\Introduction to Steam Cracker Technology.pptx';

const SLIDE_CAPTURE_SIZES = [
  [1920, 1080], [1280, 720], [960, 540], [1600, 900], [1366, 768],
  [1024, 576], [2560, 1440], [3840, 2160],
  [1024, 768], [800, 600], [1600, 1200], [2048, 1536], [1280, 960], [1440, 1080],
  [1920, 1200], [1680, 1050], [1440, 900], [1280, 800],
];

function nearExactSize(w, h, tw, th, tol = 0.02) {
  return tw > 0 && th > 0 && Math.abs(w - tw) / tw <= tol && Math.abs(h - th) / th <= tol;
}
function isLikelyFullSlideCapture(width, height) {
  if (width < 600 || height < 400) return false;
  for (const [tw, th] of SLIDE_CAPTURE_SIZES) {
    if (nearExactSize(width, height, tw, th) || nearExactSize(width, height, th, tw)) return true;
  }
  return false;
}
function gifHeaderDims(bytes) {
  if (bytes.length < 10) return null;
  const sig = String.fromCharCode(...bytes.subarray(0, 6));
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
}
function pngHeaderDims(bytes) {
  if (bytes.length < 24 || bytes[0] !== 0x89) return null;
  const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
  const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
  if (width < 1 || height < 1) return null;
  return { width, height };
}
function jpegHeaderDims(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) break;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}
function rasterHeaderDims(bytes, ext) {
  if (ext === 'png') return pngHeaderDims(bytes);
  if (ext === 'jpg' || ext === 'jpeg') return jpegHeaderDims(bytes);
  if (ext === 'gif') return gifHeaderDims(bytes);
  return null;
}
function uint8ToBase64(bytes) {
  const chunk = 0x2000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

async function main() {
  const t0 = performance.now();
  const buf = fs.readFileSync(pptxPath);
  const tRead = performance.now();
  const zip = await JSZip.loadAsync(buf);
  const tZip = performance.now();

  const layoutMedia = new Set();
  const slideMedia = new Set();
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    let into = null;
    if (/^ppt\/(slideLayouts|slideMasters)\/_rels\//.test(name)) into = layoutMedia;
    else if (/^ppt\/slides\/_rels\//.test(name)) into = slideMedia;
    if (!into) continue;
    const xml = await zip.files[name].async('string');
    const re = /media\/([^"]+)/gi;
    let m;
    while ((m = re.exec(xml))) into.add(m[1].split('?')[0]);
  }
  const themeOnly = new Set([...layoutMedia].filter((m) => !slideMedia.has(m)));
  const tTheme = performance.now();

  const mediaFiles = Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/') && !zip.files[n].dir);
  let kept = 0;
  let skipped = 0;
  let base64Bytes = 0;

  for (const filename of mediaFiles) {
    if (kept >= 64) break;
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const shortName = filename.replace(/^ppt\/media\//, '');
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) { skipped++; continue; }
    if (themeOnly.has(shortName)) { skipped++; continue; }
    const raw = await zip.files[filename].async('uint8array');
    const hdr = rasterHeaderDims(raw, ext);
    const width = hdr?.width || 0;
    const height = hdr?.height || 0;
    if (width < 120 || height < 120) { skipped++; continue; }
    if (isLikelyFullSlideCapture(width, height)) { skipped++; continue; }
    const b64 = uint8ToBase64(raw);
    base64Bytes += b64.length;
    kept++;
  }
  const tEnd = performance.now();

  console.log(JSON.stringify({
    file: path.basename(pptxPath),
    fileMB: +(buf.length / 1024 / 1024).toFixed(2),
    media: mediaFiles.length,
    kept,
    skipped,
    base64MB: +(base64Bytes / 1024 / 1024).toFixed(2),
    ms: {
      readFile: Math.round(tRead - t0),
      zipLoad: Math.round(tZip - tRead),
      themeScan: Math.round(tTheme - tZip),
      mediaLoop: Math.round(tEnd - tTheme),
      total: Math.round(tEnd - t0),
    },
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
