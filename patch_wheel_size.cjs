// patch_wheel_size.cjs — Make the WheelDiagram significantly larger
const fs = require('fs');
let wheel = fs.readFileSync('src/components/interactions/WheelDiagram.tsx', 'utf8');
let app   = fs.readFileSync('src/App.tsx', 'utf8');
let ok = 0;

function patch(label, src, marker, replacement) {
  const idx = src.indexOf(marker);
  if (idx < 0) { console.error('❌', label); return src; }
  console.log('✔', label);
  ok++;
  return src.substring(0, idx) + replacement + src.substring(idx + marker.length);
}

// ─── WheelDiagram.tsx ────────────────────────────────────────────────────────
// 1. Increase SVG constants — 500px viewBox, bigger ring
wheel = patch('SVG constants 500',
  wheel,
  'const SVG_SIZE = 420;\nconst CX = SVG_SIZE / 2;\nconst CY = SVG_SIZE / 2;\nconst OUTER_R = 196;\nconst INNER_R = 88;  // hub radius',
  'const SVG_SIZE = 500;\nconst CX = SVG_SIZE / 2;\nconst CY = SVG_SIZE / 2;\nconst OUTER_R = 232;\nconst INNER_R = 104;  // hub radius'
);

// 2. Fix SVG container to a large fixed pixel size (no percentage height)
wheel = patch('SVG container fixed 520px',
  wheel,
  `      <div className="shrink-0" style={{ width: 'min(50%, 440px)', height: 'min(50%, 440px)', minWidth: 260, minHeight: 260 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`,
  `      <div className="shrink-0" style={{ width: 520, height: 520 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`
);

// 3. Increase label font sizes so text is readable
wheel = patch('label font size larger',
  wheel,
  'fontSize={n >= 8 ? 8 : n >= 6 ? 9 : 11}',
  'fontSize={n >= 8 ? 10 : n >= 6 ? 12 : 14}'
);

// 4. Update reveal panel maxHeight to match new container
wheel = patch('reveal panel maxHeight',
  wheel,
  'maxHeight: SVG_SIZE,',
  'maxHeight: 520,'
);

// ─── App.tsx ─────────────────────────────────────────────────────────────────
// 5. Increase the outer wheel container height in the slide renderer
app = patch('wheel container height 560',
  app,
  `<div className="w-full" style={{ height: '440px' }}>`,
  `<div className="w-full overflow-x-auto" style={{ height: '560px' }}>`
);

fs.writeFileSync('src/components/interactions/WheelDiagram.tsx', wheel, 'utf8');
fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log(`\n${ok}/5 patches applied.`);
