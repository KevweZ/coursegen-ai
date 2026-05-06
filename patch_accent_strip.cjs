/**
 * Fix accent strip: replace absolute z-20 approach with flex-row layout.
 * This avoids stacking context issues with framer-motion transforms,
 * making the strip visible on ALL non-full-bleed slides (accordion, quiz, etc.)
 */
const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');

// Find and replace the absolute accent strip + content zone wrapper
// Old structure: absolute strip BEFORE content zone div
// New structure: outer flex-row with strip as first child, then inner content div

const OLD = `                    {/* Global per-module accent strip (absolute, left edge) */}\n                    {!['cover','module-cover','module-overview','player-tour','course-objectives','closing','exam-intro','mastery-exam','exam-results'].includes((currentSlide as any)?.type) && (\n                      <div\n                        className="absolute left-0 top-0 bottom-0 w-[3px] z-20 pointer-events-none"\n                        style={{ background: \`linear-gradient(to bottom, \${slideAccentColor}, \${slideAccentColor}40)\` }}\n                      />\n                    )}\n                    {/* ── Content zone: flex-1 so PlayerBar stays at bottom ── */}\n                    <div className="flex-1 relative overflow-hidden flex flex-col">`;

const NEW = `                    {/* ── Content zone + accent strip ── */}\n                    <div className="flex-1 flex flex-row overflow-hidden">\n                    {/* Per-module accent strip — flex column, immune to stacking context issues */}\n                    {!isFullBleed && (\n                      <div\n                        className="w-[3px] shrink-0 self-stretch pointer-events-none"\n                        style={{ background: \`linear-gradient(to bottom, \${slideAccentColor}, \${slideAccentColor}40)\`, flexShrink: 0 }}\n                      />\n                    )}\n                    <div className="flex-1 relative overflow-hidden flex flex-col">`;

// Try CRLF first
const OLD_CRLF = OLD.replace(/\n/g, '\r\n');
const NEW_CRLF = NEW.replace(/\n/g, '\r\n');

if (src.includes(OLD_CRLF)) {
  src = src.replace(OLD_CRLF, NEW_CRLF);
  console.log('✔ Accent strip restructured (CRLF)');
} else if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  console.log('✔ Accent strip restructured (LF)');
} else {
  // Try to find by key substring
  const KEY = 'Global per-module accent strip (absolute, left edge)';
  const idx = src.indexOf(KEY);
  if (idx !== -1) {
    console.log(`Found key at char ${idx}, context:`, src.substring(idx - 20, idx + 300));
  } else {
    console.error('❌ Could not find accent strip block');
  }
}

// Also need to close the extra div before the PlayerBar
// Find the end of the content zone (before PlayerBar div)
const CLOSE_OLD = `                     </div>{/* end content zone */}`;
const CLOSE_NEW = `                     </div>{/* end inner content */}\n                     </div>{/* end accent+content row */}`;

const CLOSE_OLD_CRLF = CLOSE_OLD.replace(/\n/g, '\r\n');
const CLOSE_NEW_CRLF = CLOSE_NEW.replace(/\n/g, '\r\n');

if (src.includes(CLOSE_OLD_CRLF)) {
  src = src.replace(CLOSE_OLD_CRLF, CLOSE_NEW_CRLF);
  console.log('✔ Closing div updated (CRLF)');
} else if (src.includes(CLOSE_OLD)) {
  src = src.replace(CLOSE_OLD, CLOSE_NEW);
  console.log('✔ Closing div updated (LF)');
} else {
  console.error('❌ Could not find content zone closing div');
  // Show what's around "end content zone"
  const idx2 = src.indexOf('end content zone');
  if (idx2 !== -1) console.log('Content near close:', src.substring(idx2 - 40, idx2 + 60));
}

fs.writeFileSync('src/App.tsx', src, 'utf8');
