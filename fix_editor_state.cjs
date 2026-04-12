'use strict';
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix onChange to use the ref-based update
app = app.replace(
  `                          onChange={(html) => setEditingSlide({ ...editingSlide, content: html })}`,
  `                          onChange={(html) => {
                            const updated = { ...(editingSlideRef.current ?? editingSlide), content: html };
                            editingSlideRef.current = updated;
                            setEditingSlide(updated);
                          }}`
);

// 2. Init the ref whenever setEditingSlide is called to open the drawer
// Find: setEditingSlide(currentSlide); setEditDrawerOpen(true);
// Add: then editingSlideRef.current = currentSlide;
app = app.replace(
  `onClick={() => { setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }}`,
  `onClick={() => { editingSlideRef.current = currentSlide; setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }}`
);

// 3. Also clear the ref on Cancel
app = app.replace(
  `onClick={() => setEditingSlide(null)}\n                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all"`,
  `onClick={() => { editingSlideRef.current = null; setEditingSlide(null); }}\n                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all"`
);

fs.writeFileSync('src/App.tsx', app, 'utf8');

// Verify
var hasOnChange = app.includes('editingSlideRef.current ?? editingSlide');
var hasInit = app.includes('editingSlideRef.current = currentSlide');
console.log('onChange uses ref:', hasOnChange ? '✓' : '✗');
console.log('ref initialised on open:', hasInit ? '✓' : '✗');
