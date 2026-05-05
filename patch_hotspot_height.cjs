const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the fixed height on the hotspot wrapper div (single-line match, CRLF-safe)
const updated = src.replace(
  `<div style={{ height: 'clamp(220px, 50vh, 400px)' }}>`,
  `<div style={{ minHeight: '320px' }}>`
);

if (updated === src) { console.error('❌ Hotspot height wrapper not found'); process.exit(1); }
fs.writeFileSync('src/App.tsx', updated, 'utf8');
console.log('✔ Hotspot wrapper: fixed clamp height → minHeight 320px');
