const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const editTextBlock = `                  {/* Edit Text & Audio */}
                  <button
                    title="Edit Text & Audio — open the rich-text and narration editor for this slide"
                    onClick={() => { setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-700/60 hover:bg-indigo-800/30 text-indigo-300 text-xs font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" /><span className="hidden lg:inline">Edit Text &amp; Audio</span>
                  </button>`;

const changeBgBlock = `
                  {/* Change Background */}
                  <label
                    htmlFor="topbar-bg-upload"
                    title="Change Background — upload a custom background image for the preview area"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-pink-700/60 hover:bg-pink-800/20 text-pink-300 text-xs font-medium cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /><span className="hidden lg:inline">Change Bg</span>
                    <input id="topbar-bg-upload" type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setCourseBg(URL.createObjectURL(f)); e.target.value = ''; } }}
                    />
                  </label>`;

const resetBlock = `
                  {/* Reset Layout */}
                  <button
                    title="Reset Layout — restore the course to its original generated state (clears all edits)"
                    onClick={() => { if (originalCourse) { setCourse(originalCourse); setCurrentSlideIndex(0); setQuizState({}); setFloatingImagesMap({}); setCourseBg(null); } }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-700/60 hover:bg-amber-800/20 text-amber-300 text-xs font-medium"
                  >
                    <RotateCw className="w-3.5 h-3.5" /><span className="hidden lg:inline">Reset</span>
                  </button>`;

// Current order: editTextBlock + changeBgBlock + resetBlock
// Target order:  resetBlock + editTextBlock + changeBgBlock
const currentOrder = editTextBlock + changeBgBlock + resetBlock;
const newOrder = resetBlock.trimStart().replace(/^\s*/, '                  ') + '\n' + editTextBlock + changeBgBlock;

// Build a simpler regex-free replacement
if (!content.includes('Edit Text & Audio — open')) {
  console.error('Could not find Edit Text & Audio block');
  process.exit(1);
}

// Find and swap using indexOf
const startMarker = '                  {/* Edit Text & Audio */}';
const endMarker = '                  </button>\n\n                  {/* Upload Image */}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf('                  {/* Upload Image */}');

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found', { startIdx, endIdx });
  process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);

const newSection = `                  {/* Reset Layout */}
                  <button
                    title="Reset Layout — restore the course to its original generated state (clears all edits)"
                    onClick={() => { if (originalCourse) { setCourse(originalCourse); setCurrentSlideIndex(0); setQuizState({}); setFloatingImagesMap({}); setCourseBg(null); } }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-700/60 hover:bg-amber-800/20 text-amber-300 text-xs font-medium"
                  >
                    <RotateCw className="w-3.5 h-3.5" /><span className="hidden lg:inline">Reset</span>
                  </button>

                  {/* Edit Text & Audio */}
                  <button
                    title="Edit Text & Audio — open the rich-text and narration editor for this slide"
                    onClick={() => { setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-700/60 hover:bg-indigo-800/30 text-indigo-300 text-xs font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" /><span className="hidden lg:inline">Edit Text &amp; Audio</span>
                  </button>

                  {/* Change Background */}
                  <label
                    htmlFor="topbar-bg-upload"
                    title="Change Background — upload a custom background image for the preview area"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-pink-700/60 hover:bg-pink-800/20 text-pink-300 text-xs font-medium cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /><span className="hidden lg:inline">Change Bg</span>
                    <input id="topbar-bg-upload" type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setCourseBg(URL.createObjectURL(f)); e.target.value = ''; } }}
                    />
                  </label>

                  `;

fs.writeFileSync('src/App.tsx', before + newSection + after, 'utf8');
console.log('✅ Reset button moved before Edit Text & Audio');

// Verify order
const out = fs.readFileSync('src/App.tsx','utf8');
const resetPos = out.indexOf('{/* Reset Layout */}');
const editPos  = out.indexOf('{/* Edit Text & Audio */}');
const uploadPos = out.indexOf('{/* Upload Image */}');
console.log('Order check - Reset:', resetPos, '< Edit:', editPos, '< Upload:', uploadPos);
console.log(resetPos < editPos && editPos < uploadPos ? '✓ Correct order' : '✗ Wrong order');
