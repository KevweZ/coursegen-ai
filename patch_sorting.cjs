const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const marker = `prompt="Drag items or use arrows to reorder"`;
const idx = app.indexOf(marker);
if (idx < 0) { console.error('marker not found'); process.exit(1); }

// 1. Remove the prompt prop
app = app.substring(0, idx) + app.substring(idx + marker.length);

// 2. Append drag hint to SmartContent for sorting slide
const sortContent = `sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />`;
const sortIdx = app.indexOf(sortContent, app.indexOf("type === 'sorting'"));
if (sortIdx < 0) { console.error('SmartContent marker not found'); process.exit(1); }

app = app.substring(0, sortIdx) + `sanitizeContent(currentSlide.content) + '\\n\\nDrag items or use ↑ ↓ arrows to reorder.'} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />` + app.substring(sortIdx + sortContent.length);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('✔ sorting slide: removed redundant prompt, appended drag hint to content');
