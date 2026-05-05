const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');
let ok = 0;

// ── 1. Imports ─────────────────────────────────────────────────────────────
const imp_old = `import { LearningObjectivesSlide } from './components/player/LearningObjectivesSlide';`;
const imp_new = `import { LearningObjectivesSlide }  from './components/player/LearningObjectivesSlide';
import { CourseObjectivesSlide } from './components/player/CourseObjectivesSlide';
import { PlayerTourSlide }       from './components/player/PlayerTourSlide';`;
if (src.includes(imp_old)) { src = src.replace(imp_old, imp_new); ok++; console.log('✔ 1 imports'); }
else console.error('❌ 1 imports');

// ── 2. FULL_BLEED_TYPES ────────────────────────────────────────────────────
const fbt_old = `['cover', 'title', 'module-cover', 'closing', 'key-takeaways']`;
const fbt_new = `['cover', 'title', 'module-cover', 'closing', 'key-takeaways', 'player-tour', 'course-objectives']`;
if (src.includes(fbt_old)) { src = src.replace(fbt_old, fbt_new); ok++; console.log('✔ 2 FULL_BLEED_TYPES'); }
else console.error('❌ 2 FULL_BLEED_TYPES');

// ── 3. contentSlides flatMap: tag first slide of each module ───────────────
// Single-line approach: replace ...m.slides with tagged variant
const slides_old = `        ...m.slides,\r\n      ])\r\n    : [];`;
const slides_new = `      ].concat(m.slides.map((sl, si) => si===0 && (course as any).learningObjectives?.[moduleIdx] ? {...sl, _moduleObjectives:(course as any).learningObjectives[moduleIdx]} : sl)),\r\n      ]).flatMap(x=>x)\r\n    : [];`;
// Simpler approach — replace the whole flatMap pattern
const fm_old = `course.modules.flatMap((m: any, moduleIdx: number) => [\r\n        {\r\n          id: \`__module-cover-\${moduleIdx + 1}__\`,\r\n          title: m.title || \`Module \${moduleIdx + 1}\`,\r\n          type: 'module-cover' as any,\r\n          content: m.description || '',\r\n          _moduleNumber: moduleIdx + 1,\r\n          _moduleTitle:  m.title || \`Module \${moduleIdx + 1}\`,\r\n        } as Slide,\r\n        ...m.slides,\r\n      ])`;
const fm_new = `course.modules.flatMap((m: any, moduleIdx: number) => {
        const moduleObj = (course as any).learningObjectives?.[moduleIdx];
        const slides = (m.slides as any[]).map((sl: any, si: number) =>
          si === 0 && moduleObj ? { ...sl, _moduleObjectives: moduleObj } : sl
        );
        return [
          {
            id: \`__module-cover-\${moduleIdx + 1}__\`,
            title: m.title || \`Module \${moduleIdx + 1}\`,
            type: 'module-cover' as any,
            content: m.description || '',
            _moduleNumber: moduleIdx + 1,
            _moduleTitle:  m.title || \`Module \${moduleIdx + 1}\`,
          } as Slide,
          ...slides,
        ];
      })`;
if (src.includes(fm_old)) { src = src.replace(fm_old, fm_new); ok++; console.log('✔ 3 flatMap tagging'); }
else console.error('❌ 3 flatMap'); 

// ── 4. allSlides + examIntroIndex ──────────────────────────────────────────
const as_old = `  // Cover slide prepended, not included in TOC (contentSlides)\r\n  const allSlides: Slide[] = course ? [coverSlide, ...contentSlides, ...examVirtualSlides] : [];\r\n  const examIntroIndex   = contentSlides.length + 1; // +1 for cover slide\r\n  const examQIndex       = contentSlides.length + 2;\r\n  const examResultsIndex = contentSlides.length + 3;`;
const as_new = `  // Cover slide + 2 synthetic pre-content slides (Player Tour + Course Objectives)
  const playerTourSlide: Slide = course ? { id: '__player-tour__', title: 'Player Navigation Guide', type: 'player-tour' as any, content: '' } as Slide : null as any;
  const courseObjectivesSlide: Slide = course ? { id: '__course-objectives__', title: 'Course Objectives', type: 'course-objectives' as any, content: '', _objectives: (course as any).learningObjectives || [] } as Slide : null as any;
  const PRE_CONTENT = 3; // cover + player-tour + course-objectives
  const allSlides: Slide[] = course ? [coverSlide, playerTourSlide, courseObjectivesSlide, ...contentSlides, ...examVirtualSlides] : [];
  const examIntroIndex   = contentSlides.length + PRE_CONTENT;
  const examQIndex       = contentSlides.length + PRE_CONTENT + 1;
  const examResultsIndex = contentSlides.length + PRE_CONTENT + 2;`;
