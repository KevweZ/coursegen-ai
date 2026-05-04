// patch_slide_designs.cjs — wires all new slide design components into App.tsx
// and updates allSlides to inject module-cover and closing slides
const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

function replace(old, neo, label) {
  // Try CRLF first, then LF
  const oldCRLF = old.replace(/\n/g, '\r\n');
  if (c.includes(oldCRLF)) {
    c = c.replace(oldCRLF, neo);
    console.log('✔', label);
    return;
  }
  if (c.includes(old)) {
    c = c.replace(old, neo);
    console.log('✔ (LF)', label);
    return;
  }
  console.error('❌ NOT FOUND:', label);
  console.error('  first 80 chars:', old.substring(0, 80));
}

// ── 1. Add imports after existing player imports ────────────────────────────
replace(
  `import { PlayerBar } from './components/player/PlayerBar';`,
  `import { PlayerBar } from './components/player/PlayerBar';
import { SlideHeader } from './components/player/SlideHeader';
import { CourseTitleSlide } from './components/player/CourseTitleSlide';
import { ClosingSlide } from './components/player/ClosingSlide';
import { ModuleCoverSlide } from './components/player/ModuleCoverSlide';
import { LearningObjectivesSlide } from './components/player/LearningObjectivesSlide';
import { WheelDiagram } from './components/interactions/WheelDiagram';`,
  'new slide imports'
);

// ── 2. Inject module-cover + closing slides into allSlides ──────────────────
replace(
  `  const contentSlides: Slide[] = course ? course.modules.map((m: any) => m.slides).flat() : [];`,
  `  // Inject module-cover slides: one before the first slide of each module
  const contentSlides: Slide[] = course
    ? course.modules.flatMap((m: any, moduleIdx: number) => [
        {
          id: \`__module-cover-\${moduleIdx + 1}__\`,
          title: m.title || \`Module \${moduleIdx + 1}\`,
          type: 'module-cover' as any,
          content: m.description || '',
          _moduleNumber: moduleIdx + 1,
          _moduleTitle:  m.title || \`Module \${moduleIdx + 1}\`,
        } as Slide,
        ...m.slides,
      ])
    : [];`,
  'contentSlides with module-cover injection'
);

// ── 3. Add closing slide to allSlides (after exam results) ──────────────────
replace(
  `  const examVirtualSlides: Slide[] = examConfig.enabled && contentSlides.length > 0 ? [
    { id: '__exam-intro__',   title: 'Mastery Quiz',   type: 'exam-intro',   content: '' } as Slide,
    { id: '__mastery-exam__', title: 'Quiz Questions', type: 'mastery-exam', content: '' } as Slide,
    { id: '__exam-results__', title: 'Quiz Results',   type: 'exam-results', content: '' } as Slide,
  ] : [];`,
  `  const closingVirtualSlide: Slide = {
    id: '__closing__',
    title: 'Thank You',
    type: 'closing' as any,
    content: '',
  } as Slide;
  const examVirtualSlides: Slide[] = examConfig.enabled && contentSlides.length > 0 ? [
    { id: '__exam-intro__',   title: 'Mastery Quiz',   type: 'exam-intro',   content: '' } as Slide,
    { id: '__mastery-exam__', title: 'Quiz Questions', type: 'mastery-exam', content: '' } as Slide,
    { id: '__exam-results__', title: 'Quiz Results',   type: 'exam-results', content: '' } as Slide,
    closingVirtualSlide,
  ] : [closingVirtualSlide];`,
  'closing slide injection into allSlides'
);

