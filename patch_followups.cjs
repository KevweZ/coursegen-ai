const fs = require('fs');
let c = fs.readFileSync('src/components/interactions/ExtraPreviews.tsx', 'utf8');

// 1. Hotspots Preview Map Change
// Find the <svg> block and replace with an <img> 
// Wait, I will use replace on the string block.
c = c.replace(
  /<svg viewBox="0 0 1000 650" className="w-full h-full opacity-30 text-indigo-400 absolute inset-0 m-auto pointer-events-none" fill="currentColor">[\s\S]*?<\/svg>/,
  '<img src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Blank_US_Map_(states_only).svg" alt="USA Map" className="absolute inset-0 w-full h-full object-contain opacity-50 p-2 pointer-events-none" style={{ filter: "invert(0.5) sepia(1) hue-rotate(180deg) saturate(300%)" }} />'
);

// We should adjust dots coordinates to roughly match the wikimedia dots. 
// California is approx x: 10%, y: 50%
// Texas is approx x: 45%, y: 75%
// Florida is approx x: 80%, y: 85%
// New York is approx x: 85%, y: 30%
c = c.replace(
  /const dots = \[[\s\S]*?\];/,
  `const dots = [
    { x: '12%', y: '45%', n: 1, label: 'California' },
    { x: '46%', y: '75%', n: 2, label: 'Texas' },
    { x: '78%', y: '85%', n: 3, label: 'Florida' },
    { x: '82%', y: '28%', n: 4, label: 'New York' }
  ];`
);

// 2. Timeline Preview e.stopPropagation for layout toggles
c = c.replace(
  /<button onClick={\(\) => setLayout\('vertical'\)}/g,
  '<button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLayout("vertical"); }}'
);
c = c.replace(
  /<button onClick={\(\) => setLayout\('horizontal'\)}/g,
  '<button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLayout("horizontal"); }}'
);

// 3. Drop Target Preview - Remove Quiz Logic
// Find `DropTargetsPreview({ isQuiz = false }: { isQuiz?: boolean })` and replace with `DropTargetsPreview()`
c = c.replace(
  /export function DropTargetsPreview\(\{ isQuiz = false \}: \{ isQuiz\?: boolean \}\) \{/g,
  'export function DropTargetsPreview() {'
);
// Remove `if (!isQuiz) { ... }` blocks and just leave the inner check
c = c.replace(/if \(!isQuiz\) \{\s*if \(correctMap/g, 'if (correctMap');
c = c.replace(/return;\s*\}\s*\}/g, 'return;\n       }');
c = c.replace(/if \(!isQuiz && correctMap\[item\.text\] !== target\) \{/g, 'if (correctMap[item.text] !== target) {');


fs.writeFileSync('src/components/interactions/ExtraPreviews.tsx', c);
console.log('ExtraPreviews (Map, Timeline, DropTargets) patched.');


// 4. Folder Explorer Tweaks
let f = fs.readFileSync('src/components/interactions/FolderExplorer.tsx', 'utf8');

// Move Instructions to top
f = f.replace(
  /\{\!openItem && \(\s*<p className="text-slate-500 text-xs text-center mt-3 font-bold animate-pulse">\s*Click any folder or tab to view its fully extracted document\s*<\/p>\s*\)\}/,
  ''
);

// Inject instructions above the row
f = f.replace(
  /<div className="w-full select-none">/g,
  `<div className="w-full select-none">
      <p className="text-slate-400 text-sm text-center mb-6 font-bold animate-pulse">
        Click any folder or tab to view its fully extracted document
      </p>`
);

// Increase folder labels
// Tab label
f = f.replace(
  /text-\[9px\] leading-snug truncate shadow-md/g,
  'text-xs leading-snug truncate shadow-md'
);
// Main front label
f = f.replace(
  /text-\[9px\] font-bold text-center/g,
  'text-xs font-bold text-center'
);

// Bridge the gap for the floating paper
// mt-3 -> -mt-4
f = f.replace(
  /className="relative px-4 w-full mt-3 z-30"/g,
  'className="relative px-4 w-full -mt-20 pt-16 pointer-events-none z-30"'
);
f = f.replace(
  /style={{ background: openColors\.paper/g,
  'style={{ background: openColors.paper, pointerEvents: "auto"'
);
f = f.replace(
  /initial={{ opacity: 0, y: -40, scale: 0\.8 }}/g,
  'initial={{ opacity: 0, y: -60, scale: 0.8 }}'
);
f = f.replace(
  /exit={{ opacity: 0, y: -40, scale: 0\.8, transition: \{ duration: 0\.2 \} }}/g,
  'exit={{ opacity: 0, y: -60, scale: 0.8, transition: { duration: 0.2 } }}'
);

// Remove mode="wait" to allow smooth layoutId morphing
f = f.replace(
  /<AnimatePresence mode="wait">/g,
  '<AnimatePresence>'
);

fs.writeFileSync('src/components/interactions/FolderExplorer.tsx', f);
console.log('FolderExplorer patched smoothly.');
