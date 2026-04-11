const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');

// Lines 1864-1882 (0-indexed: 1863-1881) is the placeholder block
// Replace lines 1865-1882 (0-indexed 1864-1881)
const newLines = [
  `                            {(currentSlide?.imagePlaceholder || currentSlide?.mediaUrl) && (`,
  `                              <div className="mt-6">`,
  `                              {currentSlide?.mediaUrl ? (`,
  `                                <div className="max-w-lg rounded-xl overflow-hidden shadow-xl border border-black/10">`,
  `                                  <img `,
  `                                    src={currentSlide.mediaUrl} `,
  `                                    alt={currentSlide.title}`,
  `                                    className="w-full h-full object-contain"`,
  `                                    referrerPolicy="no-referrer"`,
  `                                  />`,
  `                                </div>`,
  `                              ) : (`,
  `                                <label`,
  `                                  className="inline-flex flex-col items-center gap-2 cursor-pointer group"`,
  `                                  title="Click to upload an image"`,
  `                                >`,
  `                                  <input`,
  `                                    type="file"`,
  `                                    accept="image/*"`,
  `                                    className="sr-only"`,
  `                                    onChange={(e) => {`,
  `                                      const file = e.target.files?.[0];`,
  `                                      if (!file) return;`,
  `                                      const url = URL.createObjectURL(file);`,
  `                                      handleUpdateSlideMedia(currentSlide.id, { mediaUrl: url, imagePlaceholder: false });`,
  `                                    }}`,
  `                                  />`,
  `                                  <div className={cn(`,
  `                                    "w-28 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all",`,
  `                                    "group-hover:border-indigo-400 group-hover:bg-indigo-500/5",`,
  `                                    theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-400' : 'border-slate-600 bg-slate-800/40 text-slate-500'`,
  `                                  )}>`,
  `                                    <ImageIcon className="w-6 h-6 opacity-50 group-hover:opacity-90 group-hover:text-indigo-400 transition-all" />`,
  `                                    <span className="text-[10px] font-bold text-center opacity-70 group-hover:opacity-100 group-hover:text-indigo-400">Click to upload</span>`,
  `                                  </div>`,
  `                                </label>`,
  `                              )}`,
  `                              </div>`,
  `                            )}`,
];

// Replace lines 1863-1881 (0-indexed) — that is 19 lines
lines.splice(1863, 19, ...newLines);

fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('Done. Verify:');
const check = fs.readFileSync('src/App.tsx','utf8').split('\n');
check.slice(1863, 1905).forEach((l,i) => console.log(1864+i, l));
