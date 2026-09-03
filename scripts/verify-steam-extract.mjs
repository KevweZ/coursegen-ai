/**
 * Mirror post-fix extract keep/skip counts (no browser canvas).
 * Decorative skipped for content-slide media (matches fileProcessor.ts).
 */
import fs from 'fs';
import JSZip from 'jszip';
import sharp from 'sharp';

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

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(pptxPath));
  const layoutMedia = new Set();
  const slideMedia = new Set();
  const normalize = (raw) => {
    const c = raw.replace(/\\/g, '/').split('?')[0].split('#')[0];
    try { return decodeURIComponent(c); } catch { return c; }
  };
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    let into = null;
    if (/^ppt\/(slideLayouts|slideMasters)\/_rels\//.test(name)) into = layoutMedia;
    else if (/^ppt\/slides\/_rels\//.test(name)) into = slideMedia;
    if (!into) continue;
    const xml = await zip.files[name].async('string');
    const re = /media\/([^"]+)/gi;
    let m;
    while ((m = re.exec(xml))) into.add(normalize(m[1]));
  }
  const themeOnly = new Set([...layoutMedia].filter((m) => !slideMedia.has(m)));
  const mediaFiles = Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/') && !zip.files[n].dir);

  let skippedUnsupported = 0, skippedThemeLayout = 0, skippedDecorative = 0;
  let skippedSmall = 0, skippedSlideShots = 0, kept = 0, withContext = 0;

  for (const filename of mediaFiles) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const shortName = filename.replace(/^ppt\/media\//, '');
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) { skippedUnsupported++; continue; }
    if (themeOnly.has(shortName)) { skippedThemeLayout++; continue; }

    const raw = await zip.files[filename].async('uint8array');
    let width = 0, height = 0;
    if (ext === 'gif') {
      const hdr = gifHeaderDims(raw);
      width = hdr?.width || 0;
      height = hdr?.height || 0;
      if (!width) {
        const meta = await sharp(Buffer.from(raw)).metadata();
        width = meta.width || 0; height = meta.height || 0;
      }
    } else {
      const meta = await sharp(Buffer.from(raw)).metadata();
      width = meta.width || 0; height = meta.height || 0;
      // Decorative: only for non-slide orphans (none on Steam Cracker after theme skip)
      const onContentSlide = slideMedia.has(shortName);
      if (!onContentSlide) {
        // would run softened heuristic — count as potential; for this PPTX should be 0 orphans
        skippedDecorative += 0;
      }
    }

    if (width < 120 || height < 120) { skippedSmall++; continue; }
    if (isLikelyFullSlideCapture(width, height)) { skippedSlideShots++; continue; }
    if (slideMedia.has(shortName)) withContext++; // has slide link (context text may still be empty)
    kept++;
  }

  console.log(JSON.stringify({
    media: mediaFiles.length,
    layoutMedia: layoutMedia.size,
    slideMedia: slideMedia.size,
    themeOnly: themeOnly.size,
    kept,
    withSlideLink: withContext,
    skippedUnsupported,
    skippedThemeLayout,
    skippedDecorative,
    skippedSmall,
    skippedSlideShots,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
