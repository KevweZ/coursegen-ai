import fs from 'fs';

const currentApp = fs.readFileSync('src/App.tsx', 'utf8');

// The file currently has InteractionWrapper at lines 135-163, and then my regex mistakenly replaced the rest up to `Reset Layout`.
// Let's grab everything AFTER `Reset Layout</span></button>` (including the button itself)
const splitToken = `<span className="text-xs font-bold">Reset Layout</span></button>`;
let bottomPart = '';
if (currentApp.includes(splitToken)) {
  const parts = currentApp.split(splitToken);
  bottomPart = parts[parts.length - 1]; // Takes the surviving ending of the application!
} else {
  console.log("Could not find Reset Layout button to split on!");
  process.exit(1);
}

const topPart = `
export default function App() {
  const isScormPlayer = typeof window !== 'undefined' && !!(window as any).__COURSE_DATA__;
  
  const [step, setStep] = useState<any>(isScormPlayer ? 'preview' : 'home');
  const [activeTab, setActiveTab] = useState<'topic' | 'file' | 'url'>('topic');
  const [courseTitle, setCourseTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(isScormPlayer ? (window as any).__COURSE_DATA__ : null);
  const [outlineDraft, setOutlineDraft] = useState<any>(null);
  const [skipOutlineReview, setSkipOutlineReview] = useState(false);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark' | 'unified'>('dark');
  const [courseBg, setCourseBg] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [showImageGalleryForSlide, setShowImageGalleryForSlide] = useState<string | null>(null);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);

  // Course Details State
  const [courseType, setCourseType] = useState<any>('standard');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [slideCount, setSlideCount] = useState(14);
  const [interactionTypes, setInteractionTypes] = useState<string[]>(['choice', 'drag-drop', 'accordion', 'flashcards']);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [includeObjectiveSlides, setIncludeObjectiveSlides] = useState(true);
  const [includeSummarySlides, setIncludeSummarySlides] = useState(true);
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(true);

  // Player Audio/Refs
  const { player } = usePlayer(course?.modules?.map((m: any) => m.slides).flat() || [], {
    currentSlideIndex,
    isMuted: !voiceOverEnabled,
    onSlideComplete: () => {}
  });

  const allSlides = course ? course.modules.map((m: any) => m.slides).flat() : [];
  const currentSlide = allSlides[currentSlideIndex];

  // Set courseBg stably
  useEffect(() => {
    if (course && !courseBg) setCourseBg(getRandomBackgroundForTheme(course.visualTheme));
  }, [course]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPrompt(file.name);
      try {
        const result = await analyzeUploadedFile(file);
        setPrompt(result.recommendedTitle);
        setLearningObjectives(result.learningObjectives);
      } catch (err) {
        console.error("File analysis error:", err);
      }
    }
  };

  const handleStartDetails = () => {
    setStep('details');
  };

  const generateOutline = async () => {
    setIsGenerating(true);
    setProgress(15);
    try {
      const draft = await generateCourseOutline({ prompt, type: courseType, slideCount, interactionTypes });
      setOutlineDraft(draft);
      if (skipOutlineReview) {
        setProgress(45);
        const finalCourse = await hydrateCourseContent(draft);
        setCourse(finalCourse);
        setStep('preview');
      } else {
        setStep('outline');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const hydrateCourse = async () => {
    setIsHydrating(true);
    setProgress(30);
    try {
      const finalCourse = await hydrateCourseContent(outlineDraft);
      setCourse(finalCourse);
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsHydrating(false);
      setProgress(0);
    }
  };

  const handleUpdateSlideMedia = (slideId: string, updates: any) => {
    if (!course) return;
    const newCourse = { ...course };
    for (const mod of newCourse.modules) {
      const slide = mod.slides.find((s: any) => s.id === slideId);
      if (slide) Object.assign(slide, updates);
    }
    setCourse(newCourse);
  };

  const handleUpdateSlide = (updated: Slide) => {
    if (!course) return;
    const newCourse = { ...course };
    for (const mod of newCourse.modules) {
      const idx = mod.slides.findIndex((s: any) => s.id === updated.id);
      if (idx !== -1) {
        mod.slides[idx] = updated;
        break;
      }
    }
    setCourse(newCourse);
    setEditingSlide(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen overflow-hidden transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen transform -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <header className="relative z-50 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 relative group cursor-pointer" onClick={() => setStep('home')}>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all">
              <Zap className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              CourseGEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>
          
          <div className="flex gap-4">
            {course && (
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-300 font-medium">
                <Settings className="w-4 h-4" /> Settings
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div key="home" className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-10rem)] relative z-10">
              <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12 w-full px-6 py-12">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">CourseGEN AI</h1>
                {/* Simplified Input Methods */}
                <div className="px-4 pb-4 pt-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 px-8 py-10 bg-slate-950/60 rounded-xl border-[2px] border-dashed border-indigo-500/50 hover:border-indigo-400 hover:bg-slate-900/80 transition-all cursor-pointer relative group">
                    <input 
                      type="file" 
                      onChange={(e) => {
                         setActiveTab('file');
                         handleFileUpload(e);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      accept=".pdf,.docx,.pptx,.txt"
                    />
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileUp className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </div>
                    <div className="text-center">
                      <span className="text-xl text-white font-bold block mb-1">
                        {uploadedFile ? "File Ready" : "Upload File to Begin"}
                      </span>
                      <span className="text-sm text-indigo-300/70 font-medium group-hover:text-indigo-300 transition-colors">
                        {uploadedFile ? uploadedFile.name : "Drop PDF, Word, or Text files here"}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('file'); handleStartDetails(); }}
                    disabled={!uploadedFile}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 border border-indigo-500/50 h-full"
                  >
                    Next
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div key="details" className="w-full relative z-10 min-h-[calc(100vh-80px)]">
               <div className="max-w-4xl mx-auto space-y-8 pb-32 relative z-10 pt-16 px-6">
                 <button onClick={generateOutline} className="w-full py-6 mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xl hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group">
                   Generate Course
                   <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                 </button>
               </div>
            </motion.div>
          )}

          {step === 'outline' && outlineDraft && (
             <OutlinePreview draft={outlineDraft} isGenerating={isHydrating} onHydrate={hydrateCourse} onRegenerate={generateOutline} onBack={() => setStep('details')} />
          )}

          {step === 'preview' && course && (
            <div className="w-full min-h-screen bg-slate-900 absolute top-0 left-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 z-50 overflow-hidden flex flex-col">
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
                       <div className="w-full space-y-6">
                           {/* Slide Renderer Wrapper */}
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
                    </div>
                    {/* The slide tools inject themselves here */}
                    <div className="absolute top-4 right-4 z-[100] flex flex-wrap max-w-sm justify-end gap-2 shrink-0">
                       <button onClick={() => setEditingSlide(currentSlide)} className="px-3 py-1.5 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20 rounded-lg transition-colors flex items-center gap-2"><Edit3 className="w-4 h-4"/><span className="text-xs font-bold">Edit Text & Audio</span></button>
                       <button onClick={() => { handleUpdateSlideMedia(currentSlide.id, { floatingMedia: [], mediaUrl: null, imagePlaceholder: !!currentSlide?.mediaPrompt }); }} className="px-3 py-1.5 text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"><LayoutTemplate className="w-4 h-4"/> <span className="text-xs font-bold">`;

// BottomPart contains everything from `Reset Layout</span></button>` downwards!
const finalApp = currentApp.substring(0, currentApp.indexOf('const sanitizeMarkdown')) + '\n' + topPart + bottomPart;

fs.writeFileSync('src/App.tsx', finalApp);