// ── 4. Replace cover/title slide renderer ──────────────────────────────────
// Find the TITLE/COVER renderer block and replace with CourseTitleSlide component
replace(
  `{/* TITLE / COVER SLIDE (cover is the injected slide at index 0) */}
                               {(currentSlide?.type === 'title' || currentSlide?.type === 'cover') && (
                                 <div className="w-full h-full flex flex-col justify-center items-center text-center space-y-6">
                                   <div className={cn('relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-8', theme === 'light' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-indigo-900/40 border-indigo-500/40 text-indigo-300')}>
                                     <Sparkles className="w-3 h-3" />eLearning Course
                                   </div>
                                   <h1 className={cn('relative z-10 text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 max-w-3xl', theme === 'light' ? 'text-slate-900' : 'text-white')}>
                                     {currentSlide.title}
                                   </h1>
                                   {currentSlide.content && (
                                     <div className={cn('relative z-10 prose max-w-2xl mx-auto text-lg', theme !== 'light' ? 'prose-invert' : '')}>
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     </div>
                                   )}
                                   <div className="relative z-10 mt-10 flex items-center gap-4">
                                     <div className={cn('h-px w-16 opacity-40', theme === 'light' ? 'bg-slate-400' : 'bg-slate-500')} />
                                     <span className={cn('text-xs font-bold uppercase tracking-widest opacity-50', theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>Begin Course</span>
                                     <div className={cn('h-px w-16 opacity-40', theme === 'light' ? 'bg-slate-400' : 'bg-slate-500')} />
                                   </div>
                                 </div>
                               )}`,
  `{/* TITLE / COVER SLIDE — redesigned CourseTitleSlide */}
                               {(currentSlide?.type === 'title' || currentSlide?.type === 'cover') && (
                                 <div className="w-full h-full -m-4 md:-m-8" style={{ margin: '-1.5rem -2.5rem' }}>
                                   <CourseTitleSlide
                                     title={currentSlide.title}
                                     description={currentSlide.content || undefined}
                                     coverImage={(currentSlide as any).coverImage || courseBg || undefined}
                                     theme={theme}
                                     isPreviewMode={true}
                                   />
                                 </div>
                               )}`,
  'cover slide renderer'
);

// ── 5. Replace key-takeaways renderer with LearningObjectivesSlide ──────────
replace(
  `{(currentSlide?.type === 'content' || currentSlide?.type === 'key-takeaways' || currentSlide?.type === 'summary') && (
                                  <div className="space-y-4 w-full">
                                    <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                    {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                  </div>
                                )}`,
  `{currentSlide?.type === 'key-takeaways' && (() => {
                                  // Parse objectives from content or interactions
                                  const raw = currentSlide.interactions || currentSlide.data?.objectives || [];
                                  const objectives = raw.length > 0 ? raw : (currentSlide.content || '')
                                    .split(/\\n+/).filter(Boolean)
                                    .map((line: string, i: number) => ({ id: String(i), label: line, content: '' }));
                                  return (
                                    <div className="w-full h-full -mx-6 md:-mx-10 -my-4" style={{ margin: '-1rem -2.5rem' }}>
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
  'key-takeaways + content + summary renderers'
);

// ── 6. Add module-cover renderer ────────────────────────────────────────────
// Insert before the quiz renderer
replace(
  `{/* QUIZ (multiple-choice with submit flow) */}`,
  `{/* MODULE COVER SLIDE */}
                               {currentSlide?.type === 'module-cover' && (
                                 <div className="w-full h-full" style={{ margin: '-1.5rem -2.5rem' }}>
                                   <ModuleCoverSlide
                                     moduleNumber={(currentSlide as any)._moduleNumber || 1}
                                     moduleTitle={(currentSlide as any)._moduleTitle || currentSlide.title}
                                     description={currentSlide.content || undefined}
                                     theme={theme}
                                   />
                                 </div>
                               )}

                               {/* CLOSING SLIDE */}
                               {currentSlide?.type === 'closing' && (
                                 <div className="w-full h-full" style={{ margin: '-1.5rem -2.5rem' }}>
                                   <ClosingSlide
                                     coverImage={(currentSlide as any).coverImage || courseBg || undefined}
                                     theme={theme}
                                   />
                                 </div>
                               )}

                               {/* QUIZ (multiple-choice with submit flow) */}`,
  'module-cover + closing renderers'
);

// ── 7. Add SlideHeader to quiz, accordion, etc. ─────────────────────────────
// Replace inline h2 in the quiz renderer
replace(
  `<h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                    <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                    <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                      <BranchingScenario nodes={normNodes} startNodeId={startId} />`,
  `<SlideHeader title={currentSlide.title} theme={theme} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                        <BranchingScenario nodes={normNodes} startNodeId={startId} />`,
  'SlideHeader in branching renderer'
);

// ── 8. Add wheel-diagram renderer ───────────────────────────────────────────
replace(
  `{currentSlide?.type === 'branching' && (() => {`,
  `{currentSlide?.type === 'wheel-diagram' && (() => {
                                  const wd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  return (
                                    <div className="space-y-4 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div className="w-full" style={{ height: '340px' }}>
                                        <WheelDiagram
                                          centerLabel={wd.centerLabel || currentSlide.title}
                                          centerImage={wd.centerImage}
                                          segments={wd.segments || []}
                                          theme={theme}
                                        />
                                      </div>
                                    </div>
                                  );
                               })()}

                               {currentSlide?.type === 'branching' && (() => {`,
  'wheel-diagram renderer'
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('\n✅ App.tsx patch complete');
