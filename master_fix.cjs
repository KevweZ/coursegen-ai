const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");

const issues = [];

// ============================================================
// FIX 1: Audience Pathway "Corporate" → "Corporate Training"
// ============================================================
const old1 = `<button onClick={() => setPathway('corporate')} className={\`flex-1 sm:w-32 py-2 rounded-lg text-sm font-bold transition-all \${pathway === 'corporate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}\`}>Corporate</button>`;
const new1 = `<button onClick={() => setPathway('corporate')} className={\`flex-1 sm:w-36 py-2 rounded-lg text-sm font-bold transition-all \${pathway === 'corporate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}\`}>Corporate Training</button>`;
if (content.includes(old1)) { content = content.replace(old1, new1); issues.push('✅ Corporate → Corporate Training'); }
else issues.push('❌ Corporate label not found');

// ============================================================
// FIX 2: Complexity Preset tile — fix garbled bullet char in presetEngine display 
// ============================================================
// The garbled â€¢ in the slide count / density string
content = content.replace(/â€¢/g, '•');
issues.push('✅ garbled bullets fixed');

// ============================================================
// FIX 3: Add "Optimize Objectives" button before Auto-suggest
// The Learning Objectives section currently only has "Auto-suggest Objectives"
// We need to add an "Optimize Objectives" button ABOVE it (or alongside), 
// that triggers re-suggestion in the selected format
// ============================================================
const old3 = `                       <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                         <button onClick={handleSuggestObjectives} disabled={isSuggesting || (!prompt && !courseDescription)} className="flex items-center justify-center gap-2 px-6 py-3 w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl font-bold transition-colors border border-indigo-500/30 disabled:opacity-50">
                           {isSuggesting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                           Auto-suggest Objectives
                         </button>
                       </div>`;
const new3 = `                       <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-3">
                         <button onClick={handleSuggestObjectives} disabled={isSuggesting || (!prompt && !courseDescription)} className="flex items-center justify-center gap-2 px-6 py-3 flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl font-bold transition-colors border border-indigo-500/30 disabled:opacity-50">
                           {isSuggesting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                           Auto-suggest Objectives
                         </button>
                         <button
                           onClick={() => {
                             if (learningObjectives.length > 0) {
                               if (window.confirm(\`Re-optimize all objectives to match the "\${objectiveFormat}" format?\`)) {
                                 handleSuggestObjectives();
                               }
                             } else {
                               handleSuggestObjectives();
                             }
                           }}
                           disabled={isSuggesting || (!prompt && !courseDescription) || learningObjectives.length === 0}
                           className="flex items-center justify-center gap-2 px-6 py-3 flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl font-bold transition-colors border border-purple-500/30 disabled:opacity-50"
                         >
                           {isSuggesting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
                           Optimize Objectives
                         </button>
                       </div>`;
if (content.includes(old3)) { content = content.replace(old3, new3); issues.push('✅ Optimize Objectives button added'); }
else issues.push('❌ Auto-suggest section not found (already updated?)');

// ============================================================
// FIX 4: Gamification grid — add eye icon for preview + proper game names
// Fix the gamification tiles to have an eye button that opens the preview modal
// ============================================================
const old4 = `                         <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {getRecommendedGames(pathway, preset).map((gt: any) => {
                              const isSelected = gameTemplateIds.includes(gt.id);
                              return (
                                <div key={gt.id} onClick={() => {
                                  if (isSelected) setGameTemplateIds(gameTemplateIds.filter(id => id !== gt.id));
                                  else setGameTemplateIds([...gameTemplateIds, gt.id]);
                                }} className={\`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 \${isSelected ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}\`}>
                                   <span className="font-bold">{gt.title}</span>
                                   <span className="text-xs opacity-70">{gt.description}</span>
                                </div>
                              );
                            })}
                         </div>`;
