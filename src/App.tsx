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
  ChevronDown,
  Ear
} from 'lucide-react';
import { 
  Accordion, 
  InteractiveTimeline, 
  SortingActivity, 
  MatchingActivity, 
  DragAndDropActivity, 
  BranchingScenario 
} from '@zomako/elearning-components/dist/elearning-components.es.js';
import { 
  AccordionPreview, HotspotPreview, BranchingPreview, MultipleChoicePreview, 
  SortingPreview, MatchingPreview, TimelinePreview, DropTargetsPreview,
  GamePreview 
} from './components/interactions/ExtraPreviews';
import { suggestLearningObjectives, generateCourseOutline, hydrateCourseContent, analyzeUploadedFile, FileAnalysisResult, CourseOutlineDraft } from './services/aiService';
import { createScormPackage } from './services/scormService';
import { FlashcardGrid } from './components/FlashcardGrid';
import { OutlinePreview } from './components/builder/OutlinePreview';
import { PlayerPropertiesModal, PlayerConfig, defaultPlayerConfig } from './components/builder/PlayerPropertiesModal';
import { CourseOutline, Slide, TerminalObjectiveGroup } from './types/course';
import { extractTextFromFile, extractImagesFromFile, SourceImage } from './lib/fileProcessor';
import { generateGameTemplate } from './services/aiGameService';
import { GameContainer } from './components/game-templates/core/GameContainer';
import { getRandomBackgroundForTheme } from './lib/backgrounds';
import { getPresetOptions, getPresetConfig } from './lib/presetEngine';
import { GameTemplateType } from './types/game';
import { usePlayer } from './lib/usePlayer';
import { PlayerBar } from './components/player/PlayerBar';
import { getRecommendedGames } from './lib/gameEngine';
import { DUMMY_COURSE } from './lib/dummyCourse';
import { FloatingImageCanvas } from './components/FloatingImageCanvas';
import { FloatingImage } from './types/course';
import TabbedHorizontal from './components/interactions/TabbedContentHorizontal';
import TabbedVertical from './components/interactions/TabbedContentVertical';
import FolderExplorer from './components/interactions/FolderExplorer';
import CarouselPanel from './components/interactions/CarouselPanel';import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { SlideEditorBar } from './components/player/SlideEditorBar';
import { CourseNavSidebar } from './components/player/CourseNavSidebar';
import { RichTextEditor } from './components/player/RichTextEditor';
import { useTTSGeneration } from './hooks/useTTSGeneration';
import { TTSProgressToast } from './components/TTSProgressToast';

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

/** Detects whether a string is HTML (from the rich-text editor) vs plain Markdown */
const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str?.trim() ?? '');

