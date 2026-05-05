const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');

const oldFn = `function autoFormatAsBullets(raw: string): string {
  const blocks = raw.split(/\\n{2,}/);
  const isPlain = (b: string) => {
    const t = b.trim();
    if (!t) return false;
    if (/^#{1,6}\\s/.test(t)) return false;
    if (/^[-*+]\\s|^\\d+\\.\\s/.test(t)) return false;
    if (/^>/.test(t)) return false;
    if (/^\`\`\`/.test(t)) return false;
    if (/^---/.test(t)) return false;
    return true;
  };
  if (blocks.filter(isPlain).length < 2) return raw;
  return blocks.map(b => isPlain(b) ? \`- \${b.trim()}\` : b).join('\\n\\n');
}`;

const newFn = `function autoFormatAsBullets(raw: string): string {
  const isPlain = (b: string) => {
    const t = b.trim();
    if (!t) return false;
    if (/^#{1,6}\\s/.test(t)) return false;
    if (/^[-*+]\\s|^\\d+\\.\\s/.test(t)) return false;
    if (/^>/.test(t)) return false;
    if (/^\`\`\`/.test(t)) return false;
    if (/^---/.test(t)) return false;
    return true;
  };
  // First try double-newline paragraphs (original behaviour)
  const dblBlocks = raw.split(/\\n{2,}/);
  if (dblBlocks.filter(isPlain).length >= 2) {
    return dblBlocks.map(b => isPlain(b) ? \`- \${b.trim()}\` : b).join('\\n\\n');
  }
  // Fall back: single-newline lines (e.g. two instruction sentences joined with \\n)
  const lines = raw.split(/\\n/);
  if (lines.filter(isPlain).length >= 2) {
    return lines.map(b => isPlain(b) ? \`- \${b.trim()}\` : b).join('\\n');
  }
  return raw;
}`;

if (!src.includes(oldFn)) {
  console.error('❌ autoFormatAsBullets function body not found');
  process.exit(1);
}
src = src.replace(oldFn, newFn);
fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log('✔ autoFormatAsBullets: now handles single-newline-separated lines too');
