import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Download, 
  Play, 
  Layout, 
  Layers, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Monitor,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  FileText,
  Globe,
  Plus,
  Trash2,
  Wand2,
  Settings2,
  Settings,
  Target,
  ListChecks,
  X,
  FileUp,
  AlertCircle,
  Volume2,
  Image as ImageIcon,
  RotateCw,
  Edit3,
  Gamepad2,
  Trophy,
  Users,
  Dna,
  Lock,
  Grid3X3,
  DollarSign,
  LayoutTemplate,
  Upload,
  Eye,
  Crop,
  Move,
  Mic,
  Volume2 as Volume2Icon,
  Music2,
  Settings2 as PlayerIcon,
  Shield,
  ChevronDown
} from 'lucide-react';
import { 
  Accordion, 
  InteractiveTimeline, 
  SortingActivity, 
  MatchingActivity, 
  DragAndDropActivity, 
  BranchingScenario 
} from '@zomako/elearning-components/dist/elearning-components.es.js';
import { suggestLearningObjectives, generateCourseOutline, hydrateCourseContent, analyzeUploadedFile, FileAnalysisResult, CourseOutlineDraft } from './services/aiService';
import { createScormPackage } from './services/scormService';
import { FlashcardGrid } from './components/FlashcardGrid';
import { OutlinePreview } from './components/builder/OutlinePreview';
import { PlayerPropertiesModal, PlayerConfig, defaultPlayerConfig } from './components/builder/PlayerPropertiesModal';
import { CourseOutline, Slide } from './types/course';
import { extractTextFromFile, extractImagesFromFile, SourceImage } from './lib/fileProcessor';
import { generateGameTemplate } from './services/aiGameService';
import { GameContainer } from './components/game-templates/core/GameContainer';
import { getRandomBackgroundForTheme } from './lib/backgrounds';
import { getPresetOptions, getPresetConfig } from './lib/presetEngine';
import { GameTemplateType } from './types/game';
import { usePlayer } from './lib/usePlayer';
import { PlayerBar } from './components/player/PlayerBar';
import { getRecommendedGames } from './lib/gameEngine';
import { FloatingImageCanvas } from './components/FloatingImageCanvas';
import { FloatingImage } from './types/course';
import TabbedHorizontal from './components/interactions/TabbedContentHorizontal';
import TabbedVertical from './components/interactions/TabbedContentVertical';
import FolderExplorer from './components/interactions/FolderExplorer';
import CarouselPanel from './components/interactions/CarouselPanel';import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

const renderInstructionalText = (children: React.ReactNode, theme: string, isList: boolean = false) => {
  let textToParse = '';
  if (typeof children === 'string') textToParse = children;
  else if (Array.isArray(children) && typeof children[0] === 'string') textToParse = children[0];
  
  if (!textToParse) return null;

  const match = textToParse.match(/^(Describe|Identify|Explain|Understand)[:\s]+(.*)/i);
  if (!match) return null;

  const verb = match[1];
  const rest = match[2];
  const remainingChildren = Array.isArray(children) ? children.slice(1) : [];

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 sm:gap-4 items-start", isList ? "mt-1 mb-2" : "my-4")}>
      <span className={cn(
        "font-bold uppercase tracking-wider text-[0.8rem] mt-1 shrink-0 w-24",
        theme === 'light' ? "text-indigo-700" : "text-indigo-300"
      )}>
        {verb}:
      </span>
      <span className={cn(
        "flex-1 leading-relaxed border-l-2 pl-4 sm:ml-2",
        theme === 'light' ? "text-gray-800 border-indigo-200" : "text-gray-200 border-indigo-500/30"
      )}>
        {rest}
        {remainingChildren}
      </span>
    </div>
  );
};

type AppStep = 'home' | 'details' | 'outline' | 'preview';
type CourseType = 'quick' | 'standard' | 'comprehensive';

