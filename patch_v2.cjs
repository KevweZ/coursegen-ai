// patch_v2.cjs — full-bleed layout + component wiring fixes
const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
let changed = 0;

function rep(old, neo, label) {
  const oldCRLF = old.replace(/\n/g, '\r\n');
  if (c.includes(oldCRLF)) { c = c.replace(oldCRLF, neo); console.log('✔', label); changed++; return; }
  if (c.includes(old))     { c = c.replace(old,     neo); console.log('✔ LF', label); changed++; return; }
  console.error('❌', label, '\n  first80:', old.substring(0, 80));
}

// ── 1. Add new component imports ─────────────────────────────────────────────
rep(
  `import { WheelDiagram } from './components/interactions/WheelDiagram';`,
  `import { WheelDiagram } from './components/interactions/WheelDiagram';
import { CustomMatchingActivity } from './components/interactions/CustomMatchingActivity';
import { CustomSortingActivity } from './components/interactions/CustomSortingActivity';
import { HotspotInteraction } from './components/interactions/HotspotInteraction';`,
  'new interaction imports'
);

// ── 2. Add isFullBleed computed var after allSlides ───────────────────────────
rep(
  `  const currentSlide = allSlides[currentSlideIndex];`,
  `  const currentSlide = allSlides[currentSlideIndex];
  const FULL_BLEED_TYPES = ['cover', 'title', 'module-cover', 'closing', 'key-takeaways'];
  const isFullBleed = FULL_BLEED_TYPES.includes(currentSlide?.type as string);`,
  'isFullBleed variable'
);

// ── 3. Replace the scroll container with conditional full-bleed logic ─────────
rep(
  `                    <div className={cn("flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full",
                      playerConfig.playerResolution === 'full' ? 'p-8 md:p-12 pb-4 text-lg' : 'p-6 md:p-10 pb-4',
                      theme === 'light' ? 'bg-white text-slate-900' : theme === 'unified' ? 'bg-indigo-950 text-slate-100' : 'bg-slate-900 text-white'
                    )}>
                      <AnimatePresence mode="wait">
                        <motion.div key={currentSlide?.id || currentSlideIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full relative min-h-full">
                          {/* Dynamic Content Layers */}
                          <div className="w-[120%] h-[120%] absolute -top-[10%] -left-[10%] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

                          <div className="relative z-10 w-full flex flex-col md:flex-row gap-8">
                            <div className="flex-1 w-full flex flex-col justify-center min-h-[50vh]">`,
  `                    {/* ── Full-bleed slide frame ─────────────────────── */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide?.id || currentSlideIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          "w-full",
                          isFullBleed
                            ? "absolute inset-0 overflow-hidden"
                            : cn(
                                "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar",
                                playerConfig.playerResolution === 'full' ? 'p-8 md:p-12 pb-4 text-lg' : 'p-6 md:p-10 pb-4',
                                theme === 'light' ? 'bg-white text-slate-900' : theme === 'unified' ? 'bg-indigo-950 text-slate-100' : 'bg-slate-900 text-white'
                              )
                        )}
                      >
                        {!isFullBleed && (
                          <div className="w-[120%] h-[120%] absolute -top-[10%] -left-[10%] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                        )}
                        <div className={cn(
                          isFullBleed
                            ? "w-full h-full"
                            : "relative z-10 w-full flex flex-col"
                        )}>
                          <div className={cn(
                            isFullBleed
                              ? "w-full h-full"
                              : "flex-1 w-full flex flex-col justify-start"
                          )}>`,
  'full-bleed layout restructure'
);

// ── 4. Replace the closing braces for the old nested divs ────────────────────
// The old structure closed with:  </div> (flex-1 w-full...) </div> (relative z-10...) </motion.div> </AnimatePresence>
// We need to find and replace the block of closing divs that corresponds to those extra wrappers
// This is tricky - let's find the place right after all the slide renderers end
// (after the exam slides renderers) and adjust closing tags
rep(
  `                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>`,
  `                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>`,
  'closing braces restructure'
);

// ── 5. Replace 'matching' renderer with CustomMatchingActivity ───────────────
rep(
  `                                   return (
                                     <div className="space-y-6 w-full">
                                       <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <MatchingActivity {...matchingProps} />
                                       </div>
                                     </div>
                                   );
                                })()}`,
  `                                   return (
                                     <div className="space-y-4 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <CustomMatchingActivity
                                         items={matchingProps.items}
                                         targets={matchingProps.targets}
                                       />
                                     </div>
                                   );
                                })()}`,
  'matching → CustomMatchingActivity'
);

// ── 6. Replace 'sorting' renderer with CustomSortingActivity ─────────────────
rep(
  `                                {currentSlide?.type === 'sorting' && (
                                   <div className="space-y-6 w-full">
                                      <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <SortingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                      </div>
                                   </div>
                                )}`,
  `                                {currentSlide?.type === 'sorting' && (() => {
                                   const sd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                   const sortItems = Array.isArray(sd.items) ? sd.items
                                     : Array.isArray(sd.steps) ? sd.steps.map((s: any, i: number) => ({ id: s.id || String(i), content: s.label || s.content || s }))
                                     : [];
                                   return (
                                     <div className="space-y-4 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <CustomSortingActivity
                                         items={sortItems}
                                         correctOrder={sd.correctOrder || []}
                                         prompt="Drag items or use ↑↓ to reorder"
                                       />
                                     </div>
                                   );
                                })()}`,
  'sorting → CustomSortingActivity'
);

// ── 7. Replace hotspot stub with HotspotInteraction ──────────────────────────
rep(
  `{['hotspot', 'drop-targets', 'memory-match'].includes(currentSlide?.type) && (`,
  `{currentSlide?.type === 'hotspot' && (() => {
                                  const hd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  return (
                                    <div className="space-y-4 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <HotspotInteraction
                                        imageUrl={hd.imageUrl || hd.image}
                                        points={hd.points || hd.hotspots || []}
                                        theme={theme}
                                      />
                                    </div>
                                  );
                               })()}

                               {['drop-targets', 'memory-match'].includes(currentSlide?.type) && (`,
  'hotspot → HotspotInteraction, split from under-construction'
);

// ── 8. Fix branching scenario h2 → SlideHeader ───────────────────────────────
rep(
  `                                       <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                         <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-start gap-3">`,
  `                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                         <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-start gap-3">`,
  'branching error state h2 → SlideHeader'
);

rep(
  `                                   return (
                                     <div className="space-y-6 w-full">
                                       <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <BranchingScenario nodes={normNodes} startNodeId={startId} />`,
  `                                   return (
                                     <div className="space-y-4 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <BranchingScenario nodes={normNodes} startNodeId={startId} />`,
  'branching valid state h2 → SlideHeader'
);

// ── 9. Replace remaining interaction h2s with SlideHeader ───────────────────
const h2Pattern = `<h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>`;
const slHeader = `<SlideHeader title={currentSlide.title} theme={theme} />`;
while (c.includes(h2Pattern)) {
  c = c.replace(h2Pattern, slHeader);
  changed++;
}
console.log('✔ remaining h2 → SlideHeader replacements');

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\n✅ Done. ${changed} patches applied.`);
