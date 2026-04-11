/**
 * apply_all_changes.cjs
 * Applies all requested enhancements to App.tsx, CourseNavSidebar.tsx, and PlayerPropertiesModal.tsx
 */
const fs = require('fs');

// ── Helper ──────────────────────────────────────────────────────────────────
function applyChange(filePath, searchStr, replaceStr, label) {
  let c = fs.readFileSync(filePath, 'utf8');
  if (!c.includes(searchStr)) {
    console.error(`❌ NOT FOUND [${label}] in ${filePath}`);
    return false;
  }
  c = c.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, c, 'utf8');
  console.log(`✅ ${label}`);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. CourseNavSidebar: Roman → Numbered (1.1, 1.2…)
// ════════════════════════════════════════════════════════════════════════════
let sidebar = fs.readFileSync('src/components/player/CourseNavSidebar.tsx', 'utf8');

// Fix the toRoman function → toNumbered and the render
sidebar = sidebar.replace(
  `function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

export function CourseNavSidebar({ modules, currentSlideIndex, allSlides, onNavigate, theme, tocNumbering = 'icons' }: Props) {`,
  `export function CourseNavSidebar({ modules, currentSlideIndex, allSlides, onNavigate, theme, tocNumbering = 'icons' }: Props) {`
);

// Update the render to use moduleIndex.slideIndex notation
sidebar = sidebar.replace(
  `                  {tocNumbering === 'roman'\n                    ? <span className="text-sm font-black font-serif italic shrink-0 w-6 text-center">{toRoman(globalIdx + 1)}</span>\n                    : <span className="text-base shrink-0">{SLIDE_TYPE_ICON[slide.type] || '\\ud83d\\udcc4'}</span>\n                  }`,
  `                  {tocNumbering === 'numbered'\n                    ? <span className="text-xs font-black shrink-0 w-8 text-right pr-1 opacity-70">{mi + 1}.{si + 1}</span>\n                    : <span className="text-base shrink-0">{SLIDE_TYPE_ICON[slide.type] || '📄'}</span>\n                  }`
);

// The map needs to expose mi and si indices. Find the slide map and add indices.
sidebar = sidebar.replace(
  `            {/* Slides */}\n            {expandedModules.has(mod.id) && mod.slides.map(slide => {`,
  `            {/* Slides */}\n            {expandedModules.has(mod.id) && mod.slides.map((slide, si) => {`
);

// Also need module index. Find the modules map call
sidebar = sidebar.replace(
  `        {modules.map((mod) => (\n          <div key={mod.id} className="mb-1">`,
  `        {modules.map((mod, mi) => (\n          <div key={mod.id} className="mb-1">`
);

fs.writeFileSync('src/components/player/CourseNavSidebar.tsx', sidebar, 'utf8');
console.log('✅ CourseNavSidebar: Roman → Numbered (mi+1.si+1)');

// ════════════════════════════════════════════════════════════════════════════
// 2. PlayerPropertiesModal: Update label + SidebarCol preview + Live preview
// ════════════════════════════════════════════════════════════════════════════
let modal = fs.readFileSync('src/components/builder/PlayerPropertiesModal.tsx', 'utf8');

// Fix the toggle label: 'I II III' Roman → 1.1 1.2 Numbered
modal = modal.replace(
  `                  <span className="font-serif italic font-black">I II III</span> Roman`,
  `                  <span className="font-black text-[10px] tabular-nums">1.1 1.2</span> Numbered`
);

