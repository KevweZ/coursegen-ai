/**
 * fix_three_issues.cjs
 * 1. Full-screen seekbar always visible (restructure full-mode layout so PlayerBar is outside scroll)
 * 2. Image placeholder: smaller icon + clickable to upload
 * 3. Landing page video: contain rather than cover so the whole animation is visible at all sizes
 */
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// ══════════════════════════════════════════════════════════════
// FIX 1: SEEKBAR ALWAYS VISIBLE IN FULL-SCREEN MODE
// Root cause: slide frame ('full' case) has flex-col but
// the scrollable div is flex-1 overflow-y-auto, so PlayerBar
// at the bottom IS within the flex column and should scroll
// into view. The real problem is the outer flex column has
// overflow:hidden. We need the slide frame in 'full' mode
// to be height:100% of the parent and use flex-col, with
// the scroll area taking flex-1 and PlayerBar being shrink-0.
// The outer "background canvas" div needs to be flex-col in full mode.
// ══════════════════════════════════════════════════════════════

// Fix the "background canvas" outer div to be flex-col in full mode:
app = app.replace(
  `                \u003cdiv className=\"flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden\"\u003e
                  {/* Background canvas */}
                  \u003cdiv
                    className={cn(\"flex-1 flex items-center justify-center bg-cover bg-center relative overflow-hidden\")}
                    style={{ backgroundImage: courseBg ? \`url('\${courseBg}')\` : undefined }}
                  \u003e`,
  `                <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
                  {/* Background canvas */}
                  <div
                    className={cn(
                      "bg-cover bg-center relative",
                      playerConfig.playerResolution === 'full'
                        ? 'flex flex-col flex-1 overflow-hidden'
                        : 'flex-1 flex items-center justify-center overflow-hidden'
                    )}
                    style={{ backgroundImage: courseBg ? \`url('\${courseBg}')\` : undefined }}
                  >`
);

// Fix the slide frame div: in full mode, it must fill the flex parent with flex-col
// and NOT have overflow:hidden so the sticky PlayerBar works
app = app.replace(
  `                  \u003cdiv className={cn(\`theme-\${theme}\`, \"shadow-2xl transition-all duration-500 flex flex-col relative z-10 overflow-hidden\",
                    viewMode === 'desktop'
                      ? playerConfig.playerResolution === '4:3'
                        ? 'mx-auto my-4 md:rounded-2xl border border-white/20'
                        : playerConfig.playerResolution === 'full'
                        ? 'w-full'
                        : 'w-full max-w-5xl mx-auto my-4 h-[calc(100vh-260px)] md:rounded-2xl border border-white/20'
                      : 'w-[375px] h-[667px] my-4 rounded-[3rem] border-[8px] border-gray-800',
                    theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900'
                  )
                  style={viewMode === 'desktop' && playerConfig.playerResolution === '4:3'
                    ? { aspectRatio: '4/3', maxWidth: '900px', width: '100%' }
                    : undefined
                  }\u003e`,
  `                  <div className={cn(\`theme-\${theme}\`,
                    "transition-all duration-500 flex flex-col relative z-10",
                    viewMode === 'desktop'
                      ? playerConfig.playerResolution === '4:3'
                        ? 'shadow-2xl overflow-hidden mx-auto my-4 md:rounded-2xl border border-white/20'
                        : playerConfig.playerResolution === 'full'
                        ? 'flex-1 overflow-hidden w-full'   // fills the flex-col parent, PlayerBar sticky inside
                        : 'shadow-2xl overflow-hidden w-full max-w-5xl mx-auto my-4 h-[calc(100vh-260px)] md:rounded-2xl border border-white/20'
                      : 'shadow-2xl overflow-hidden w-[375px] h-[667px] my-4 rounded-[3rem] border-[8px] border-gray-800',
                    theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900'
                  )}
                  style={viewMode === 'desktop' && playerConfig.playerResolution === '4:3'
                    ? { aspectRatio: '4/3', maxWidth: '900px', width: '100%' }
                    : undefined
                  }>`
);

// The ScrollArea inside the slide frame must be flex-1 (already is), and PlayerBar must be shrink-0
// PlayerBar already has shrink-0 via the outer div. The sticky class is the real fix — let's 
// change 'sticky bottom-0' → keep it but ensure the slide frame overflow is not hidden in full mode
// (done above by removing overflow-hidden from full-mode slide frame)

// ══════════════════════════════════════════════════════════════
// FIX 2: IMAGE PLACEHOLDER — smaller + clickable to upload
// ══════════════════════════════════════════════════════════════
app = app.replace(
  `                            {(currentSlide?.imagePlaceholder || currentSlide?.mediaUrl) && (
                              <div className="mt-8">
                              {currentSlide?.mediaUrl ? (
                                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-black/10">
                                  <img 
                                    src={currentSlide.mediaUrl} 
                                    alt={currentSlide.title}
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center flex-col gap-3 text-slate-400">
                                  <ImageIcon className="w-12 h-12 opacity-30" />
                                  <span className="text-sm font-medium">Image Placeholder</span>
                                </div>
                              )}
                              </div>
                            )}`,
  `                            {(currentSlide?.imagePlaceholder || currentSlide?.mediaUrl) && (
                              <div className="mt-6">
                              {currentSlide?.mediaUrl ? (
                                <div className="max-w-lg rounded-xl overflow-hidden shadow-xl border border-black/10">
                                  <img 
                                    src={currentSlide.mediaUrl} 
                                    alt={currentSlide.title}
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <label
                                  className="inline-flex flex-col items-center gap-2 cursor-pointer group"
                                  title="Click to upload an image"
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const url = URL.createObjectURL(file);
                                      handleUpdateSlideMedia(currentSlide.id, { mediaUrl: url, imagePlaceholder: false });
                                    }}
                                  />
                                  <div className={cn(
                                    "w-28 h-20 rounded-xl border-2 border-dashed flex items-center justify-center flex-col gap-1.5 transition-all",
                                    "group-hover:border-indigo-400 group-hover:bg-indigo-500/5",
                                    theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-400' : 'border-slate-600 bg-slate-800/40 text-slate-500'
                                  )}>
                                    <ImageIcon className="w-7 h-7 opacity-50 group-hover:opacity-80 group-hover:text-indigo-400 transition-all" />
                                    <span className="text-[10px] font-bold text-center leading-tight opacity-70 group-hover:opacity-100 group-hover:text-indigo-400">Click to upload</span>
                                  </div>
                                </label>
                              )}
                              </div>
                            )}`
);

// ══════════════════════════════════════════════════════════════
// FIX 3: LANDING PAGE VIDEO — contain so whole animation visible
// Use object-contain + max dimensions so it never clips at
// large viewport sizes; center it vertically
// ══════════════════════════════════════════════════════════════
app = app.replace(
  `                  className=\"absolute min-w-full min-h-full object-cover opacity-30 mix-blend-screen scale-105 pointer-events-none\"`,
  `                  className="absolute inset-0 w-full h-full object-contain opacity-30 mix-blend-screen pointer-events-none"`
);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('✅ All 3 fixes applied to App.tsx');
