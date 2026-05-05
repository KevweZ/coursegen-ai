const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');
let ok = 0;

// ── 1. Add ModuleOverviewSlide import ────────────────────────────────────────
const imp_old = `import { CourseObjectivesSlide } from './components/player/CourseObjectivesSlide';`;
const imp_new = `import { CourseObjectivesSlide }   from './components/player/CourseObjectivesSlide';
import { ModuleOverviewSlide }    from './components/player/ModuleOverviewSlide';`;
if (src.includes(imp_old)) { src = src.replace(imp_old, imp_new); ok++; console.log('✔ 1 import'); }
else console.error('❌ 1 import not found');

// ── 2. Add module-overview to FULL_BLEED_TYPES ────────────────────────────────
const fbt_old = `'player-tour', 'course-objectives']`;
const fbt_new = `'player-tour', 'course-objectives', 'module-overview']`;
if (src.includes(fbt_old)) { src = src.replace(fbt_old, fbt_new); ok++; console.log('✔ 2 FULL_BLEED_TYPES'); }
else console.error('❌ 2 FULL_BLEED_TYPES');

// ── 3. Replace contentSlides flatMap: inject module-overview, drop _moduleObjectives tagging
const fm_old = `course.modules.flatMap((m: any, moduleIdx: number) => {
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
const fm_new = `course.modules.flatMap((m: any, moduleIdx: number) => {
        const moduleObj = (course as any).learningObjectives?.[moduleIdx];
        const modNum = moduleIdx + 1;
        return [
          // Full-bleed animated module cover (stays as-is)
          {
            id: \`__module-cover-\${modNum}__\`,
            title: m.title || \`Module \${modNum}\`,
            type: 'module-cover' as any,
            content: m.description || '',
            _moduleNumber: modNum,
            _moduleTitle:  m.title || \`Module \${modNum}\`,
          } as Slide,
          // Synthetic Module Overview slide: objectives accordion, full-bleed
          {
            id: \`__module-overview-\${modNum}__\`,
            title: \`Module \${modNum} — Overview\`,
            type: 'module-overview' as any,
            content: m.description || '',
            _moduleNumber: modNum,
            _moduleTitle:  m.title || \`Module \${modNum}\`,
            _objectives: moduleObj ? [moduleObj] : [],
          } as Slide,
          // Real module slides (no _moduleObjectives tagging needed any more)
          ...m.slides,
        ];
      })`;
if (src.includes(fm_old)) { src = src.replace(fm_old, fm_new); ok++; console.log('✔ 3 flatMap updated'); }
else console.error('❌ 3 flatMap not found');

// ── 4. Add module-overview renderer (after course-objectives renderer) ─────────
const renderer_anchor = `{/* MODULE COVER SLIDE */}
                               {currentSlide?.type === 'module-cover'`;
const renderer_new = `{/* MODULE OVERVIEW SLIDE */}
                               {(currentSlide as any)?.type === 'module-overview' && (
                                 <div className="w-full h-full">
                                   <ModuleOverviewSlide
                                     moduleNumber={(currentSlide as any)._moduleNumber || 1}
                                     moduleTitle={(currentSlide as any)._moduleTitle || ''}
                                     description={currentSlide.content || undefined}
                                     objectives={(currentSlide as any)._objectives || []}
                                     theme={theme}
                                   />
                                 </div>
                               )}
                               {/* MODULE COVER SLIDE */}
                               {currentSlide?.type === 'module-cover'`;
if (src.includes(renderer_anchor)) { src = src.replace(renderer_anchor, renderer_new); ok++; console.log('✔ 4 renderer added'); }
else console.error('❌ 4 renderer anchor not found');

// ── 5. Strip the ugly _moduleObjectives section from content slide renderer ────
// Replace the IIFE content renderer with the clean version
const cr_old = `{(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {
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
const cr_new = `{(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (
                                 <div className="space-y-4 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} />
                                   {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                 </div>
                               )}`;
if (src.includes(cr_old)) { src = src.replace(cr_old, cr_new); ok++; console.log('✔ 5 content renderer cleaned'); }
else console.error('❌ 5 content renderer not found');

fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log(`\n✅ ${ok}/5 patches applied to App.tsx`);