const sanitizeContent = (content: string) => {
  return content
    .replace(/^[-*] \*\*.*\*\*:\s*$/gm, '') 
    .replace(/^[-*] \*\*\*\*:\s*/gm, '- ') 
    .replace(/\|\s*$/gm, '') 
    .replace(/\|\s*\|/g, '') 
    .replace(/^(#.*)$/gm, '') 
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const SlideContent = ({ content, theme }: { content: string, theme: string }) => {
  return (
    <ReactMarkdown
      className={cn('prose max-w-none text-lg lg:text-xl leading-relaxed', theme !== 'light' ? 'prose-invert' : '')}
      components={{
        p: ({ node, children, ...props }) => {
          const instructional = renderInstructionalText(children, theme);
          if (instructional) return instructional;
          return <p {...props} className={cn("text-lg mb-4", theme === 'light' ? "text-gray-800" : "text-gray-200")}>{children}</p>;
        },
        li: ({ node, children, ...props }) => {
          const instructional = renderInstructionalText(children, theme, true);
          if (instructional) return <li {...props} className="marker:text-indigo-400">{instructional}</li>;
          return <li {...props} className={cn("marker:text-indigo-400", theme === 'light' ? "text-gray-800" : "text-gray-200")}>{children}</li>;
        },
        ul: ({ node, children, ...props }) => (
          <ul {...props} className="pl-6 space-y-2 lg:list-disc border-l-0 border-indigo-500/20">{children}</ul>
        ),
        ol: ({ node, children, ...props }) => (
          <ol {...props} className="pl-6 space-y-2 list-decimal pb-4">{children}</ol>
        ),
        strong: ({ node, children, ...props }) => (
          <strong {...props} className={cn("font-extrabold", theme === 'light' ? "text-indigo-900" : "text-white")}>{children}</strong>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function App() {
  const isScormPlayer = typeof window !== 'undefined' && !!(window as any).__COURSE_DATA__;
  
  const [step, setStep] = useState<AppStep>(isScormPlayer ? 'preview' : 'home');
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
  const [outlineDraft, setOutlineDraft] = useState<CourseOutlineDraft | null>(null);
  const [skipOutlineReview, setSkipOutlineReview] = useState(false);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark' | 'unified'>('dark');
  const [courseBg, setCourseBg] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [showImageGalleryForSlide, setShowImageGalleryForSlide] = useState<string | null>(null);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);

  // Interaction Previews
  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);
  
  // Player Properties
  const [showPlayerProperties, setShowPlayerProperties] = useState(false);
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(defaultPlayerConfig);
  
  // Edit Drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editDrawerTab, setEditDrawerTab] = useState<'text'|'audio'>('text');

  // Player / Game
  const [quizState, setQuizState] = useState<Record<string, any>>({});
  // Admin quick-nav
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  // Course Details State
  const [pathway, setPathway] = useState<'corporate' | 'k12'>('corporate');
  const [preset, setPreset] = useState<'quick' | 'standard' | 'comprehensive'>('standard');
  const [courseType, setCourseType] = useState<CourseType>('standard');
  // Change-confirmation modals
  const [pendingPathway, setPendingPathway] = useState<'corporate' | 'k12' | null>(null);
  const [pendingPreset, setPendingPreset] = useState<'quick' | 'standard' | 'comprehensive' | null>(null);
  const [courseDescription, setCourseDescription] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [objectiveFormat, setObjectiveFormat] = useState<string>('ABC');
  const [slideCount, setSlideCount] = useState(14);
  const [interactionTypes, setInteractionTypes] = useState<string[]>([]);
  const [gameTemplateIds, setGameTemplateIds] = useState<string[]>([]);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [includeObjectiveSlides, setIncludeObjectiveSlides] = useState(true);
  const [includeSummarySlides, setIncludeSummarySlides] = useState(true);
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(true);
  const [generatedCourseTitle, setGeneratedCourseTitle] = useState('');

  // Player Audio/Refs
  const player = usePlayer();
  const allSlides = course ? course.modules.map((m: any) => m.slides).flat() : [];
  const currentSlide = allSlides[currentSlideIndex];

  useEffect(() => {
    if (currentSlide) {
      player.loadSlide(
        currentSlide.id, 
        currentSlide.audioUrl || null, 
        voiceOverEnabled ? (currentSlide.voiceOverText || currentSlide.content) : null
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide?.id, voiceOverEnabled]);

  // Extract images
  useEffect(() => {
    if (uploadedFile) {
      extractImagesFromFile(uploadedFile).then(imgs => setSourceImages(imgs)).catch(e => console.error(e));
    }
  }, [uploadedFile]);

  // Set courseBg stably
  useEffect(() => {
    if (course && !courseBg) {
      setCourseBg(getRandomBackgroundForTheme(course.visualTheme));
    }
  }, [course]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsAnalyzing(true);
      try {
        const text = await extractTextFromFile(file);
        const result = await analyzeUploadedFile(text, file.name);
        setPrompt(result.title || file.name);
        setCourseTitle(result.title || file.name);
        if (result.summary) setCourseDescription(result.summary);
        if (result.objectives) setLearningObjectives(result.objectives);
        if (result.recommendedObjectiveFormat) setObjectiveFormat(result.recommendedObjectiveFormat as any);
        if (result.recommendedPreset) {
           const rp = result.recommendedPreset as 'quick' | 'standard' | 'comprehensive';
           setPreset(rp);
           const config = getPresetConfig(pathway, rp);
           setSlideCount(config.slideCountTarget);
           setInteractionTypes(config.interactions);
           if (config.objectiveFormat) setObjectiveFormat(config.objectiveFormat === 'k12_ican' ? 'I Can' : config.objectiveFormat);
        }
        setStep('details');
      } catch (err) {
        console.error("File analysis error:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };


  const handleSuggestObjectives = async () => {
    if (!prompt && !courseTitle) return;
    setIsSuggesting(true);
    try {
      const fmt = objectiveFormat === 'I Can' ? 'k12_ican' : (objectiveFormat as 'AB' | 'ABC' | 'ABCD');
      const suggestions = await suggestLearningObjectives(
        courseTitle || prompt, 
        courseDescription || prompt, 
        pathway, 
        preset, 
        fmt,
        learningObjectives.length > 0 ? learningObjectives : undefined
      );
      setLearningObjectives([...new Set([...learningObjectives, ...suggestions])]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };


  const handleStartDetails = () => {
    setStep('details');
  };

  const handlePresetChange = (newPreset: 'quick' | 'standard' | 'comprehensive') => {
    setPreset(newPreset);
    const config = getPresetConfig(pathway, newPreset);
    setSlideCount(config.slideCountTarget);
    setInteractionTypes(config.interactions);
    if (config.objectiveFormat) setObjectiveFormat(config.objectiveFormat === 'k12_ican' ? 'I Can' : config.objectiveFormat);
  };

  const generateOutline = async () => {
    setIsGenerating(true);
    setProgress(15);
    try {
      const draft = await generateCourseOutline(
        prompt, 
        learningObjectives, 
        { 
          courseType, 
          interactionTypes, 
          slideCount,
          includeModuleTitleSlides,
          includeObjectiveSlides,
          gameTemplateId: null
        }
      );
      setOutlineDraft(draft);
      if (skipOutlineReview) {
        setProgress(45);
        const finalCourse = await hydrateCourseContent(draft, prompt, { courseType });
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
    setProgress(20);
    // Animate progress smoothly while AI works
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        const increment = prev < 50 ? 4 : prev < 75 ? 2 : 0.5;
        return Math.min(90, prev + increment);
      });
    }, 600);
    try {
      const finalCourse = await hydrateCourseContent(outlineDraft!, prompt, { courseType });
      clearInterval(progressInterval);
      setProgress(100);
      await new Promise(r => setTimeout(r, 300));
      setCourse(finalCourse);
      setStep('preview');
    } catch (e: any) {
      clearInterval(progressInterval);
      setError(e.message);
    } finally {
      setIsHydrating(false);
      setProgress(0);
    }
  };

  const exportScorm = async () => {
    if (!course) return;
    try {
      const blob = await createScormPackage(course);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.title.replace(/\s+/g, '_')}_SCORM12.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export SCORM', e);
      alert('SCORM generation failed.');
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

  const renderProgressState = () => {
    const isWorking = isGenerating || isHydrating;
    if (!isWorking && !error) return null;
    return (
      <div className="w-full flex-col items-center justify-center p-8 bg-slate-900 rounded-3xl border border-indigo-500/30 text-center animate-in fade-in zoom-in duration-500 mb-8 max-w-4xl mx-auto shadow-2xl">
        {error ? (
          <div className="space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h3 className="text-2xl font-bold text-white">Generation Failed</h3>
            <p className="text-red-400 font-medium max-w-lg mx-auto">{error}</p>
            <button onClick={() => { setError(null); setStep('home'); }} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl mt-4 font-bold transition-all">Start Over</button>
          </div>
        ) : (
          <div className="space-y-8 w-full max-w-xl mx-auto">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
              <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite]" />
              <Wand2 className="w-12 h-12 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                {isGenerating ? 'Structuring Module Flow...' : 'Synthesizing Course Content...'}
              </h3>
              <p className="text-slate-400 text-lg">
                {isGenerating ? 'Analyzing topics and creating progressive learning paths. This usually takes 10-15 seconds.' : 'Generating detailed slide content, interactions, and knowledge checks. This can take up to a minute.'}
              </p>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative overflow-hidden"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-[30deg] animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
            <p className="text-sm font-bold text-indigo-400 font-mono">{progress}% Complete</p>
            
            <style>{`
              @keyframes shimmer {
                0% { transform: translateX(-150%) skewX(-30deg); }
                100% { transform: translateX(250%) skewX(-30deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  };

  // ── Interactive Timeline Preview Component ──
  const TimelinePreviewDemo = () => {
    const [openStep, setOpenStep] = React.useState<number | null>(null);
    const steps = [
      { n: 1, title: 'Preparation', content: 'Establish IR policies, train your teams, and set up communication channels before an incident occurs.', color: 'bg-blue-500', border: 'border-blue-500/50' },
      { n: 2, title: 'Identification', content: 'Detect and determine whether a security incident has actually occurred using monitoring tools and alerts.', color: 'bg-yellow-500', border: 'border-yellow-500/50' },
      { n: 3, title: 'Containment', content: 'Limit the damage and prevent further spread. Short-term containment isolates affected systems.', color: 'bg-orange-500', border: 'border-orange-500/50' },
      { n: 4, title: 'Eradication', content: 'Remove the root cause — eliminate malware, close vulnerabilities, and patch systems.', color: 'bg-red-500', border: 'border-red-500/50' },
      { n: 5, title: 'Recovery', content: 'Restore systems to normal operations and verify they are clean before reconnecting.', color: 'bg-green-500', border: 'border-green-500/50' },
    ];
    return (
      <div className="w-full max-w-2xl">
        <p className="text-white font-bold text-lg mb-1">Incident Response Timeline</p>
        <p className="text-slate-400 text-xs mb-5 font-medium">Click each step to reveal details</p>
        <div className="relative">
          <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500 via-orange-500 to-green-500 opacity-40" />
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenStep(openStep === i ? null : i)}
                  className={`w-full relative flex items-center gap-4 pl-14 pr-4 py-3 rounded-xl border transition-all text-left group ${
                    openStep === i ? `${step.border} bg-slate-800 text-white` : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className={`absolute left-3 w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0`}>{step.n}</div>
                  <span className="font-bold text-sm flex-1">{step.title}</span>
                  <span className="text-slate-500 text-xs group-hover:text-slate-300 transition-colors">{openStep === i ? '▲ Close' : '▼ Details'}</span>
                </button>
                {openStep === i && (
                  <div className={`mt-1 ml-14 p-4 rounded-xl bg-slate-900 border ${step.border} text-slate-300 text-sm leading-relaxed`}>{step.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
          
          <div className="flex gap-3 items-center">
            {course && (
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-300 font-medium">
                <Settings className="w-4 h-4" /> Settings
              </button>
            )}

            {/* ── Admin Quick-Nav Dropdown ── */}
            <div className="relative">
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 rounded-lg text-indigo-300 font-bold text-sm transition-all"
              >
                <Shield className="w-4 h-4" />
                Admin
                <ChevronDown className={`w-3 h-3 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
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
                          setCourseTitle('Demo Course: Advanced Cybersecurity');
                          setCourseDescription('An AI-generated course covering cybersecurity principles, threat vectors, and incident response strategies.');
                          setLearningObjectives(['Identify common cybersecurity threats', 'Apply the NIST framework to risk assessment', 'Respond to security incidents effectively']);
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
                    <button onClick={() => { setShowPlayerProperties(true); setAdminDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-indigo-500/10 hover:text-white text-sm font-medium transition-all text-left">
                      <Settings2 className="w-4 h-4 text-orange-400" /> Player Properties
                    </button>
                  </div>
                </div>
              )}
              {adminDropdownOpen && <div className="fixed inset-0 z-[499]" onClick={() => setAdminDropdownOpen(false)} />}
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div key="home" className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-5rem)] relative z-10 overflow-hidden">
              {/* Background Video */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <video 
                  src="/landing_background_3.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="absolute min-w-full min-h-full object-cover opacity-30 mix-blend-screen scale-105 pointer-events-none"
                />
                <div className="absolute inset-0 bg-slate-900/60 pointer-events-none" />
              </div>

              {isAnalyzing ? (
                 <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8 w-full px-6 py-16 bg-slate-950/80 backdrop-blur-xl rounded-[3rem] border border-indigo-500/30 shadow-2xl">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                      <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin" />
                      <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite]" />
                      <FileText className="w-10 h-10 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Analyzing Document</h3>
                      <p className="text-slate-400 mt-2">Extracting structure, topics, and generating learning objectives...</p>
                    </div>
                 </div>
              ) : (
                <div className="relative z-10 max-w-4xl mx-auto text-center w-full px-6 py-16 bg-slate-950/40 backdrop-blur-md rounded-[3rem] border border-indigo-500/20 shadow-2xl space-y-10 my-8">
                  <div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
                      CourseGEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-extrabold pb-2">AI</span>
                    </h1>
                    <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto">
                      Transform Any Document Into a Complete eLearning Course in Minutes
                    </p>
                  </div>
                  
                  <div className="w-full flex flex-col items-center gap-6 max-w-xl mx-auto">
                    <div className="w-full flex flex-col items-center justify-center gap-4 px-8 py-12 bg-slate-900/80 rounded-2xl border-[2px] border-dashed border-indigo-500/50 hover:border-indigo-400 hover:bg-slate-800/90 transition-all cursor-pointer relative group">
                      <input 
                        type="file" 
                        onChange={(e) => {
                           handleFileUpload(e);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                        accept=".pdf,.docx,.pptx,.txt"
                      />
                      <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                        <FileUp className="w-10 h-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                      </div>
                      <div className="text-center">
                        <span className="text-2xl text-white font-bold block mb-2">
                          {uploadedFile ? "File Ready" : "Upload File to Begin"}
                        </span>
                        <span className="text-base text-indigo-300/70 font-medium group-hover:text-indigo-300 transition-colors">
                          {uploadedFile ? uploadedFile.name : "Drop PDF, Word, or Text files here"}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 mt-2 font-medium">AI-powered authoring that analyzes your content and builds a complete, SCORM-compliant, interactive course — automatically.</p>

                    <button 
                      onClick={() => handleStartDetails()}
                      disabled={!uploadedFile}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-indigo-500/25 border border-indigo-500/50 text-xl mt-4"
                    >
                      Start Configuration
                      <ArrowRight className="w-6 h-6" />
                    </button>
                    
                    <div className="w-full flex items-center gap-6 mt-6 opacity-60 justify-center">
                       <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> SCORM Compliant</span>
                       <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> AI Generated</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div key="details" className="w-full relative z-10 min-h-[calc(100vh-80px)]">
               <div className="max-w-4xl mx-auto space-y-8 pb-32 relative z-10 pt-16 px-6">
                  <div className="flex items-center justify-between mb-8 gap-4">
                    {/* Back nav */}
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-0 cursor-pointer group flex-1" onClick={() => setStep('home')} style={{paddingBottom: 0}}>
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors shrink-0">
                        <ArrowRight className="w-5 h-5 text-slate-400 rotate-180 group-hover:text-indigo-400" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-white flex-1">Course Details</h2>
                    </div>
                    {/* Replace Document button — separate from nav click area */}
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-xl cursor-pointer transition-all shrink-0">
                      <FileUp className="w-4 h-4 text-indigo-400" />
                      Replace Document
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.pptx,.txt"
                        onChange={(e) => { if (e.target.files?.[0]) { setUploadedFile(e.target.files[0]); handleFileUpload(e); } }}
                      />
                    </label>
                  </div>
                  <div className="border-b border-slate-800 mb-8" />

                 {(isGenerating || isHydrating) ? renderProgressState() : (
                   <div className="space-y-6">
                      {/* ── Pathway Change Confirmation Popup ── */}
                      {pendingPathway && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-6">
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-5">
                            <h3 className="text-white font-extrabold text-xl">Change Audience Pathway?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                              Switching to <strong className="text-white">{pendingPathway === 'k12' ? 'K-12 Education' : 'Corporate Training'}</strong> will regenerate your course description and learning objectives to match that audience's specifications.
                            </p>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => setPendingPathway(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all">Cancel</button>
                              <button
                                onClick={async () => {
                                  const p = pendingPathway;
                                  setPendingPathway(null);
                                  setPathway(p);
                                  if (courseTitle || prompt) {
                                    await handleSuggestObjectives();
                                  }
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
                              >Proceed &amp; Regenerate</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Preset Change Confirmation Popup ── */}
                      {pendingPreset && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-6">
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-5">
                            <h3 className="text-white font-extrabold text-xl">Change Complexity Level?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                              Switching complexity will cause the app to regenerate the course description and learning objectives to better reflect the new depth and scope.
                            </p>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => setPendingPreset(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all">Cancel</button>
                              <button
                                onClick={async () => {
                                  const p = pendingPreset;
                                  setPendingPreset(null);
                                  handlePresetChange(p);
                                  if (courseTitle || prompt) {
                                    await handleSuggestObjectives();
                                  }
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all"
                              >Proceed &amp; Regenerate</button>
                            </div>
                          </div>
                        </div>
                      )}

                     {/* Audience Pathway */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between shadow-xl">
                       <div className="flex items-center gap-4 mb-4 sm:mb-0">
                         <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                           <Users className="w-6 h-6 text-orange-400" />
                         </div>
                         <div>
                           <h3 className="text-xl font-bold text-white">Audience Pathway</h3>
                           <p className="text-slate-400 text-sm">Tailor content tone to the target age group.</p>
                         </div>
                       </div>
                       <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                         <button onClick={() => { if (pathway !== 'corporate') setPendingPathway('corporate'); }} className={`flex-1 sm:w-32 py-2 rounded-lg text-sm font-bold transition-all ${pathway === 'corporate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Corporate Training</button>
                         <button onClick={() => { if (pathway !== 'k12') setPendingPathway('k12'); }} className={`flex-1 sm:w-32 py-2 rounded-lg text-sm font-bold transition-all ${pathway === 'k12' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>K-12 Education</button>
                       </div>
                     </div>

                     {/* Complexity Presets */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-900 relative">
                           <div className="flex items-center gap-3 relative z-10">
                             <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center"><Layers className="w-5 h-5 text-teal-400" /></div>
                             <div>
                               <h3 className="text-xl font-bold text-white">Complexity Level</h3>
                               <p className="text-slate-400 text-sm">Auto-configure the depth, slides, and interactivity.</p>
                             </div>
                           </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                           {getPresetOptions(pathway).map(p => (
                             <div key={p.id} onClick={() => { if (preset !== p.id) setPendingPreset(p.id as any); }} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${preset === p.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
                                <h4 className="text-white font-bold text-lg mb-1">{pathway === 'k12' ? p.k12Label : p.label}</h4>
                                <p className="text-slate-400 text-xs mb-3">{p.description}</p>
                                <div className="text-xs font-mono text-indigo-400">{p.slideCountTarget} slides • {p.interactions.length} types</div>
                             </div>
                           ))}
                        </div>
                     </div>

                     {/* Course Topic */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-xl">
                       <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                         <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                           <FileText className="w-5 h-5 text-pink-400" />
                         </div>
                         <div>
                           <h3 className="text-xl font-bold text-white">Course Topic</h3>
                           <p className="text-slate-400 text-sm">Review or manually refine the course title and focus.</p>
                         </div>
                       </div>
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Title</label>
                           <input 
                             value={courseTitle}
                             onChange={e => setCourseTitle(e.target.value)}
                             className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all placeholder-slate-600 font-bold"
                             placeholder="Course Title"
                           />
                         </div>
                         {(courseDescription || prompt) && (
                           <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description / Prompt</label>
                             <textarea 
                               rows={3}
                               value={courseDescription || prompt}
                               onChange={e => {
                                 setCourseDescription(e.target.value);
                                 setPrompt(e.target.value);
                               }}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all placeholder-slate-600 font-medium whitespace-pre-wrap"
                               placeholder="Course description or prompt focus..."
                             />
                           </div>
                         )}
                       </div>
                     </div>

                     {/* Objectives */}
                      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm shadow-xl">
                        <div className="p-6 border-b border-slate-800 flex flex-col gap-4 bg-slate-900 relative overflow-hidden">
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
                          <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                              <Target className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">Learning Objectives</h3>
                              <p className="text-slate-400 text-sm">What learners will achieve upon completion.</p>
                            </div>
                          </div>
                          <div className="relative z-10 flex flex-wrap items-center gap-2">
                            {(pathway === 'corporate' ? ['AB', 'ABC', 'ABCD'] : ['I Can', 'ABC', 'ABCD']).map(fmt => (
                              <button
                                key={fmt}
                                onClick={() => {
                                  if (fmt !== objectiveFormat && learningObjectives.length > 0) {
                                    if (window.confirm(`Optimize current objectives for the ${fmt} format?`)) {
                                      setObjectiveFormat(fmt);
                                      handleSuggestObjectives();
                                    } else {
                                      setObjectiveFormat(fmt);
                                    }
                                  } else {
                                    setObjectiveFormat(fmt);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${objectiveFormat === fmt ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Optimize Objectives button — only when objectives exist (re-optimizes for current format) */}
                        {learningObjectives.length > 0 && (
                          <div className="px-6 pb-4 pt-2 bg-slate-900/50 border-b border-slate-800">
                            <button
                              onClick={handleSuggestObjectives}
                              disabled={isSuggesting || (!prompt && !courseDescription)}
                              className="flex items-center justify-center gap-2 px-6 py-3 w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl font-bold transition-colors border border-purple-500/30 disabled:opacity-50"
                            >
                              {isSuggesting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
                              Optimize Objectives
                            </button>
                          </div>
                        )}
                       <div className="p-6 space-y-3">
                         {learningObjectives.map((obj, i) => (
                           <div key={i} className="flex gap-3 items-start group">
                             <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                             <textarea 
                               rows={2}
                               value={obj} 
                               onChange={(e) => {
                                 const newObjs = [...learningObjectives];
                                 newObjs[i] = e.target.value;
                                 setLearningObjectives(newObjs);
                               }}
                               className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all placeholder-slate-600 font-medium whitespace-pre-wrap resize-none"
                               placeholder="e.g., Understand the core principles of..."
                             />
                             <button onClick={() => setLearningObjectives(learningObjectives.filter((_, idx) => idx !== i))} className="p-2.5 mt-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5"/></button>
                           </div>
                         ))}
                         <button onClick={() => setLearningObjectives([...learningObjectives, ''])} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold px-4 py-2 hover:bg-indigo-500/10 rounded-lg transition-all text-sm"><Plus className="w-4 h-4"/> Add Objective</button>
                       </div>
                     </div>

                     {/* Configuration Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                       <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
                         <div>
                           <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><LayoutTemplate className="w-5 h-5 text-emerald-400" /></div>
                             <h3 className="text-xl font-bold text-white">Course Length</h3>
                           </div>
                           <div className="flex justify-between items-end mb-2">
                             <span className="text-white font-bold">{slideCount} Slides</span>
                             <span className="text-slate-500 text-xs font-bold uppercase">~{Math.round(slideCount * 1.5)} Mins</span>
                           </div>
                           <input type="range" min="3" max="100" value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                           <div className="flex justify-between text-xs font-bold text-slate-500 mt-2 uppercase"><span>Bite-sized</span><span>In-depth (up to 100)</span></div>
                         </div>
                       </div>
                       
                       <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
                         <div>
                           <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center"><Grid3X3 className="w-5 h-5 text-pink-400" /></div>
                             <h3 className="text-xl font-bold text-white">Structure Components</h3>
                           </div>
                           <p className="text-slate-400 text-sm mb-6 pb-6 border-b border-slate-800">Select which automated slides to include.</p>
                           <div className="space-y-4">
                             {[
                               { label: 'Module Title Slides', state: includeModuleTitleSlides, set: setIncludeModuleTitleSlides },
                               { label: 'Objectives Slides', state: includeObjectiveSlides, set: setIncludeObjectiveSlides },
                               { label: 'Knowledge Checks', state: true, set: () => {} },
                               { label: 'Summary/Recap Slides', state: includeSummarySlides, set: setIncludeSummarySlides }
                             ].map((opt, i) => (
                               <label key={i} className={`flex items-center justify-between cursor-pointer group ${opt.label === 'Knowledge Checks' ? 'opacity-80' : ''}`}>
                                 <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{opt.label}</span>
                                 <div className={`w-12 h-6 rounded-full transition-colors relative ${opt.state ? 'bg-pink-500' : 'bg-slate-700'}`}>
                                   <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${opt.state ? 'translate-x-6' : ''}`} />
                                 </div>
                                 <input type="checkbox" className="hidden" checked={opt.state} onChange={(e) => opt.set(e.target.checked)} disabled={opt.label === 'Knowledge Checks'} />
                               </label>
                             ))}
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Previews Modal triggers for interactions */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-900 relative">
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent"></div>
                          <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-blue-400" /></div>
                            <div>
                              <h3 className="text-xl font-bold text-white">Interactive Elements</h3>
                              <p className="text-slate-400 text-sm">Select activity types to include in your course.</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                           <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-6">CLICK TO SELECT • HOVER FOR PREVIEW</p>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             {[
                               { id: 'multiple-choice', label: 'Multiple Choice' },
                               { id: 'multiple-answers', label: 'Multiple Answers' },
                               { id: 'drag-drop', label: 'Drag & Drop' },
                               { id: 'hotspot', label: 'Hotspot' },
                               { id: 'accordion', label: 'Accordion' },
                               { id: 'flashcards', label: 'Flashcards' },
                               { id: 'timeline', label: 'Timeline' },
                               { id: 'sorting', label: 'Sorting' },
                               { id: 'matching', label: 'Matching' },
                               { id: 'drop-targets', label: 'Drop Targets' },
                               { id: 'branching', label: 'Branching' },
                               { id: 'tabbed-horizontal', label: 'Tabs (Horizontal)' },
                               { id: 'tabbed-vertical', label: 'Tabs (Vertical)' },
                               { id: 'folder-explorer', label: 'Folder Explorer' },
                               { id: 'carousel-panel', label: 'Carousel Panel' },
                             ].map(({ id, label }) => {
                                 const isSelected = interactionTypes.includes(id);
                                 return (
                                   <div key={id} className={`relative flex flex-col items-center gap-2 transition-all p-4 rounded-xl border-2 ${isSelected ? 'border-blue-500 bg-blue-500/10 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                                       <div className={`absolute top-2 right-2 cursor-pointer z-20 bg-slate-900 rounded-full p-1 ${isSelected ? 'text-blue-300 hover:text-blue-200' : 'text-slate-400 hover:text-white'}`} onClick={(e) => { e.stopPropagation(); setPreviewModalOption(label); }}>
                                         <Eye className="w-4 h-4"/>
                                       </div>
                                       <button className="absolute inset-0 z-10 w-full h-full" onClick={() => {
                                          if (isSelected) setInteractionTypes(interactionTypes.filter(t => t !== id));
                                          else setInteractionTypes([...interactionTypes, id]);
                                       }} />
                                       <span className={`font-bold text-sm text-center relative z-0 mt-3 ${isSelected ? 'text-blue-200' : ''}`}>{label}</span>
                                   </div>
                                 );
                             })}
                           </div>
                        </div>
                     </div>

                     {/* Gamification grid */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-900 relative">
                           <div className="flex items-center gap-3 relative z-10">
                             <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-orange-400" /></div>
                             <div>
                               <h3 className="text-xl font-bold text-white">Gamification Templates</h3>
                               <p className="text-slate-400 text-sm">Select game activities to include in your course.</p>
                             </div>
                           </div>
                        </div>
                         <div className="p-6">
                           <p className="text-xs text-orange-400 font-bold tracking-widest uppercase mb-5">CLICK TO SELECT • EYE ICON TO PREVIEW</p>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {getRecommendedGames(pathway, preset).map((gt: any) => {
                              const isSelected = gameTemplateIds.includes(gt.id);
                              const NICKNAMES: Record<string, {emoji:string; aka:string}> = {
                                'jeopardy': { emoji: '📺', aka: 'aka Jeopardy!' },
                                'knowledge-board': { emoji: '📺', aka: 'aka Jeopardy!' },
                                'millionaire': { emoji: '💰', aka: "aka Who Wants to Be a Millionaire" },
                                'millionaire-challenge': { emoji: '💰', aka: "aka Who Wants to Be a Millionaire" },
                                'family-feud': { emoji: '👨‍👩‍👧', aka: 'aka Family Feud' },
                                'ranked-survey': { emoji: '👨‍👩‍👧', aka: 'aka Family Feud' },
                                'escape-room': { emoji: '🔒', aka: 'aka Digital Escape Room' },
                                'digital-escape-room': { emoji: '🔒', aka: 'aka Digital Escape Room' },
                                'spin-wheel': { emoji: '🎡', aka: 'aka Spin the Wheel' },
                                'spin-the-wheel': { emoji: '🎡', aka: 'aka Spin the Wheel' },
                                'price-is-right': { emoji: '🏷️', aka: "aka The Price is Right" },
                                'price-estimator': { emoji: '🏷️', aka: "aka The Price is Right" },
                              };
                              const nick = NICKNAMES[gt.id] || { emoji: '🎮', aka: '' };
                              return (
                                <div key={gt.id} className={`relative flex flex-col items-center text-center gap-1.5 p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}>
                                  <div className="absolute top-2 right-2 text-slate-400 hover:text-orange-300 cursor-pointer z-20 bg-slate-900 rounded-full p-1" onClick={(e) => { e.stopPropagation(); setPreviewModalOption(gt.name); }}>
                                    <Eye className="w-4 h-4"/>
                                  </div>
                                  <button className="absolute inset-0 z-10 w-full h-full" onClick={() => {
                                    if (isSelected) setGameTemplateIds(gameTemplateIds.filter(id => id !== gt.id));
                                    else setGameTemplateIds([...gameTemplateIds, gt.id]);
                                  }} />
                                  <span className="text-2xl relative z-0">{nick.emoji}</span>
                                  <span className="font-bold text-sm relative z-0 leading-snug">{gt.name}</span>
                                  {nick.aka && <span className="text-[10px] opacity-50 relative z-0 leading-snug italic">{nick.aka}</span>}
                                </div>
                              );
                            })}
                           </div>
                         </div>
                     </div>

                     {/* Audio & Accessibility Section */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
                       <div className="flex items-center gap-3 mb-5">
                         <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                           <Volume2 className="w-5 h-5 text-emerald-400" />
                         </div>
                         <div>
                           <h3 className="text-xl font-bold text-white">Audio & Accessibility</h3>
                           <p className="text-slate-400 text-sm">Control narration and audio settings for the generated course.</p>
                         </div>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {/* Voice-Over Toggle */}
                         <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                               <Volume2 className="w-4 h-4 text-emerald-400" />
                             </div>
                             <div>
                               <span className="text-slate-200 font-bold block text-sm">Voice-Over Narration</span>
                               <span className="text-slate-500 text-xs">AI reads slide narration aloud</span>
                             </div>
                           </div>
                           <button
                             onClick={() => setVoiceOverEnabled(!voiceOverEnabled)}
                             className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${voiceOverEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                           >
                             <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${voiceOverEnabled ? 'translate-x-6' : ''}`} />
                           </button>
                         </div>
                         {/* Sound Effects Toggle */}
                         <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                               <Gamepad2 className="w-4 h-4 text-purple-400" />
                             </div>
                             <div>
                               <span className="text-slate-200 font-bold block text-sm">Sound Effects</span>
                               <span className="text-slate-500 text-xs">Sounds for interactions & quizzes</span>
                             </div>
                           </div>
                           <button
                             onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
                             className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${soundEffectsEnabled ? 'bg-purple-500' : 'bg-slate-700'}`}
                           >
                             <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${soundEffectsEnabled ? 'translate-x-6' : ''}`} />
                           </button>
                         </div>
                       </div>
                     </div>

                     {/* Footer Actions — Player Properties + Generate */}
                     <div className="flex flex-col sm:flex-row gap-4 mt-8">
                       <button
                         onClick={() => setShowPlayerProperties(true)}
                         className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-slate-700 bg-slate-900 text-slate-300 font-bold text-base hover:border-indigo-500/50 hover:text-white hover:bg-slate-800 transition-all group"
                       >
                         <Settings2 className="w-5 h-5 text-indigo-400 group-hover:rotate-45 transition-transform" />
                         Player Properties
                       </button>
                       <button onClick={generateOutline} className="flex-1 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xl hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group">
                         Generate Course Design
                         <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                       </button>
                     </div>
                   </div>
                 )}
               </div>
            </motion.div>
          )}

          {step === 'outline' && outlineDraft && (
             <OutlinePreview initialOutline={outlineDraft} isHydrating={isHydrating} progress={progress} onApprove={hydrateCourse} onCancel={() => setStep('details')} error={error} />
          )}

          {step === 'preview' && course && (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full min-h-screen bg-slate-900 absolute top-0 left-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 z-50 overflow-hidden flex flex-col">
              <div className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setStep('home')} className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-white font-bold text-lg">{course.title}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   {/* Desktop/Mobile Toggle */}
                   <button onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium">
                     {viewMode === 'desktop' ? <Monitor className="w-4 h-4"/> : <Smartphone className="w-4 h-4"/>}
                     <span className="hidden sm:inline">{viewMode === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                   </button>
                   {/* Theme Toggle */}
                   <button onClick={() => setTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'unified' : 'dark')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium">
                     {theme === 'dark' ? '🌑' : theme === 'light' ? '☀️' : '💜'}
                     <span className="hidden sm:inline capitalize">{theme}</span>
                   </button>
                   {/* Edit Slide */}
                   <button onClick={() => { setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-700 hover:bg-indigo-800/30 text-indigo-300 text-sm font-medium">
                     <Edit3 className="w-4 h-4"/> <span className="hidden sm:inline">Edit Slide</span>
                   </button>
                   {/* Export SCORM */}
                   <button onClick={exportScorm} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
                     <Download className="w-4 h-4" /> Export SCORM
                   </button>
                   {/* Discard button */}
                   <button onClick={() => { setCourse(null); setStep('home'); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-800/60 hover:bg-red-900/20 text-red-400 text-sm font-medium">
                     <X className="w-4 h-4"/> <span className="hidden sm:inline">Discard</span>
                   </button>
                </div>
              </div>
              
              <div className={cn("w-full relative flex flex-col items-center justify-start bg-cover bg-center before:absolute before:inset-0 before:bg-slate-900/50 py-8 px-4 md:p-8 rounded-3xl min-h-[calc(100vh-8rem)]")} style={{ backgroundImage: courseBg ? `url('${courseBg}')` : undefined }}>
                 <div className={cn(`theme-${theme}`, "bg-white/70 backdrop-blur-md shadow-2xl transition-all duration-500 flex flex-col relative z-10 w-full overflow-hidden", viewMode === 'desktop' ? "max-w-5xl h-[85vh] md:rounded-2xl border border-white/30 my-auto" : "max-w-[375px] h-[667px] mt-8 rounded-[3rem] border-[8px] border-gray-800 bg-white/90")}>
                    <div className={cn("flex-1 p-6 md:p-12 pb-8 overflow-y-auto custom-scrollbar w-full", theme === 'light' ? "bg-white/50 text-slate-900" : "bg-slate-900/80 text-white")}>
                       <AnimatePresence mode="wait">
                         <motion.div key={currentSlide?.id || currentSlideIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full relative min-h-full">
                           
                           {/* Dynamic Content Layers */}
                           <div className="w-[120%] h-[120%] absolute -top-[10%] -left-[10%] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                           
                           <div className="relative z-10 w-full flex flex-col md:flex-row gap-8">
                             <div className="flex-1 w-full flex flex-col justify-center min-h-[50vh]">
                               {/* TITLE SLIDE */}
                               {currentSlide?.type === 'title' && (
                                 <div className="w-full h-full flex flex-col justify-center items-center text-center space-y-6">
                                   <div className={cn('relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-8', theme === 'light' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-indigo-900/40 border-indigo-500/40 text-indigo-300')}>
                                     <Sparkles className="w-3 h-3" />eLearning Course
                                   </div>
                                   <h1 className={cn('relative z-10 text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 max-w-3xl', theme === 'light' ? 'text-slate-900' : 'text-white')}>
                                     {currentSlide.title}
                                   </h1>
                                   {currentSlide.content && (
                                     <div className={cn('relative z-10 prose max-w-2xl mx-auto text-lg', theme !== 'light' ? 'prose-invert' : '')}>
                                       <ReactMarkdown>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                     </div>
                                   )}
                                   <div className="relative z-10 mt-10 flex items-center gap-4">
                                     <div className={cn('h-px w-16 opacity-40', theme === 'light' ? 'bg-slate-400' : 'bg-slate-500')} />
                                     <span className={cn('text-xs font-bold uppercase tracking-widest opacity-50', theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>Begin Course</span>
                                     <div className={cn('h-px w-16 opacity-40', theme === 'light' ? 'bg-slate-400' : 'bg-slate-500')} />
                                   </div>
                                 </div>
                               )}

                               {/* CONTENT / KEY-TAKEAWAYS / SUMMARY */}
                               {(currentSlide?.type === 'content' || currentSlide?.type === 'key-takeaways' || currentSlide?.type === 'summary') && (
                                 <div className="space-y-4 w-full">
                                   <h2 className={cn('text-2xl md:text-3xl font-extrabold leading-snug', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                 </div>
                               )}

                               {/* QUIZ (multiple-choice with submit flow) */}
                               {currentSlide?.type === 'quiz' && (() => {
                                 const interactions = currentSlide.interactions || [];
                                 const quiz = interactions[0] || currentSlide.data;
                                 const qKey = currentSlide.id;
                                 const qs = quizState[qKey] || { selectedIdx: null, submitted: false };

                                 if (!quiz || !quiz.options?.length || !quiz.questionText && !quiz.prompt && !quiz.question) return (
                                   <div className={cn('p-6 rounded-xl border', theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-900/20 border-amber-600/30 text-amber-300')}>
                                     <AlertCircle className="w-6 h-6 mb-2" />
                                     <p className="font-bold">This question could not be loaded.</p>
                                     <p className="text-sm mt-1 opacity-80">The AI did not generate valid answer options. Use the Edit button to add content manually, or try regenerating the course.</p>
                                   </div>
                                 );

                                 const correctIdx = quiz.options?.findIndex((o: any) => o.isCorrect || o.correct || o.id === quiz.correctAnswer || o.text === quiz.correctAnswer);
                                 const correctLabel = correctIdx >= 0 ? (quiz.options[correctIdx]?.text || quiz.options[correctIdx]?.label || quiz.options[correctIdx]) : null;
                                 return (
                                   <div className="space-y-5 w-full">
                                     <h2 className={cn('text-2xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     {currentSlide.content && <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>}
                                     <p className={cn('font-bold text-lg', theme === 'light' ? 'text-slate-800' : 'text-slate-100')}>{quiz.questionText || quiz.prompt || quiz.question}</p>
                                     <div className="space-y-2.5 w-full">
                                       {quiz.options.map((opt: any, i: number) => {
                                         const label = opt.text || opt.label || opt;
                                         const isSelected = qs.selectedIdx === i;
                                         const isCorrect = i === correctIdx;
                                         let bg = theme === 'light' ? 'bg-white border-gray-200 text-gray-800 hover:border-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500';
                                         if (qs.submitted) {
                                           if (isCorrect) bg = 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200';
                                           else if (isSelected) bg = 'bg-red-50 border-red-400 text-red-900 dark:bg-red-900/30 dark:text-red-200';
                                         } else if (isSelected) {
                                           bg = theme === 'light' ? 'bg-indigo-50 border-indigo-400 text-indigo-900' : 'bg-indigo-900/30 border-indigo-400 text-indigo-200';
                                         }
                                         return (
                                           <button key={i} disabled={qs.submitted}
                                             onClick={() => setQuizState(s => ({ ...s, [qKey]: { ...qs, selectedIdx: i } }))}
                                             className={cn('w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all font-medium', bg)}
                                           >
                                             <div className={cn('w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center', isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300')}>
                                               {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                             </div>
                                             <span className="flex-1 leading-snug text-sm">{label}</span>
                                             {qs.submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                           </button>
                                         );
                                       })}
                                     </div>
                                     {!qs.submitted ? (
                                       <button
                                         disabled={qs.selectedIdx === null}
                                         onClick={() => setQuizState(s => ({ ...s, [qKey]: { ...qs, submitted: true } }))}
                                         className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all"
                                       >Submit Answer</button>
                                     ) : (
                                       <div className={cn('p-4 rounded-xl font-bold flex flex-col gap-2', qs.selectedIdx === correctIdx ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200')}>
                                         <div className="flex items-center gap-2">
                                           {qs.selectedIdx === correctIdx ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                           <span>{qs.selectedIdx === correctIdx ? 'Correct! Well done.' : 'Incorrect.'}</span>
                                         </div>
                                         {qs.selectedIdx !== correctIdx && correctLabel && (
                                           <p className="text-sm font-medium">✓ Correct answer: <span className="font-bold">{correctLabel}</span></p>
                                         )}
                                         {quiz.feedback && <p className="text-sm font-medium opacity-80">{quiz.feedback}</p>}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}

                               {/* MULTIPLE ANSWERS (multi-select) */}
                               {currentSlide?.type === 'multiple-answers' && (() => {
                                 const quiz = (currentSlide.interactions?.[0]) || currentSlide.data;
                                 const qKey = currentSlide.id + '-ma';
                                 const maState: { selected: number[]; submitted: boolean } = (quizState as any)[qKey] || { selected: [], submitted: false };
                                 if (!quiz?.options?.length) return <p className={cn('text-sm p-4 rounded-xl', theme === 'light' ? 'text-amber-700 bg-amber-50' : 'text-amber-300 bg-amber-900/20')}>Question data missing.</p>;
                                 const correctIndices: number[] = quiz.options.reduce((acc: number[], o: any, i: number) => (o.isCorrect || o.correct) ? [...acc, i] : acc, []);
                                 const isAllCorrect = maState.submitted && maState.selected.length === correctIndices.length && maState.selected.every((i: number) => correctIndices.includes(i));
                                 return (
                                   <div className="space-y-5 w-full">
                                     <h2 className={cn('text-2xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     {currentSlide.content && <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>}
                                     <p className={cn('font-bold text-lg', theme === 'light' ? 'text-slate-800' : 'text-slate-100')}>{quiz.questionText || quiz.prompt || quiz.question}</p>
                                     <p className={cn('text-xs font-bold uppercase tracking-wider', theme === 'light' ? 'text-indigo-600' : 'text-indigo-400')}>Select all correct answers</p>
                                     <div className="space-y-2.5 w-full">
                                       {quiz.options.map((opt: any, i: number) => {
                                         const label = opt.text || opt.label || opt;
                                         const isSelected = maState.selected.includes(i);
                                         const isCorrect = correctIndices.includes(i);
                                         let bg = theme === 'light'
                                           ? 'bg-white border-gray-200 text-gray-800 hover:border-indigo-400'
                                           : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500';
                                         if (maState.submitted) {
                                           if (isCorrect && isSelected) bg = 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200';
                                           else if (isCorrect && !isSelected) bg = 'bg-emerald-50/50 border-emerald-300 text-emerald-700 border-dashed';
                                           else if (!isCorrect && isSelected) bg = 'bg-red-50 border-red-400 text-red-900 dark:bg-red-900/30 dark:text-red-200';
                                         } else if (isSelected) {
                                           bg = theme === 'light' ? 'bg-indigo-50 border-indigo-400 text-indigo-900' : 'bg-indigo-900/30 border-indigo-400 text-indigo-200';
                                         }
                                         return (
                                           <button key={i} disabled={maState.submitted}
                                             onClick={() => {
                                               const next = maState.selected.includes(i) ? maState.selected.filter((x: number) => x !== i) : [...maState.selected, i];
                                               setQuizState((s: any) => ({ ...s, [qKey]: { ...maState, selected: next } }));
                                             }}
                                             className={cn('w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all font-medium', bg)}
                                           >
                                             <div className={cn('w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center', isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300')}>
                                               {isSelected && <div className="w-2.5 h-2.5 bg-white" style={{clipPath:'polygon(20% 50%, 0% 70%, 40% 100%, 100% 20%, 80% 0%, 40% 60%)'}} />}
                                             </div>
                                             <span className="flex-1 leading-snug text-sm">{label}</span>
                                             {maState.submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                           </button>
                                         );
                                       })}
                                     </div>
                                     {!maState.submitted ? (
                                       <button
                                         disabled={maState.selected.length === 0}
                                         onClick={() => setQuizState((s: any) => ({ ...s, [qKey]: { ...maState, submitted: true } }))}
                                         className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all"
                                       >Submit Answers</button>
                                     ) : (
                                       <div className={cn('p-4 rounded-xl font-bold flex flex-col gap-2', isAllCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200')}>
                                         <div className="flex items-center gap-2">
                                           {isAllCorrect ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                           <span>{isAllCorrect ? 'Correct! All answers right.' : 'Not quite — check the highlighted answers.'}</span>
                                         </div>
                                         {quiz.feedback && <p className="text-sm font-medium opacity-80">{quiz.feedback}</p>}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}

                               {/* EXTERNAL COMPONENTS (zomako + interactions) */}
                               {currentSlide?.type === 'drag-drop-activity' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <DragAndDropActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'matching' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <MatchingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'accordion' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <Accordion {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'flashcards' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                   <FlashcardGrid cards={currentSlide.data?.cards || currentSlide.interactions?.[0]?.cards || []} theme={theme} />
                                 </div>
                               )}
                               {currentSlide?.type === 'timeline' && (
                                  <div className="space-y-6 w-full">
                                    <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                    <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                    <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                      <InteractiveTimeline {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                    </div>
                                  </div>
                                )}
                               {currentSlide?.type === 'sorting' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <SortingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'branching' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <BranchingScenario {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}

                               {/* CUSTOM TAB/FOLDER INTERACTIONS */}
                               {currentSlide?.type === 'tabbed-horizontal' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <TabbedHorizontal tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'tabbed-vertical' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <TabbedVertical tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'folder-explorer' && (
                                  <div className="space-y-6 w-full">
                                    <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                    <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                    <div className={cn('overflow-visible', theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                      <FolderExplorer items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />
                                    </div>
                                  </div>
                                )}
                               {currentSlide?.type === 'carousel-panel' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <CarouselPanel cards={currentSlide.data?.cards || currentSlide.data?.items || currentSlide.interactions?.[0]?.cards || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}

                               {/* GAME TEMPLATES */}
                               {currentSlide?.type === 'game-template' && (
                                 <div className="w-full min-h-[600px] flex items-center justify-center mt-8">
                                   <GameContainer payload={currentSlide.data} />
                                 </div>
                               )}

                               {/* ANY UNHANDLED GENERIC INTERACTION */}
                               {['hotspot', 'drop-targets', 'memory-match'].includes(currentSlide?.type) && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <ReactMarkdown className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}>{sanitizeContent(currentSlide.content)}</ReactMarkdown>
                                     <div className="p-8 border-2 border-dashed border-indigo-400/50 bg-indigo-500/10 rounded-2xl text-center">
                                       <Gamepad2 className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
                                       <p className="text-xl font-bold text-indigo-300">[{currentSlide.type}] interaction is under construction.</p>
                                     </div>
                                  </div>
                               )}
                             </div>

                             {currentSlide?.floatingMedia && currentSlide.floatingMedia.length > 0 && viewMode === 'desktop' && (
                               <div className="hidden md:block w-[40%] max-w-[500px] shrink-0 pointer-events-none z-[60]">
                                 <FloatingImageCanvas isAuthoring={false} onChange={() => {}} onRemove={() => {}} images={currentSlide.floatingMedia} />
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

                         </motion.div>
                       </AnimatePresence>
                    </div>
                    {/* Learner Player Navigation Bar */}
                    <div className={cn("w-full z-[100] shrink-0 border-t backdrop-blur-md relative", theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900 border-slate-800')}>
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
        </AnimatePresence>

        {/* Source Image Gallery Modal */}
        <AnimatePresence>
          {showImageGalleryForSlide && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden border border-slate-700 flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="text-indigo-400">Source Document Images</span>
                    </h3>
                  </div>
                  <button onClick={() => setShowImageGalleryForSlide(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">Close</button>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sourceImages.map((img: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        handleUpdateSlideMedia(showImageGalleryForSlide, { mediaUrl: img.url, imagePlaceholder: false });
                        setShowImageGalleryForSlide(null);
                      }}
                      className="aspect-video bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-indigo-500 transition-all border border-slate-700 group relative"
                    >
                      <img src={img.url} alt="Source Document Extracted" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Right Slide-In Edit Drawer ─── */}
        <AnimatePresence>
          {editingSlide && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
                onClick={() => setEditingSlide(null)}
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl z-[120] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/60 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <Edit3 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h3 className="text-white font-extrabold text-base">Edit Slide</h3>
                  </div>
                  <button onClick={() => setEditingSlide(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 flex-shrink-0">
                  {[
                    { id: 'text', icon: '✏', label: 'Edit Text', activeColor: 'border-indigo-500 text-indigo-300 bg-indigo-500/10' },
                    { id: 'audio', icon: '🎤', label: 'Audio / Narration', activeColor: 'border-emerald-500 text-emerald-300 bg-emerald-500/10' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setEditDrawerTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-all ${editDrawerTab === tab.id ? tab.activeColor : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                      <span>{tab.icon}</span> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {editDrawerTab === 'text' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Slide Title</label>
                        <input
                          type="text"
                          value={editingSlide.title || ''}
                          onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                          placeholder="Slide title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>On-Screen Text <span className="normal-case font-normal text-slate-600">(Markdown supported)</span></span>
                          <span className="text-slate-600 normal-case font-normal">{(editingSlide.content || '').length} chars</span>
                        </label>
                        <textarea
                          rows={10}
                          value={editingSlide.content || ''}
                          onChange={(e) => setEditingSlide({ ...editingSlide, content: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all font-medium resize-none text-sm leading-relaxed"
                          placeholder="Slide content... Markdown is supported.&#10;&#10;Use **bold**, *italic*, - bullet points, etc."
                        />
                      </div>
                    </>
                  )}

                  {editDrawerTab === 'audio' && (
                    <>
                      <div className="p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-xl text-xs text-emerald-300">
                        <strong>ISD Best Practice:</strong> Narration should <em>expand</em> on what's on screen — never read line-by-line. Aim for conversational, explanatory language.
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>Audio Narration Script</span>
                          <span className={`normal-case font-normal ${voiceOverEnabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {voiceOverEnabled ? '🔊 Voice-Over Enabled' : '🔇 Voice-Over Off'}
                          </span>
                        </label>
                        <textarea
                          rows={8}
                          value={editingSlide.voiceOverText || ''}
                          onChange={(e) => setEditingSlide({ ...editingSlide, voiceOverText: e.target.value })}
                          className="w-full bg-slate-950 border border-emerald-700/40 rounded-xl px-4 py-3 text-emerald-100 focus:border-emerald-500 outline-none transition-all font-medium resize-none text-sm leading-relaxed"
                          placeholder="Write the narration script here. The AI voice will read this text while the slide is displayed..."
                        />
                        {(() => {
                          const words = (editingSlide.voiceOverText || '').split(/\s+/).filter(Boolean).length;
                          const secs = Math.round((words / 130) * 60);
                          const mins = Math.floor(secs / 60);
                          const remainSecs = secs % 60;
                          return (
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>{words} words</span>
                              <span>•</span>
                              <span>~{mins > 0 ? `${mins}m ` : ''}{remainSecs}s read time @ 130 wpm</span>
                            </div>
                          );
                        })()}
                      </div>
                      {/* Audio URL if available */}
                      {editingSlide.audioUrl && (
                        <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                          <p className="text-xs text-slate-400 font-bold mb-1">Current Audio File</p>
                          <p className="text-xs text-emerald-400 break-all font-mono">{editingSlide.audioUrl}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/40 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setEditingSlide(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (course && editingSlide) {
                        const updatedModules = course.modules.map((m: any) => ({
                          ...m,
                          slides: m.slides.map((s: any) => s.id === editingSlide.id ? editingSlide : s)
                        }));
                        setCourse({ ...course, modules: updatedModules });
                      }
                      setEditingSlide(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>


        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && course && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[130] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Course Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full">Close</button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visual Theme</h4>
                    <div className="grid grid-cols-3 gap-2">
                       {['light', 'dark', 'unified'].map((t) => (
                         <button key={t} onClick={() => setTheme(t as any)} className={`py-2 rounded-lg text-sm font-bold border transition-all ${theme === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                           {t.charAt(0).toUpperCase() + t.slice(1)}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 flex justify-end">
                  <button onClick={() => setShowSettings(false)} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">Done</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ★ Player Properties Modal ★ */}
        <AnimatePresence>
          {showPlayerProperties && (
            <PlayerPropertiesModal
              config={playerConfig}
              onChange={(cfg) => setPlayerConfig(cfg)}
              onClose={() => setShowPlayerProperties(false)}
            />
          )}
        </AnimatePresence>

        {/* Interaction Preview Modal */}

        <AnimatePresence>
          {previewModalOption && (
             <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
               >
                 <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 block">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-indigo-400" />
                       </div>
                       <h3 className="font-bold text-white text-lg">Preview: {previewModalOption}</h3>
                    </div>
                    <button onClick={() => setPreviewModalOption(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-8 bg-slate-900 custom-scrollbar theme-dark InteractionPreviewBodyWrapper">
                     <div className="w-full min-h-[420px] flex flex-wrap items-start justify-center gap-6 py-6 px-2">
                         {previewModalOption === 'Multiple Choice' && (
                           <div className="w-full max-w-lg">
                              <div className="space-y-4 w-full">
                                <p className="font-bold text-lg text-white mb-2">Which of the following is a primary benefit of microlearning?</p>
                                {[
                                  { id: 'a', text: 'Higher cognitive load per session' },
                                  { id: 'b', text: 'Focused, bite-sized content targeting one concept at a time', correct: true },
                                  { id: 'c', text: 'Replaces all formal training programs entirely' },
                                  { id: 'd', text: 'Requires no assessment or feedback loops' }
                                ].map((opt, i) => (
                                  <button key={i} className={`w-full text-left p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${(opt as any).correct ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-500'}`}>
                                     <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${(opt as any).correct ? 'border-indigo-500 bg-indigo-500' : 'border-slate-500'}`}>
                                       {(opt as any).correct && <div className="w-2 h-2 bg-white rounded-full" />}
                                     </div>
                                     <span className="font-medium text-sm">{opt.text}</span>
                                  </button>
                                ))}
                              </div>
                              <div className="mt-4"><button className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm w-full transition-colors">Submit Answer</button></div>
                           </div>
                         )}
                         {previewModalOption === 'Multiple Answers' && <MultipleAnswersPreviewDemo />}
                         {previewModalOption === 'Drag & Drop' && (
                           <div className="w-full max-w-2xl space-y-4">
                             <p className="text-white font-bold text-lg">Classify each item by dragging it to the correct zone:</p>
                             <div className="flex flex-wrap gap-3 p-4 bg-slate-800 rounded-xl border border-slate-700 mb-2">
                               <span className="text-xs text-slate-400 font-bold uppercase w-full mb-1">Items to classify:</span>
                               {['Social Security Number','Public Press Release','Employee Salary Data','Marketing Brochure'].map(item => (
                                 <div key={item} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold cursor-grab shadow-lg">{item}</div>
                               ))}
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               {[{label:'🔒 Confidential', color:'border-red-500/50 bg-red-500/10'},{label:'📢 Public', color:'border-green-500/50 bg-green-500/10'}].map(zone => (
                                 <div key={zone.label} className={`p-6 rounded-xl border-2 border-dashed ${zone.color} min-h-[100px] flex items-center justify-center text-slate-300 font-bold`}>{zone.label}</div>
                               ))}
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Hotspot' && (
                           <div className="w-full max-w-xl">
                             <p className="text-white font-bold text-lg mb-4">Click numbered hotspots to explore each part:</p>
                             <div className="relative w-full h-[300px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
                               <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-48 h-48 bg-indigo-500/10 rounded-full border border-indigo-500/30 flex items-center justify-center">
                                   <div className="w-28 h-28 bg-indigo-500/20 rounded-full border border-indigo-500/40 flex items-center justify-center">
                                     <div className="w-14 h-14 bg-indigo-500/40 rounded-full border border-indigo-500/60 flex items-center justify-center text-indigo-300 font-bold text-xs">Core</div>
                                   </div>
                                 </div>
                               </div>
                               {([{x:'15%',y:'20%',n:1,label:'Outer Layer'},{x:'70%',y:'15%',n:2,label:'Data Flow'},{x:'80%',y:'65%',n:3,label:'Security Zone'},{x:'20%',y:'70%',n:4,label:'Access Control'}] as any[]).map((dot: any) => (
                                 <div key={dot.n} className="absolute group cursor-pointer" style={{left:dot.x, top:dot.y}}>
                                   <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/50 animate-pulse group-hover:scale-110 transition-transform">{dot.n}</div>
                                   <div className="absolute left-10 top-0 bg-slate-900 border border-indigo-500/50 text-white text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">{dot.label}</div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Accordion' && (
                           <div className="w-full max-w-2xl space-y-2">
                             <p className="text-white font-bold text-lg mb-4">Security Principles — click to expand:</p>
                             {([
                               {title:'🔒 Confidentiality', content:'Ensuring only authorized parties can access sensitive information. Implemented through encryption, access controls, and need-to-know policies.', open:true},
                               {title:'✅ Integrity', content:'Safeguarding the accuracy and completeness of data. Prevents unauthorized modification.'},
                               {title:'⚡ Availability', content:'Ensuring systems and data are accessible when needed by authorized users.'}
                             ] as any[]).map((item: any, i: number) => (
                               <div key={i} className="rounded-xl overflow-hidden border border-slate-700">
                                 <div className={item.open ? 'bg-indigo-600 text-white p-4 font-bold flex items-center justify-between' : 'bg-slate-800 text-slate-300 p-4 font-bold flex items-center justify-between hover:bg-slate-750'}>
                                   <span>{item.title}</span><span className="text-lg">{item.open ? '−' : '+'}</span>
                                 </div>
                                 {item.open && <div className="bg-slate-800/50 p-4 text-slate-300 text-sm leading-relaxed">{item.content}</div>}
                               </div>
                             ))}
                           </div>
                         )}
                         {previewModalOption === 'Flashcards' && (
                           <div className="w-full max-w-3xl">
                              <FlashcardGrid cards={[
                                 { front: 'What is phishing?', back: 'A social engineering attack using disguised messages to steal credentials or spread malware.' },
                                 { front: 'What is multi-factor authentication?', back: 'A security method requiring two or more verification factors: something you know, have, or are.' },
                                 { front: 'What does "need-to-know" principle mean?', back: 'Limiting access to sensitive information only to those who need it to perform their job.' }
                              ]} theme="unified" />
                           </div>
                         )}
                         {previewModalOption === 'Matching' && (
                            <div className="w-full max-w-2xl">
                              <p className="text-white font-bold text-lg mb-4">Match each term to its definition:</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Terms</p>
                                  {['Phishing','Malware','Ransomware','Zero-day'].map(term => (
                                    <div key={term} className="p-3 bg-indigo-600 rounded-xl text-white font-bold text-sm text-center cursor-pointer hover:bg-indigo-500 transition-colors">{term}</div>
                                  ))}
                                </div>
                                <div className="space-y-3">
                                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Definitions</p>
                                  {['Malicious code targeting systems','Deceptive messages to steal credentials','Encrypts files and demands payment','Exploit before patch is available'].map(def => (
                                    <div key={def} className="p-3 bg-purple-600/30 border border-purple-500/40 rounded-xl text-slate-300 text-sm cursor-pointer hover:border-purple-400 transition-colors">{def}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {previewModalOption === 'Timeline' && (
                            <TimelinePreviewDemo />
                          )}
                         {previewModalOption === 'Sorting' && (
                           <div className="w-full max-w-md">
                             <p className="text-white font-bold text-lg mb-4">Drag items into the correct order (Bloom's Taxonomy):</p>
                             <div className="space-y-2">
                               {['Remember','Understand','Apply','Analyze','Evaluate','Create'].map((level, i) => (
                                 <div key={level} className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl cursor-grab hover:border-indigo-500 transition-colors">
                                   <span className="text-slate-500 font-bold w-6 text-center">⠿</span>
                                   <span className="text-white font-medium text-sm">{level}</span>
                                   <span className="ml-auto text-xs text-indigo-400 font-bold">Level {i+1}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Drop Targets' && (
                           <div className="w-full max-w-2xl">
                             <p className="text-white font-bold text-lg mb-4">Drop each regulation into the correct compliance category:</p>
                             <div className="flex flex-wrap gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-4">
                               {['HIPAA','GDPR','SOX','PCI-DSS','FERPA'].map(item => (
                                 <div key={item} className="px-3 py-2 bg-indigo-600 rounded-lg text-white text-sm font-bold cursor-grab shadow-md">{item}</div>
                               ))}
                             </div>
                             <div className="grid grid-cols-3 gap-3">
                               {([{label:'Healthcare',icon:'🏥'},{label:'Financial',icon:'💰'},{label:'Education',icon:'🎓'}] as any[]).map((zone: any) => (
                                 <div key={zone.label} className={`p-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 min-h-[100px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 transition-colors`}>
                                   <span className="text-2xl">{zone.icon}</span>
                                   <span className="text-xs font-bold uppercase">{zone.label}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Branching' && (
                           <div className="w-full max-w-2xl">
                             <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-4">
                               <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">📖 Scenario</p>
                               <p className="text-white font-bold text-lg leading-snug">You receive an urgent email from your CEO requesting an immediate $50,000 wire transfer. What do you do?</p>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="p-4 bg-red-600/20 border-2 border-red-500/50 rounded-xl hover:border-red-400 cursor-pointer transition-all text-center">
                                 <p className="text-white font-bold mb-1">⚠️ Wire the funds immediately</p>
                                 <p className="text-red-400 text-xs mt-2">Outcome: Successful phishing attack — $50K lost</p>
                               </div>
                               <div className="p-4 bg-green-600/20 border-2 border-green-500/50 rounded-xl hover:border-green-400 cursor-pointer transition-all text-center">
                                 <p className="text-white font-bold mb-1">✅ Verify via direct phone call first</p>
                                 <p className="text-green-400 text-xs mt-2">Outcome: Attack prevented — Incident reported</p>
                               </div>
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Tabs (Horizontal)' && (
                            <div className="w-full max-w-2xl">
                              <TabbedHorizontal tabs={[
                                { id: '1', label: 'Overview', content: 'Welcome to this interactive learning module. Use the tabs to navigate between sections. Each section builds on the previous one to support progressive mastery.' },
                                { id: '2', label: 'Key Concepts', content: 'This section covers the essential principles and frameworks. Take time to understand each before moving on.' },
                                { id: '3', label: 'Practice', content: 'Apply what you have learned through real-world scenarios and hands-on exercises.' },
                                { id: '4', label: 'Summary', content: 'Review the key takeaways from this module and test your knowledge with a quick knowledge check.' },
                              ]} />
                            </div>
                         )}
                         {previewModalOption === 'Tabs (Vertical)' && (
                            <div className="w-full max-w-2xl">
                              <TabbedVertical tabs={[
                                { id: '1', label: 'Introduction', icon: '📖', content: 'This section introduces the core framework. Use the vertical navigation on the left to jump between areas. Each tab covers a distinct concept.' },
                                { id: '2', label: 'Core Skills', icon: '⚡', content: 'These are the essential skills needed for mastery. Review each carefully and take notes on areas where you may need practice.' },
                                { id: '3', label: 'Application', icon: '🔧', content: 'Apply the concepts through real-world scenarios. The exercises here reinforce your understanding with practical examples.' },
                                { id: '4', label: 'Assessment', icon: '✅', content: 'Test your knowledge with a comprehensive review. Aim for 80% or above to demonstrate topic mastery.' },
                              ]} />
                            </div>
                         )}
                         {previewModalOption === 'Folder Explorer' && (
                             <div className="w-full max-w-2xl overflow-visible">
                               <FolderExplorer folderLabel="Department Policies" items={[
                                 { id: 'f1', title: 'HR Policies', previewText: 'Human Resources', content: 'Updated remote work guidelines effective Q2.\n\nCore hours: 10AM - 3PM EST\nPTO accrual: 1.5 days/month\nAnnual carry-over: up to 5 days' },
                                 { id: 'f2', title: 'IT Security', previewText: 'Technology', content: 'Password policy: Minimum 12 characters, must include uppercase, number, and symbol.\n\nMFA required for all corporate accounts.\nVPN required for remote access.' },
                                 { id: 'f3', title: 'Finance', previewText: 'Compliance', content: 'Expense reimbursement policy: Submit within 30 days of expense.\n\nRequires manager approval for amounts over $500.\nReceipts required for all items over $25.' },
                                 { id: 'f4', title: 'Legal', previewText: 'Contracts', content: 'All external contracts must be reviewed by legal counsel before signing. NDAs are required for all vendor relationships.' },
                               ]} />
                             </div>
                          )}
                         {previewModalOption === 'Carousel Panel' && (
                            <div className="w-full max-w-2xl">
                              <CarouselPanel cards={[
                                { id: 'c1', label: 'Discover', description: 'Gather requirements, understand learner needs, and analyze existing content to identify key learning gaps.', color: '#6366f1', expandedContent: 'During the discovery phase, we use surveys, interviews, and performance data to build a clear picture of what learners already know and what they need to learn.' },
                                { id: 'c2', label: 'Design', description: 'Develop the instructional design blueprint including objectives, module structure, and interaction types.', color: '#ec4899', expandedContent: 'In the design phase, we create storyboards, wireframes, and learning maps that guide the content authoring process.' },
                                { id: 'c3', label: 'Develop', description: 'Build the actual course content, interactions, assessments, and media elements.', color: '#f59e0b', expandedContent: 'Development transforms the design documents into a fully functional eLearning experience using tools like CourseGEN AI.' },
                                { id: 'c4', label: 'Deliver', description: 'Deploy the course to your LMS and roll it out to your learner audience.', color: '#10b981', expandedContent: 'During delivery, we ensure SCORM compliance, LMS compatibility, and learner access before launch.' },
                              ]} />
                            </div>
                         )}

                         {/* ===== GAMIFICATION TEMPLATE PREVIEWS ===== */}
                         {(previewModalOption === 'Knowledge Board' || previewModalOption === 'Knowledge Board (Jeopardy)') && (
                           <div className="w-full max-w-3xl">
                             <p className="text-indigo-400 font-black text-2xl text-center mb-6 tracking-wider">KNOWLEDGE BOARD</p>
                             <div className="grid grid-cols-4 gap-2">
                               {['Security','Privacy','Compliance','Ethics'].map(cat => (
                                 <div key={cat} className="bg-indigo-800 text-white text-center p-3 rounded-t-lg font-bold text-sm">{cat}</div>
                               ))}
                               {[100,200,300].flatMap(pts => ['Security','Privacy','Compliance','Ethics'].map(cat => (
                                  <div key={String(cat)+pts} className="bg-indigo-700 hover:bg-indigo-600 border border-indigo-600 text-yellow-300 font-black text-xl text-center p-4 rounded-lg cursor-pointer transition-all">{'$' + pts}</div>
                               )))}
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Millionaire Challenge' && (
                           <div className="w-full max-w-2xl">
                             <div className="bg-gradient-to-b from-blue-900 to-blue-950 rounded-2xl p-6 border border-blue-700">
                               <p className="text-yellow-400 font-bold text-xs uppercase tracking-widest text-center mb-4">Question 3 of 15 — $1,000</p>
                               <p className="text-white font-bold text-xl text-center mb-6">Which regulation governs healthcare data privacy in the United States?</p>
                               <div className="grid grid-cols-2 gap-3">
                                 {[{l:'A',t:'GDPR'},{l:'B',t:'HIPAA'},{l:'C',t:'SOX'},{l:'D',t:'FERPA'}].map(opt => (
                                   <div key={opt.l} className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${opt.l==='B'?'bg-orange-500/30 border-orange-400':'bg-blue-800 border-blue-600 hover:border-blue-400'}`}>
                                     <span className="font-black text-yellow-300 w-6">{opt.l}:</span>
                                     <span className="text-white font-bold">{opt.t}</span>
                                   </div>
                                 ))}
                               </div>
                               <div className="flex justify-center gap-4 mt-4">
                                 {['50:50','📞 Phone','👥 Audience'].map(l => <button key={l} className="px-3 py-1 bg-yellow-500 text-black font-bold rounded-full text-xs">{l}</button>)}
                               </div>
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Ranked Survey' && (
                           <div className="w-full max-w-2xl">
                             <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                               <div className="bg-blue-700 p-4 text-center">
                                 <p className="text-yellow-300 font-black text-xl tracking-wider">SURVEY SAYS...</p>
                                 <p className="text-white font-bold mt-2 text-sm">"Name a reason employees skip required training"</p>
                               </div>
                               <div className="p-4 space-y-3">
                                 {[{a:'Too time-consuming',pct:36},{a:'Content not relevant',pct:28},{a:'Poor reminders',pct:19},{a:'Competing deadlines',pct:17}].map((item,i) => (
                                   <div key={i} className="flex items-center gap-3">
                                     <span className="text-yellow-400 font-black w-6">{i+1}</span>
                                     <div className="flex-1 relative bg-blue-900 rounded-lg overflow-hidden h-9 flex items-center">
                                       <div className="bg-blue-600 h-full" style={{width:item.pct+'%'}}></div>
                                       <span className="absolute left-3 text-white text-sm font-bold z-10">{item.a}</span>
                                     </div>
                                     <span className="text-yellow-300 font-black w-10 text-right">{item.pct}%</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Digital Escape Room' && (
                           <div className="w-full max-w-md text-center">
                             <div className="bg-slate-800 rounded-2xl border border-amber-600/50 p-8 space-y-5">
                               <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
                                 <span className="text-5xl">🔒</span>
                               </div>
                               <div>
                                 <p className="text-amber-400 font-black text-lg uppercase tracking-widest">Stage 1: The Phishing Lab</p>
                                 <p className="text-slate-300 text-sm mt-2 leading-relaxed">A suspicious email has arrived. Identify the phishing indicators to unlock the next stage and escape!</p>
                               </div>
                               <div className="flex justify-center gap-2 mt-2">
                                 {[1,2,3,4].map(n => <div key={n} className={`w-12 h-12 rounded-lg border-2 font-bold text-xl flex items-center justify-center ${n===1?'border-indigo-500 bg-indigo-500/20 text-white':'border-slate-700 bg-slate-900 text-slate-600'}`}>{n===1?'?':'-'}</div>)}
                               </div>
                               <div className="flex justify-center gap-2">
                                 {['Stage 1','Stage 2','Stage 3'].map((s,i) => <div key={s} className={`w-3 h-3 rounded-full ${i===0?'bg-amber-500':'bg-slate-700'}`} />)}
                               </div>
                             </div>
                           </div>
                         )}
                         {previewModalOption === 'Spin the Wheel' && (
                           <div className="w-full max-w-sm text-center">
                             <p className="text-white font-bold text-lg mb-4">Spin for a random category!</p>
                             <div className="relative w-56 h-56 mx-auto mb-6">
                               <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
                                 {[{c:'#6366f1',l:'Security'},{c:'#8b5cf6',l:'Privacy'},{c:'#06b6d4',l:'Ethics'},{c:'#10b981',l:'Compliance'},{c:'#f59e0b',l:'Data'},{c:'#ef4444',l:'Access'}].map((seg, i) => {
                                   const angle = (i * 60 - 90) * Math.PI/180;
                                   const angle2 = ((i+1)*60 - 90) * Math.PI/180;
                                   const x1=100+95*Math.cos(angle), y1=100+95*Math.sin(angle);
                                   const x2=100+95*Math.cos(angle2), y2=100+95*Math.sin(angle2);
                                   const mx=100+55*Math.cos((angle+angle2)/2), my=100+55*Math.sin((angle+angle2)/2);
                                   return (<g key={i}><path d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`} fill={seg.c} stroke="#1e293b" strokeWidth="2"/><text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9" fontWeight="bold">{seg.l}</text></g>);
                                 })}
                                 <circle cx="100" cy="100" r="12" fill="white"/>
                                 <polygon points="100,0 95,20 105,20" fill="white"/>
                               </svg>
                             </div>
                             <button className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl shadow-lg hover:shadow-indigo-500/40 transition-all hover:scale-105">SPIN!</button>
                           </div>
                         )}
                         {previewModalOption === 'Price Estimator' && (
                           <div className="w-full max-w-lg">
                             <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-4">
                               <p className="text-yellow-400 font-black text-xl text-center">PRICE ESTIMATOR</p>
                               <div className="bg-slate-900 rounded-xl p-4 text-center">
                                 <p className="text-white font-bold mb-1">Average cost of a data breach for a mid-sized company</p>
                                 <p className="text-slate-400 text-sm">Hint: It's more expensive than most annual training budgets</p>
                               </div>
                               <div className="grid grid-cols-3 gap-2">
                                 {['$500K','$1M','$5M','$10M','$50M','Custom'].map(v => (
                                   <button key={v} className={`py-2 bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white text-sm font-bold rounded-lg transition-colors ${v==='$5M'?'bg-indigo-600 text-white':''}`}>{v}</button>
                                 ))}
                               </div>
                               <button className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black rounded-xl hover:shadow-lg transition-all">LOCK IN PRICE</button>
                             </div>
                           </div>
                         )}
                     </div>
                  </div>
                </motion.div>
              </div>
           )}
         </AnimatePresence>

      </main>
    </div>
  );
}

// Extracted to avoid React Hook Rules Violation for conditional rendering in preview modal
function MultipleAnswersPreviewDemo() {
  const maOpts = ['Rabbit', 'Dog', 'Cat', 'Apple'];
  const correctSet = [0, 1, 2];
  const [maSelected, setMaSelected] = React.useState<number[]>([]);
  const [maSubmitted, setMaSubmitted] = React.useState(false);
  const isAllCorrect = maSubmitted && maSelected.length === 3 && maSelected.every(i => correctSet.includes(i));
  
  return (
    <div className="space-y-3 max-w-lg w-full mx-auto">
      <p className="text-slate-100 font-bold text-lg mb-1">Which of the following are animals?</p>
      <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">Select all correct answers</p>
      {maOpts.map((opt, i) => {
        const isSelected = maSelected.includes(i);
        const isCorrect = correctSet.includes(i);
        let cls = 'border-slate-700 bg-slate-800/50 hover:border-slate-600 text-slate-300';
        if (maSubmitted) {
          if (isCorrect && isSelected) cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-200';
          else if (isCorrect) cls = 'border-emerald-400/50 text-emerald-300 border-dashed bg-transparent';
          else if (isSelected) cls = 'border-red-500 bg-red-500/15 text-red-300';
        } else if (isSelected) cls = 'border-indigo-500 bg-indigo-500/15 text-indigo-200';
        return (
          <div key={i} onClick={() => !maSubmitted && setMaSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${cls}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-500'}`}>
              {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
            </div>
            <span className="text-sm font-medium">{opt}</span>
            {maSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />}
          </div>
        );
      })}
      {!maSubmitted ? (
        <button onClick={() => setMaSubmitted(true)} disabled={maSelected.length === 0}
          className="mt-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all">
          Submit Answers
        </button>
      ) : (
        <div className={`mt-2 p-3 rounded-xl font-bold text-sm flex items-center gap-2 ${isAllCorrect ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border border-red-500/40 text-red-300'}`}>
          {isAllCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {isAllCorrect ? 'Correct! Rabbit, Dog, and Cat are animals.' : 'Not quite — only Rabbit, Dog, and Cat are animals.'}
        </div>
      )}
    </div>
  );
}