// Fix the SidebarCol to show numbered labels when tocNumbering is numbered
modal = modal.replace(
  `  const SidebarCol = ({ side }: { side: 'left' | 'right' }) => (
    <div
      className={cn('flex flex-col flex-shrink-0 overflow-hidden', sideBg, side === 'left' ? 'border-r' : 'border-l')}
      style={{ width: 110 }}
    >
      <div className={cn('px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-widest border-b', isLight ? 'text-gray-500 border-gray-200' : 'text-slate-500 border-slate-800')}>
        Menu
      </div>
      {sampleSlides.map((s, i) => (
        <div
          key={s}
          className={cn(
            'px-2 py-1 text-[10px] truncate border-l-2 transition-all',
            i === 1
              ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/10'
              : cn('border-transparent', isLight ? 'text-gray-600' : 'text-slate-400')
          )}
        >
          {s}
        </div>
      ))}
    </div>
  );`,
  `  const sampleModuleSlides = [
    { label: 'Introduction', num: '1.1' },
    { label: 'Module 1: Basics', num: '1.2' },
    { label: 'Module 2: Practice', num: '2.1' },
    { label: 'Check', num: '2.2' },
    { label: 'Summary', num: '3.1' },
  ];
  const SidebarCol = ({ side }: { side: 'left' | 'right' }) => (
    <div
      className={cn('flex flex-col flex-shrink-0 overflow-hidden', sideBg, side === 'left' ? 'border-r' : 'border-l')}
      style={{ width: 110 }}
    >
      <div className={cn('px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-widest border-b', isLight ? 'text-gray-500 border-gray-200' : 'text-slate-500 border-slate-800')}>
        Menu
      </div>
      {sampleModuleSlides.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'px-2 py-1 text-[10px] truncate border-l-2 transition-all flex items-center gap-1',
            i === 1
              ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/10'
              : cn('border-transparent', isLight ? 'text-gray-600' : 'text-slate-400')
          )}
        >
          {config.tocNumbering === 'numbered'
            ? <span className="font-black shrink-0 opacity-60">{s.num}</span>
            : null
          }
          <span className="truncate">{s.label}</span>
        </div>
      ))}
    </div>
  );`
);

// Also update the reference to sampleSlides in TOCMenu (uses old sampleSlides array)
modal = modal.replace(
  `  const sampleSlides = ['Introduction', 'Module 1: Basics', 'Module 2: Practice', 'Check', 'Summary'];`,
  `  const sampleSlides = ['Introduction', 'Module 1: Basics', 'Module 2: Practice', 'Check', 'Summary'];
  // sampleModuleSlides defined inside return — needed for SidebarCol only`
);

// Remove the duplicate declaration that will be inside return — actually it's in SidebarCol which is inside component.
// Move sampleModuleSlides outside of SidebarCol to avoid redeclaration warnings by removing the "const sampleModuleSlides..." inside it
// The replacement already puts it before SidebarCol, should be fine.

fs.writeFileSync('src/components/builder/PlayerPropertiesModal.tsx', modal, 'utf8');
console.log('✅ PlayerPropertiesModal: numbered preview + label fix');

// ════════════════════════════════════════════════════════════════════════════
// 3. App.tsx — All changes
// ════════════════════════════════════════════════════════════════════════════
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 3a. Add new state variables
app = app.replace(
  `  // Admin quick-nav\n  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);`,
  `  // Sandbox / Admin dropdowns
  const [sandboxDropdownOpen, setSandboxDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false); // kept for compat
  // Sandbox mode flag (dummy course active)
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  // Sandbox outline (derived from DUMMY_COURSE for outline step)
  const [sandboxOutline, setSandboxOutline] = useState<any>(null);`
);

