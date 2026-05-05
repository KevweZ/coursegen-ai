/**
 * patch_layout_fixes.cjs — Comprehensive layout & UX fixes:
 *  1. Hide HelpWidget in preview mode
 *  2. Default playerResolution to 'full', remove resolution selector from modal
 *  3. Always use full padding (p-8 md:p-12) in slide content area
 *  4. PlayerBar always sticky bottom-0
 *  5. Constrain all interaction content to max-w-4xl (left-aligned)
 *  6. Increase text size in SlideContent
 *  7. Increase WheelDiagram container height & make SVG responsive
 */
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
let modal = fs.readFileSync('src/components/builder/PlayerPropertiesModal.tsx', 'utf8');
let wheel = fs.readFileSync('src/components/interactions/WheelDiagram.tsx', 'utf8');
let ok = 0;

function patch(label, src, marker, replacement) {
  const idx = src.indexOf(marker);
  if (idx < 0) { console.error('❌', label, '— marker not found'); return src; }
  console.log('✔', label);
  ok++;
  return src.substring(0, idx) + replacement + src.substring(idx + marker.length);
}

// ══════════════════════════════════════════════════════════════════════════════
// App.tsx patches
// ══════════════════════════════════════════════════════════════════════════════

// 1. Hide HelpWidget in preview mode
app = patch('HelpWidget hidden in preview',
  app,
  `      {/* Help & Support floating widget — visible to all authenticated users */}\r\n      <HelpWidget userEmail={user?.email ?? ''} userId={user?.id} />`,
  `      {/* Help & Support floating widget — hidden during course preview to avoid covering Next button */}\r\n      {step !== 'preview' && <HelpWidget userEmail={user?.email ?? ''} userId={user?.id} />}`
);

// 2. Always use full padding regardless of playerResolution
app = patch('full padding always',
  app,
  `playerConfig.playerResolution === 'full' ? 'p-8 md:p-12 pb-4 text-lg' : 'p-6 md:p-10 pb-4',`,
  `'p-8 md:p-12 pb-4',`
);

// 3. PlayerBar always sticky bottom-0
app = patch('PlayerBar always sticky',
  app,
  `playerConfig.playerResolution === 'full' ? 'sticky bottom-0' : 'relative',`,
  `'sticky bottom-0',`
);

// 4. Constrain inner slide content wrapper to max-w-4xl (left-aligned)
app = patch('max-w-4xl inner content wrapper',
  app,
  `                              : "flex-1 w-full flex flex-col justify-start"`,
  `                              : "flex-1 w-full max-w-4xl flex flex-col justify-start"`
);

// 5. Bump text size in local SlideContent
app = patch('SlideContent text-xl',
  app,
  `className={cn('prose max-w-none text-lg lg:text-xl leading-relaxed', theme !== 'light' ? 'prose-invert' : '')}`,
  `className={cn('prose max-w-none text-xl leading-relaxed', theme !== 'light' ? 'prose-invert' : '')}`
);

// 6. Wheel diagram container: increase height to give SVG room
app = patch('WheelDiagram container height 440',
  app,
  `<div className="w-full" style={{ height: '340px' }}>`,
  `<div className="w-full" style={{ height: '440px' }}>`
);

// ══════════════════════════════════════════════════════════════════════════════
// PlayerPropertiesModal.tsx patches
// ══════════════════════════════════════════════════════════════════════════════

// 7. Default resolution to 'full'
modal = patch('default playerResolution full',
  modal,
  `  playerResolution: '16:9',`,
  `  playerResolution: 'full',`
);

// 8. Remove the Aspect Ratio & Resolution section from the modal settings panel
modal = patch('remove aspect ratio selector',
  modal,
  `            <SectionTitle>Aspect Ratio &amp; Resolution</SectionTitle>\n            <div className="grid grid-cols-3 gap-2 mb-1">\n              {([\n                { ratio: '16:9' as const, res: '1920×1080', label: 'Widescreen', icon: '▐▐▐▐▐▐▐' },\n                { ratio: '4:3'  as const, res: '1024×768',  label: 'Classic',    icon: '▐▐▐▐▐' },\n                { ratio: 'full' as const, res: 'Full viewport', label: 'Max Size', icon: '■' },\n              ]).map(({ ratio, res, label, icon }) => (\n                <button\n                  key={ratio}\n                  type="button"\n                  onClick={() => update({ playerResolution: ratio })}\n                  className={cn(\n                    'flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-bold transition-all',\n                    local.playerResolution === ratio\n                      ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'\n                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-500 hover:text-slate-200'\n                  )}\n                >\n                  <div className={cn(\n                    'border-2 rounded flex items-center justify-center shrink-0',\n                    local.playerResolution === ratio ? 'border-indigo-400' : 'border-slate-600',\n                    ratio === '16:9' ? 'w-12 h-[27px]' : ratio === '4:3' ? 'w-10 h-[30px]' : 'w-12 h-[27px] bg-indigo-500/10'\n                  )}>\n                    <span className="text-[8px] font-black opacity-60">{ratio === 'full' ? '⛶' : ratio}</span>\n                  </div>\n                  <span className="font-black text-[10px]">{label}</span>\n                  <span className={cn('text-[9px] font-normal text-center leading-tight', local.playerResolution === ratio ? 'text-indigo-400/70' : 'text-slate-600')}>{res}</span>\n                </button>\n              ))}\n            </div>`,
  `            {/* Aspect ratio is always Full — fills the available canvas. */}`
);

// 9. Remove resolution chip from config summary
modal = patch('remove resolution chip',
  modal,
  `                { label: local.playerResolution + ' · ' + (local.playerResolution === '16:9' ? '1920×1080' : '1024×768'), color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },`,
  `                { label: 'Full viewport · responsive', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },`
);

// ══════════════════════════════════════════════════════════════════════════════
// WheelDiagram.tsx patches
// ══════════════════════════════════════════════════════════════════════════════

// 10. Increase SVG_SIZE and radii
wheel = patch('WheelDiagram SVG_SIZE 420',
  wheel,
  `const SVG_SIZE = 340;\nconst CX = SVG_SIZE / 2;\nconst CY = SVG_SIZE / 2;\nconst OUTER_R = 158;\nconst INNER_R = 72;  // hub radius`,
  `const SVG_SIZE = 420;\nconst CX = SVG_SIZE / 2;\nconst CY = SVG_SIZE / 2;\nconst OUTER_R = 196;\nconst INNER_R = 88;  // hub radius`
);

// 11. Make SVG container responsive (fill parent, capped by CSS)
wheel = patch('WheelDiagram responsive SVG container',
  wheel,
  `      <div className="shrink-0" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`,
  `      <div className="shrink-0" style={{ width: 'min(50%, 440px)', height: 'min(50%, 440px)', minWidth: 260, minHeight: 260 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`
);

// Write all files
fs.writeFileSync('src/App.tsx', app, 'utf8');
fs.writeFileSync('src/components/builder/PlayerPropertiesModal.tsx', modal, 'utf8');
fs.writeFileSync('src/components/interactions/WheelDiagram.tsx', wheel, 'utf8');

console.log(`\n${ok}/11 patches applied.`);
