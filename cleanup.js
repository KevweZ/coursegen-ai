import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `                           {currentSlide?.type === 'game-template' && (
                             <div className="w-full min-h-[600px] flex items-center justify-center mt-8">
                               <GameContainer payload={currentSlide.data} />
                             </div>
                           )}
                         </div>
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
                    </div>
                  </div>
                </div>
              </div>
          </motion.div>
        )}
        </AnimatePresence>`;

const replacement = `                           {currentSlide?.type === 'game-template' && (
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
                    </div>
                  </div>
                </div>
          </motion.div>
        )}
        </AnimatePresence>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Cleanup successful");
} else {
  console.error("Cleanup failed - could not find block");
}
