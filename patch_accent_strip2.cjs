/**
 * Patch: Convert accent strip from absolute positioning to flex-row layout.
 * Uses line-by-line approach for robustness.
 */
const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

let i = 0;
let stripStart = -1, stripEnd = -1, zoneStart = -1, zoneClose = -1;

// Find the accent strip block and content zone div
for (i = 0; i < lines.length; i++) {
  if (lines[i].includes('Global per-module accent strip (absolute, left edge)')) {
    stripStart = i;
  }
  if (stripStart !== -1 && stripEnd === -1 && lines[i].trim() === ')}' && i > stripStart + 3) {
    stripEnd = i;
  }
  if (stripStart !== -1 && lines[i].includes('Content zone: flex-1 so PlayerBar stays at bottom')) {
    zoneStart = i;
  }
  if (zoneStart !== -1 && lines[i].includes('end content zone')) {
    zoneClose = i;
    break;
  }
}

console.log(`Strip block: lines ${stripStart}–${stripEnd}`);
console.log(`Zone comment: line ${zoneStart}`);
console.log(`Zone close: line ${zoneClose}`);
console.log('Zone div line:', lines[zoneStart + 1]?.trim());

if (stripStart === -1 || zoneStart === -1 || zoneClose === -1) {
  process.exit(1);
}

// The content zone opening div line (the line after the comment)
const contentZoneLine = zoneStart + 1;
const indent = '                    '; // 20 spaces

// New lines to replace strips + zone opening:
const newBlock = [
  `${indent}{/* ── Content zone + accent strip ── */}`,
  `${indent}<div className="flex-1 flex flex-row overflow-hidden">`,
  `${indent}{/* Per-module accent strip — flex column, no z-index issues */}`,
  `${indent}{!isFullBleed && (`,
  `${indent}  <div`,
  `${indent}    className="w-[3px] shrink-0 self-stretch pointer-events-none"`,
  `${indent}    style={{ background: \`linear-gradient(to bottom, \${slideAccentColor}, \${slideAccentColor}40)\` }}`,
  `${indent}  />`,
  `${indent})}`,
  `${indent}<div className="flex-1 relative overflow-hidden flex flex-col">`,
];

// Replace lines stripStart through contentZoneLine (inclusive) with newBlock
lines.splice(stripStart, contentZoneLine - stripStart + 1, ...newBlock);

// Recalculate zoneClose offset (we added/removed lines)
const delta = newBlock.length - (contentZoneLine - stripStart + 1);
zoneClose = zoneClose + delta;

console.log(`New zoneClose: line ${zoneClose}`);
console.log('Close line context:', lines[zoneClose]?.trim());

// Replace the single closing </div>{/* end content zone */} with two closes
const closeIndent = '                     '; // 21 spaces
lines.splice(zoneClose, 1,
  `${closeIndent}</div>{/* end inner content */}`,
  `${closeIndent}</div>{/* end accent+content row */}`
);

fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('✅ Accent strip patch complete');
