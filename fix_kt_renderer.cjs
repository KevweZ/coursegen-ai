const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

function replaceCRLF(old, neo, label) {
  const oldCRLF = old.replace(/\n/g, '\r\n');
  if (c.includes(oldCRLF)) { c = c.replace(oldCRLF, neo); console.log('✔', label); return; }
  if (c.includes(old))     { c = c.replace(old, neo);     console.log('✔ LF', label); return; }
  console.error('❌', label);
}

// Fix 1: Split content/key-takeaways/summary into separate handlers
// key-takeaways now uses LearningObjectivesSlide; content & summary use SlideHeader
replaceCRLF(
  `                         {(currentSlide?.type === 'content' || currentSlide?.type === 'key-takeaways' || currentSlide?.type === 'summary') && (
                                 <div className="space-y-4 w-full">
                                   <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                 </div>
                               )}`,
  `                         {currentSlide?.type === 'key-takeaways' && (() => {
                                  const raw: any[] = (currentSlide as any).interactions || (currentSlide as any).data?.objectives || [];
                                  const objectives = raw.length > 0 ? raw : (currentSlide.content || '')
                                    .split(/\\n+/).filter(Boolean)
                                    .map((line: string, i: number) => ({ id: String(i), label: line, content: '' }));
                                  return (
                                    <div className="w-full h-full absolute inset-0">
                                      <LearningObjectivesSlide
                                        title={currentSlide.title}
                                        objectives={objectives}
                                        theme={theme}
                                      />
                                    </div>
                                  );
                               })()}

                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (
                                 <div className="space-y-4 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} />
                                   {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                 </div>
                               )}`,
  'key-takeaways → LearningObjectivesSlide; content/summary → SlideHeader'
);

// Fix 2: Add SlideHeader to accordion and other interaction types
// Find the accordion renderer h2 and replace
replaceCRLF(
  `{currentSlide?.type === 'accordion' && (() => {`,
  `{currentSlide?.type === 'accordion' && (() => {`,
  'accordion (no change needed — header is inside component)'
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('\n✅ done');