// 3b. Replace the entire header right-side buttons (Admin dropdown → Sandbox + Admin)
const oldHeaderButtons = `          <div className="flex gap-3 items-center">
            {/* Settings button removed — accessed via Admin → Player Properties */}

            {/* ── Admin Quick-Nav Dropdown ── */}
            <div className="relative">
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 rounded-lg text-indigo-300 font-bold text-sm transition-all"
              >
                <Shield className="w-4 h-4" />
                Admin
                <ChevronDown className={\`w-3 h-3 transition-transform \${adminDropdownOpen ? 'rotate-180' : ''}\`} />
              </button>
              {adminDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[500] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Navigation</p>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <button onClick={() => { setStep('home'); setAdminDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-indigo-500/10 hover:text-white text-sm font-medium transition-all text-left">
                      <FileUp className="w-4 h-4 text-indigo-400" /> Landing Page
                    </button>
                    <button
                      onClick={() => {
                        setStep('details');
                        setAdminDropdownOpen(false);
                        if (!courseTitle) {
                          if (pathway === 'k12') {
                             setCourseTitle('Demo Course: Primary Ecosystems');
                             setCourseDescription('An engaging science unit exploring evaporation, condensation, and precipitation through interactive models.');
                             setLearningObjectives(['Students will identify ecosystem components | I can name parts of an ecosystem', 'Students will map a food chain | I can draw a simple food chain', 'Students will explain human impact | I can tell how people affect nature']);
                          } else {
                             setCourseTitle('Demo Course: Advanced Cybersecurity');
                             setCourseDescription('An AI-generated course covering cybersecurity principles, threat vectors, and incident response strategies.');
                             setLearningObjectives([{ 
                                terminalObjective: 'Identify and respond to common cybersecurity threats effectively using industry-standard frameworks.', 
                                enablingObjectives: ['Identify common cybersecurity threats', 'Apply the NIST framework to risk assessment', 'Respond to security incidents effectively'] 
                             }]);
                          }
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-indigo-500/10 hover:text-white text-sm font-medium transition-all text-left"
                    >
                      <FileText className="w-4 h-4 text-pink-400" /> Course Details
                    </button>
                    <button
                      onClick={() => {
                        if (outlineDraft) { setStep('outline'); setAdminDropdownOpen(false); }
                        else alert('Generate a course outline first from the Course Details page.');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-indigo-500/10 hover:text-white text-sm font-medium transition-all text-left"
                    >
                      <Layers className="w-4 h-4 text-teal-400" /> Course Outline
                    </button>
                    {course && (
                      <button onClick={() => { setStep('preview'); setAdminDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-indigo-500/10 hover:text-white text-sm font-medium transition-all text-left">
                        <Eye className="w-4 h-4 text-emerald-400" /> Course Preview
                      </button>
                    )}
                    <div className="border-t border-slate-800 my-1" />
                    {/* ── Preview Mode (Sandbox) ── */}
                    <button
                      onClick={() => {
                        setCourse(DUMMY_COURSE);
                        setOriginalCourse(DUMMY_COURSE);
                        setCurrentSlideIndex(0);
                        setQuizState({});
                        setTheme('dark');
                        setViewMode('desktop');
                        setFloatingImagesMap({});
                        setCourseBg(null);
                        setStep('preview');
                        setAdminDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-300 text-sm font-medium transition-all text-left"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" /> Preview Mode
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button onClick={() => { setShowPlayerProperties(true); setAdminDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-indigo-500/10 hover:text-white text-sm font-medium transition-all text-left">
                      <Settings2 className="w-4 h-4 text-orange-400" /> Player Properties
                    </button>
                  </div>
                </div>
              )}
              {adminDropdownOpen && <div className="fixed inset-0 z-[599]" onClick={() => setAdminDropdownOpen(false)} />}
            </div>
          </div>`;

