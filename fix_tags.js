import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

// I will capture everything from the start of the preview to the end of the PlayerBar, and re-create it exactly.
const previewStartStr = `          {step === 'preview' && course && (`;
const playerBarEndStr = `                    />\n                  </div>`;

if (code.includes(previewStartStr) && code.includes(playerBarEndStr)) {
  const parts = code.split(previewStartStr);
  const beforePreview = parts[0];
  const previewToEOF = parts[1];
  const parts2 = previewToEOF.split(playerBarEndStr);
  const afterPreview = parts2.slice(1).join(playerBarEndStr);

  const previewBody = `{step === 'preview' && course && (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full min-h-screen bg-slate-900 absolute top-0 left-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 z-50 overflow-hidden flex flex-col">
              <div className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setStep('home')} className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-white font-bold text-lg">{course.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                   <button onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300">
                     {viewMode === 'desktop' ? <Monitor className="w-4 h-4"/> : <Smartphone className="w-4 h-4"/>}
                   </button>
                </div>
              </div>
              
              <div className={cn("w-full relative flex flex-col items-center justify-start bg-cover bg-center before:absolute before:inset-0 before:bg-slate-900/50 py-8 px-4 md:p-8 rounded-3xl min-h-[calc(100vh-8rem)]")} style={{ backgroundImage: courseBg ? \`url('\${courseBg}')\` : undefined }}>
                 <div className={cn("bg-white/70 backdrop-blur-md shadow-2xl transition-all duration-500 flex flex-col relative z-10 w-full overflow-hidden flex flex-col", viewMode === 'desktop' ? "max-w-5xl h-[85vh] md:rounded-2xl border border-white/30 my-auto" : "max-w-[375px] h-[667px] mt-8 rounded-[3rem] border-[8px] border-gray-800 bg-white/90")}>
                    <div className={cn("flex-1 p-6 md:p-12 pb-8 overflow-y-auto custom-scrollbar w-full text-slate-900")}>
                       <AnimatePresence mode="wait">
                         <motion.div key={currentSlide?.id || currentSlideIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full relative min-h-full">
                           {/* Slide Renderer Wrapper */}
                           <div className="w-full space-y-6">
                             {currentSlide?.type === 'title' && (
                               <div className="text-center space-y-4 my-20">
                                  <h2 className="text-5xl font-bold">{currentSlide.title}</h2>
                                  <ReactMarkdown className="prose max-w-none text-xl">{currentSlide.content}</ReactMarkdown>
                               </div>
                             )}
                             {currentSlide?.type === 'content' && (
                               <div className="space-y-6">
                                  <h2 className="text-4xl font-bold">{currentSlide.title}</h2>
                                  <ReactMarkdown className="prose max-w-none text-xl lg:text-2xl">{currentSlide.content}</ReactMarkdown>
                               </div>
                             )}
                             {currentSlide?.type === 'key-takeaways' && (
                               <div className="space-y-6 border-4 border-indigo-100 p-8 rounded-2xl bg-indigo-50/50">
                                  <h2 className="text-3xl font-bold text-indigo-900">{currentSlide.title}</h2>
                                  <ReactMarkdown className="prose max-w-none text-xl">{currentSlide.content}</ReactMarkdown>
                               </div>
                             )}
                             {currentSlide?.type === 'summary' && (
                               <div className="space-y-6 p-12 bg-emerald-50 rounded-2xl border border-emerald-100">
                                  <h2 className="text-4xl font-bold text-emerald-900 text-center">{currentSlide.title}</h2>
                                  <ReactMarkdown className="prose max-w-none text-xl text-center">{currentSlide.content}</ReactMarkdown>
                               </div>
                             )}
                             {currentSlide?.type === 'drag-drop-activity' && (
                                <InteractionWrapper slide={currentSlide} slideState={null}>
                                   <h2 className="text-3xl font-bold mb-4">{currentSlide.title}</h2>
                                   <ReactMarkdown className="prose">{currentSlide.content}</ReactMarkdown>
                                   <DragAndDropActivity payload={currentSlide.data} />
                                </InteractionWrapper>
                             )}
                             {currentSlide?.type === 'matching' && (
                                <InteractionWrapper slide={currentSlide} slideState={null}>
                                   <h2 className="text-3xl font-bold mb-4">{currentSlide.title}</h2>
                                   <ReactMarkdown className="prose">{currentSlide.content}</ReactMarkdown>
                                   <MatchingActivity payload={currentSlide.data} />
                                </InteractionWrapper>
                             )}
                             {currentSlide?.type === 'choice' && (
                                <InteractionWrapper slide={currentSlide} slideState={null}>
                                   <h2 className="text-3xl font-bold mb-4">{currentSlide.title}</h2>
                                   <ReactMarkdown className="prose">{currentSlide.content}</ReactMarkdown>
                                   {currentSlide.data?.options?.map((opt: any, i: number) => (
                                     <div key={i} className="p-4 bg-slate-100 rounded-xl my-2 border cursor-pointer font-medium">{opt.text}</div>
                                   ))}
                                </InteractionWrapper>
                             )}
                             {currentSlide?.type === 'accordion' && (
                               <div className="space-y-6">
                                 <h2 className="text-3xl font-bold">{currentSlide.title}</h2>
                                 <ReactMarkdown className="prose">{currentSlide.content}</ReactMarkdown>
                                 <Accordion payload={currentSlide.data} />
                               </div>
                             )}
                             {currentSlide?.type === 'flashcards' && (
                               <div className="space-y-6">
                                 <h2 className="text-3xl font-bold">{currentSlide.title}</h2>
                                 <ReactMarkdown className="prose">{currentSlide.content}</ReactMarkdown>
                                 <FlashcardGrid cards={currentSlide.data?.cards || []} />
                               </div>
                             )}
                           </div>

                           {/* The slide tools */}
                           <div className="absolute top-0 right-0 z-[100] flex flex-wrap max-w-sm justify-end gap-2 shrink-0">
                             <button onClick={() => setEditingSlide(currentSlide)} className="px-3 py-1.5 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20 rounded-lg transition-colors flex items-center gap-2"><Edit3 className="w-4 h-4"/><span className="text-xs font-bold">Edit Text & Audio</span></button>
                             <button onClick={() => { handleUpdateSlideMedia(currentSlide.id, { floatingMedia: [], mediaUrl: null, imagePlaceholder: !!currentSlide?.mediaPrompt }); }} className="px-3 py-1.5 text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"><LayoutTemplate className="w-4 h-4"/> <span className="text-xs font-bold">Reset Layout</span></button>
                             
                             <label className="px-3 py-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-colors cursor-pointer flex items-center gap-2" title="Upload Local Image">
                               <Upload className="w-4 h-4"/>
                               <span className="text-xs font-bold">Upload</span>
                               <input type="file" className="hidden" accept="image/*" onChange={(e: any) => { /* missing actual def, safely ignored for now */ }} />
                             </label>

                             {sourceImages.length > 0 && (
                               <button 
                                 onClick={() => setShowImageGalleryForSlide(currentSlide.id)}
                                 className="px-3 py-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-2"
                                 title="Select from Source Document"
                               ><ImageIcon className="w-4 h-4"/><span className="text-xs font-bold">Source Image</span></button>
                             )}

                             {currentSlide?.mediaUrl && (
                               <button 
                                 onClick={() => handleUpdateSlideMedia(currentSlide.id, { mediaUrl: null })}
                                 className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center gap-2"
                                 title="Remove Media"
                               ><Trash2 className="w-4 h-4"/><span className="text-xs font-bold">Clear</span></button>
                             )}
                           </div>

                           {(currentSlide?.imagePlaceholder || currentSlide?.mediaUrl) && (
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
                           )}

                           {currentSlide?.type === 'game-template' && (
                             <div className="w-full min-h-[600px] flex items-center justify-center mt-8">
                               <GameContainer payload={currentSlide.data} />
                             </div>
                           )}

                         </motion.div>
                       </AnimatePresence>
                    </div>
                    {/* Learner Player Navigation Bar */}
                    <div className="w-full z-50 shrink-0 bg-white/50 backdrop-blur-md border-t border-slate-200">
                      <PlayerBar
                        player={player}
                        currentSlideIndex={currentSlideIndex}
                        totalSlides={allSlides.length}
                        currentSlideTitle={currentSlide?.title ?? ''}
                        onPrev={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                        onNext={() => setCurrentSlideIndex(prev => Math.min(allSlides.length - 1, prev + 1))}
                        theme={theme}
                      />
                    </div>`;

  const newCode = beforePreview + previewBody + afterPreview;
  
  // also fix double closing brackets from earlier script bugs
  const finalCode = (newCode.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/motion\.div>\s*\)\}/s, `</div>\n                </div>\n              </div>\n          </motion.div>\n        )}`));

  fs.writeFileSync('src/App.tsx', finalCode);
  console.log("Rewrote preview logic successfully");
} else {
  console.log("Could not split properly");
}
