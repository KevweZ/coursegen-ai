const fs = require('fs');
let c = fs.readFileSync('src/App.tsx','utf8');

// The comment text for exact match
const marker = '</div>{/* end slide content scroll area */}';
const idx = c.indexOf(marker);
if (idx < 0) { console.error('not found'); process.exit(1); }

// Get the whole line (including leading spaces and CRLF)
const lineStart = c.lastIndexOf('\n', idx) + 1;
const lineEnd = c.indexOf('\n', idx) + 1;
console.log('line:', JSON.stringify(c.substring(lineStart, lineEnd)));

// Remove just that line
c = c.substring(0, lineStart) + c.substring(lineEnd);
fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('✔ removed orphaned closing div line');
