const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Find the canvas div using "bg-cover bg-center relative" as anchor
const canvasAnchor = '"bg-cover bg-center relative"';
const canvasIdx = c.indexOf(canvasAnchor, 140000); // search from ~line 2460 area
if (canvasIdx < 0) { console.error('canvas not found'); process.exit(1); }

console.log('canvas context:', JSON.stringify(c.substring(canvasIdx, canvasIdx + 300)));
console.log('---');

// Find the frame style block
const frameStyleAnchor = '// Articulate-style: fixed design size + CSS scale to fill viewport';
const fsi = c.indexOf(frameStyleAnchor);
if (fsi < 0) { console.error('frameStyle anchor not found'); process.exit(1); }
console.log('frameStyle context:', JSON.stringify(c.substring(fsi-100, fsi+300)));