const newHeaderButtons = `          <div className="flex gap-3 items-center">

            {/* ── Sandbox Dropdown ── */}
            <div className="relative">
              <button
                onClick={() => { setSandboxDropdownOpen(o => !o); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg text-purple-300 font-bold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Sandbox
                <ChevronDown className={\`w-3 h-3 transition-transform \${sandboxDropdownOpen ? 'rotate-180' : ''}\`} />
              </button>
              {sandboxDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-purple-700/40 rounded-xl shadow-2xl z-[500] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 bg-purple-900/30 border-b border-purple-700/40 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">Sandbox — Dummy Course</p>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {/* Course Outline (sandbox) */}
                    <button
                      onClick={() => {
                        // Build a dummy outline from DUMMY_COURSE for the outline step
                        const dummyOutline = {
                          title: DUMMY_COURSE.title,
                          description: DUMMY_COURSE.description,
                          modules: DUMMY_COURSE.modules.map((mod: any) => ({
                            id: mod.id,
                            title: mod.title,
                            slides: mod.slides.map((s: any) => ({
                              id: s.id,
                              title: s.title,
                              type: s.type,
                              estimatedMinutes: 3,
                            })),
                          })),
                        };
                        setSandboxOutline(dummyOutline);
                        setOutlineDraft(dummyOutline as any);
                        setIsSandboxMode(true);
                        setStep('outline');
                        setSandboxDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 text-sm font-medium transition-all text-left"
                    >
                      <Layers className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="flex-1">Course Outline</span>
                      {step === 'outline' && isSandboxMode && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded-full">● HERE</span>
                      )}
                    </button>
                    {/* Course Preview */}
                    <button
                      onClick={() => {
                        setCourse(DUMMY_COURSE);
                        setOriginalCourse(DUMMY_COURSE);
                        setCurrentSlideIndex(0);
                        setQuizState({});
                        setTheme('dark');
                        setViewMode('desktop');
                        setFloatingImagesMap({});
                        setCourseBg('/eLearning Template Backgrounds/Neutral/blue background coffee books_01.png');
                        setIsSandboxMode(true);
                        setStep('preview');
                        setSandboxDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 text-sm font-medium transition-all text-left"
                    >
                      <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="flex-1">Course Preview</span>
                      {step === 'preview' && isSandboxMode && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded-full">● HERE</span>
                      )}
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    {/* Player Properties */}
                    <button onClick={() => { setShowPlayerProperties(true); setSandboxDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 text-sm font-medium transition-all text-left">
                      <Settings2 className="w-4 h-4 text-orange-400 shrink-0" /> Player Properties
                    </button>
                  </div>
                </div>
              )}
              {sandboxDropdownOpen && <div className="fixed inset-0 z-[599]" onClick={() => setSandboxDropdownOpen(false)} />}
            </div>

            {/* ── Admin Button (no dropdown for now) ── */}
            <button
              onClick={() => { /* Admin panel — reserved for future use */ }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 rounded-lg text-indigo-300 font-bold text-sm transition-all"
              title="Admin panel — coming soon"
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>`;

if (!app.includes(oldHeaderButtons)) {
  console.error('❌ Header buttons block NOT FOUND — check exact whitespace');
} else {
  app = app.replace(oldHeaderButtons, newHeaderButtons);
  console.log('✅ Header: Sandbox + Admin buttons replaced');
}

// 3c. Sandbox outline step: when isSandboxMode, hydrateCourse should just load DUMMY_COURSE ordered
// We need to modify the outline step rendering to intercept the onApprove for sandbox
// Find the outline step rendering
app = app.replace(
  `          {step === 'outline' && outlineDraft && (
             <OutlinePreview initialOutline={outlineDraft} isHydrating={isHydrating} progress={progress} onApprove={hydrateCourse} onCancel={() => setStep('details')} error={error} />
          )}`,
  `          {step === 'outline' && outlineDraft && (
             <OutlinePreview
               initialOutline={outlineDraft}
               isHydrating={isHydrating}
               progress={progress}
               onApprove={isSandboxMode
                 ? (reorderedOutline: any) => {
                     // Sandbox: reorder DUMMY_COURSE slides to match the outline order, no AI
                     const allDummySlides: any[] = [];
                     DUMMY_COURSE.modules.forEach((m: any) => m.slides.forEach((s: any) => allDummySlides.push(s)));
                     const reorderedCourse = {
                       ...DUMMY_COURSE,
                       modules: reorderedOutline.modules.map((mod: any, mi: number) => ({
                         ...DUMMY_COURSE.modules[mi] || DUMMY_COURSE.modules[0],
                         id: mod.id,
                         title: mod.title,
                         slides: mod.slides.map((s: any) => {
                           const found = allDummySlides.find(ds => ds.id === s.id);
                           return found || allDummySlides[0];
                         }),
                       })),
                     };
                     setCourse(reorderedCourse);
                     setOriginalCourse(reorderedCourse);
                     setCurrentSlideIndex(0);
                     setCourseBg('/eLearning Template Backgrounds/Neutral/blue background coffee books_01.png');
                     setStep('preview');
                   }
                 : hydrateCourse
               }
               onCancel={() => {
                 if (isSandboxMode) { setIsSandboxMode(false); setSandboxDropdownOpen(false); setStep('home'); }
                 else setStep('details');
               }}
               error={error}
               sandboxMode={isSandboxMode}
             />
          )}`
);