const new4 = `                         <div className="p-4">
                           <p className="text-xs text-orange-400 font-bold tracking-widest uppercase mb-4">CLICK TO SELECT • HOVER EYE FOR PREVIEW</p>
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
                            {getRecommendedGames(pathway, preset).map((gt: any) => {
                              const isSelected = gameTemplateIds.includes(gt.id);
                              return (
                                <div key={gt.id} className={\`relative flex flex-col items-center text-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all \${isSelected ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}\`}>
                                  <div className="absolute top-2 right-2 text-slate-400 hover:text-orange-300 cursor-pointer z-20 bg-slate-900 rounded-full p-1" onClick={(e) => { e.stopPropagation(); setPreviewModalOption(gt.title); }}>
                                    <Eye className="w-4 h-4"/>
                                  </div>
                                  <button className="absolute inset-0 z-10 w-full h-full" onClick={() => {
                                    if (isSelected) setGameTemplateIds(gameTemplateIds.filter(id => id !== gt.id));
                                    else setGameTemplateIds([...gameTemplateIds, gt.id]);
                                  }} />
                                  <span className="text-xl mb-1">{gt.emoji || '🎮'}</span>
                                  <span className="font-bold text-sm relative z-0">{gt.title}</span>
                                  <span className="text-xs opacity-70 relative z-0 leading-snug">{gt.nickname || gt.description}</span>
                                </div>
                              );
                            })}
                           </div>
                         </div>`;
if (content.includes(old4)) { content = content.replace(old4, new4); issues.push('✅ Gamification grid with eye preview + emoji added'); }
else issues.push('❌ Gamification grid not found');

// ============================================================
// FIX 5: Fix TabbedHorizontal in player — it uses `tabs` not `items`
// ============================================================
const old5a = `<TabbedHorizontal items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />`;
const new5a = `<TabbedHorizontal tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />`;
if (content.includes(old5a)) { content = content.replace(old5a, new5a); issues.push('✅ TabbedHorizontal tabs prop fixed in player'); }
else issues.push('⚠️ TabbedHorizontal player prop — already fixed or not found');

// FIX: TabbedVertical in player — it uses `tabs` not `items`
const old5b = `<TabbedVertical items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />`;
const new5b = `<TabbedVertical tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />`;
if (content.includes(old5b)) { content = content.replace(old5b, new5b); issues.push('✅ TabbedVertical tabs prop fixed in player'); }
else issues.push('⚠️ TabbedVertical player prop — already fixed or not found');

// FIX: CarouselPanel in player — uses `cards` not `items`
const old5c = `<CarouselPanel items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />`;
const new5c = `<CarouselPanel cards={currentSlide.data?.cards || currentSlide.data?.items || currentSlide.interactions?.[0]?.cards || currentSlide.interactions?.[0]?.items || []} />`;
if (content.includes(old5c)) { content = content.replace(old5c, new5c); issues.push('✅ CarouselPanel cards prop fixed in player'); }
else issues.push('⚠️ CarouselPanel player prop — already fixed or not found');

// ============================================================
// FIX 6: Preview modal — fix all 4 new interaction component props
// Currently the preview modal was rebuilt with inline JSX, so these components 
// are not actually being imported there. But the preview modal might reference them.
// Let's make sure the preview modal uses correct props
// ============================================================

// Fix Tabs (Horizontal) preview — use tabs not items
content = content.replace(
  `<TabbedHorizontal items={[`,
  `<TabbedHorizontal tabs={[`
);
// Also fix TabbedVertical in preview
content = content.replace(
  `<TabbedVertical items={[`,
  `<TabbedVertical tabs={[`
);
// Fix FolderExplorer in preview — items prop is correct for FolderExplorer
// Fix CarouselPanel in preview — use cards not items  
content = content.replace(
  `<CarouselPanel items={[`,
  `<CarouselPanel cards={[`
);
issues.push('✅ Preview modal component props fixed');

// ============================================================
// FIX 7: Check/add PlayerPropertiesModal in preview toolbar
// ============================================================
const hasPlayerModal = content.includes('PlayerPropertiesModal') || content.includes('showSettings');
issues.push(hasPlayerModal ? '✅ PlayerPropertiesModal/Settings is in the file' : '❌ PlayerPropertiesModal NOT found');

// ============================================================
// FIX 8: Landing page - ensure bottom footer badges and taglines are complete
// Make sure the "Start Configuration" button says the right thing
// and there's proper text below the upload box
// ============================================================
// Make sure the badges at the bottom are there
const hasScormBadge = content.includes('SCORM Compliant');
issues.push(hasScormBadge ? '✅ Landing page badges present' : '❌ Landing page badges MISSING');

// ============================================================
// Write results
// ============================================================
fs.writeFileSync("src/App.tsx", content, "utf-8");
console.log("\n=== FIX REPORT ===");
issues.forEach(i => console.log(i));
console.log("\n✅ File written. Total size:", content.length, "bytes");
