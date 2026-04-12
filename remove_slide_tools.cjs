const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = '{/* The slide tools */}';
const endMarker = '{sourceImages.length > 0 && (';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1) { console.error('Start marker not found'); process.exit(1); }
if (endIdx === -1) { console.error('End marker not found'); process.exit(1); }

// Detect indentation from startMarker line
const lineStart = content.lastIndexOf('\n', startIdx) + 1;
const indent = content.slice(lineStart, startIdx);

const replacement =
  '{/* Slide media tools — Edit/Reset/Upload are in the top bar */}\n' +
  indent + '<div className="absolute top-0 right-0 z-[100] flex flex-wrap max-w-sm justify-end gap-2 shrink-0">\n' +
  indent + '  ';

const newContent = content.slice(0, startIdx) + replacement + content.slice(endIdx);
fs.writeFileSync('src/App.tsx', newContent, 'utf8');

// Verify
const lines = newContent.split('\n');
const verifyIdx = lines.findIndex(l => l.includes('Slide media tools'));
console.log('SUCCESS. Lines around change:');
console.log(lines.slice(Math.max(0, verifyIdx - 1), verifyIdx + 6).join('\n'));