// 3d. Full-screen mode: make seekbar sticky-bottom + no horizontal scroll + scale text
// Find the full-screen slide frame and the main scroll area
// The issue: in 'full' mode the slide frame has 'w-full h-full' but PlayerBar is outside it
// We need to ensure the PlayerBar in full mode is fixed/sticky at bottom
// Find the main player layout div and add overflow-x-hidden when full
app = app.replace(
  `              {/* ── Body: Sidebar + Main Player Area ── */}
              <div className="flex flex-row flex-1 min-h-0 overflow-hidden">`,
  `              {/* ── Body: Sidebar + Main Player Area ── */}
              <div className={cn("flex flex-row flex-1 overflow-hidden", playerConfig.playerResolution === 'full' ? 'overflow-x-hidden' : 'min-h-0')}>`
);

// Fix full-mode slide frame to be flex-col filling all space with no horizontal overflow
// Find the 'full' resolution case in the slide frame
app = app.replace(
  `                        : playerConfig.playerResolution === 'full'\n                        ? 'w-full h-full'\n                        : 'w-full max-w-5xl mx-auto my-4 h-[calc(100vh-260px)] md:rounded-2xl border border-white/20'`,
  `                        : playerConfig.playerResolution === 'full'\n                        ? 'w-full'\n                        : 'w-full max-w-5xl mx-auto my-4 h-[calc(100vh-260px)] md:rounded-2xl border border-white/20'`
);

// In full mode, make the slide content area not overflow-y-auto but overflow-y-scroll with larger text
// Find the slide content inner div
app = app.replace(
  `                    <div className={cn("flex-1 p-4 md:p-8 pb-4 overflow-y-auto custom-scrollbar w-full",\n                      theme === 'light' ? 'bg-white text-slate-900' : theme === 'unified' ? 'bg-indigo-950 text-slate-100' : 'bg-slate-900 text-white'\n                    )}>`,
  `                    <div className={cn("flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full",\n                      playerConfig.playerResolution === 'full' ? 'p-6 md:p-12 pb-4 text-lg' : 'p-4 md:p-8 pb-4',\n                      theme === 'light' ? 'bg-white text-slate-900' : theme === 'unified' ? 'bg-indigo-950 text-slate-100' : 'bg-slate-900 text-white'\n                    )}>`
);

// Make PlayerBar sticky at bottom in full mode
app = app.replace(
  `                    {/* Learner Player Navigation Bar */}\n                    <div className={cn("w-full z-[100] shrink-0 border-t backdrop-blur-md relative", theme === 'light' ? 'bg-white/80 border-slate-200' : theme === 'unified' ? 'bg-indigo-950 border-indigo-800' : 'bg-slate-900 border-slate-800')}>`,
  `                    {/* Learner Player Navigation Bar — sticky at bottom in full-screen mode */}\n                    <div className={cn(\n                      "w-full z-[100] shrink-0 border-t backdrop-blur-md",\n                      playerConfig.playerResolution === 'full' ? 'sticky bottom-0' : 'relative',\n                      theme === 'light' ? 'bg-white/80 border-slate-200' : theme === 'unified' ? 'bg-indigo-950 border-indigo-800' : 'bg-slate-900 border-slate-800'\n                    )}>`
);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('✅ App.tsx: all changes applied');

console.log('\n🎉 All changes done! Run: npx tsc --noEmit to verify');