if (src.includes(as_old)) { src = src.replace(as_old, as_new); ok++; console.log('✔ 4 allSlides/examIndex'); }
else console.error('❌ 4 allSlides/examIndex');

// ── 5. Add renderers before MODULE COVER and add objectives to content slides
const mc_old = `                               {/* MODULE COVER SLIDE */}\r\n                               {currentSlide?.type === 'module-cover'`;
const mc_new = `                               {/* PLAYER TOUR SLIDE */}
                               {(currentSlide as any)?.type === 'player-tour' && (
                                 <div className="w-full h-full">
                                   <PlayerTourSlide theme={theme} onSkip={() => setCurrentSlideIndex((si: number) => Math.min(allSlides.length - 1, si + 1))} />
                                 </div>
                               )}
                               {/* COURSE OBJECTIVES SLIDE */}
                               {(currentSlide as any)?.type === 'course-objectives' && (
                                 <div className="w-full h-full">
                                   <CourseObjectivesSlide objectives={(currentSlide as any)._objectives || []} theme={theme} />
                                 </div>
                               )}
                               {/* MODULE COVER SLIDE */}
                               {currentSlide?.type === 'module-cover'`;
if (src.includes(mc_old)) { src = src.replace(mc_old, mc_new); ok++; console.log('✔ 5 renderers'); }
else console.error('❌ 5 renderers — mark not found');

// ── 6. Module objectives section in content slide renderer ─────────────────
const cr_old = `                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (\r\n                                 <div className="space-y-4 w-full">\r\n                                   <SlideHeader title={currentSlide.title} theme={theme} />\r\n                                   {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}\r\n                                 </div>\r\n                               )}`;
const cr_new = `                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {
                                 const mo: any = (currentSlide as any)._moduleObjectives;
                                 const accentClr = theme === 'light' ? '#4f46e5' : '#818cf8';
                                 const bgClr     = theme === 'light' ? 'rgba(79,70,229,0.06)' : 'rgba(129,140,248,0.08)';
                                 const textClr   = theme === 'light' ? '#1e293b' : '#e2e8f0';
                                 const subClr    = theme === 'light' ? '#475569' : '#94a3b8';
                                 const terminal  = mo ? (typeof mo === 'string' ? mo : mo.terminalObjective || '') : '';
                                 const enabling: string[] = mo ? (typeof mo === 'string' ? [] : mo.enablingObjectives || []) : [];
                                 return (
                                   <div className="space-y-4 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} />
                                     {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                     {mo && (
                                       <div className="w-full rounded-xl p-5 space-y-3 mt-2" style={{ backgroundColor: bgClr, border: \`1.5px solid \${accentClr}30\` }}>
                                         <p className="text-xs font-black uppercase tracking-widest" style={{ color: accentClr }}>Module Objectives</p>
                                         {terminal && <div className="flex items-start gap-2.5">
                                           <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: \`\${accentClr}22\`, color: accentClr }}>T</span>
                                           <p className="text-sm font-semibold leading-snug" style={{ color: textClr }}>{terminal}</p>
                                         </div>}
                                         {enabling.length > 0 && <div className="ml-7 space-y-1.5">{enabling.map((eo: string, j: number) => (
                                           <div key={j} className="flex items-start gap-2">
                                             <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentClr }} />
                                             <p className="text-xs leading-relaxed" style={{ color: subClr }}>{eo}</p>
                                           </div>
                                         ))}</div>}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}`;
if (src.includes(cr_old)) { src = src.replace(cr_old, cr_new); ok++; console.log('✔ 6 content renderer objectives'); }
else console.error('❌ 6 content renderer — check exact whitespace');

fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log(`\n✅ ${ok}/6 patches applied to App.tsx`);
