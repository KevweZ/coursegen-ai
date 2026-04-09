const fs = require('fs');

// Patch App Component - HotspotPreview
let c = fs.readFileSync('src/components/interactions/ExtraPreviews.tsx', 'utf8');

c = c.replace(
  /<motion\.div initial=\{\{ opacity: 0, scale: 0\.8, x: 20 \}\} animate=\{\{ opacity: 1, scale: 1, x: 40 \}\} exit=\{\{ opacity: 0, scale: 0\.8, x: 20 \}\} className="absolute -top-1 left-0 bg-slate-900 border-2 border-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-2xl z-30">/g,
  `{(() => {
     const isRight = parseInt(dot.x) > 60;
     return (
       <motion.div 
         initial={{ opacity: 0, scale: 0.8, x: isRight ? -20 : 20 }} 
         animate={{ opacity: 1, scale: 1, x: isRight ? -40 : 40 }} 
         exit={{ opacity: 0, scale: 0.8, x: isRight ? -20 : 20 }} 
         className={\`absolute -top-1 \${isRight ? 'right-0' : 'left-0'} bg-slate-900 border-2 border-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-2xl z-30\`}
       >
  `
);
c = c.replace(
  /\{dot\.label\}\n\s*<\/motion\.div>/g,
  `{dot.label}
       </motion.div>
     );
  })()}`
);


// Patch App Component - TimelinePreview
// Make sure all click events stop propagation!
c = c.replace(
  /onClick=\{\(\) => setOpenStep\(isOpen \? null : i\)\}/g,
  'onClick={(e) => { e.stopPropagation(); setOpenStep(isOpen ? null : i); }}'
);
c = c.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); e\.preventDefault\(\); setLayout\("vertical"\); \}\}/g,
  'onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLayout("vertical"); }}'
);
// just enforcing stopPropagation stringently

fs.writeFileSync('src/components/interactions/ExtraPreviews.tsx', c);


// Patch App Component - FolderExplorer
let f = fs.readFileSync('src/components/interactions/FolderExplorer.tsx', 'utf8');

// Inject flash return state
f = f.replace(
  /const \[openItemId, setOpenItemId\] = useState<string \| null>\(null\);/,
  `const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [flashReturn, setFlashReturn] = useState(false);`
);

// Lock folder clicks
f = f.replace(
  /onClick=\{\(\) => setOpenItemId\(isOpen \? null : item\.id\)\}/g,
  `onClick={(e) => {
    e.stopPropagation();
    if (openItemId && !isOpen) {
      setFlashReturn(true);
      setTimeout(() => setFlashReturn(false), 800);
      return;
    }
    setOpenItemId(isOpen ? null : item.id);
  }}`
);
f = f.replace(
  /onClick=\{\(e\) \=\> \{ e\.stopPropagation\(\); setOpenItemId\(item\.id\); \}\}/g,
  `onClick={(e) => {
    e.stopPropagation();
    if (openItemId) {
      setFlashReturn(true);
      setTimeout(() => setFlashReturn(false), 800);
      return;
    }
    setOpenItemId(item.id);
  }}`
);

// Empty folder when open (hide back generic papers)
// It looks like: {[1, 2].map(pi => (
f = f.replace(
  /\{\/\* Back generic papers \*\/\}\n\s*\{\[1, 2\].map\(pi => \(/g,
  `{/* Back generic papers */}
              {!isOpen && [1, 2].map(pi => (`
);

// Flash the return button
f = f.replace(
  /className="flex items-center gap-1\.5 bg-white\/20 hover:bg-white\/35 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors shrink-0"/g,
  `className={\`flex items-center gap-1.5 \${flashReturn ? 'bg-red-500 animate-pulse text-white scale-110' : 'bg-white/20 hover:bg-white/35 text-white'} font-bold text-xs px-3 py-1 rounded-lg transition-all shrink-0 duration-300\`}`
);

fs.writeFileSync('src/components/interactions/FolderExplorer.tsx', f);
console.log('UI patches injected successfully');