const sanitizeContent = (content: string) => {
  // HTML content from the rich-text editor must never be run through markdown
  // cleanup regexes — return it untouched so SmartContent can render it correctly.
  if (isHTML(content)) return content;
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
  if (isHTML(content)) {
    return (
      <div
        className={cn('prose max-w-none text-lg lg:text-xl leading-relaxed rich-slide-content', theme !== 'light' ? 'prose-invert text-gray-200' : 'text-gray-800')}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
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

/**
 * SmartContent — handles the numerous inline `<ReactMarkdown>` usages in the slide renderer.
 * Automatically switches between HTML rendering and Markdown based on content type.
 */
const SmartContent = ({ content, className, theme }: { content: string; className?: string; theme?: string }) => {
  if (isHTML(content)) {
    return (
      <div
        className={cn(className, 'rich-slide-content')}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return (
    <ReactMarkdown className={className}>
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
  /** Always-current ref so Save Changes uses the latest course even in stale closures */
  const courseRef = useRef<any>(null);
  const [outlineDraft, setOutlineDraft] = useState<CourseOutlineDraft | null>(null);
  const [skipOutlineReview, setSkipOutlineReview] = useState(false);
  
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark' | 'unified'>('dark');
  const [courseBg, setCourseBg] = useState<string | null>(null);
  const [showBgMenu, setShowBgMenu] = useState(false);
  
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
  /** Always-current ref so Save Changes captures the latest editingSlide even after async edits */
  const editingSlideRef = useRef<any>(null);
  const [editDrawerTab, setEditDrawerTab] = useState<'text'|'audio'>('text');

  // Player / Game
  const [quizState, setQuizState] = useState<Record<string, any>>({});
  // Sandbox / Admin dropdowns
  const [sandboxDropdownOpen, setSandboxDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false); // kept for compat
  // Sandbox mode flag (dummy course active)
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  // Sandbox outline (derived from DUMMY_COURSE for outline step)
  const [sandboxOutline, setSandboxOutline] = useState<any>(null);
  // Theme dropdown in preview top bar
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  // Original course snapshot for Reset Layout
  const [originalCourse, setOriginalCourse] = useState<any>(null);
  // Per-slide floating images map: slideId -> FloatingImage[]
  const [floatingImagesMap, setFloatingImagesMap] = useState<Record<string, FloatingImage[]>>({});

  // Course Details State
  const [pathway, setPathway] = useState<'corporate' | 'k12'>('corporate');
  const [preset, setPreset] = useState<'quick' | 'standard' | 'comprehensive'>('standard');
  const [courseType, setCourseType] = useState<CourseType>('standard');
  // Change-confirmation modals
  const [pendingPathway, setPendingPathway] = useState<'corporate' | 'k12' | null>(null);
  const [pendingPreset, setPendingPreset] = useState<'quick' | 'standard' | 'comprehensive' | null>(null);
  const [courseDescription, setCourseDescription] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<(string | TerminalObjectiveGroup)[]>([{ terminalObjective: '', enablingObjectives: [''] }]);
  const [objectiveFormat, setObjectiveFormat] = useState<string>('ABC');
  const [slideCount, setSlideCount] = useState(14);
  const [interactionTypes, setInteractionTypes] = useState<string[]>([]);
  const [gameTemplateIds, setGameTemplateIds] = useState<string[]>([]);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [ttsVoice, setTtsVoice] = useState<string>('alloy');
  // Per-slide TTS regeneration state
  const [regenSlideId, setRegenSlideId] = useState<string | null>(null);
  // Voice preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const voicePreviewCache = useRef<Map<string, string>>(new Map());
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const previewVoice = async (voiceId: string) => {
    if (previewingVoice) return; // already loading one
    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    // Use cache if available
    if (voicePreviewCache.current.has(voiceId)) {
      const audio = new Audio(voicePreviewCache.current.get(voiceId)!);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }
    setPreviewingVoice(voiceId);
    try {
      const { generateSlideTTS } = await import('./services/ttsService');
      const sampleText = `Hello! I'm ${voiceId.charAt(0).toUpperCase() + voiceId.slice(1)}, and I'll be your narrator for this course.`;
      const blobUrl = await generateSlideTTS(sampleText, { voice: voiceId as any });
      voicePreviewCache.current.set(voiceId, blobUrl);
      const audio = new Audio(blobUrl);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch (err: any) {
      console.warn('[Voice Preview]', err.message);
    } finally {
      setPreviewingVoice(null);
    }
  };
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [includeObjectiveSlides, setIncludeObjectiveSlides] = useState(true);
  const [includeSummarySlides, setIncludeSummarySlides] = useState(true);
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(true);
  const [generatedCourseTitle, setGeneratedCourseTitle] = useState('');

  // Player Audio/Refs
  const player = usePlayer();
  const { progress: ttsProgress, generateTTS, resetTTS } = useTTSGeneration();
  const allSlides = course ? course.modules.map((m: any) => m.slides).flat() : [];
  const currentSlide = allSlides[currentSlideIndex];

  useEffect(() => {
    if (currentSlide) {
      player.loadSlide(
        currentSlide.id,
        // Prefer real TTS-generated URL, fall back to legacy audioUrl
        currentSlide.voiceOverUrl || currentSlide.audioUrl || null,
        // Only use browser TTS fallback when voiceOverUrl isn't available yet
        voiceOverEnabled && !currentSlide.voiceOverUrl
          ? (currentSlide.voiceOverText || currentSlide.narration || null)
          : null
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide?.id, currentSlide?.voiceOverUrl, voiceOverEnabled]);

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
      setOriginalCourse(finalCourse);
      setStep('preview');
      // ── Kick off TTS generation in the background ──
      if (voiceOverEnabled) {
        generateTTS(finalCourse, setCourse, ttsVoice);
      }
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

      <header className="relative z-[600] border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
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

            {/* ── Sandbox Dropdown ── */}
            <div className="relative">
              <button
                onClick={() => { setSandboxDropdownOpen(o => !o); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg text-purple-300 font-bold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Sandbox
                <ChevronDown className={`w-3 h-3 transition-transform ${sandboxDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {sandboxDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-purple-700/40 rounded-xl shadow-2xl z-[500] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 bg-purple-900/30 border-b border-purple-700/40 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">Sandbox — Demo Course</p>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {/* ── Course Details (sandbox) ── */}
                    <button
                      onClick={() => {
                        // Pre-fill details with sandbox dummy data
                        setCourseTitle('Advanced Workplace Communication');
                        setCourseDescription('A comprehensive eLearning course covering modern workplace communication strategies, active listening, cross-functional collaboration, and professional writing for remote and hybrid teams.');
                        setLearningObjectives([{
                          terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration and team performance.',
                          enablingObjectives: [
                            'The learner will recall the key characteristics of effective workplace communication.',
                            'The learner will describe common barriers to communication in remote and hybrid team settings.',
                            'The learner will distinguish between active listening behaviors and passive listening behaviors.',
                            'The learner will recognize examples of clear and professional written correspondence.',
                            'The learner will classify meeting facilitation techniques as productive or unproductive.',
                          ],
                        }]);
                        setPathway('corporate');
                        setCourseType('standard');
                        setPreset('standard');
                        setIsSandboxMode(true);
                        setShowPlayerProperties(false);
                        setStep('details');
                        setSandboxDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 text-sm font-medium transition-all text-left"
                    >
                      <FileText className="w-4 h-4 text-pink-400 shrink-0" />
                      <span className="flex-1">Course Details</span>
                      {step === 'details' && isSandboxMode && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded-full">● HERE</span>
                      )}
                    </button>

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
                        setShowPlayerProperties(false);
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
                        setShowPlayerProperties(false);
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
                  className="absolute top-0 left-0 w-full h-auto scale-90 origin-top opacity-30 mix-blend-screen pointer-events-none"
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
                              Switching to <strong className="text-white">{pendingPathway === 'k12' ? 'K-12 Education' : 'Adult Learning'}</strong> will regenerate your course description and learning objectives to match that audience's specifications.
                            </p>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => setPendingPathway(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all">Cancel</button>
                              <button
                                onClick={async () => {
                                  const p = pendingPathway;
                                  setPendingPathway(null);
                                  setPathway(p);
                                  if (courseTitle && courseTitle.startsWith('Demo Course')) {
                                    if (p === 'k12') {
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
                                  } else if (courseTitle || prompt) {
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
                         <button onClick={() => { if (pathway !== 'corporate') setPendingPathway('corporate'); }} className={`flex-1 sm:w-32 py-2 rounded-lg text-sm font-bold transition-all ${pathway === 'corporate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Adult Learning</button>
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
                                  if (courseTitle === 'Demo Course: Advanced Cybersecurity') {
                                    setObjectiveFormat(fmt);
                                    if (fmt === 'AB') {
                                       setLearningObjectives([{ 
                                         terminalObjective: 'The learner will identify and respond to common cybersecurity threats.', 
                                         enablingObjectives: ['The learner will identify common cybersecurity threats.', 'The learner will apply the NIST framework to risk assessment.', 'The learner will respond to security incidents effectively.'] 
                                       }]);
                                    } else if (fmt === 'ABC') {
                                       setLearningObjectives([{ 
                                         terminalObjective: 'Given a simulated network environment, the learner will identify and respond to common cybersecurity threats.', 
                                         enablingObjectives: ['Given a list of attack vectors, the learner will identify common cybersecurity threats.', 'Given a risk scenario, the learner will apply the NIST framework.', 'Given an active breach, the learner will respond to security incidents.'] 
                                       }]);
                                    } else if (fmt === 'ABCD') {
                                       setLearningObjectives([{ 
                                         terminalObjective: 'Given a simulated network environment, the learner will identify and respond to common cybersecurity threats with 100% accuracy.', 
                                         enablingObjectives: ['Given a list of attack vectors, the learner will identify common cybersecurity threats with zero false positives.', 'Given a risk scenario, the learner will apply the NIST framework according to federal guidelines.', 'Given an active breach, the learner will respond to security incidents within a 15-minute SLA.'] 
                                       }]);
                                    } else {
                                       setLearningObjectives([{ 
                                         terminalObjective: 'Identify and respond to common cybersecurity threats effectively using industry-standard frameworks.', 
                                         enablingObjectives: ['Identify common cybersecurity threats', 'Apply the NIST framework to risk assessment', 'Respond to security incidents effectively'] 
                                       }]);
                                    }
                                  } else if (fmt !== objectiveFormat && learningObjectives.length > 0) {
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
                       <div className="p-6 space-y-4">
                          {learningObjectives.map((obj, i) => {
                            const isString = typeof obj === 'string';
                            if (isString) {
                              const strObj = obj as string;
                              return (
                                <div key={i} className="flex gap-3 items-start group">
                                  <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                  <textarea 
                                    rows={2}
                                    value={strObj} 
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
                              );
                            } else {
                              const tObj = obj as TerminalObjectiveGroup;
                              return (
                                <div key={i} className="bg-slate-950/50 border border-indigo-500/20 rounded-xl p-4 space-y-3 relative group">
                                  <div className="flex gap-3 items-start">
                                     <div className="mt-2.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                                     <div className="flex-1 space-y-1">
                                       <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Terminal Objective</p>
                                       <textarea 
                                          rows={2}
                                          value={tObj.terminalObjective} 
                                          onChange={(e) => {
                                            const newObjs = [...learningObjectives];
                                            const currentObj = newObjs[i] as TerminalObjectiveGroup;
                                            newObjs[i] = { ...currentObj, terminalObjective: e.target.value };
                                            setLearningObjectives(newObjs);
                                          }}
                                          className="w-full bg-indigo-950/30 border border-indigo-500/30 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-600 font-bold whitespace-pre-wrap resize-none"
                                          placeholder="e.g., The learner will design a marketing brochure..."
                                       />
                                     </div>
                                     <button onClick={() => setLearningObjectives(learningObjectives.filter((_, idx) => idx !== i))} className="p-2 mt-6 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 absolute top-0 right-2"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                                  
                                  <div className="pl-6 space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Enabling Objectives</p>
                                    {tObj.enablingObjectives.map((enablingObj, eIdx) => (
                                      <div key={eIdx} className="flex gap-2 items-start group/enabling">
                                        <div className="mt-2 text-slate-600 shrink-0">↳</div>
                                        <textarea 
                                          rows={1}
                                          value={enablingObj} 
                                          onChange={(e) => {
                                            const newObjs = [...learningObjectives];
                                            const currentObj = newObjs[i] as TerminalObjectiveGroup;
                                            const newEnabling = [...currentObj.enablingObjectives];
                                            newEnabling[eIdx] = e.target.value;
                                            newObjs[i] = { ...currentObj, enablingObjectives: newEnabling };
                                            setLearningObjectives(newObjs);
                                          }}
                                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 focus:border-slate-500 outline-none transition-all placeholder-slate-700 text-sm whitespace-pre-wrap resize-none"
                                          placeholder="e.g., Identify the target audience..."
                                        />
                                        <button onClick={() => {
                                           const newObjs = [...learningObjectives];
                                           const currentObj = newObjs[i] as TerminalObjectiveGroup;
                                           const newEnabling = currentObj.enablingObjectives.filter((_, idx) => idx !== eIdx);
                                           newObjs[i] = { ...currentObj, enablingObjectives: newEnabling };
                                           setLearningObjectives(newObjs);
                                        }} className="p-1.5 mt-0.5 text-slate-600 hover:text-red-400 rounded-md transition-all opacity-0 group-hover/enabling:opacity-100"><Trash2 className="w-3.5 h-3.5"/></button>
                                      </div>
                                    ))}
                                    <button onClick={() => {
                                       const newObjs = [...learningObjectives];
                                       const currentObj = newObjs[i] as TerminalObjectiveGroup;
                                       newObjs[i] = { ...currentObj, enablingObjectives: [...currentObj.enablingObjectives, ''] };
                                       setLearningObjectives(newObjs);
                                    }} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 font-bold px-2 py-1 hover:bg-indigo-500/10 rounded-md transition-all text-xs ml-5 mt-1"><Plus className="w-3 h-3"/> Add Enabling Objective</button>
                                  </div>
                                </div>
                              );
                            }
                          })}
                          <div className="flex gap-3">
                             <button onClick={() => setLearningObjectives([...learningObjectives, ''])} className="flex items-center gap-2 text-slate-400 hover:text-slate-300 font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-sm"><Plus className="w-4 h-4"/> Add Custom String</button>
                             <button onClick={() => setLearningObjectives([...learningObjectives, { terminalObjective: '', enablingObjectives: [''] }])} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/30 rounded-lg transition-all text-sm"><Plus className="w-4 h-4"/> Add Terminal Framework</button>
                          </div>
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
                           <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-6">CLICK TO SELECT • CLICK ON EYE ICON TO PREVIEW</p>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             {[
                               { id: 'multiple-choice', label: 'Multiple Choice' },
                               { id: 'multiple-answers', label: 'Multiple Answers' },
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
                           <p className="text-xs text-orange-400 font-bold tracking-widest uppercase mb-5">CLICK TO SELECT • CLICK ON EYE ICON TO PREVIEW</p>
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

                        {/* TTS Voice Picker — shown when voice-over is enabled */}
                        {voiceOverEnabled && (
                          <div className="mt-5 space-y-3">
                            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">AI Narrator Voice</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {([
                                { id: 'alloy',   label: 'Alloy',   sub: 'Neutral · Balanced' },
                                { id: 'echo',    label: 'Echo',    sub: 'Male · Measured' },
                                { id: 'fable',   label: 'Fable',   sub: 'Male · Warm' },
                                { id: 'onyx',    label: 'Onyx',    sub: 'Male · Deep' },
                                { id: 'nova',    label: 'Nova',    sub: 'Female · Bright' },
                                { id: 'shimmer', label: 'Shimmer', sub: 'Female · Soft' },
                              ] as const).map(v => (
                                <div key={v.id} className="relative">
                                  <button
                                    onClick={() => setTtsVoice(v.id)}
                                    className={cn(
                                      'w-full flex flex-col items-start px-3 pt-2.5 pb-2 rounded-xl border text-left transition-all',
                                      ttsVoice === v.id
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                                    )}
                                  >
                                    <span className="text-xs font-bold pr-5">{v.label}</span>
                                    <span className="text-[10px] opacity-70 mt-0.5">{v.sub}</span>
                                  </button>
                                  {/* Ear preview button — top-right corner of card */}
                                  <button
                                    onClick={e => { e.stopPropagation(); previewVoice(v.id); }}
                                    disabled={!!previewingVoice}
                                    title={`Preview ${v.label} voice`}
                                    className={cn(
                                      'absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center transition-all',
                                      previewingVoice === v.id
                                        ? 'text-emerald-400'
                                        : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/40',
                                      'disabled:cursor-wait'
                                    )}
                                  >
                                    {previewingVoice === v.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Ear className="w-3 h-3" />
                                    }
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
          )}

          {step === 'preview' && course && (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full min-h-screen bg-slate-900 absolute top-0 left-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 z-50 overflow-hidden flex flex-col">
              {/* ── Preview Top Bar — Row 1: Navigation + title + view controls + export ── */}
              <div className="px-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="h-11 flex items-center justify-between gap-2">
                  {/* Left: back + title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => setStep('home')} className="p-1.5 -ml-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="text-white font-bold text-sm truncate max-w-[220px]">
                        {isSandboxMode ? 'Demo Course' : course.title}
                      </h1>
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">Preview</span>
                    </div>
                  </div>

                  {/* Right: view mode + theme + divider + export + discard */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Desktop / Mobile toggle */}
                    <button
                      title="Toggle Desktop / Mobile preview"
                      onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium"
                    >
                      {viewMode === 'desktop' ? <Monitor className="w-3.5 h-3.5"/> : <Smartphone className="w-3.5 h-3.5"/>}
                      <span className="hidden lg:inline">{viewMode === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                    </button>

                    {/* Theme dropdown */}
                    <div className="relative">
                      <button
                        title="Change colour theme"
                        onClick={() => setThemeDropdownOpen(o => !o)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium"
                      >
                        {theme === 'dark' ? '🌑' : theme === 'light' ? '☀️' : '💜'}
                        <span className="hidden lg:inline capitalize">{theme}</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>
                      {themeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[200]" onClick={() => setThemeDropdownOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 z-[201] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[130px]">
                            {([['dark','🌑 Dark'],['light','☀️ Light'],['unified','💜 Unified']] as [string,string][]).map(([val, label]) => (
                              <button
                                key={val}
                                onClick={() => { setTheme(val as any); setThemeDropdownOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-700 transition-colors ${theme === val ? 'text-indigo-300' : 'text-slate-300'}`}
                              >
                                {theme === val && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"/>}
                                {theme !== val && <span className="w-1.5 h-1.5 shrink-0"/>}
                                {label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Export SCORM */}
                    <button
                      title="Export SCORM — download a SCORM 1.2 zip package"
                      onClick={exportScorm}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition-colors shadow-lg shadow-indigo-500/20"
                    >
                      <Download className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Export SCORM</span>
                    </button>

                    {/* Discard */}
                    <button
                      title="Discard — exit preview and return to the home screen"
                      onClick={() => { setCourse(null); setStep('home'); }}
                      className="p-1.5 rounded-lg border border-red-800/50 hover:bg-red-900/20 text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>

                {/* ── Row 2: Editing tools strip ── */}
                <div className="h-9 flex items-center gap-1 pb-1">
                  {/* Reset */}
                  <button
                    title="Reset — restore to original generated state"
                    onClick={() => { if (originalCourse) { setCourse(originalCourse); setCurrentSlideIndex(0); setQuizState({}); setFloatingImagesMap({}); setCourseBg(null); } }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-700/50 hover:bg-amber-800/20 text-amber-300 text-[11px] font-semibold"
                  >
                    <RotateCw className="w-3 h-3" /><span>Reset</span>
                  </button>

                  <div className="w-px h-4 bg-slate-700 mx-0.5" />

                  {/* Edit Text & Audio */}
                  <button
                    title="Edit Text & Audio — open the rich-text and narration editor for this slide"
                    onClick={() => { editingSlideRef.current = currentSlide; setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-700/50 hover:bg-indigo-800/20 text-indigo-300 text-[11px] font-semibold"
                  >
                    <Edit3 className="w-3 h-3" /><span>Edit Text &amp; Audio</span>
                  </button>

                  {/* Change Background */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBgMenu(v => !v)}
                      title="Change Background — upload an image or choose a solid color"
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-pink-700/50 hover:bg-pink-800/20 text-pink-300 text-[11px] font-semibold"
                    >
                      <ImageIcon className="w-3 h-3" /><span>Change Bg</span>
                    </button>

                    {showBgMenu && (
                      <>
                        <div className="fixed inset-0 z-[399]" onClick={() => setShowBgMenu(false)} />
                        <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[400] overflow-hidden">
                          <label
                            htmlFor="topbar-bg-upload"
                            className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
                            onClick={() => setShowBgMenu(false)}
                          >
                            <Upload className="w-3.5 h-3.5 text-pink-400" />
                            Upload Image
                          </label>
                          <div className="border-t border-slate-800" />
                          <div className="px-4 py-3">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2.5">Solid Color</p>
                            <div className="grid grid-cols-6 gap-1.5">
                              {[
                                { color: '#0f172a', label: 'Slate 950' },
                                { color: '#1e293b', label: 'Slate 800' },
                                { color: '#334155', label: 'Slate 700' },
                                { color: '#475569', label: 'Slate 600' },
                                { color: '#f8fafc', label: 'White' },
                                { color: '#e2e8f0', label: 'Light Gray' },
                                { color: '#1e3a5f', label: 'Navy Blue' },
                                { color: '#1d4ed8', label: 'Blue' },
                                { color: '#4f46e5', label: 'Indigo' },
                                { color: '#7c3aed', label: 'Purple' },
                                { color: '#0f4c3a', label: 'Dark Green' },
                                { color: '#7c2d12', label: 'Dark Red' },
                              ].map(({ color, label }) => (
                                <button
                                  key={color}
                                  title={label}
                                  onClick={() => { setCourseBg(color); setShowBgMenu(false); }}
                                  className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 hover:border-white"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: courseBg === color ? '#fff' : 'transparent',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Hidden file input for background upload */}
                    <input id="topbar-bg-upload" type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setCourseBg(URL.createObjectURL(f)); e.target.value = ''; } }}
                    />
                  </div>

                  {/* Upload Image (floating) */}
                  <label
                    htmlFor="topbar-img-upload"
                    title="Upload Image — add images to the current slide"
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-700/50 hover:bg-emerald-800/20 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                  >
                    <Upload className="w-3 h-3" /><span>Upload Image</span>
                    <input id="topbar-img-upload" type="file" accept="image/*" multiple className="hidden"
                      onChange={e => {
                        if (e.target.files?.length) {
                          const newImgs: FloatingImage[] = Array.from(e.target.files).map((f, i) => ({
                            id: `fi-${Date.now()}-${i}`,
                            url: URL.createObjectURL(f),
                            x: 40 + i * 20, y: 40 + i * 20, width: 320, height: 240,
                          }));
                          setFloatingImagesMap(prev => ({ ...prev, [currentSlide?.id]: [...(prev[currentSlide?.id] || []), ...newImgs] }));
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>

                  {/* Source Image */}
                  <button
                    title="Source Image — pick an image from your uploaded source document"
                    onClick={() => setShowImageGalleryForSlide(currentSlide?.id || null)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-teal-700/50 hover:bg-teal-800/20 text-teal-300 text-[11px] font-semibold"
                  >
                    <Layers className="w-3 h-3" /><span>Source Image</span>
                  </button>

                  <div className="w-px h-4 bg-slate-700 mx-0.5" />

                  {/* Player Properties */}
                  <button
                    title="Player Properties — configure controls, TOC, aspect ratio, branding"
                    onClick={() => setShowPlayerProperties(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-orange-700/50 hover:bg-orange-800/20 text-orange-300 text-[11px] font-semibold"
                  >
                    <Settings2 className="w-3 h-3" /><span>Player Props</span>
                  </button>
                </div>
              </div>

              {/* ── Body: Sidebar + Main Player Area ── */}
              <div className={cn("flex flex-row flex-1 overflow-hidden", playerConfig.playerResolution === 'full' ? 'overflow-x-hidden' : 'min-h-0')}>
                {/* Course Navigation Sidebar */}
                <CourseNavSidebar
                  modules={course.modules}
                  currentSlideIndex={currentSlideIndex}
                  allSlides={allSlides}
                  onNavigate={(idx) => { setCurrentSlideIndex(idx); }}
                  theme={theme}
                  tocNumbering={playerConfig.tocNumbering}
                />

                {/* Main slide area */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
                  {/* Background canvas */}
                  <div
                    className={cn(
                      "bg-cover bg-center relative",
                      playerConfig.playerResolution === 'full'
                        ? 'flex flex-col flex-1 overflow-hidden'
                        : 'flex-1 flex items-center justify-center overflow-hidden'
                    )}
                    style={{
                      backgroundImage: courseBg && !courseBg.startsWith('#') ? `url('${courseBg}')` : undefined,
                      backgroundColor: courseBg && courseBg.startsWith('#') ? courseBg : undefined,
                    }}
                  >
                    {/* Overlay only for image backgrounds */}
                    {courseBg && !courseBg.startsWith('#') && <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />}

                  {/* Slide frame — aspect ratio driven by playerConfig.playerResolution */}
                  <div className={cn(`theme-${theme}`,
                    "transition-all duration-500 flex flex-col relative z-10",
                    viewMode === 'desktop'
                      ? playerConfig.playerResolution === '4:3'
                        ? 'shadow-2xl overflow-hidden mx-auto my-4 md:rounded-2xl border border-white/20'
                        : playerConfig.playerResolution === 'full'
                        ? 'flex-1 overflow-hidden w-full'  /* fills flex-col parent; PlayerBar stays visible */
                        : 'shadow-2xl overflow-hidden w-full max-w-5xl mx-auto my-4 h-[calc(100vh-260px)] md:rounded-2xl border border-white/20'
                      : 'shadow-2xl overflow-hidden w-[375px] h-[667px] my-4 rounded-[3rem] border-[8px] border-gray-800',
                    theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900'
                  )}
                  style={viewMode === 'desktop' && playerConfig.playerResolution === '4:3'
                    ? { aspectRatio: '4/3', maxWidth: '900px', width: '100%' }
                    : undefined
                  }>
                    <div className={cn("flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full",
                      playerConfig.playerResolution === 'full' ? 'p-6 md:p-12 pb-4 text-lg' : 'p-4 md:p-8 pb-4',
                      theme === 'light' ? 'bg-white text-slate-900' : theme === 'unified' ? 'bg-indigo-950 text-slate-100' : 'bg-slate-900 text-white'
                    )}>
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
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
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
                                     {currentSlide.content && <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />}
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
                                     {currentSlide.content && <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />}
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
                               {currentSlide?.type === 'matching' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <MatchingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'accordion' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <Accordion {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'flashcards' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <FlashcardGrid cards={currentSlide.data?.cards || currentSlide.interactions?.[0]?.cards || []} theme={theme} />
                                 </div>
                               )}
                               {currentSlide?.type === 'timeline' && (
                                  <div className="space-y-6 w-full">
                                    <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                    <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                    <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                      <InteractiveTimeline {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                    </div>
                                  </div>
                                )}
                               {currentSlide?.type === 'sorting' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <SortingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'branching' && (
                                  <div className="space-y-6 w-full">
                                     <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                     <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                        <BranchingScenario {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                     </div>
                                  </div>
                               )}

                               {/* CUSTOM TAB/FOLDER INTERACTIONS */}
                               {currentSlide?.type === 'tabbed-horizontal' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <TabbedHorizontal tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'tabbed-vertical' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                     <TabbedVertical tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'folder-explorer' && (
                                  <div className="space-y-6 w-full">
                                    <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                    <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                    <div className={cn('overflow-visible', theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : '')}>
                                      <FolderExplorer items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />
                                    </div>
                                  </div>
                                )}
                               {currentSlide?.type === 'carousel-panel' && (
                                 <div className="space-y-6 w-full">
                                   <h2 className={cn('text-3xl font-extrabold', theme === 'light' ? 'text-slate-900' : 'text-white')}>{currentSlide.title}</h2>
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
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
                                     <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
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

                           {/* Slide media tools — Edit/Reset/Upload are in the top bar */}
                           <div className="absolute top-0 right-0 z-[100] flex flex-wrap max-w-sm justify-end gap-2 shrink-0">
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
                              <div className="mt-6">
                              {currentSlide?.mediaUrl ? (
                                <div className="max-w-lg rounded-xl overflow-hidden shadow-xl border border-black/10">
                                  <img 
                                    src={currentSlide.mediaUrl} 
                                    alt={currentSlide.title}
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <label
                                  className="inline-flex flex-col items-center gap-2 cursor-pointer group"
                                  title="Click to upload an image"
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const url = URL.createObjectURL(file);
                                      // Add to FloatingImageCanvas so it's draggable, resizable, croppable
                                      const newImg: FloatingImage = {
                                        id: `fi-placeholder-${Date.now()}`,
                                        url,
                                        x: 40, y: 40, width: 320, height: 240,
                                      };
                                      setFloatingImagesMap(prev => ({
                                        ...prev,
                                        [currentSlide.id]: [...(prev[currentSlide.id] || []), newImg],
                                      }));
                                      // Clear the placeholder flag so the dashed box disappears
                                      handleUpdateSlideMedia(currentSlide.id, { imagePlaceholder: false });
                                      e.target.value = '';
                                    }}
                                  />
                                  <div className={cn(
                                    "w-28 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all",
                                    "group-hover:border-indigo-400 group-hover:bg-indigo-500/5",
                                    theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-400' : 'border-slate-600 bg-slate-800/40 text-slate-500'
                                  )}>
                                    <ImageIcon className="w-6 h-6 opacity-50 group-hover:opacity-90 group-hover:text-indigo-400 transition-all" />
                                    <span className="text-[10px] font-bold text-center opacity-70 group-hover:opacity-100 group-hover:text-indigo-400">Click to upload</span>
                                  </div>
                                </label>
                              )}
                              </div>
                            )}

                       {/* Floating images — inside scroll so they scroll with content */}
                       <FloatingImageCanvas
                         images={floatingImagesMap[currentSlide?.id] || []}
                         isAuthoring={true}
                         onChange={(imgs) => setFloatingImagesMap(prev => ({ ...prev, [currentSlide?.id]: imgs }))}
                         onRemove={(id) => setFloatingImagesMap(prev => ({
                           ...prev,
                           [currentSlide?.id]: (prev[currentSlide?.id] || []).filter(i => i.id !== id)
                         }))}
                       />
                        </motion.div>
                       </AnimatePresence>

                     </div>{/* end slide content scroll area */}

                    {/* Learner Player Navigation Bar — sticky at bottom in full-screen mode */}
                    <div className={cn(
                      "w-full z-[100] shrink-0 border-t backdrop-blur-md",
                      playerConfig.playerResolution === 'full' ? 'sticky bottom-0' : 'relative',
                      theme === 'light' ? 'bg-white/80 border-slate-200' : theme === 'unified' ? 'bg-indigo-950 border-indigo-800' : 'bg-slate-900 border-slate-800'
                    )}>
                      <PlayerBar
                        player={player}
                        currentSlideIndex={currentSlideIndex}
                        totalSlides={allSlides.length}
                        currentSlideTitle={currentSlide?.title ?? ''}
                        onPrev={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                        onNext={() => setCurrentSlideIndex(prev => Math.min(allSlides.length - 1, prev + 1))}
                        theme={theme}
                      />
                     </div>{/* end PlayerBar */}
                  </div>{/* end slide frame */}
                  </div>{/* end bg canvas */}

                </div>{/* end main slide column */}
              </div>{/* end sidebar+main row */}
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
                        const slideId = showImageGalleryForSlide;
                        if (!slideId) return;
                        // Add to FloatingImageCanvas so it's draggable, resizable, croppable
                        const newImg: FloatingImage = {
                          id: `fi-src-${Date.now()}`,
                          url: img.url,
                          x: 40, y: 40, width: 320, height: 240,
                        };
                        setFloatingImagesMap(prev => ({
                          ...prev,
                          [slideId]: [...(prev[slideId] || []), newImg],
                        }));
                        // Clear placeholder flag if present
                        handleUpdateSlideMedia(slideId, { imagePlaceholder: false });
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
                          <span>On-Screen Text <span className="normal-case font-normal text-slate-600">(Rich Text)</span></span>
                        </label>
                        <RichTextEditor
                          key={editingSlide.id}
                          value={editingSlide.content || ''}
                          onChange={(html) => {
                            const updated = { ...(editingSlideRef.current ?? editingSlide), content: html };
                            editingSlideRef.current = updated;
                            setEditingSlide(updated);
                          }}
                          placeholder="Slide content... Use the toolbar for bold, italic, colors, and lists."
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
                        {/* Per-slide voice picker + regenerate */}
                        {voiceOverEnabled && (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-2">
                               <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shrink-0">Voice</label>
                               <select
                                 value={ttsVoice}
                                 onChange={e => setTtsVoice(e.target.value)}
                                 className="flex-1 bg-slate-950 border border-emerald-700/40 rounded-lg px-3 py-1.5 text-emerald-200 text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                               >
                                 <option value="alloy">Alloy — Neutral / Balanced</option>
                                 <option value="echo">Echo — Male / Measured</option>
                                 <option value="fable">Fable — Male / Warm</option>
                                 <option value="onyx">Onyx — Male / Deep</option>
                                 <option value="nova">Nova — Female / Bright</option>
                                 <option value="shimmer">Shimmer — Female / Soft</option>
                               </select>
                               {/* Ear preview button — previews the currently selected voice */}
                               <button
                                 onClick={() => previewVoice(ttsVoice)}
                                 disabled={!!previewingVoice}
                                 title={`Preview ${ttsVoice} voice`}
                                 className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-emerald-700/40 border border-slate-700 hover:border-emerald-600 text-slate-400 hover:text-emerald-300 transition-all disabled:cursor-wait"
                               >
                                 {previewingVoice === ttsVoice
                                   ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                   : <Ear className="w-3.5 h-3.5" />
                                 }
                               </button>
                             </div>
                            <button
                              disabled={regenSlideId === editingSlide?.id}
                              onClick={async () => {
                                if (!editingSlide) return;
                                const text = editingSlide.voiceOverText || editingSlide.narration || editingSlide.content || '';
                                if (!text) return;
                                setRegenSlideId(editingSlide.id);
                                try {
                                  const { generateSlideTTS: genTTS } = await import('./services/ttsService');
                                  const blobUrl = await genTTS(text, { voice: ttsVoice as any });
                                  handleUpdateSlideMedia(editingSlide.id, { voiceOverUrl: blobUrl });
                                  // Update editingSlide so the audio editor reflects the change
                                  setEditingSlide({ ...editingSlide, voiceOverUrl: blobUrl });
                                } catch (err: any) {
                                  alert(`TTS error: ${err.message}`);
                                } finally {
                                  setRegenSlideId(null);
                                }
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700/20 border border-emerald-600/40 text-emerald-300 font-bold text-xs hover:bg-emerald-700/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {regenSlideId === editingSlide?.id ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating audio…</>
                              ) : (
                                <><Mic className="w-3.5 h-3.5" /> Regenerate Audio for this Slide</>
                              )}
                            </button>
                          </div>
                        )}
                        {/* Audio URL if available */}
                        {(editingSlide?.voiceOverUrl || editingSlide?.audioUrl) && (
                          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                            <p className="text-xs text-emerald-400 font-bold">✅ Audio ready for this slide</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/40 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => { editingSlideRef.current = null; setEditingSlide(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingSlideRef.current) {
                        const latest = editingSlideRef.current;
                        setCourse((prevCourse: any) => {
                          if (!prevCourse) return prevCourse;
                          return {
                            ...prevCourse,
                            modules: prevCourse.modules.map((m: any) => ({
                              ...m,
                              slides: m.slides.map((s: any) => s.id === latest.id ? latest : s)
                            })),
                          };
                        });
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

        {/* ── TTS Generation Progress Toast ── */}
        <TTSProgressToast
          progress={ttsProgress}
          onDismiss={resetTTS}
        />

        {/* Interaction Preview Modal */}

        <AnimatePresence>
          {previewModalOption && (
             <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewModalOption(null)}>
               <motion.div 
                  onClick={(e) => e.stopPropagation()}
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
                         {previewModalOption === 'Multiple Choice' && <MultipleChoicePreview />}
                         {previewModalOption === 'Multiple Answers' && <MultipleAnswersPreviewDemo />}
                         {previewModalOption === 'Hotspot' && <HotspotPreview />}
                         {previewModalOption === 'Accordion' && <AccordionPreview />}
                         {previewModalOption === 'Flashcards' && (
                           <div className="w-full max-w-3xl">
                              <FlashcardGrid cards={[
                                 { front: 'What is phishing?', back: 'A social engineering attack using disguised messages to steal credentials or spread malware.' },
                                 { front: 'What is multi-factor authentication?', back: 'A security method requiring two or more verification factors: something you know, have, or are.' },
                                 { front: 'What does "need-to-know" principle mean?', back: 'Limiting access to sensitive information only to those who need it to perform their job.' }
                              ]} theme="unified" />
                           </div>
                         )}
                         {previewModalOption === 'Matching' && <MatchingPreview />}
                         {previewModalOption === 'Timeline' && <TimelinePreview />}
                         {previewModalOption === 'Sorting' && <SortingPreview />}
                         {previewModalOption === 'Drop Targets' && <DropTargetsPreview />}
                         {previewModalOption === 'Branching' && <BranchingPreview />}
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
                         {(['Knowledge Board (Jeopardy)', 'Millionaire Challenge', 'Ranked Survey (Family Feud)', 'Digital Escape Room', 'Spin the Wheel', 'Price Estimator'].includes(previewModalOption || '')) && (
                            <GamePreview option={previewModalOption || ''} />
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

