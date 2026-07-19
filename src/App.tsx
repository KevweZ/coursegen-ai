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
  Ear,
  CreditCard,
  Save,
  Undo2,
  Send,
  Activity
} from 'lucide-react';
import { 
  Accordion, 
  InteractiveTimeline, 
  SortingActivity, 
  MatchingActivity, 
  DragAndDropActivity
} from '@zomako/elearning-components/dist/elearning-components.es.js';
import { 
  AccordionPreview, HotspotPreview, MultipleChoicePreview, 
  SortingPreview, MatchingPreview, TimelinePreview, DropTargetsPreview,
  GamePreview, ScenarioPreview
} from './components/interactions/ExtraPreviews';
import { stripSlideTypePrefix } from './lib/stripSlideTypePrefix';
import { suggestLearningObjectives, generateCourseOutline, hydrateCourseContent, analyzeUploadedFile, FileAnalysisResult, CourseOutlineDraft, generateMasteryExam } from './services/aiService';
import { createScormPackage, ScormVersion } from './services/scormService';
import { FlashcardGrid } from './components/FlashcardGrid';
import { ScenarioEngine } from './components/interactions/ScenarioEngine';
import { ScenarioBuilderPanel } from './components/ScenarioBuilderPanel';
import { AIEditDrawer } from './components/AIEditDrawer';
import type { ScenarioData, ScenarioConfig } from './types/scenario';
import { DEFAULT_SCENARIO_CONFIG } from './types/scenario';

import { AccordionDarkWrapper } from './components/AccordionDarkWrapper';
import { QCTrackChangesModal } from './components/QCTrackChangesModal';
import { runFullQC, runStructuralQC, autoFixCourse, applyConfirmedFixes, simplifySlide, regenerateSlideData, QCReport } from './services/qcService';

import { OutlinePreview } from './components/builder/OutlinePreview';
import { PlayerPropertiesModal, PlayerConfig, defaultPlayerConfig } from './components/builder/PlayerPropertiesModal';
import { CourseOutline, Slide, TerminalObjectiveGroup, ExamConfig, ExamQuestion, ExamSessionState, NavigationMode } from './types/course';
import { extractTextFromFile, extractImagesFromFile, SourceImage } from './lib/fileProcessor';
import { generateGameTemplate, generateStandaloneGame } from './services/aiGameService';
import { GameContainer } from './components/game-templates/core/GameContainer';
import { getRandomBackgroundForTheme } from './lib/backgrounds';
import { getPresetOptions, getPresetConfig } from './lib/presetEngine';
import { GameTemplateType } from './types/game';
import { generateModuleImages, applyCoverImageToCourse } from './services/imageService';
import { usePlayer } from './lib/usePlayer';
import { PlayerBar } from './components/player/PlayerBar';
import { ClosedCaptionOverlay } from './components/player/ClosedCaptionOverlay';

import { SlideHeader } from './components/player/SlideHeader';
import { SlideErrorBoundary } from './components/player/SlideErrorBoundary';
import { useDraftCourses } from './lib/useDraftCourses';
import { DraftCoursesPanel } from './components/player/DraftCoursesPanel';
import { AppImagePickerModal } from './components/player/AppImagePickerModal';
import { CourseTitleSlide } from './components/player/CourseTitleSlide';
import { ClosingSlide } from './components/player/ClosingSlide';
import { ModuleCoverSlide } from './components/player/ModuleCoverSlide';
import { LearningObjectivesSlide }  from './components/player/LearningObjectivesSlide';
import { CourseObjectivesSlide }   from './components/player/CourseObjectivesSlide';
import { ModuleOverviewSlide, MODULE_COLORS } from './components/player/ModuleOverviewSlide';
import { PlayerTourSlide }       from './components/player/PlayerTourSlide';
import { WheelDiagram } from './components/interactions/WheelDiagram';
import { MermaidDiagram } from './components/MermaidDiagram';
import { WorkflowInsightsPanel } from './components/WorkflowInsightsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CustomMatchingActivity } from './components/interactions/CustomMatchingActivity';
import { CustomSortingActivity } from './components/interactions/CustomSortingActivity';
import { HotspotInteraction } from './components/interactions/HotspotInteraction';
import ClickRevealInteraction from './components/interactions/ClickRevealInteraction';
import { getRecommendedGames } from './lib/gameEngine';
import { DUMMY_COURSE, DUMMY_EXAM_QUESTIONS } from './lib/dummyCourse';
import { useScaleToFit } from './hooks/useScaleToFit';
import { FloatingImageCanvas } from './components/FloatingImageCanvas';
import { TrialInvitePanel } from './components/TrialInvitePanel';

import { FloatingImage } from './types/course';
import TabbedHorizontal from './components/interactions/TabbedContentHorizontal';
import TabbedVertical from './components/interactions/TabbedContentVertical';
import FolderExplorer from './components/interactions/FolderExplorer';
import CarouselPanel from './components/interactions/CarouselPanel';
import { VerticalTimeline } from './components/interactions/VerticalTimeline';
import { HorizontalTimeline } from './components/interactions/HorizontalTimeline';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { SlideEditorBar } from './components/player/SlideEditorBar';
import { CourseNavSidebar } from './components/player/CourseNavSidebar';
import { RichTextEditor } from './components/player/RichTextEditor';
import { useTTSGeneration } from './hooks/useTTSGeneration';
import { TTSProgressToast } from './components/TTSProgressToast';
import { ExamIntroSlide } from './components/player/ExamIntroSlide';
import { MasteryExamSlide } from './components/player/MasteryExamSlide';
import { ExamResultsSlide } from './components/player/ExamResultsSlide';
import { scormInit, scormQuit, scormSetLocation, scormReportScore, scormSuspend } from './services/scormReporter';
import { PricingPage } from './components/PricingPage';
import { AccountPage } from './components/AccountPage';
import { PaymentSuccessPage } from './components/PaymentSuccessPage';
import { PaymentCancelPage } from './components/PaymentCancelPage';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MarketingHomepage } from './components/marketing/MarketingHomepage';
import { MethodologyPage } from './components/marketing/MethodologyPage';
import { ExamplesPage } from './components/marketing/ExamplesPage';
import { HelpWidget } from './components/HelpWidget';

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

type AppStep = 'home' | 'details' | 'outline' | 'preview' | 'pricing' | 'account' | 'payment-success' | 'payment-cancel';
type CourseType = 'quick' | 'standard' | 'comprehensive';

/** Detects whether a string is HTML (from the rich-text editor) vs plain Markdown */
const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str?.trim() ?? '');

const sanitizeContent = (content: string) => {
  // HTML content from the rich-text editor must never be run through markdown
  // cleanup regexes â€” return it untouched so SmartContent can render it correctly.
  if (isHTML(content)) return content;
  return content
    .replace(/^[-*] \*\*.*\*\*:\s*$/gm, '') 
    .replace(/^[-*] \*\*\*\*:\s*/gm, '- ') 
    .replace(/\|\s*$/gm, '') 
    .replace(/\|\s*\|/g, '') 
    .replace(/^(#.*)$/gm, '') 
    // Ensure a blank line between the last list item and the first non-list paragraph
    // so ReactMarkdown renders them as separate block elements with proper spacing
    .replace(/(^[-*+][ \t]+.+)\n(?!\n)(?![ \t]*[-*+][ \t])/gm, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Group B fix: lightweight Markdown â†’ HTML converter for accordion / interaction item content.
 * The external @zomako Accordion component renders its item.content as plain text,
 * so we convert markdown to HTML before passing data in.
 */
function markdownToHtml(text: string): string {
  if (!text) return '';
  if (isHTML(text)) return text; // already HTML, don't double-process
  return text
    // Bold + italic (***)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bullet lists: lines starting with - or *
    .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/, '<ul>$1</ul>')
    // Prevent em-dash from wrapping to start of new line (use non-breaking space)
    .replace(/ \u2014 /g, '\u00a0\u2014 ')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

/** Pre-processes accordion data so item content renders markdown correctly. */
function preprocessAccordionData(data: any): any {
  if (!data?.items) return data;
  return {
    ...data,
    items: data.items.map((item: any) => ({
      ...item,
      content: item.content ? markdownToHtml(item.content) : item.content,
    })),
  };
}

/**
 * autoFormatAsBullets â€” converts multi-paragraph plain text to bullet points.
 * Skips blockquotes (>), headers (#), existing lists, HRs, and code fences.
 * Only fires when there are 2+ plain-text paragraphs.
 */
function autoFormatAsBullets(raw: string): string {
  // If content already has markdown structure (headings or lists), leave it as-is.
  if (/^#{1,6}\s/m.test(raw) || /^[-*+]\s/m.test(raw) || /^\d+\.\s/m.test(raw)) {
    return raw;
  }
  const isPlain = (b: string) => {
    const t = b.trim();
    if (!t) return false;
    if (/^#{1,6}\s/.test(t)) return false;
    if (/^[-*+]\s|^\d+\.\s/.test(t)) return false;
    if (/^>/.test(t)) return false;
    if (/^```/.test(t)) return false;
    if (/^---/.test(t)) return false;
    return true;
  };
  // First try double-newline paragraphs (original behaviour)
  const dblBlocks = raw.split(/\n{2,}/);
  if (dblBlocks.filter(isPlain).length >= 2) {
    return dblBlocks.map(b => isPlain(b) ? `- ${b.trim()}` : b).join('\n\n');
  }
  // Fall back: single-newline lines (e.g. two instruction sentences joined with \n)
  const lines = raw.split(/\n/);
  if (lines.filter(isPlain).length >= 2) {
    return lines.map(b => isPlain(b) ? `- ${b.trim()}` : b).join('\n');
  }
  return raw;
}

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
      className={cn('prose max-w-none text-xl leading-relaxed', theme !== 'light' ? 'prose-invert' : '')}
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
          <ul {...props} className="pl-6 space-y-2 lg:list-disc border-l-0 border-indigo-500/20 mb-4">{children}</ul>
        ),
        ol: ({ node, children, ...props }) => (
          <ol {...props} className="pl-6 space-y-2 list-decimal pb-4">{children}</ol>
        ),
        strong: ({ node, children, ...props }) => (
          <strong {...props} className={cn("font-extrabold", theme === 'light' ? "text-indigo-900" : "text-white")}>{children}</strong>
        ),
        // Render ```mermaid code blocks as actual Mermaid diagrams
        code({ node, className, children, ...props }: any) {
          const lang = /language-(\w+)/.exec(className ?? '')?.[1];
          if (lang === 'mermaid') {
            return (
              <MermaidDiagram
                code={String(children).replace(/\n$/, '')}
                theme={theme as any}
                className="my-4"
              />
            );
          }
          return <code className={className} {...props}>{children}</code>;
        },
      }}
    >
      {autoFormatAsBullets(content)}
    </ReactMarkdown>
  );
};

/**
 * SmartContent â€” handles the numerous inline `<ReactMarkdown>` usages in the slide renderer.
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
      {autoFormatAsBullets(content)}
    </ReactMarkdown>
  );
};

// â”€â”€â”€ Grid interaction IDs (must match the interactive-elements grid in the UI) â”€â”€
const GRID_INTERACTION_IDS = [
  'multiple-choice', 'multiple-answers', 'hotspot', 'accordion', 'flashcards',
  'timeline', 'sorting', 'matching', 'drop-targets', 'scenario',
  'tabbed-horizontal', 'tabbed-vertical', 'folder-explorer', 'carousel-panel',
  'click-reveal',
];
// Map legacy / AI-prompt IDs â†’ visual grid IDs so the UI checkboxes stay in sync
const PRESET_TO_GRID: Record<string, string> = {
  quiz: 'multiple-choice',
  choice: 'multiple-choice',
  'drag-drop': 'drop-targets',
  'drag-drop-activity': 'drop-targets',
};
const mapToGridIds = (ids: string[]): string[] =>
  [...new Set(ids.map(id => PRESET_TO_GRID[id] ?? id).filter(id => GRID_INTERACTION_IDS.includes(id)))];

export default function App() {
  const isScormPlayer = typeof window !== 'undefined' && !!(window as any).__COURSE_DATA__;
  const { user, session, loading: authLoading, signOut, isAdmin, isTrial, isTrialExpired } = useAuth();

  // â”€â”€ Draft Courses (Pro feature) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const draftManager = useDraftCourses(user?.id ?? null);
  const [showDraftsPanel, setShowDraftsPanel] = React.useState(false);
  const [showAppImagePicker, setShowAppImagePicker] = React.useState(false);
  const [showImageDropdown, setShowImageDropdown] = React.useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = React.useState<string | null>(null);

  const showDraftMessage = (msg: string) => {
    setDraftSaveMessage(msg);
    setTimeout(() => setDraftSaveMessage(null), 3500);
  };

  const handleSaveDraft = () => {
    if (!course) return;
    const result = draftManager.saveDraft(course, playerConfig, theme);
    showDraftMessage(result.message);
  };

  const handleLoadDraft = (id: string) => {
    const snapshot = draftManager.loadDraft(id);
    if (!snapshot) return;
    setCourse(snapshot.course);
    setPlayerConfig(snapshot.playerConfig || playerConfig);
    setCurrentSlideIndex(0);
    setShowDraftsPanel(false);
    showDraftMessage('Draft loaded âœ“');
  };

  const handleReplaceDraft = (id: string) => {
    if (!course) return;
    draftManager.replaceDraft(id, course, playerConfig, theme);
    showDraftMessage('Draft updated âœ“');
  };

  // Controls which pre-auth view to show: public marketing homepage OR login/signup
  const [publicView, setPublicView] = useState<'homepage' | 'auth' | 'methodology' | 'pricing' | 'examples'>('homepage');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  
  const [step, setStep] = useState<AppStep>(isScormPlayer ? 'preview' : 'home');

  // â”€â”€ Handle Stripe redirect-back URLs (/payment-success, /payment-cancel)
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/payment-success') {
      setStep('payment-success');
      window.history.replaceState({}, '', '/');
    } else if (path === '/payment-cancel') {
      setStep('payment-cancel');
      window.history.replaceState({}, '', '/');
    } else if (path === '/methodology') {
      setPublicView('methodology');
      window.history.replaceState({}, '', '/methodology');
    } else if (path === '/pricing') {
      setPublicView('pricing');
      window.history.replaceState({}, '', '/pricing');
    } else if (path === '/examples') {
      setPublicView('examples');
      window.history.replaceState({}, '', '/examples');
    } else if (path === '/login') {
      setPublicView('auth');
      setAuthInitialMode('login');
    } else if (path === '/signup') {
      setPublicView('auth');
      setAuthInitialMode('signup');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ Handle browser back / forward buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/pricing') { setPublicView('pricing'); window.scrollTo(0, 0); }
      else if (path === '/examples') setPublicView('examples');
      else if (path === '/methodology') setPublicView('methodology');
      else if (path === '/login')  { setPublicView('auth'); setAuthInitialMode('login'); }
      else if (path === '/signup') { setPublicView('auth'); setAuthInitialMode('signup'); }
      else setPublicView('homepage');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<'topic' | 'file' | 'url'>('topic');
  const [courseTitle, setCourseTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isRunningQC, setIsRunningQC] = useState(false);
  const [qcPhase, setQcPhase] = useState<'structural' | 'ai' | 'done' | null>(null);
  const [qcReport, setQcReport] = useState<QCReport | null>(null);
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcConfirmed, setQcConfirmed] = useState<Set<string>>(new Set());
  const [qcDeclined, setQcDeclined] = useState<Set<string>>(new Set());
  const [showQcPublishWarning, setShowQcPublishWarning] = useState(false);
  const [showTrialExportModal, setShowTrialExportModal] = useState(false);
  const [showTrialInvitePanel, setShowTrialInvitePanel] = useState(false);
  const [adminToken, setAdminToken] = useState('');
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
  const [scormVersion, setScormVersion] = useState<ScormVersion>('1.2');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Mobile portrait orientation detection
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 && window.innerHeight > window.innerWidth
  );

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
  // Scenario slide completion gate (unlocks Next button)
  const [scenarioCompleted, setScenarioCompleted] = useState(false);
  // Scenario builder config (feeds AI generation)
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig>(DEFAULT_SCENARIO_CONFIG);
  // AI Edit Drawer for scenario / game-template slides
  const [showAIEditDrawer, setShowAIEditDrawer] = useState(false);
  // Sandbox outline (derived from DUMMY_COURSE for outline step)
  const [sandboxOutline, setSandboxOutline] = useState<any>(null);
  // Theme dropdown in preview top bar
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  // Original course snapshot for Reset Layout
  const [originalCourse, setOriginalCourse] = useState<any>(null);
  // Per-slide floating images map: slideId -> FloatingImage[]
  const [floatingImagesMap, setFloatingImagesMap] = useState<Record<string, FloatingImage[]>>({});
  // Edits to synthetic slides (module-overview, etc.) that don't live in course.modules
  const [syntheticSlideOverrides, setSyntheticSlideOverrides] = useState<Record<string, {content?: string; voiceOverText?: string}>>({});
  // Audio URLs for synthetic slides (cover, player-tour, module-overviews) keyed by slide id
  const [syntheticAudioMap, setSyntheticAudioMap] = useState<Record<string, string>>({});
  // Closed captions toggle
  const [showCC, setShowCC] = useState(false);


  // â”€â”€ Undo history (max 20 snapshots) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MAX_UNDO = 20;
  type UndoSnapshot = { course: any; floatingImagesMap: Record<string, FloatingImage[]>; courseBg: string | null; syntheticSlideOverrides: Record<string, any>; };
  const [undoHistory, setUndoHistory] = useState<UndoSnapshot[]>([]);
  // Call before any user-triggered mutation to save current state
  const pushUndo = () => {
    setUndoHistory(prev => [
      ...prev.slice(-(MAX_UNDO - 1)),
      {
        course: JSON.parse(JSON.stringify(course)),
        floatingImagesMap: JSON.parse(JSON.stringify(floatingImagesMap)),
        courseBg,
        syntheticSlideOverrides: JSON.parse(JSON.stringify(syntheticSlideOverrides)),
      },
    ]);
  };
  const handleUndo = () => {
    setUndoHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCourse(last.course);
      setFloatingImagesMap(last.floatingImagesMap);
      setCourseBg(last.courseBg);
      setSyntheticSlideOverrides(last.syntheticSlideOverrides || {});
      return prev.slice(0, -1);
    });
  };

  // Course Details State
  const [pathway] = useState<'corporate'>('corporate');
  const [preset, setPreset] = useState<'quick' | 'standard' | 'comprehensive'>('standard');
  const [courseType, setCourseType] = useState<CourseType>('standard');
  const [courseDescription, setCourseDescription] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<(string | TerminalObjectiveGroup)[]>([{ terminalObjective: '', enablingObjectives: [''] }]);
  const [objectiveFormat, setObjectiveFormat] = useState<string>('ABC');
  const [slideCount, setSlideCount] = useState(14);
  const [interactionTypes, setInteractionTypes] = useState<string[]>([]);
  const [gameTemplateIds, setGameTemplateIds] = useState<string[]>([]);
  // Build mode: 'course' = full course builder, 'game' = standalone game mode
  const [buildMode, setBuildMode] = useState<'course' | 'game' | 'workflow'>('course');
  const [selectedGameType, setSelectedGameType] = useState<GameTemplateType>('jeopardy');
  const [extractedFileText, setExtractedFileText] = useState<string>('');
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);

  // Articulate-style scale-to-fit: always called at hook level regardless of step.
  // 'full' resolution mode intentionally fills the available space responsively
  // (no fixed aspect-ratio box), so it is excluded from scaling.
  const scaler = useScaleToFit(
    playerConfig?.playerResolution ?? '16:9',
    step === 'preview' && viewMode === 'desktop' && playerConfig?.playerResolution !== 'full'
  );
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

  // Mastery Quiz state
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    enabled: true,
    passingScore: 80,
    questionMode: 'total',
    questionCount: 10,
    allowRetake: true,
    questionTypes: ['mc', 'ma', 'tf'],
    presentationMode: 'one-at-a-time',
  });
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examPhase, setExamPhase] = useState<'idle' | 'active' | 'complete'>('idle');
  const [examSession, setExamSession] = useState<ExamSessionState>({
    questions: [],
    answers: {},
    currentQuestionIdx: 0,
    submitted: false,
    score: null,
    passed: null,
  });
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);

  // Navigation restriction state
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('free');
  const [highestVisitedIndex, setHighestVisitedIndex] = useState(0);

  // Player Audio/Refs
  const player = usePlayer();
  const { progress: ttsProgress, generateTTS, resetTTS } = useTTSGeneration();

  // Virtual exam slides appended after all content slides
  // Inject module-cover slides: one before the first slide of each module
  const contentSlides: Slide[] = course
    ? course.modules.flatMap((m: any, moduleIdx: number) => {
        const moduleObj = (learningObjectives as any)?.[moduleIdx] ?? null;
        const modNum = moduleIdx + 1;
        return [
          // Full-bleed animated module cover (stays as-is)
          {
            id: `__module-cover-${modNum}__`,
            title: m.title || `Module ${modNum}`,
            type: 'module-cover' as any,
            content: m.description || '',
            _moduleNumber: modNum,
            _moduleTitle:  m.title || `Module ${modNum}`,
          } as Slide,
          // Synthetic Module Overview slide: objectives accordion, full-bleed
          {
            id: `__module-overview-${modNum}__`,
            title: `Module ${modNum} â€” Overview`,
            type: 'module-overview' as any,
            // Merge any user edits stored in syntheticSlideOverrides
            content: syntheticSlideOverrides[`__module-overview-${modNum}__`]?.content ?? (m.description || ''),
            voiceOverText: syntheticSlideOverrides[`__module-overview-${modNum}__`]?.voiceOverText
              ?? (() => {
                  const ct = (m.title || `Module ${modNum}`).replace(/^Module\s+\d+\s*[â€”\-]\s*/i, '').trim();
                  return `Hello, welcome to Module ${modNum}: ${ct}. ${m.description ? `In this module, you'll cover ${m.description}` : "Let's look at the learning objectives for this module."}`;
                })(),

            _moduleNumber: modNum,
            _moduleTitle:  m.title || `Module ${modNum}`,
            _objectives: moduleObj ? [moduleObj] : [],
          } as Slide,
          // Real module slides (no _moduleObjectives tagging needed any more)
          ...m.slides,
        ];
      })
    : [];
  // Item 12: Inject a synthetic cover slide at position 0
  const coverSlide: Slide = course ? {
    id: '__cover__',
    title: course.title,
    type: 'cover' as any,
    content: course.description || '',
    narration: `Welcome to ${course.title}. ${course.description || ''}`.trim(),
  } as Slide : null as any;
  const closingVirtualSlide: Slide = {
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
  ] : [closingVirtualSlide];
  // Cover slide + 2 synthetic pre-content slides (Player Tour + Course Objectives)
  const playerTourSlide: Slide = course ? { id: '__player-tour__', title: 'Player Navigation Guide', type: 'player-tour' as any, content: '', narration: 'Before we begin, take a moment to explore the player controls. Hover over each card on the right to see the corresponding element highlighted in the player preview on the left.', voiceOverText: 'Before we begin, take a moment to explore the player controls. Hover over each card to see the corresponding element highlighted.' } as Slide : null as any;
  const courseObjectivesSlide: Slide = course ? { id: '__course-objectives__', title: 'Course Objectives', type: 'course-objectives' as any, content: '', _objectives: learningObjectives || [] } as Slide : null as any;
  const PRE_CONTENT = 3; // cover + player-tour + course-objectives
  const allSlides: Slide[] = course ? [coverSlide, playerTourSlide, courseObjectivesSlide, ...contentSlides, ...examVirtualSlides] : [];
  // Compute which module the current slide belongs to (for accent color)
  const currentModuleNumber = React.useMemo(() => {
    let mod = 0;
    for (let i = 0; i <= currentSlideIndex; i++) {
      const s = allSlides[i];
      if (s && typeof (s as any).id === 'string') {
        const m = (s as any).id.match(/__module-overview-(\d+)__/);
        if (m) mod = parseInt(m[1]);
      }
    }
    return mod;
  }, [allSlides, currentSlideIndex]);

  const slideAccentColor = React.useMemo(() => {
    if ((playerConfig as any).accentMode === 'global') {
      return (playerConfig as any).globalAccentColor || '#4f46e5';
    }
    return MODULE_COLORS[(currentModuleNumber - 1) % MODULE_COLORS.length] || '#4f46e5';
  }, [playerConfig, currentModuleNumber]);

    const examIntroIndex   = contentSlides.length + PRE_CONTENT;
  const examQIndex       = contentSlides.length + PRE_CONTENT + 1;
  const examResultsIndex = contentSlides.length + PRE_CONTENT + 2;
  const currentSlide = allSlides[currentSlideIndex];
  const FULL_BLEED_TYPES = ['cover', 'title', 'module-cover', 'closing', 'key-takeaways', 'player-tour', 'course-objectives', 'module-overview'];
  const isFullBleed = FULL_BLEED_TYPES.includes(currentSlide?.type as string);

  const canNavigateTo = (targetIdx: number): boolean => {
    const isExamIntro    = targetIdx === examIntroIndex;
    const isExamQuestion = targetIdx === examQIndex;
    const isExamResults  = targetIdx === examResultsIndex;
    if (isExamIntro)    return true;
    if (isExamQuestion) return examPhase !== 'idle';
    if (isExamResults)  return examPhase === 'complete';
    if (examPhase === 'active') return false;
    switch (navigationMode) {
      case 'free':       return true;
      case 'linear':     return false;
      case 'restricted': return targetIdx <= highestVisitedIndex;
      default:           return true;
    }
  };

  const handleNext = () => {
    const next = Math.min(allSlides.length - 1, currentSlideIndex + 1);
    setHighestVisitedIndex(prev => Math.max(prev, next));
    setCurrentSlideIndex(next);
  };

  const handlePrev = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  // Orientation change listener
  useEffect(() => {
    const checkOrientation = () =>
      setIsPortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Touch-swipe refs for the course player (swipe left = next, swipe right = prev)
  const playerTouchStartX = useRef(0);
  const playerTouchStartY = useRef(0);
  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    playerTouchStartX.current = e.touches[0].clientX;
    playerTouchStartY.current = e.touches[0].clientY;
  };
  const handlePlayerTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - playerTouchStartX.current;
    const dy = e.changedTouches[0].clientY - playerTouchStartY.current;
    if (isPortrait && !isScormPlayer) {
      // CSS-rotated 90° CW: device vertical axis = visual horizontal axis
      // Swipe down on device (dy > 0) = visual left swipe = next slide
      // Swipe up on device  (dy < 0) = visual right swipe = prev slide
      if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        if (dy > 0) handleNext(); else handlePrev();
      }
    } else {
      // Normal orientation: horizontal swipe navigates slides
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) handleNext(); else handlePrev();
      }
    }
  };

  // Derive only the current slide's synthetic URL — do NOT put the whole syntheticAudioMap
  // object in the effect deps, because every setSyntheticAudioMap() call (each module's
  // background audio generation) creates a new reference, which would fire loadSlide for
  // the current slide over and over, resetting playback mid-sentence.
  const currentSyntheticUrl = syntheticAudioMap[currentSlide?.id ?? ''] ?? null;

  useEffect(() => {
    if (currentSlide) {
      player.loadSlide(
        currentSlide.id,
        // AI audio only — never fall back to browser TTS
        voiceOverEnabled
          ? (currentSlide.voiceOverUrl || (currentSlide as any).audioUrl || currentSyntheticUrl || null)
          : null,
        null  // ttsText always null: slides are silent while AI audio loads, then auto-play
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide?.id, currentSlide?.voiceOverUrl, voiceOverEnabled, currentSyntheticUrl]);


  // Extract images
  useEffect(() => {
    if (uploadedFile) {
      extractImagesFromFile(uploadedFile).then(imgs => setSourceImages(imgs)).catch(e => console.error(e));
    }
  }, [uploadedFile]);

  // SCORM lifecycle â€” safe no-op when not inside an LMS
  useEffect(() => {
    scormInit();
    const onUnload = () => scormQuit();
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('beforeunload', onUnload); scormQuit(); };
  }, []);

  useEffect(() => { scormSetLocation(currentSlideIndex); }, [currentSlideIndex]);

  // Reset scenario gate when entering a scenario slide
  useEffect(() => {
    if (currentSlide?.type === 'scenario') setScenarioCompleted(false);
  }, [currentSlideIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (examPhase !== 'idle') {
      scormSuspend({ currentSlideIndex, examPhase, score: examSession.score, passed: examSession.passed });
    }
  }, [currentSlideIndex, examPhase, examSession.score, examSession.passed]);

  // Set courseBg stably â€” Item 11: skip background for light theme (stays white)
  useEffect(() => {
    if (course && !courseBg) {
      // Light theme stays white by default; dark/unified get the themed background
      if (course.visualTheme !== 'light') {
        setCourseBg(getRandomBackgroundForTheme(course.visualTheme));
      }
    }
  }, [course]);

  // Item 13: Auto-play voice-over when slide changes
  // Uses a ref so the setTimeout closure always calls the LATEST play() â€” avoids stale isPlaying=true skip
  const playerPlayRef = useRef<() => void>(() => {});
  useEffect(() => { playerPlayRef.current = player.play; }, [player.play]);
  useEffect(() => {
    if (!voiceOverEnabled) return;
    const timer = setTimeout(() => {
      // Call via ref â€” guaranteed to use state from the most recent render
      playerPlayRef.current();
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide?.id, player.hasAudio, voiceOverEnabled]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  /**
   * Runs the full AI document analysis. Can be called directly for retries.
   * Stays on the analyzing screen on failure â€” shows error + Retry button in-place.
   */
  const runAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setProgress(15);
    const analysisTimer = setInterval(() => {
      setProgress(prev => prev < 80 ? Math.min(80, prev + 5) : prev);
    }, 500);
    try {
      const text = await extractTextFromFile(file);
      setExtractedFileText(text);

      if (buildMode === 'game') {
        // Game Mode: extract text only, derive topic from filename, stay on home screen
        const baseName = file.name.replace(/\.(pdf|docx|pptx|txt)$/i, '').replace(/[-_]/g, ' ');
        setPrompt(baseName);
        clearInterval(analysisTimer);
        setProgress(100);
        setIsAnalyzing(false);
        return;
      }

      // Course Builder: full AI analysis
      const result = await analyzeUploadedFile(text, file.name);
      clearInterval(analysisTimer);
      setProgress(100);
      setPrompt(result.title || file.name);
      setCourseTitle(result.title || file.name);
      if (result.summary) setCourseDescription(result.summary);
      if (result.objectives) setLearningObjectives(result.objectives);
      if (result.recommendedObjectiveFormat) setObjectiveFormat(result.recommendedObjectiveFormat as any);
      if (result.recommendedPreset) {
         const rp = result.recommendedPreset as 'quick' | 'standard' | 'comprehensive';
         setPreset(rp);
         const config = getPresetConfig('corporate', rp);
         setSlideCount(config.slideCountTarget);
         setInteractionTypes(mapToGridIds(config.interactions));
         if (config.objectiveFormat) setObjectiveFormat(config.objectiveFormat);
      }
      await new Promise(r => setTimeout(r, 300));
      setProgress(0);
      setIsAnalyzing(false);
      setStep('details');
    } catch (err: any) {
      clearInterval(analysisTimer);
      console.error('File analysis error:', err);
      const isColdStart = err?.message?.includes('COLD_START') || err?.message?.includes('warming up') || err?.message?.includes('503');
      const isTrial = err?.message?.includes('TRIAL_LIMIT_EXCEEDED') || err?.message?.includes('trial limit');
      setAnalyzeError(
        isColdStart
          ? 'The server is warming up. Please wait 20â€“30 seconds and click â€œTry Againâ€.'
          : isTrial
          ? 'Trial generation limit reached. Please upgrade your plan to continue.'
          : `Analysis failed: ${err?.message ?? 'Unknown error'}. Please try again.`
      );
      // Keep progress at 80% and stay on the analyzing screen so the user can retry
      setProgress(80);
      // Do NOT call setIsAnalyzing(false) â€” stay on the overlay to show the error
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      await runAnalysis(file);
    }
  };

/**
   * Client-side objective reformatter.
   * Extracts the core "verb + outcome" from any AB/ABC/ABCD formatted string,
   * then re-wraps it cleanly in the target format.
   *
   * Strip order:  Given[condition],  â†’  The learner will  â†’  trailing .  â†’  trailing degree clause  â†’  trailing .
   * Reapply:       AB / ABC / ABCD wrappers
   */
  const reformatObjectivesClientSide = (
    objectives: (string | TerminalObjectiveGroup)[],
    fmt: string
  ): TerminalObjectiveGroup[] => {

    const applyFormat = (raw: string): string => {
      let s = raw.trim();

      // â”€â”€ 1. Capture + strip "Given [condition], " â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Preserve the original condition so ABCâ†’ABCD doesn't lose specificity
      let condition = ''; // will be derived from verb if no existing Given
      const givenMatch = s.match(/^Given\s+([^,]+),\s+/i);
      if (givenMatch) {
        condition = givenMatch[1].trim();
        s = s.slice(givenMatch[0].length).trim();
      }

      // â”€â”€ 2. Strip "The learner will " / "the learner will " â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      s = s.replace(/^[Tt]he learner will\s+/i, '').trim();

      // â”€â”€ 3. Strip trailing period â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      s = s.replace(/\.+$/, '').trim();

      // â”€â”€ 4. Strip trailing degree / standard clause â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      s = s.replace(/\s+(?:to\s+\S|with\s+\S).+$/i, '').trim();

      // â”€â”€ 5. Strip any trailing period that snuck through â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      s = s.replace(/\.+$/, '').trim();

      // â”€â”€ 6. Derive condition from verb when none was present â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (!condition) {
        // Extract the first word (the Bloom's verb) from the core action
        const verb = s.split(/\s+/)[0]?.toLowerCase() ?? '';
        const verbConditionMap: Record<string, string> = {
          // Remembering
          recall:     'a list of key terms',
          identify:   'a scenario',
          define:     'a glossary of terms',
          list:       'course content',
          name:       'a labeled diagram',
          recognize:  'practical examples',
          state:      'course content',
          label:      'a diagram or model',
          match:      'matching items',
          outline:    'course content',
          retrieve:   'course content',
          locate:     'a resource or document',
          // Understanding
          describe:   'a written scenario',
          explain:    'a case study',
          summarize:  'a written report',
          classify:   'a set of examples',
          compare:    'two or more examples',
          contrast:   'two or more examples',
          interpret:  'a data set or report',
          paraphrase: 'a written passage',
          categorize: 'a set of items',
          distinguish: 'common challenges',
          illustrate: 'practical examples',
        };
        condition = verbConditionMap[verb] ?? 'relevant examples';
      }

      // â”€â”€ 6. Re-apply the selected format â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      switch (fmt) {
        case 'AB':
          return `The learner will ${s}.`;
        case 'ABC':
          return `Given ${condition}, the learner will ${s}.`;
        case 'ABCD':
          return `Given ${condition}, the learner will ${s} with at least 80% accuracy.`;
        default:
          return `The learner will ${s}.`;
      }
    };

    return objectives.map(obj => {
      if (typeof obj === 'string') {
        return { terminalObjective: applyFormat(obj), enablingObjectives: [] };
      }
      return {
        terminalObjective: applyFormat(obj.terminalObjective),
        enablingObjectives: (obj.enablingObjectives || []).map(applyFormat),
      };
    });
  };



  const handleSuggestObjectives = async () => {
    if (!prompt && !courseTitle) return;
    setIsSuggesting(true);
    try {
      const fmt = objectiveFormat as 'AB' | 'ABC' | 'ABCD';
      const suggestions = await suggestLearningObjectives(
        courseTitle || prompt, 
        courseDescription || prompt, 
        pathway, 
        preset, 
        fmt,
        // Pass existing objectives for context so the AI knows the content areas,
        // but the result fully REPLACES the current list (no merge) so multiple
        // terminal objective groups returned by the AI all appear cleanly.
        learningObjectives.length > 0 ? learningObjectives : undefined
      );
      // Replace objectives with the full AI-generated set
      setLearningObjectives(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  /** Switch format: apply client-side reformat IMMEDIATELY, then refine with AI in background */
  const handleFormatChange = async (fmt: string) => {
    setObjectiveFormat(fmt);

    // 1. Immediate synchronous reformat so the user sees the change instantly
    if (learningObjectives.length > 0) {
      const instant = reformatObjectivesClientSide(learningObjectives, fmt);
      setLearningObjectives(instant);
    }

    // 2. Fire AI refinement in the background for higher-quality output
    if (learningObjectives.length > 0 && (courseTitle || prompt)) {
      setIsSuggesting(true);
      try {
        const apiFormat = fmt as 'AB' | 'ABC' | 'ABCD';
        const suggestions = await suggestLearningObjectives(
          courseTitle || prompt,
          courseDescription || prompt,
          pathway,
          preset,
          apiFormat,
          learningObjectives
        );
        setLearningObjectives(suggestions);
      } catch (e) {
        // API failed â€” client-side reformatted objectives remain visible
        console.warn('AI refinement failed, keeping client-side reformatted objectives:', e);
      } finally {
        setIsSuggesting(false);
      }
    }
  };

  /**
   * Switch the complexity preset and update all dependent state:
   * slide count, objective format, interaction defaults, and re-suggest objectives via AI.
   */
  const handlePresetChange = async (newPreset: 'quick' | 'standard' | 'comprehensive') => {
    if (preset === newPreset) return;
    const config = getPresetConfig('corporate', newPreset);
    setPreset(newPreset);
    setSlideCount(config.slideCountTarget);
    setInteractionTypes(mapToGridIds(config.interactions));
    const newFmt = config.objectiveFormat;
    setObjectiveFormat(newFmt);
    // Immediate client-side reformat so the user sees results instantly
    if (learningObjectives.length > 0) {
      const instant = reformatObjectivesClientSide(learningObjectives, newFmt);
      setLearningObjectives(instant);
    }
    // AI refinement in the background (re-scopes objectives to the new complexity)
    if (learningObjectives.length > 0 && (courseTitle || prompt)) {
      setIsSuggesting(true);
      try {
        const suggestions = await suggestLearningObjectives(
          courseTitle || prompt,
          courseDescription || prompt,
          pathway,
          newPreset,
          newFmt as 'AB' | 'ABC' | 'ABCD',
          learningObjectives
        );
        setLearningObjectives(suggestions);
      } catch (e) {
        console.warn('[handlePresetChange] AI objective re-scope failed:', e);
      } finally {
        setIsSuggesting(false);
      }
    }
  };


  const handleStartDetails = () => {
    setStep('details');
  };

  const handleGenerateGame = async () => {
    if (!selectedGameType) return;
    const topic = prompt || (uploadedFile?.name.replace(/\.(pdf|docx|pptx|txt)$/i, '') ?? '');
    if (!topic) { setError('Please enter a topic or upload a file first.'); return; }
    setIsGenerating(true);
    setProgress(30);
    try {
      const result = await generateStandaloneGame(topic, selectedGameType, extractedFileText || undefined);
      setCourse(result);
      setStep('preview');
    } catch (err: any) {
      setError(`Game generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
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
          // A1 FIX: Pass the full array of selected game template IDs
          gameTemplateIds: gameTemplateIds.length > 0 ? gameTemplateIds : undefined,
        }
      );
      setOutlineDraft(draft);
      if (skipOutlineReview) {
        setProgress(45);
        const finalCourse = await hydrateCourseContent(draft, prompt, { courseType, scenarioConfig: interactionTypes.includes('scenario') ? scenarioConfig : undefined });
        setCourse(finalCourse);
        setStep('preview');
        // Kick off module image generation in background (non-blocking)
        setIsGeneratingImages(true);
        generateModuleImages(finalCourse, (slideId, imageDataUrl) => {
          setCourse((prev: any) => prev ? applyCoverImageToCourse(prev, slideId, imageDataUrl) : prev);
        }).finally(() => setIsGeneratingImages(false));
      } else {
        // Item 7: Jump to 100% when outline generation is done
        setProgress(100);
        await new Promise(r => setTimeout(r, 300));
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
    setProgress(10);
    try {
      const finalCourse = await hydrateCourseContent(
        outlineDraft!, prompt, { courseType, scenarioConfig: interactionTypes.includes('scenario') ? scenarioConfig : undefined },
        (pct) => setProgress(pct)
      );
      setProgress(100);
      await new Promise(r => setTimeout(r, 200));
      setCourse(finalCourse);
      setOriginalCourse(finalCourse);

      // Show preview immediately - AI audio generated in background, arrives within ~2s
      setSyntheticAudioMap({});

      // -- Show the preview --
      setStep('preview');

      // â€”â€” Kick off module image generation in background (non-blocking) â€”â€”
      setIsGeneratingImages(true);
      generateModuleImages(finalCourse, (slideId, imageDataUrl) => {
        setCourse((prev: any) => prev ? applyCoverImageToCourse(prev, slideId, imageDataUrl) : prev);
      }).finally(() => setIsGeneratingImages(false));

      // â€”â€” Kick off main TTS in background (module content slides) â€”â€”
      if (voiceOverEnabled) {
        generateTTS(finalCourse, setCourse, ttsVoice);

        // Background: generate TTS for module covers + overviews (NOT cover/player-tour â€” already done)
        ;(async () => {
          try {
            const { generateSlideTTS: genSlideTTS } = await import('./services/ttsService');

            // Cover + Player Tour FIRST (shown immediately when preview opens)
            for (const { id, text } of [
              { id: '__cover__', text: `Welcome to ${finalCourse.title}. ${finalCourse.description || ''}`.trim() },
              { id: '__player-tour__', text: 'Before we begin, take a moment to explore the player controls. Hover over each card to see the corresponding element highlighted in the player preview.' },
            ]) {
              if (!text.trim()) continue;
              try {
                const url = await genSlideTTS(text, { voice: ttsVoice as any });
                setSyntheticAudioMap(prev => ({ ...prev, [id]: url }));
              } catch { /* non-fatal */ }
            }

            const moduleSynthetics: Array<{ id: string; text: string }> = (finalCourse.modules || []).flatMap(
              (m: any, idx: number) => {
                const modNum = idx + 1;
                const ct = (m.title || `Module ${modNum}`)
                  .replace(/^Module\s+\d+\s*[\u2014\-]\s*/i, '')
                  .trim();
                return [
                  {
                    id: `__module-cover-${modNum}__`,
                    text: `Module ${modNum}: ${ct}.${m.description ? ' ' + m.description : ''}`.trim(),
                  },
                  {
                    id: `__module-overview-${modNum}__`,
                    text: `Hello, welcome to Module ${modNum}: ${ct}. ${
                      m.description
                        ? `In this module, you'll cover ${m.description}`
                        : "Let's look at the learning objectives for this module."
                    }`,
                  },
                ];
              }
            );
            for (const { id, text } of moduleSynthetics) {
              if (!text.trim()) continue;
              try {
                const url = await genSlideTTS(text, { voice: ttsVoice as any });
                setSyntheticAudioMap(prev => ({ ...prev, [id]: url }));
              } catch { /* non-fatal */ }
              await new Promise(r => setTimeout(r, 300));
            }
          } catch { /* silently ignore */ }
        })();

      } // end if (voiceOverEnabled)

      // â”€â”€ Auto QC runs silently in background â€” preview is already visible â”€â”€
      try {
        setIsRunningQC(true);
        setQcPhase('structural');
        const report = await runFullQC(finalCourse, voiceOverEnabled, (phase) => setQcPhase(phase));
        setQcReport(report);
        // Apply auto-fixable issues silently
        if (report.issues.some(i => i.autoFixable)) {
          const { course: fixedCourse } = autoFixCourse(finalCourse, report);
          setCourse(fixedCourse);
          setOriginalCourse(fixedCourse);
        }
      } catch {
        // QC failure is non-fatal â€” proceed with original course
      } finally {
        setIsRunningQC(false);
        setQcPhase(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsHydrating(false);
      setProgress(0);
    }
  };

  const exportScorm = async () => {
    if (!course || isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const blob = await createScormPackage(course, {
        version: scormVersion,
        onProgress: (pct) => setExportProgress(pct),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.title.replace(/\s+/g, '_')}_SCORM${scormVersion === '2004' ? '2004' : '12'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Failed to export SCORM', e);
      alert('SCORM export failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
      setExportProgress(0);
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
                {isRunningQC
                  ? (qcPhase === 'structural' ? 'Checking Structure & Formatâ€¦'
                     : qcPhase === 'ai'       ? 'Running AI Quality Scanâ€¦'
                     : 'Finalisingâ€¦')
                  : isGenerating ? 'Structuring Module Flow...' : 'Synthesizing Course Content...'}
              </h3>
              <p className="text-slate-400 text-lg">
                {isRunningQC
                  ? (qcPhase === 'ai' ? 'AI is reviewing spelling, grammar, and clarity. Almost thereâ€¦' : 'Running instant checks on your course contentâ€¦')
                  : isGenerating ? 'Analyzing topics and creating progressive learning paths. This usually takes 10-15 seconds.' : 'Generating detailed slide content, interactions, and knowledge checks. This can take up to a minute.'}
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

  // â”€â”€ Interactive Timeline Preview Component â”€â”€
  const TimelinePreviewDemo = () => {
    const [openStep, setOpenStep] = React.useState<number | null>(null);
    const steps = [
      { n: 1, title: 'Preparation', content: 'Establish IR policies, train your teams, and set up communication channels before an incident occurs.', color: 'bg-blue-500', border: 'border-blue-500/50' },
      { n: 2, title: 'Identification', content: 'Detect and determine whether a security incident has actually occurred using monitoring tools and alerts.', color: 'bg-yellow-500', border: 'border-yellow-500/50' },
      { n: 3, title: 'Containment', content: 'Limit the damage and prevent further spread. Short-term containment isolates affected systems.', color: 'bg-orange-500', border: 'border-orange-500/50' },
      { n: 4, title: 'Eradication', content: 'Remove the root cause â€” eliminate malware, close vulnerabilities, and patch systems.', color: 'bg-red-500', border: 'border-red-500/50' },
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
                  <span className="text-slate-500 text-xs group-hover:text-slate-300 transition-colors">{openStep === i ? 'â–² Close' : 'â–¼ Details'}</span>
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

  // â”€â”€ Auth Gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Loading spinner while Supabase session is restoring
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated â€” show Public Marketing Homepage OR Sign In/Up page
  if (!user && !isScormPlayer) {
    if (publicView === 'auth') {
      return (
        <AuthPage
          onBackToHome={() => { setPublicView('homepage'); window.history.pushState({}, '', '/'); }}
          initialMode={authInitialMode}
        />
      );
    }
    if (publicView === 'methodology') {
      return (
        <MethodologyPage
          onGetStarted={() => { setAuthInitialMode('signup'); setPublicView('auth'); window.history.pushState({}, '', '/signup'); }}
          onBack={() => { setPublicView('homepage'); window.history.pushState({}, '', '/'); }}
        />
      );
    }
    if (publicView === 'pricing') {
      return (
        <div className="min-h-screen bg-slate-950">
          <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <button onClick={() => { setPublicView('homepage'); window.history.pushState({}, '', '/'); }}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="font-extrabold text-lg text-white">NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span></span>
              </div>
              <button onClick={() => { setAuthInitialMode('signup'); setPublicView('auth'); window.history.pushState({}, '', '/signup'); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap shrink-0">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
          <PricingPage />
        </div>
      );
    }
    if (publicView === 'examples') {
      return (
        <ExamplesPage
          onBack={() => { setPublicView('homepage'); window.history.pushState({}, '', '/'); }}
          onGetStarted={() => { setAuthInitialMode('signup'); setPublicView('auth'); window.history.pushState({}, '', '/signup'); }}
        />
      );
    }
    return (
      <MarketingHomepage
        onGetStarted={() => { setAuthInitialMode('signup'); setPublicView('auth'); window.history.pushState({}, '', '/signup'); }}
        onSignIn={() => { setAuthInitialMode('login'); setPublicView('auth'); window.history.pushState({}, '', '/login'); }}
        onMethodology={() => { setPublicView('methodology'); window.history.pushState({}, '', '/methodology'); }}
        onViewPricing={() => { setPublicView('pricing'); window.history.pushState({}, '', '/pricing'); window.scrollTo(0, 0); }}
        onExamples={() => { setPublicView('examples'); window.history.pushState({}, '', '/examples'); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Help & Support floating widget â€” hidden during course preview to avoid covering Next button */}
      {step !== 'preview' && <HelpWidget userEmail={user?.email ?? ''} userId={user?.id} />}
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen overflow-hidden transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen transform -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay"></div>
      </div>

      <header className="relative z-[600] border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 relative group cursor-pointer" onClick={() => setStep('home')}>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all">
              <Zap className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>
          
          <div className="flex gap-3 items-center">


            {/* â”€â”€ Pricing Button â”€â”€ */}
            <button
              onClick={() => setStep('pricing')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-bold text-sm transition-all ${
                step === 'pricing'
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-300'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Pricing
            </button>

            {/* â”€â”€ User Profile â”€â”€ */}
            {user && (
              <div className="relative">
                {adminDropdownOpen && (
                  <div className="fixed inset-0 z-[699]" onClick={() => setAdminDropdownOpen(false)} />
                )}
                <button onClick={() => setAdminDropdownOpen(o => !o)} className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-slate-600 transition-all">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-slate-200 text-sm font-semibold max-w-[100px] truncate hidden sm:block">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* Dropdown â€” click controlled */}
                {adminDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden z-[700]">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-xs font-bold text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                        Corporate
                      </p>
                      {isAdmin && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">Admin</span>
                      )}
                    </div>
                  </div>
                  <div className="p-1.5">
                    {/* Sandbox â€” admin only */}
                    {isAdmin && (
                      <>
                        <div className="px-3 py-1.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Sandbox</p>
                        </div>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            setCourseTitle('Advanced Workplace Communication');
                            setCourseDescription('A comprehensive eLearning course covering modern workplace communication strategies.');
                            setLearningObjectives([{ terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration.', enablingObjectives: [] }]);
                            setCourseType('standard'); setPreset('standard');
                            setIsSandboxMode(true); setShowPlayerProperties(false); setStep('details');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <FileText className="w-3.5 h-3.5" /> Demo â€” Course Design
                        </button>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            setCourse(DUMMY_COURSE); setOriginalCourse(DUMMY_COURSE);
                            setCurrentSlideIndex(0); setQuizState({}); setTheme('dark'); setViewMode('desktop');
                            setFloatingImagesMap({}); setSyntheticSlideOverrides({}); setCourseBg('/eLearning Template Backgrounds/Neutral/blue background coffee books_01.png');
                            setIsSandboxMode(true); setShowPlayerProperties(false);
                            setExamQuestions(DUMMY_EXAM_QUESTIONS); setExamConfig(DUMMY_COURSE.examConfig!);
                            setExamPhase('idle'); setHighestVisitedIndex(0);
                            setPlayerConfig(prev => ({ ...prev, playerResolution: '16:9' }));
                            setNavigationMode(DUMMY_COURSE.navigationMode ?? 'free'); setStep('preview');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <Eye className="w-3.5 h-3.5" /> Demo â€” Course Development
                        </button>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            setBuildMode('game');
                            setSelectedGameType('jeopardy');
                            setPrompt('Workplace Communication Skills');
                            setUploadedFile(null);
                            setExtractedFileText('');
                            setIsSandboxMode(true);
                            setStep('home');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <Gamepad2 className="w-3.5 h-3.5" /> Demo â€” Game Mode
                        </button>
                        <div className="border-t border-slate-800 my-1" />
                        {/* Trial Invites â€” admin only */}
                        <button
                          onClick={() => {
                              setAdminDropdownOpen(false);
                              setAdminToken(session?.access_token ?? '');
                              setShowTrialInvitePanel(true);
                            }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-300 hover:bg-amber-500/10 text-sm font-medium transition-all text-left"
                        >
                          <Send className="w-3.5 h-3.5" /> Trial Invites
                        </button>
                        <div className="border-t border-slate-800 my-1" />
                      </>
                    )}

                    <button
                      onClick={() => { setAdminDropdownOpen(false); setStep('account'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all text-left"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      My Account &amp; Billing
                    </button>
                    <button
                      onClick={() => { setAdminDropdownOpen(false); signOut(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all text-left"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        <AnimatePresence mode="wait">
          {step === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="relative z-10"
            >
              <PricingPage />
            </motion.div>
          )}
          {step === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="relative z-10"
            >
              <AccountPage onUpgrade={() => setStep('pricing')} />
            </motion.div>
          )}
          {step === 'payment-success' && (
            <motion.div key="payment-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PaymentSuccessPage onContinue={() => setStep('home')} />
            </motion.div>
          )}
          {step === 'payment-cancel' && (
            <motion.div key="payment-cancel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PaymentCancelPage
                onBackToPricing={() => setStep('pricing')}
                onBackToHome={() => setStep('home')}
              />
            </motion.div>
          )}

          {/* Publish Warning â€” pending QC items */}
          {showQcPublishWarning && (
            <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQcPublishWarning(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl p-6 w-full max-w-md"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black text-white">Pending QC Items</h3>
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                      Your QC report has <span className="text-amber-300 font-bold">
                        {qcReport ? qcReport.issues.filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)).length : 0} unreviewed item{(qcReport ? qcReport.issues.filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)).length : 0) !== 1 ? 's' : ''}
                      </span> that haven't been confirmed or declined yet.
                    </p>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      You can review them first, or publish anyway.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6 justify-end">
                  <button
                    onClick={() => { setShowQcPublishWarning(false); setQcModalOpen(true); }}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition-all hover:bg-slate-800"
                  >
                    Review QC Items
                  </button>
                  <button
                    onClick={() => { setShowQcPublishWarning(false); exportScorm(); }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
                  >
                    Publish Anyway
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* App Image Picker Modal */}
          <AppImagePickerModal
            isOpen={showAppImagePicker}
            onClose={() => setShowAppImagePicker(false)}
            theme={theme}
            onInsert={(url) => {
              if (!currentSlide) return;
              setFloatingImagesMap(prev => ({
                ...prev,
                [currentSlide.id]: [
                  ...(prev[currentSlide.id] || []),
                  { id: `fi-lib-${Date.now()}`, url, x: 40, y: 40, width: 320, height: 240 },
                ],
              }));
            }}
          />

          {/* AI Edit Drawer â€” scenario and game-template slides */}
          <AnimatePresence>
            {showAIEditDrawer && currentSlide && (['scenario', 'game-template', 'knowledge-check', 'mastery-exam'].includes(currentSlide.type)) && (
              <AIEditDrawer
                slideType={currentSlide.type as any}
                slideTitle={currentSlide.title}
                currentData={currentSlide.data ?? {}}
                courseContext={course?.title ?? prompt}
                theme={theme}
                onApply={(newData) => {
                  if (!course || !currentSlide) return;
                  const updated = {
                    ...course,
                    modules: course.modules.map(mod => ({
                      ...mod,
                      slides: mod.slides.map(sl =>
                        sl.id === currentSlide.id ? { ...sl, data: newData } : sl
                      ),
                    })),
                  };
                  pushUndo(); setCourse(updated);
                }}
                onClose={() => setShowAIEditDrawer(false)}
              />
            )}
          </AnimatePresence>

          {/* Draft Courses Panel - Pro feature */}
          {course && (
            <DraftCoursesPanel
              isOpen={showDraftsPanel}
              onClose={() => setShowDraftsPanel(false)}
              theme={theme}
              drafts={draftManager.drafts}
              slotsUsed={draftManager.slotsUsed}
              slotsTotal={draftManager.slotsTotal}
              canSave={draftManager.canSave}
              isAuthenticated={!!user}
              currentCourseTitle={course?.title}
              onSave={handleSaveDraft}
              onLoad={handleLoadDraft}
              onDelete={(id) => draftManager.deleteDraft(id)}
              onReplace={handleReplaceDraft}
              saveMessage={draftSaveMessage}
            />
          )}

          {/* QC Track Changes Modal â€” overlays preview, persists across open/close */}
          <QCTrackChangesModal
            open={qcModalOpen}
            report={qcReport}
            loading={qcLoading}
            loadingPhase={qcPhase}
            confirmed={qcConfirmed}
            declined={qcDeclined}
            onConfirm={(id) => {
              setQcConfirmed(prev => new Set([...prev, id]));
              setQcDeclined(prev => { const n = new Set(prev); n.delete(id); return n; });
            }}
            onDecline={(id) => {
              setQcDeclined(prev => new Set([...prev, id]));
              setQcConfirmed(prev => { const n = new Set(prev); n.delete(id); return n; });
            }}
            onConfirmAll={(ids) => {
              setQcConfirmed(prev => new Set([...prev, ...ids]));
              setQcDeclined(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
            }}
            onDeclineAll={(ids) => {
              setQcDeclined(prev => new Set([...prev, ...ids]));
              setQcConfirmed(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
            }}
            onClose={() => setQcModalOpen(false)}
            onGoToSlide={(moduleIndex, slideIndex) => {
              if (course?.modules) {
                let globalIdx = 0;
                for (let m = 0; m < moduleIndex; m++) {
                  globalIdx += course.modules[m]?.slides?.length ?? 0;
                }
                globalIdx += slideIndex;
                setCurrentSlideIndex(globalIdx);
              }
              setQcModalOpen(false);
            }}
            onSimplify={(moduleIndex, slideIndex) => {
              pushUndo(); setCourse(simplifySlide(course, moduleIndex, slideIndex));
              // Remove resolved issue from report
              setQcReport(prev => prev ? {
                ...prev,
                issues: prev.issues.filter(i =>
                  !(i.moduleIndex === moduleIndex && i.slideIndex === slideIndex && i.type === 'interaction_empty')
                ),
                totalIssues: prev.totalIssues - 1,
                errors: Math.max(0, prev.errors - 1),
              } : null);
            }}
            onRegenerate={async (moduleIndex, slideIndex, slideId) => {
              const slide = course?.modules?.[moduleIndex]?.slides?.[slideIndex];
              if (!slide) return;
              try {
                const newData = await regenerateSlideData(slide, course.title ?? '');
                const cloned = JSON.parse(JSON.stringify(course));
                cloned.modules[moduleIndex].slides[slideIndex].data = newData;
                pushUndo(); setCourse(cloned);
                // Remove the resolved empty-interaction issue
                setQcReport(prev => prev ? {
                  ...prev,
                  issues: prev.issues.filter(i => !(i.slideId === slideId && i.type === 'interaction_empty')),
                  totalIssues: Math.max(0, prev.totalIssues - 1),
                  errors: Math.max(0, prev.errors - 1),
                } : null);
              } catch (err) {
                console.error('[QC] Regeneration failed:', err);
                // Non-fatal â€” user can retry or use simple layout
              }
            }}
            onRunScan={async () => {
              setQcConfirmed(new Set());
              setQcDeclined(new Set());
              setQcReport(null);
              setQcLoading(true);
              try {
                const report = await runFullQC(course, voiceOverEnabled, (phase) => setQcPhase(phase));
                setQcReport(report);
              } catch {
                setQcReport(null);
              } finally {
                setQcLoading(false);
                setQcPhase(null);
              }
            }}
            onApply={(confirmedIds) => {
              if (course && qcReport) {
                const fixed = applyConfirmedFixes(course, confirmedIds, qcReport);
                pushUndo(); setCourse(fixed);
              }
              // Clear resolved report after applying
              setQcReport(null);
              setQcConfirmed(new Set());
              setQcDeclined(new Set());
              setQcModalOpen(false);
            }}
          />


          {step === 'home' && (

            <motion.div key="home" className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-5rem)] relative z-10 overflow-hidden">


              {isAnalyzing ? (
                 <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8 w-full px-6 py-16 bg-slate-950/80 backdrop-blur-xl rounded-[3rem] border border-indigo-500/30 shadow-2xl">
                   {analyzeError ? (
                     /* â€”â€”â€” Error state: stay on overlay, show message + actions â€”â€”â€” */
                     <>
                       <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                         <AlertCircle className="w-10 h-10 text-red-400" />
                       </div>
                       <div>
                         <h3 className="text-2xl font-bold text-red-400">Analysis Failed</h3>
                         <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-md mx-auto">{analyzeError}</p>
                       </div>
                       <div className="flex gap-3 justify-center">
                         <button
                           onClick={() => { if (uploadedFile) runAnalysis(uploadedFile); }}
                           className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                         >
                           Try Again
                         </button>
                         <button
                           onClick={() => { setIsAnalyzing(false); setAnalyzeError(null); setUploadedFile(null); setProgress(0); }}
                           className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                         >
                           Cancel
                         </button>
                       </div>
                     </>
                   ) : (
                     /* â€”â€”â€” Normal loading state â€”â€”â€” */
                     <>
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
                       {/* Progress bar â€” driven by the analysisTimer in runAnalysis */}
                       <div className="w-full max-w-sm mx-auto space-y-2">
                         <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                           <span>Progress</span>
                           <span>{Math.round(progress)}%</span>
                         </div>
                         <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                           <div
                             className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                             style={{ width: `${progress}%` }}
                           />
                         </div>
                         <p className="text-xs text-slate-600 text-center">
                           {progress < 30 ? 'Reading document structure...' :
                            progress < 55 ? 'Extracting topics and key concepts...' :
                            progress < 80 ? 'Generating learning objectives...' :
                            'Finalizing course blueprint...'}
                         </p>
                       </div>
                     </>
                   )}
                 </div>
              ) : (
                <div className="relative z-10 max-w-4xl mx-auto text-center w-full px-6 py-12 bg-slate-950/40 backdrop-blur-md rounded-[3rem] border border-indigo-500/20 shadow-2xl space-y-8 my-8">
                  {/* Title */}
                  <div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
                      NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-extrabold pb-2">AI</span>
                    </h1>
                    <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto">
                      Transform Any Document Into a Complete eLearning Experience
                    </p>
                  </div>

                   {/* Mode Cards â€” 3-column */}
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                     <button
                       onClick={() => setBuildMode('course')}
                       className={`p-5 rounded-2xl border-2 text-left transition-all ${buildMode === 'course' ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'}`}
                     >
                       <div className="flex items-center gap-3 mb-2">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${buildMode === 'course' ? 'bg-indigo-500/30' : 'bg-indigo-500/10'}`}>
                           <BookOpen className="w-5 h-5 text-indigo-400" />
                         </div>
                         <span className="font-extrabold text-white text-base">Course Builder</span>
                       </div>
                       <p className="text-sm text-slate-400 leading-relaxed">Full AI course with slides, quizzes &amp; narration. SCORM-ready for your LMS.</p>
                     </button>
                     <button
                       onClick={() => setBuildMode('game')}
                       className={`p-5 rounded-2xl border-2 text-left transition-all ${buildMode === 'game' ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10' : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'}`}
                     >
                       <div className="flex items-center gap-3 mb-2">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${buildMode === 'game' ? 'bg-purple-500/30' : 'bg-purple-500/10'}`}>
                           <Gamepad2 className="w-5 h-5 text-purple-400" />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="font-extrabold text-white text-base">Game Mode</span>
                           <span className="text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">New</span>
                         </div>
                       </div>
                       <p className="text-sm text-slate-400 leading-relaxed">Standalone game from any document. Jeopardy, Millionaire, Escape Room &amp; more â€” in 30 sec.</p>
                     </button>
                     <button
                       onClick={() => setBuildMode('workflow')}
                       className={`p-5 rounded-2xl border-2 text-left transition-all ${buildMode === 'workflow' ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10' : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'}`}
                     >
                       <div className="flex items-center gap-3 mb-2">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${buildMode === 'workflow' ? 'bg-violet-500/30' : 'bg-violet-500/10'}`}>
                           <Activity className="w-5 h-5 text-violet-400" />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="font-extrabold text-white text-base">Workflow Insights</span>
                           <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">AI</span>
                         </div>
                       </div>
                       <p className="text-sm text-slate-400 leading-relaxed">Detect what you've been working on and auto-suggest relevant eLearning courses to build.</p>
                     </button>
                   </div>

                  {/* Main input area â€” hidden in Workflow Insights mode */}
                  {buildMode !== 'workflow' ? (
                   <div className="w-full flex flex-col items-center gap-4 max-w-xl mx-auto">
                     {/* File upload */}
                     <div className="w-full flex flex-col items-center justify-center gap-4 px-8 py-8 bg-slate-900/80 rounded-2xl border-[2px] border-dashed border-indigo-500/50 hover:border-indigo-400 hover:bg-slate-800/90 transition-all cursor-pointer relative group">
                       <input
                         type="file"
                         onChange={(e) => { handleFileUpload(e); }}
                         className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                         accept=".pdf,.docx,.pptx,.txt"
                       />
                       <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                         <FileUp className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                       </div>
                       <div className="text-center">
                         <span className="text-xl text-white font-bold block mb-1">
                           {uploadedFile ? 'File Ready âœ“' : 'Upload File to Begin'}
                         </span>
                         <span className="text-sm text-indigo-300/70 font-medium group-hover:text-indigo-300 transition-colors">
                           {uploadedFile ? uploadedFile.name : 'Drop PDF, Word, or PowerPoint files here'}
                         </span>
                       </div>
                     </div>

                     {/* Game Mode: topic input + game type selector */}
                     {buildMode === 'game' && (
                      <>
                        <div className="w-full space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left flex">Topic (or use uploaded file above)</label>
                          <input
                            type="text"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="e.g. Workplace Safety, Customer Service Excellence..."
                            className="w-full bg-slate-900/80 border border-slate-700 hover:border-slate-600 focus:border-purple-500 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>

                        <div className="w-full">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-left flex">Select Game Type</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            {([
                              { id: 'jeopardy',       label: 'Jeopardy',    icon: 'ðŸŽ¯', desc: 'Category board' },
                              { id: 'millionaire',    label: 'Millionaire', icon: 'ðŸ’°', desc: '12-question climb' },
                              { id: 'family-feud',    label: 'Family Feud', icon: 'ðŸ‘¥', desc: 'Ranked surveys' },
                              { id: 'escape-room',    label: 'Escape Room', icon: 'ðŸ”', desc: 'Narrative stages' },
                              { id: 'spin-wheel',     label: 'Spin Wheel',  icon: 'ðŸŽ¡', desc: 'Random segments' },
                              { id: 'price-is-right', label: 'Price Is Right', icon: 'ðŸ“Š', desc: 'Estimation game' },
                            ] as const).map(g => (
                              <button
                                key={g.id}
                                onClick={() => setSelectedGameType(g.id as GameTemplateType)}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${selectedGameType === g.id ? 'border-purple-500 bg-purple-500/15' : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60'}`}
                              >
                                <span className="text-2xl">{g.icon}</span>
                                <span className={`text-xs font-bold ${selectedGameType === g.id ? 'text-purple-300' : 'text-slate-300'}`}>{g.label}</span>
                                <span className="text-[10px] text-slate-500">{g.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleGenerateGame}
                          disabled={isGenerating || (!prompt && !uploadedFile)}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-purple-500/25 border border-purple-500/50 text-lg"
                        >
                          {isGenerating
                            ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Game...</>
                            : <><Gamepad2 className="w-5 h-5" /> Generate Game</>}
                        </button>
                      </>
                    )}

                    {/* Course Builder buttons */}
                    {buildMode === 'course' && (
                      <>
                        <p className="text-sm text-slate-400 font-medium">AI-powered authoring that analyzes your content and builds a complete, SCORM-compliant, interactive course â€” automatically.</p>
                        <button
                          onClick={() => handleStartDetails()}
                          disabled={!uploadedFile}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-indigo-500/25 border border-indigo-500/50 text-xl"
                        >
                          Start Configuration
                          <ArrowRight className="w-6 h-6" />
                        </button>
                        <div className="w-full flex items-center gap-6 opacity-60 justify-center">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> SCORM Compliant</span>
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> AI Generated</span>
                        </div>
                      </>
                    )}
                   </div>
                  ) : (
                    /* â”€â”€ Workflow Insights Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                    <WorkflowInsightsPanel
                      onGenerateCourse={(topic) => {
                        // Pre-fill topic, switch to Course Builder, auto-start
                        setBuildMode('course');
                        setPrompt(topic);
                        // Small delay so state settles before starting details
                        setTimeout(() => handleStartDetails(), 50);
                      }}
                    />
                  )}
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
                      <h2 className="text-3xl font-extrabold text-white flex-1">Course Design</h2>
                    </div>
                    {/* Replace Document button â€” separate from nav click area */}
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
                           {getPresetOptions('corporate').map(p => (
                             <div key={p.id} onClick={() => handlePresetChange(p.id as any)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${preset === p.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'} ${isSuggesting && preset !== p.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                <h4 className="text-white font-bold text-lg mb-1">{p.label}</h4>
                                <p className="text-slate-400 text-xs mb-3">{p.description}</p>
                                <div className="text-xs font-mono text-indigo-400">{p.slideCountTarget} slides â€¢ {p.interactions.length} types</div>
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
                               rows={5}
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
                                 // Always call the AI to refine objectives for the selected format
                                 // (works the same way in sandbox/demo mode and real course creation)
                                 handleFormatChange(fmt);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${objectiveFormat === fmt ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                              >
                                {isSuggesting && objectiveFormat === fmt ? (
                                  <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />{fmt}</span>
                                ) : fmt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Refine Objectives button â€” always visible when title/description exists */}
                        {(courseTitle || courseDescription || prompt) && (
                          <div className="px-6 pb-4 pt-2 bg-slate-900/50 border-b border-slate-800">
                            <button
                              onClick={handleSuggestObjectives}
                              disabled={isSuggesting || (!prompt && !courseDescription && !courseTitle)}
                              className="flex items-center justify-center gap-2 px-6 py-3 w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl font-bold transition-colors border border-purple-500/30 disabled:opacity-50"
                            >
                              {isSuggesting ? (
                                <><Loader2 className="w-5 h-5 animate-spin" />Refining Objectives...</>
                              ) : (
                                <><Wand2 className="w-5 h-5" />Refine Objectives</>
                              )}
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
                                          rows={4}
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
                                        <div className="mt-2 text-slate-600 shrink-0">â†³</div>
                                        <textarea 
                                          rows={3}
                                          value={enablingObj} 
                                          onChange={(e) => {
                                            const newObjs = [...learningObjectives];
                                            const currentObj = newObjs[i] as TerminalObjectiveGroup;
                                            const newEnabling = [...currentObj.enablingObjectives];
                                            newEnabling[eIdx] = e.target.value;
                                            newObjs[i] = { ...currentObj, enablingObjectives: newEnabling };
                                            setLearningObjectives(newObjs);
                                          }}
                                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:border-slate-500 outline-none transition-all placeholder-slate-700 text-sm resize-none"
                                          placeholder="e.g., The learner will identify the target audience..."
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


                     {/* Mastery Quiz Configuration */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 w-full space-y-5">
                   <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center"><Target className="w-5 h-5 text-indigo-400" /></div>
                     <div>
                       <h3 className="text-xl font-bold text-white">Mastery Quiz</h3>
                       <p className="text-xs text-slate-500">Final assessment appended after course content</p>
                     </div>
                   </div>
                   <div onClick={() => setExamConfig(c => ({ ...c, enabled: !c.enabled }))} className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${examConfig.enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                     <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${examConfig.enabled ? 'translate-x-6' : ''}`} />
                   </div>
                   </div>
                   {examConfig.enabled && (
                   <div className="space-y-5 pt-3 border-t border-slate-800">
                     <div>
                       <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-300">Passing Score</span><span className="text-indigo-400 font-extrabold">{examConfig.passingScore}%</span></div>
                       <input type="range" min="50" max="100" value={examConfig.passingScore} onChange={e => setExamConfig(c => ({ ...c, passingScore: Number(e.target.value) }))} className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                       <div className="flex justify-between text-xs text-slate-600 mt-1"><span>50%</span><span>100%</span></div>
                     </div>
                     <div><p className="text-sm font-bold text-slate-300 mb-2">Question Count Mode</p>
                       <div className="flex gap-2">
                         {(['total', 'per-module'] as const).map(m => (<button key={m} onClick={() => setExamConfig(c => ({ ...c, questionMode: m }))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${examConfig.questionMode === m ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>{m === 'total' ? 'Total' : 'Per Module'}</button>))}
                       </div>
                     </div>
                     <div><p className="text-sm font-bold text-slate-300 mb-2">{examConfig.questionMode === 'total' ? 'Total Questions' : 'Questions per Module'}</p>
                       <div className="flex items-center gap-3">
                         <button onClick={() => setExamConfig(c => ({ ...c, questionCount: Math.max(1, c.questionCount - 1) }))} className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-extrabold text-xl flex items-center justify-center">-</button>
                         <span className="text-white font-extrabold text-xl w-8 text-center">{examConfig.questionCount}</span>
                         <button onClick={() => setExamConfig(c => ({ ...c, questionCount: c.questionCount + 1 }))} className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-extrabold text-xl flex items-center justify-center">+</button>
                       </div>
                     </div>
                     <div><p className="text-sm font-bold text-slate-300 mb-2">Question Types</p>
                       <div className="flex gap-2 flex-wrap">
                         {([['mc','Multiple Choice'],['ma','Multiple Answer'],['tf','True / False']] as [string,string][]).map(([type,label]) => { const active = examConfig.questionTypes.includes(type as any); return (<button key={type} onClick={() => setExamConfig(c => ({ ...c, questionTypes: active ? c.questionTypes.filter(t => t !== type) : [...c.questionTypes, type as any] }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>{label}</button>); })}
                       </div>
                     </div>
                     <div><p className="text-sm font-bold text-slate-300 mb-2">Presentation Mode</p>
                       <div className="flex gap-2">
                         {([['one-at-a-time','One at a Time'],['scroll-all','All at Once']] as [string,string][]).map(([m,label]) => (<button key={m} onClick={() => setExamConfig(c => ({ ...c, presentationMode: m as any }))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${examConfig.presentationMode === m ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>{label}</button>))}
                       </div>
                     </div>
                     <label className="flex items-center justify-between cursor-pointer">
                       <div><p className="text-sm font-bold text-slate-300">Allow Retake on Fail</p><p className="text-xs text-slate-600">Disabled = learner must restart full course</p></div>
                       <div onClick={() => setExamConfig(c => ({ ...c, allowRetake: !c.allowRetake }))} className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${examConfig.allowRetake ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${examConfig.allowRetake ? 'translate-x-6' : ''}`} /></div>
                     </label>
                   </div>
                   )}
                     </div>

                     {/* Navigation Mode */}
                     <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 w-full space-y-4">
                   <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><Lock className="w-5 h-5 text-amber-400" /></div>
                   <div><h3 className="text-xl font-bold text-white">Navigation Mode</h3><p className="text-xs text-slate-500">Controls how learners move through course slides</p></div>
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                   {([{mode:'free' as NavigationMode,label:'Free Roam',desc:'Click any slide at any time'},{mode:'linear' as NavigationMode,label:'Linear',desc:'Next button only - no menu skipping'},{mode:'restricted' as NavigationMode,label:'Restricted',desc:'Next to advance; revisit viewed slides via menu'}]).map(({mode,label,desc}) => (<button key={mode} onClick={() => setNavigationMode(mode)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${navigationMode === mode ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}><div className="flex-1"><p className="text-sm font-bold">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>{navigationMode === mode && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}</button>))}
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
                           <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-6">CLICK TO SELECT â€¢ CLICK ON EYE ICON TO PREVIEW</p>
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
                               { id: 'scenario', label: 'Scenario' },
                               { id: 'tabbed-horizontal', label: 'Tabs (Horizontal)' },
                               { id: 'tabbed-vertical', label: 'Tabs (Vertical)' },
                               { id: 'folder-explorer', label: 'Folder Explorer' },
                               { id: 'carousel-panel', label: 'Carousel Panel' },
                               { id: 'click-reveal', label: 'Click & Reveal' },
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

                      {/* Decision Simulation Config â€” shown immediately when 'scenario' is selected */}
                      {interactionTypes.includes('scenario') && (
                        <ScenarioBuilderPanel
                          config={scenarioConfig}
                          onChange={setScenarioConfig}
                        />
                      )}

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
                           <p className="text-xs text-orange-400 font-bold tracking-widest uppercase mb-5">CLICK TO SELECT â€¢ CLICK ON EYE ICON TO PREVIEW</p>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {getRecommendedGames(preset).map((gt: any) => {
                              const isSelected = gameTemplateIds.includes(gt.id);
                              const NICKNAMES: Record<string, {emoji:string; aka:string}> = {
                                'jeopardy': { emoji: 'ðŸ“º', aka: 'aka Jeopardy!' },
                                'knowledge-board': { emoji: 'ðŸ“º', aka: 'aka Jeopardy!' },
                                'millionaire': { emoji: 'ðŸ’°', aka: "aka Who Wants to Be a Millionaire" },
                                'millionaire-challenge': { emoji: 'ðŸ’°', aka: "aka Who Wants to Be a Millionaire" },
                                'family-feud': { emoji: 'ðŸ‘¨â€ðŸ‘©â€ðŸ‘§', aka: 'aka Family Feud' },
                                'ranked-survey': { emoji: 'ðŸ‘¨â€ðŸ‘©â€ðŸ‘§', aka: 'aka Family Feud' },
                                'escape-room': { emoji: 'ðŸ”’', aka: 'aka Digital Escape Room' },
                                'digital-escape-room': { emoji: 'ðŸ”’', aka: 'aka Digital Escape Room' },
                                'spin-wheel': { emoji: 'ðŸŽ¡', aka: 'aka Spin the Wheel' },
                                'spin-the-wheel': { emoji: 'ðŸŽ¡', aka: 'aka Spin the Wheel' },
                                'price-is-right': { emoji: 'ðŸ·ï¸', aka: "aka The Price is Right" },
                                'price-estimator': { emoji: 'ðŸ·ï¸', aka: "aka The Price is Right" },
                              };
                              const nick = NICKNAMES[gt.id] || { emoji: 'ðŸŽ®', aka: '' };
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

                      {/* Item 5: Soft advisory warning for large interaction selections */}
                      {(interactionTypes.length + gameTemplateIds.length) > 5 && (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-300">Large selection detected</p>
                            <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
                              {`You've selected ${interactionTypes.length + gameTemplateIds.length} interaction/game types. Larger selections increase slide count and generation time. Consider narrowing to 3-5 types for best results.`}
                            </p>
                          </div>
                        </div>
                      )}

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
                       <div className="grid grid-cols-1 gap-4">
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
                       </div>

                        {/* TTS Voice Picker â€” shown when voice-over is enabled */}
                        {voiceOverEnabled && (
                          <div className="mt-5 space-y-3">
                            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">AI Narrator Voice</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {([
                                { id: 'alloy',   label: 'Alloy',   sub: 'Neutral Â· Balanced' },
                                { id: 'echo',    label: 'Echo',    sub: 'Male Â· Measured' },
                                { id: 'fable',   label: 'Fable',   sub: 'Male Â· Warm' },
                                { id: 'onyx',    label: 'Onyx',    sub: 'Male Â· Deep' },
                                { id: 'nova',    label: 'Nova',    sub: 'Female Â· Bright' },
                                { id: 'shimmer', label: 'Shimmer', sub: 'Female Â· Soft' },
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
                                  {/* Ear preview button â€” top-right corner of card */}
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

                     {/* Footer Actions â€” Player Properties + Generate */}
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
                     pushUndo(); setCourse(reorderedCourse);
                     setOriginalCourse(reorderedCourse);
                     setCurrentSlideIndex(0);
                     setCourseBg('/eLearning Template Backgrounds/Neutral/blue background coffee books_01.png');
                     setStep('preview');
                   }
                 : hydrateCourse
               }
               onCancel={() => {
                 if (isSandboxMode) { setStep('details'); }
                 else setStep('details');
               }}
               error={error}
               sandboxMode={isSandboxMode}
             />
          )}

          {step === 'preview' && course && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed top-20 left-0 right-0 bottom-0 z-50">
              {/* Auto-landscape wrapper: CSS-rotates 90Â° on mobile portrait so the player
                  appears landscape immediately â€” no user action required. On desktop or
                  physical landscape the wrapper is a transparent full-size container. */}
              <div
                className="bg-slate-900 overflow-hidden flex flex-col"
                style={(isPortrait && !isScormPlayer) ? {
                  position: 'fixed',
                  top: '100vh',
                  left: 0,
                  width: '100vh',
                  height: '100vw',
                  transformOrigin: 'left top',
                  transform: 'rotate(90deg)',
                } : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              >
              {/* â”€â”€ Preview Top Bar â€” hidden in SCORM/published view â”€â”€ */}
              {!isScormPlayer && <div className="px-3 bg-slate-900 border-b border-slate-800 shrink-0">
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
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">Dev</span>
                    </div>
                  </div>

                  {/* âœ¨ Image generation in-progress badge */}
                  {isGeneratingImages && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block" />
                      Generating visualsâ€¦
                    </div>
                  )}

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

                    {/* Theme dropdown removed â€” Dark mode only */}

                    {/* QC Check â€” context-aware: reopen existing report if pending, or start new scan */}
                    {(() => {
                      const pendingCount = qcReport
                        ? qcReport.issues.filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)).length
                        : 0;
                      const hasPending = pendingCount > 0;
                      return (
                        <button
                          id="qc-check-button"
                          title={hasPending
                            ? `QC Report â€” ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending review (click to reopen)`
                            : 'Quality Check â€” scan for spelling, grammar, and formatting issues'}
                          onClick={async () => {
                            // If a report exists with pending items, just reopen. Don't re-scan.
                            if (qcReport && hasPending) {
                              setQcModalOpen(true);
                              return;
                            }
                            // Fresh scan
                            setQcConfirmed(new Set());
                            setQcDeclined(new Set());
                            setQcReport(null);
                            setQcModalOpen(true);
                            setQcLoading(true);
                            try {
                              const report = await runFullQC(course, voiceOverEnabled, (phase) => setQcPhase(phase));
                              setQcReport(report);
                            } catch {
                              setQcReport(null);
                            } finally {
                              setQcLoading(false);
                              setQcPhase(null);
                            }
                          }}
                          className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs transition-colors shadow-lg ${
                            hasPending
                              ? 'bg-amber-600/80 hover:bg-amber-500 text-white shadow-amber-500/10'
                              : 'bg-emerald-700/80 hover:bg-emerald-600 text-white shadow-emerald-500/10'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">{hasPending ? 'QC Pending' : 'QC Check'}</span>
                          {hasPending && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                              {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                          )}
                        </button>
                      );
                    })()}

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Save Drafts (Pro) */}
                    <button
                      title={`Save Draft (${draftManager.slotsUsed}/${draftManager.slotsTotal} slots used)`}
                      onClick={() => setShowDraftsPanel(true)}
                      className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs transition-colors text-slate-300 hover:bg-slate-700/60 border border-slate-700/50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Save</span>
                      {draftManager.slotsUsed > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          {draftManager.slotsUsed}
                        </span>
                      )}
                    </button>


                    {/* Export SCORM â€” blocked for trial users */}
                    {isTrial ? (
                      <button
                        title="Export SCORM â€” not available in trial"
                        onClick={() => setShowTrialExportModal(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-slate-400 rounded-lg font-bold text-xs cursor-pointer border border-slate-600"
                      >
                        <Download className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Export SCORM</span>
                      </button>
                    ) : (
                      <div className="flex items-center rounded-lg overflow-hidden border border-indigo-500/40 shadow-lg shadow-indigo-500/20">
                        {/* Version toggle */}
                        <button
                          title={`Switch SCORM version (current: ${scormVersion})`}
                          onClick={() => setScormVersion(v => v === '1.2' ? '2004' : '1.2')}
                          className="px-2 py-1 bg-indigo-700/60 hover:bg-indigo-600/70 text-indigo-200 text-[10px] font-black tracking-wide transition-colors border-r border-indigo-500/30"
                        >
                          {scormVersion}
                        </button>
                        {/* Export button */}
                        <button
                          title={`Export SCORM ${scormVersion} â€” download a SCORM zip package`}
                          disabled={isExporting}
                          onClick={() => {
                            const pendingCount = qcReport
                              ? qcReport.issues.filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)).length
                              : 0;
                            if (pendingCount > 0) {
                              setShowQcPublishWarning(true);
                            } else {
                              exportScorm();
                            }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-xs transition-colors"
                        >
                          {isExporting ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              <span className="hidden lg:inline">{exportProgress < 100 ? `${exportProgress}%` : 'Packagingâ€¦'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Export SCORM</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}


                    {/* Discard */}
                    <button
                      title="Discard â€” exit preview and return to the home screen"
                      onClick={() => { setCourse(null); setStep('home'); }}
                      className="p-1.5 rounded-lg border border-red-800/50 hover:bg-red-900/20 text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>

                {/* â”€â”€ Row 2: Editing tools strip â”€â”€ */}
                <div className="h-9 hidden md:flex items-center justify-end gap-1 pb-1">
                  {/* Undo */}
                  <button
                    title={undoHistory.length > 0 ? `Undo (${undoHistory.length} step${undoHistory.length !== 1 ? 's' : ''} available)` : 'Nothing to undo'}
                    onClick={handleUndo}
                    disabled={undoHistory.length === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-600/60 hover:bg-slate-700/30 text-slate-300 text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Undo2 className="w-3 h-3" /><span>Undo</span>
                  </button>

                  {/* Reset */}
                  <button
                    title="Reset â€” restore to original generated state"
                    onClick={() => { if (originalCourse) { setCourse(originalCourse); setCurrentSlideIndex(0); setQuizState({}); setFloatingImagesMap({}); setCourseBg(null); setUndoHistory([]); setSyntheticSlideOverrides({}); } }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-700/50 hover:bg-amber-800/20 text-amber-300 text-[11px] font-semibold"
                  >
                    <RotateCw className="w-3 h-3" /><span>Reset</span>
                  </button>

                  <div className="w-px h-4 bg-slate-700 mx-0.5" />

                  {/* Edit Text & Audio */}
                  <button
                    title="Edit Text & Audio â€” open the rich-text and narration editor for this slide"
                    onClick={() => { editingSlideRef.current = currentSlide; setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-700/50 hover:bg-indigo-800/20 text-indigo-300 text-[11px] font-semibold"
                  >
                    <Edit3 className="w-3 h-3" /><span>Edit Text &amp; Audio</span>
                  </button>

                  {/* Edit via AI â€” scenario and game-template slides only */}
                  {(currentSlide?.type === 'scenario' || currentSlide?.type === 'game-template') && (
                    <button
                      title="Edit via AI â€” make targeted changes to this interaction using plain language"
                      onClick={() => setShowAIEditDrawer(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-cyan-700/50 hover:bg-cyan-800/20 text-cyan-300 text-[11px] font-semibold"
                    >
                      <Sparkles className="w-3 h-3" /><span>Edit via AI</span>
                    </button>
                  )}

                  {/* Edit via AI â€” quiz, exam, knowledge-check slides */}
                  {(['knowledge-check', 'mastery-exam'].includes(currentSlide?.type ?? '')) && (
                    <button
                      title="Edit via AI â€” make targeted changes to this interaction using plain language"
                      onClick={() => setShowAIEditDrawer(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-cyan-700/50 hover:bg-cyan-800/20 text-cyan-300 text-[11px] font-semibold"
                    >
                      <Sparkles className="w-3 h-3" /><span>Edit via AI</span>
                    </button>
                  )}

                  {/* Images dropdown â€” consolidates Slide Images, Upload, Source Image */}
                  <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowImageDropdown(false); }} tabIndex={-1}>
                    <button
                      onClick={() => setShowImageDropdown(v => !v)}
                      title="Images â€” add or manage images on this slide"
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-violet-700/50 hover:bg-violet-800/20 text-violet-300 text-[11px] font-semibold"
                    >
                      <ImageIcon className="w-3 h-3" /><span>Add Image</span><ChevronDown className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                    {showImageDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 min-w-[150px]">
                        {/* Slide Images */}
                        <button
                          onClick={() => { setShowAppImagePicker(true); setShowImageDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                          <ImageIcon className="w-3 h-3 text-violet-400 shrink-0" /> Image Library
                        </button>
                        {/* Upload Image */}
                        <label
                          htmlFor="topbar-img-upload"
                          onClick={() => setShowImageDropdown(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-emerald-400 shrink-0" /> Upload Image
                          <input id="topbar-img-upload" type="file" accept="image/*" multiple className="hidden"
                            onChange={e => {
                              if (e.target.files?.length) {
                                const newImgs: FloatingImage[] = Array.from(e.target.files).map((f, i) => ({
                                  id: `fi-${Date.now()}-${i}`,
                                  url: URL.createObjectURL(f),
                                  x: 40 + i * 20, y: 40 + i * 20, width: 320, height: 240,
                                }));
                                pushUndo(); setFloatingImagesMap(prev => ({ ...prev, [currentSlide?.id]: [...(prev[currentSlide?.id] || []), ...newImgs] }));
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                        {/* Source Image */}
                        <button
                          onClick={() => { setShowImageGalleryForSlide(currentSlide?.id || null); setShowImageDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                          <Layers className="w-3 h-3 text-teal-400 shrink-0" /> Source Image
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-px h-4 bg-slate-700 mx-0.5" />

                  {/* Player Properties */}
                  <button
                    title="Player Properties â€” configure controls, TOC, aspect ratio, branding"
                    onClick={() => setShowPlayerProperties(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-orange-700/50 hover:bg-orange-800/20 text-orange-300 text-[11px] font-semibold"
                  >
                    <Settings2 className="w-3 h-3" /><span>Player Props</span>
                  </button>
                </div>
              </div>}



              {/* â”€â”€ Body: Sidebar + Main Player Area â”€â”€ */}
              <div className={cn("flex flex-row flex-1 overflow-hidden", playerConfig.playerResolution === 'full' ? 'overflow-x-hidden' : 'min-h-0')}>
                {/* Course Navigation Sidebar */}
                <CourseNavSidebar
                  modules={course.modules}
                  currentSlideIndex={currentSlideIndex}
                  allSlides={allSlides}
                  onNavigate={(idx) => {
                    if (canNavigateTo(idx)) {
                              setHighestVisitedIndex(prev => Math.max(prev, idx));
                      setCurrentSlideIndex(idx);
                    }
                  }}
                  theme={theme}
                  tocNumbering={playerConfig.tocNumbering}
                  navigationMode={navigationMode}
                  examPhase={examPhase}
                  examIntroIndex={examIntroIndex}
                  highestVisitedIndex={highestVisitedIndex}
                  defaultCollapsed={typeof window !== 'undefined' && window.innerWidth < 768}
                />

                {/* Main slide area â€” swipe left/right on mobile to navigate slides */}
                <div
                  className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden"
                  onTouchStart={handlePlayerTouchStart}
                  onTouchEnd={handlePlayerTouchEnd}
                >
                  {/* Background canvas â€” scaler measures this div to compute transform scale */}
                  <div
                    ref={viewMode === 'desktop' ? scaler.containerRef : undefined}
                    className={cn(
                      "bg-cover bg-center relative flex flex-col flex-1 overflow-hidden",
                      viewMode === 'desktop' && playerConfig.playerResolution !== 'full' ? 'items-center justify-center' : undefined
                    )}
                    style={{
                      backgroundImage: courseBg && !courseBg.startsWith('#') ? `url('${courseBg}')` : undefined,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {/* Overlay only for image backgrounds */}
                    {courseBg && !courseBg.startsWith('#') && <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />}

                  {/* Slide frame â€” aspect ratio driven by playerConfig.playerResolution.
                      16:9 / 4:3 modes render at a FIXED design size (scaler.frameStyle) and are
                      visually scaled to fit with CSS transform -- transform never affects layout,
                      so this can never overflow/crop its container the way the old `zoom`-based
                      approach did (which double-scaled an already-100%-wide flex box). 'full'
                      mode intentionally skips scaling and fills the available space directly. */}
                  <div className={cn(`theme-${theme}`,
                    "transition-all duration-500 flex flex-col relative z-10",
                    viewMode === 'desktop'
                      ? (playerConfig.playerResolution !== 'full' ? 'overflow-hidden' : 'flex-1 overflow-hidden w-full')
                      : 'shadow-2xl overflow-hidden w-[375px] h-[667px] my-4 rounded-[3rem] border-[8px] border-gray-800',
                    theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900'
                  )}
                  style={viewMode === 'desktop'
                    ? (playerConfig.playerResolution !== 'full'
                        ? {
                            ...scaler.frameStyle,
                            borderRadius: '1rem',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }
                        : undefined)
                    : undefined
                  }>
                    {/* â”€â”€ Content zone + accent strip â”€â”€ */}
                    <div className="flex-1 flex flex-row overflow-hidden">
                    {/* Per-module accent strip â€” flex column, no z-index issues */}
                    {!isFullBleed && (
                      <div
                        className="w-[3px] shrink-0 self-stretch pointer-events-none"
                        style={{ background: `linear-gradient(to bottom, ${slideAccentColor}, ${slideAccentColor}40)` }}
                      />
                    )}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                    {/* â”€â”€ Full-bleed slide frame â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide?.id || currentSlideIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          "w-full",
                          isFullBleed
                            ? "absolute inset-0 overflow-hidden"
                            : cn(
                                "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar",
                                'p-8 md:p-12 pb-4',
                                theme === 'light' ? 'bg-white text-slate-900' : theme === 'unified' ? 'bg-indigo-950 text-slate-100' : 'bg-slate-900 text-white'
                              )
                        )}
                      >
                        {!isFullBleed && (
                          <div className="w-[120%] h-[120%] absolute -top-[10%] -left-[10%] pointer-events-none opacity-[0.03] mix-blend-overlay"></div>
                        )}
                        <div className={cn(
                          isFullBleed
                            ? "w-full h-full"
                            : "relative z-10 w-full flex flex-col"
                        )}>
                          <div className={cn(
                            isFullBleed
                              ? "w-full h-full"
                              : "flex-1 w-full max-w-4xl flex flex-col justify-start"
                          )}>
                               <SlideErrorBoundary slideId={currentSlide?.id}>
                               {/* â”€â”€ Universal accent label + underline â€” all interactive/quiz slides â”€â”€ */}
                               {!isFullBleed && !['content','summary','title','cover','key-takeaways'].includes(currentSlide?.type as string) && (() => {
                                 const TYPE_LABELS: Record<string,string> = {
                                   'quiz': 'Knowledge Check', 'multiple-answers': 'Knowledge Check',
                                   'matching': 'Matching Activity', 'sorting': 'Sorting Activity',
                                   'accordion': 'Explore', 'flashcards': 'Flashcards',
                                   'timeline': 'Timeline', 'hotspot': 'Hotspot', 'wheel-diagram': 'Diagram',
                                   'tabbed-horizontal': 'Tabbed Content', 'tabbed-vertical': 'Tabbed Content',
                                   'folder-explorer': 'Explorer', 'carousel-panel': 'Carousel',
                                   'click-reveal': 'Click & Reveal',
                                   'game-template': 'Game',
                                   'diagram': 'Process Diagram',
                                 };
                                 const label = TYPE_LABELS[currentSlide?.type as string];
                                 if (!label) return null;
                                 return (
                                   <div className="mb-4">
                                     <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: slideAccentColor }}>{label}</p>
                                   </div>
                                 );
                               })()}

                               {/* TITLE / COVER SLIDE â€” redesigned CourseTitleSlide */}
                               {(currentSlide?.type === 'title' || currentSlide?.type === 'cover') && (
                                 <div className="w-full h-full">
                                   <CourseTitleSlide
                                     title={currentSlide.title}
                                     description={currentSlide.content || undefined}
                                     coverImage={(currentSlide as any).coverImage || courseBg || undefined}
                                     theme={theme}
                                     isPreviewMode={true}
                                   />
                                 </div>
                               )}

                               {/* CONTENT / KEY-TAKEAWAYS / SUMMARY */}
                               {currentSlide?.type === 'key-takeaways' && (() => {
                                  const raw: any[] = (currentSlide as any).interactions || (currentSlide as any).data?.objectives || [];
                                  const objectives = raw.length > 0 ? raw : (currentSlide.content || '')
                                    .split(/\n+/).filter(Boolean)
                                    .map((line: string, i: number) => ({ id: String(i), label: line, content: '' }));
                                  // Derive module number for this slide
                                  const modIdx = course?.modules.findIndex((m: any) => m.slides.some((s: any) => s.id === currentSlide.id)) ?? -1;
                                  const slideModuleNumber = modIdx >= 0 ? modIdx + 1 : undefined;
                                  return (
                                    <div className="w-full h-full absolute inset-0">
                                      <LearningObjectivesSlide
                                        title={currentSlide.title}
                                        objectives={objectives}
                                        theme={theme}
                                        moduleNumber={slideModuleNumber}
                                      />
                                    </div>
                                  );
                               })()}

                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {
                                 const typeLabel = currentSlide.type === 'summary' ? 'Summary' : 'Overview';
                                 return (
                                   <div className="w-full space-y-4">
                                     {/* Section label */}
                                     <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: slideAccentColor }}>
                                       {typeLabel}
                                     </p>
                                       <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {/* Body content */}
                                     {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}
                                   </div>
                                 );
                               })()}

                               {/* PLAYER TOUR SLIDE */}
                               {(currentSlide as any)?.type === 'player-tour' && (
                                 <div className="w-full h-full">
                                   <PlayerTourSlide theme={theme} onSkip={() => setCurrentSlideIndex((si: number) => Math.min(allSlides.length - 1, si + 1))} />
                                 </div>
                               )}
                               {/* COURSE OBJECTIVES SLIDE â€” course-level, no module number */}
                               {(currentSlide as any)?.type === 'course-objectives' && (
                                 <div className="w-full h-full">
                                   <CourseObjectivesSlide objectives={(currentSlide as any)._objectives || []} theme={theme} />
                                 </div>
                               )}
                               {/* MODULE OVERVIEW SLIDE */}
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
                               {currentSlide?.type === 'module-cover' && (
                                 <div className="w-full h-full">
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
                                 <div className="w-full h-full">
                                   <ClosingSlide
                                     coverImage={(currentSlide as any).coverImage || courseBg || undefined}
                                     theme={theme}
                                   />
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
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
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
                                           <p className="text-sm font-medium">âœ“ Correct answer: <span className="font-bold">{correctLabel}</span></p>
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
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
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
                                           <span>{isAllCorrect ? 'Correct! All answers right.' : 'Not quite â€” check the highlighted answers.'}</span>
                                         </div>
                                         {quiz.feedback && <p className="text-sm font-medium opacity-80">{quiz.feedback}</p>}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}

                               {/* EXTERNAL COMPONENTS (zomako + interactions) */}
                               {currentSlide?.type === 'matching' && (() => {
                                  // MatchingActivity expects {items:[{id,content}], targets:[{id,content}]}
                                  // AI may produce {pairs:[{id,term,definition}]} â€” normalise either format
                                  const rawData = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  const matchingProps = (() => {
                                    if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {
                                      const items   = rawData.pairs.map((p) => ({ id: p.id + '_item',   content: p.term }));
                                      const targets = rawData.pairs.map((p) => ({ id: p.id + '_target', content: p.definition }));
                                      const correctAnswers = rawData.correctAnswers ||
                                        Object.fromEntries(rawData.pairs.map((p) => [p.id + '_item', p.id + '_target']));
                                      return { items, targets, correctAnswers };
                                    }
                                    if (Array.isArray(rawData.items) && rawData.items.length > 0) {
                                      return { items: rawData.items, targets: rawData.targets || [], correctAnswers: rawData.correctAnswers || {} };
                                    }
                                    return { items: [], targets: [], correctAnswers: {} };
                                  })();
                                  return (
                                    <div className="space-y-6 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                                                             <CustomMatchingActivity
                                        items={matchingProps.items || []}
                                        targets={matchingProps.targets || []}
                                        correctAnswers={matchingProps.correctAnswers || {}}
                                       />
                                    </div>
                                  );
                               })()}
                               {currentSlide?.type === 'accordion' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <VerticalTimeline
                                       events={((currentSlide.data || currentSlide.interactions?.[0] || {}).items || []).map((item: any, idx: number) => ({
                                         id: 'acc-' + idx,
                                         year: item.subtitle || item.category || undefined,
                                         title: item.title || item.label || '',
                                         content: markdownToHtml(item.content || item.description || ''),
                                       }))}
                                       theme={theme}
                                       accentColor={slideAccentColor}
                                     />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'flashcards' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <FlashcardGrid cards={currentSlide.data?.cards || currentSlide.interactions?.[0]?.cards || []} theme={theme} />
                                 </div>
                               )}
                               {currentSlide?.type === 'timeline' && (
                                   <div className="space-y-4 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {currentSlide.content && (
                                       <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />
                                     )}
                                     <HorizontalTimeline
                                       events={((currentSlide.data || currentSlide.interactions?.[0] || {}).events || []).map((ev: any) => ({
                                        ...ev,
                                        content: markdownToHtml(ev.content || ''),
                                      }))}
                                       theme={theme}
                                       accentColor={slideAccentColor}
                                     />
                                   </div>
                                 )}

                               {currentSlide?.type === 'sorting' && (
                                  <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     <SmartContent content={sanitizeContent(currentSlide.content) + '\n\nDrag items or use â†‘ â†“ arrows to reorder.'} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                        <CustomSortingActivity items={(currentSlide.data || currentSlide.interactions?.[0] || {}).items || []} correctOrder={(currentSlide.data || currentSlide.interactions?.[0] || {}).correctOrder || []}  />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'wheel-diagram' && (() => {
                                  const wd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  return (
                                    <div className="space-y-4 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div className="w-full overflow-x-auto" style={{ height: '560px' }}>
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

                               {/* MERMAID PROCESS DIAGRAM */}
                               {currentSlide?.type === 'diagram' && (() => {
                                  const mermaidCode: string = currentSlide.data?.mermaidCode || currentSlide.data?.code || '';
                                  const caption: string = currentSlide.data?.caption || currentSlide.content || '';
                                  return (
                                    <div className="space-y-5 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      {caption && (
                                        <SmartContent
                                          content={sanitizeContent(caption)}
                                          theme={theme}
                                          className={cn('prose max-w-none text-sm', theme !== 'light' ? 'prose-invert text-slate-400' : 'text-slate-600')}
                                        />
                                      )}
                                      {mermaidCode ? (
                                        <div className="w-full overflow-auto rounded-xl bg-slate-800/40 border border-slate-700/40 p-4">
                                          <MermaidDiagram
                                            code={mermaidCode}
                                            theme={theme as any}
                                            className="mx-auto"
                                          />
                                        </div>
                                      ) : (
                                        <div className="rounded-xl bg-slate-800/50 border border-amber-700/30 p-6 text-amber-400 text-sm text-center">
                                          No diagram code found. Edit this slide to add Mermaid markup.
                                        </div>
                                      )}
                                    </div>
                                  );
                               })()}


                               {currentSlide?.type === 'tabbed-horizontal' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <TabbedHorizontal tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'tabbed-vertical' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <TabbedVertical tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'folder-explorer' && (
                                  <div className="space-y-6 w-full">
                                    <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                    <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                    <div className={cn('overflow-visible', theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                      <FolderExplorer items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />
                                    </div>
                                  </div>
                                )}
                               {currentSlide?.type === 'carousel-panel' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <CarouselPanel cards={currentSlide.data?.cards || currentSlide.data?.items || currentSlide.interactions?.[0]?.cards || currentSlide.interactions?.[0]?.items || []} />
                                   </div>
                                 </div>
                               )}

                               {/* CLICK & REVEAL INTERACTION */}
                               {currentSlide?.type === 'click-reveal' && (() => {
                                 const crItems = currentSlide.data?.items || currentSlide.interactions?.[0]?.items || [];
                                 return (
                                   <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {currentSlide.content && <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />}
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                       <ClickRevealInteraction items={crItems} />
                                     </div>
                                   </div>
                                 );
                               })()}

                               {/* EXAM INTRO */}
                               {currentSlide?.type === 'exam-intro' && (
                                 <ExamIntroSlide
                                   examConfig={examConfig}
                                   courseTitle={course?.title}
                                   onBegin={async () => {
                                     let questions = examQuestions;
                                     if (!questions || questions.length === 0) {
                                       setIsGeneratingExam(true);
                                       try {
                                         questions = await generateMasteryExam(course, examConfig);
                                         setExamQuestions(questions);
                                       } finally { setIsGeneratingExam(false); }
                                     }
                                     setExamSession({ questions, answers: Object.fromEntries(questions.map(q => [q.id, null])), currentQuestionIdx: 0, submitted: false, score: null, passed: null });
                                     setExamPhase('active');
                                     setCurrentSlideIndex(examQIndex);
                                   }}
                                 />
                               )}

                               {/* MASTERY EXAM QUESTIONS */}
                               {currentSlide?.type === 'mastery-exam' && (
                                 isGeneratingExam ? (
                                   // Still generating â€” show progress spinner
                                   <div className="flex flex-col items-center justify-center gap-4 h-full">
                                     <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                                     <p className="text-slate-300 font-semibold">Generating quiz questionsâ€¦</p>
                                     <p className="text-slate-500 text-sm">This may take up to 30 seconds</p>
                                   </div>
                                 ) : examPhase === 'active' && (examSession.questions.length > 0 || examQuestions.length > 0) ? (
                                   <MasteryExamSlide
                                     questions={examSession.questions.length > 0 ? examSession.questions : examQuestions}
                                     examConfig={examConfig}
                                     sessionState={examSession}
                                     onAnswer={(qId, answer) => setExamSession(prev => ({ ...prev, answers: { ...prev.answers, [qId]: answer } }))}
                                     onSubmit={(newState) => {
                                       if (newState.submitted) {
                                         setExamSession(newState);
                                         setExamPhase('complete');
                                         setCurrentSlideIndex(examResultsIndex);
                                         scormReportScore(newState.score ?? 0, newState.passed ?? false);
                                       } else { setExamSession(newState); }
                                     }}
                                   />
                                 ) : examPhase === 'idle' ? (
                                   // Landed on mastery-exam slide without going through intro â€” redirect back
                                   <div className="flex flex-col items-center justify-center gap-4 h-full">
                                     <p className="text-slate-400 text-sm">Please start the quiz from the intro screen.</p>
                                     <button onClick={() => setCurrentSlideIndex(examIntroIndex)}
                                       className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all">
                                       Go to Quiz Intro
                                     </button>
                                   </div>
                                 ) : null
                               )}


                               {/* EXAM RESULTS */}
                               {currentSlide?.type === 'exam-results' && examPhase === 'complete' && examSession.submitted && (
                                 <ExamResultsSlide
                                   score={examSession.score ?? 0}
                                   passed={examSession.passed ?? false}
                                   passingScore={examConfig.passingScore}
                                   totalQuestions={examSession.questions.length || examQuestions.length}
                                   correctCount={Math.round(((examSession.score ?? 0) / 100) * (examSession.questions.length || examQuestions.length))}
                                   allowRetake={examConfig.allowRetake}
                                   onContinue={() => setCurrentSlideIndex(allSlides.length - 1)}
                                   onRetake={() => {
                                     setExamSession({ questions: examQuestions, answers: Object.fromEntries(examQuestions.map(q => [q.id, null])), currentQuestionIdx: 0, submitted: false, score: null, passed: null });
                                     setExamPhase('active');
                                     setCurrentSlideIndex(examIntroIndex);
                                   }}
                                   onReturnToCourse={() => { setExamPhase('complete'); setCurrentSlideIndex(0); }}
                                   onRestartCourse={() => {
                                     setExamPhase('idle');
                                     setExamSession({ questions: [], answers: {}, currentQuestionIdx: 0, submitted: false, score: null, passed: null });
                                     setHighestVisitedIndex(0);
                                     setCurrentSlideIndex(0);
                                   }}
                                 />
                               )}

                               {/* GAME TEMPLATES */}
                               {currentSlide?.type === 'game-template' && (
                                 <div className="w-full min-h-[600px] flex items-center justify-center mt-8">
                                   <GameContainer payload={currentSlide.data} />
                                 </div>
                               )}

                               {/* ANY UNHANDLED GENERIC INTERACTION */}
                               {currentSlide?.type === 'hotspot' && (() => {
                                  const hd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  return (
                                    <div className="space-y-4 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div style={{ minHeight: '320px' }}>
                                        <HotspotInteraction
                                          imageUrl={hd.imageUrl || hd.image || hd.backgroundImage}
                                          points={hd.points || hd.hotspots || []}
                                          theme={theme}
                                        />
                                      </div>
                                    </div>
                                  );
                               })()}

                               {['drop-targets', 'memory-match'].includes(currentSlide?.type) && (
                                  <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className="p-8 border-2 border-dashed border-indigo-400/50 bg-indigo-500/10 rounded-2xl text-center">
                                       <Gamepad2 className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
                                       <p className="text-xl font-bold text-indigo-300">[{currentSlide.type}] interaction is under construction.</p>
                                     </div>
                                  </div>
                               )}

                               {currentSlide?.type === 'scenario' && (() => {
                                 const scenarioData = currentSlide.data as ScenarioData | undefined;
                                 if (!scenarioData?.nodes || !scenarioData?.startNodeId) {
                                   return (
                                     <div className="space-y-4 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                       <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-start gap-3">
                                         <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                         <span>Scenario data is missing. Use <strong>Edit Text &amp; Audio</strong> or regenerate this slide.</span>
                                       </div>
                                     </div>
                                   );
                                 }
                                 return (
                                   <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     <ScenarioEngine
                                       data={scenarioData}
                                       theme={theme}
                                       onComplete={() => setScenarioCompleted(true)}
                                     />
                                   </div>
                                 );
                               })()}
                               </SlideErrorBoundary>
                             </div>

                             {currentSlide?.floatingMedia && currentSlide.floatingMedia.length > 0 && viewMode === 'desktop' && (
                               <div className="hidden md:block w-[40%] max-w-[500px] shrink-0 pointer-events-none z-[60]">
                                 <FloatingImageCanvas isAuthoring={false} onChange={() => {}} onRemove={() => {}} images={currentSlide.floatingMedia} />
                               </div>
                             )}

                           </div>

                           {/* Slide media tools â€” Edit/Reset/Upload are in the top bar */}
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

                            {!isScormPlayer && (currentSlide?.imagePlaceholder || currentSlide?.mediaUrl) && (
                              <div className="mt-6 flex justify-center">
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
                                      pushUndo(); setFloatingImagesMap(prev => ({
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

                       {/* Floating images â€” inside scroll so they scroll with content */}
                       <FloatingImageCanvas
                         images={floatingImagesMap[currentSlide?.id] || []}
                         isAuthoring={true}
                         onChange={(imgs) => setFloatingImagesMap(prev => ({ ...prev, [currentSlide?.id]: imgs }))}
                         onRemove={(id) => { pushUndo(); setFloatingImagesMap(prev => ({
                           ...prev,
                           [currentSlide?.id]: (prev[currentSlide?.id] || []).filter(i => i.id !== id)
                         })); }}
                       />
                        </motion.div>
                       </AnimatePresence>

                      {/* Closed Caption Overlay - above player bar */}
                      {showCC && player.hasAudio && (
                        <ClosedCaptionOverlay
                          narrationText={currentSlide?.voiceOverText || (currentSlide as any)?.narration || null}
                          currentTime={player.currentTime}
                          duration={player.duration}
                          isPlaying={player.isPlaying}
                        />
                      )}
                     </div>{/* end inner content */}
                     </div>{/* end accent+content row */}


                     {/* Learner Player Navigation Bar â€” sticky at bottom in full-screen mode */}
                    <div className={cn(
                      "w-full z-[100] shrink-0 border-t backdrop-blur-md",
                      'sticky bottom-0',
                      theme === 'light' ? 'bg-white/80 border-slate-200' : theme === 'unified' ? 'bg-indigo-950 border-indigo-800' : 'bg-slate-900 border-slate-800'
                    )}>
                      <PlayerBar
                        player={player}
                        currentSlideIndex={currentSlideIndex}
                        totalSlides={allSlides.length}
                        currentSlideTitle={stripSlideTypePrefix(currentSlide?.title ?? '')}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        theme={theme}
                        disableNext={currentSlide?.type === 'exam-intro' || currentSlide?.type === 'mastery-exam' || currentSlide?.type === 'exam-results' || (currentSlide?.type === 'scenario' && !scenarioCompleted)}
                        disablePrev={currentSlide?.type === 'mastery-exam'}
                        volume={player.volume}
                        onVolumeChange={player.setVolume}
                        showCC={showCC}
                        onToggleCC={voiceOverEnabled ? () => setShowCC(v => !v) : undefined}

                      />

                     </div>{/* end PlayerBar */}
                  </div>{/* end slide frame */}
                  </div>{/* end bg canvas */}

                </div>{/* end main slide column */}
              </div>{/* end sidebar+main row */}
              </div>{/* end auto-landscape wrapper */}
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
                          url: img.dataUrl || img.url,
                          x: 40, y: 40, width: 320, height: 240,
                        };
                        pushUndo(); setFloatingImagesMap(prev => ({
                          ...prev,
                          [slideId]: [...(prev[slideId] || []), newImg],
                        }));
                        // Clear placeholder flag if present
                        handleUpdateSlideMedia(slideId, { imagePlaceholder: false });
                        setShowImageGalleryForSlide(null);
                      }}
                      className="aspect-video bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-indigo-500 transition-all border border-slate-700 group relative"
                    >
                      <img src={img.dataUrl || img.url} alt="Source Document Extracted" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* â”€â”€â”€ Right Slide-In Edit Drawer â”€â”€â”€ */}
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
                    { id: 'text', icon: 'âœ', label: 'Edit Text', activeColor: 'border-indigo-500 text-indigo-300 bg-indigo-500/10' },
                    { id: 'audio', icon: 'ðŸŽ¤', label: 'Audio / Narration', activeColor: 'border-emerald-500 text-emerald-300 bg-emerald-500/10' },
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
                        <strong>ISD Best Practice:</strong> Narration should <em>expand</em> on what's on screen â€” never read line-by-line. Aim for conversational, explanatory language.
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>Audio Narration Script</span>
                          <span className={`normal-case font-normal ${voiceOverEnabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {voiceOverEnabled ? 'ðŸ”Š Voice-Over Enabled' : 'ðŸ”‡ Voice-Over Off'}
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
                               <span>â€¢</span>
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
                                 <option value="alloy">Alloy â€” Neutral / Balanced</option>
                                 <option value="echo">Echo â€” Male / Measured</option>
                                 <option value="fable">Fable â€” Male / Warm</option>
                                 <option value="onyx">Onyx â€” Male / Deep</option>
                                 <option value="nova">Nova â€” Female / Bright</option>
                                 <option value="shimmer">Shimmer â€” Female / Soft</option>
                               </select>
                               {/* Ear preview button â€” previews the currently selected voice */}
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
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating audioâ€¦</>
                              ) : (
                                <><Mic className="w-3.5 h-3.5" /> Regenerate Audio for this Slide</>
                              )}
                            </button>
                          </div>
                        )}
                        {/* Audio URL if available */}
                        {(editingSlide?.voiceOverUrl || editingSlide?.audioUrl) && (
                          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                            <p className="text-xs text-emerald-400 font-bold">âœ… Audio ready for this slide</p>
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
                        pushUndo();
                        // Synthetic slides (module-overview etc.) don't exist in course.modules.
                        // Route their edits to syntheticSlideOverrides instead.
                        if (latest.id?.match(/^__module-overview-\d+__$/)) {
                          setSyntheticSlideOverrides(prev => ({
                            ...prev,
                            [latest.id]: { content: latest.content, voiceOverText: latest.voiceOverText },
                          }));
                        } else {
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

        {/* â˜… Player Properties Modal â˜… */}
        <AnimatePresence>
          {showPlayerProperties && (
            <PlayerPropertiesModal
              config={playerConfig}
              onChange={(cfg) => setPlayerConfig(cfg)}
              onClose={() => setShowPlayerProperties(false)}
            />
          )}
        </AnimatePresence>

        {/* â”€â”€ TTS Generation Progress Toast â”€â”€ */}
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
                         {previewModalOption === 'Scenario' && (
                           <div className="w-full max-w-2xl">
                             <ScenarioPreview />
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
                                { id: '1', label: 'Introduction', icon: 'ðŸ“–', content: 'This section introduces the core framework. Use the vertical navigation on the left to jump between areas. Each tab covers a distinct concept.' },
                                { id: '2', label: 'Core Skills', icon: 'âš¡', content: 'These are the essential skills needed for mastery. Review each carefully and take notes on areas where you may need practice.' },
                                { id: '3', label: 'Application', icon: 'ðŸ”§', content: 'Apply the concepts through real-world scenarios. The exercises here reinforce your understanding with practical examples.' },
                                { id: '4', label: 'Assessment', icon: 'âœ…', content: 'Test your knowledge with a comprehensive review. Aim for 80% or above to demonstrate topic mastery.' },
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
                                { id: 'c3', label: 'Develop', description: 'Build the actual course content, interactions, assessments, and media elements.', color: '#f59e0b', expandedContent: 'Development transforms the design documents into a fully functional eLearning experience using tools like NexCourse AI.' },
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

      {/* â”€â”€ Trial Expiry Interstitial â”€â”€ */}
      <AnimatePresence>
        {isTrialExpired && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl"
              initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }}
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">â³</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Your trial has ended</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Your trial access to NexCourse AI has expired. Get in touch to continue building
                world-class interactive courses.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="mailto:support@nexcourse.ai?subject=Trial%20Upgrade%20Request"
                  className="block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Contact Us to Upgrade
                </a>
                <button
                  onClick={signOut}
                  className="w-full px-6 py-2 text-slate-400 hover:text-white text-sm"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Trial Export Blocked Modal â”€â”€ */}
      <AnimatePresence>
        {showTrialExportModal && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTrialExportModal(false)}
          >
            <motion.div
              className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-sm w-full mx-4 text-center shadow-2xl"
              initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-indigo-500/15 flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Export Available in Full Version</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                SCORM export is available in the full NexCourse AI platform. Your courses are saved
                and will be ready to export once you upgrade.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:support@nexcourse.ai?subject=NexCourse%20AI%20Upgrade"
                  className="block w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Contact Us to Upgrade
                </a>
                <button
                  onClick={() => setShowTrialExportModal(false)}
                  className="w-full px-5 py-2 text-slate-500 hover:text-slate-300 text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Admin Invite Panel â”€â”€ */}
      <AnimatePresence>
        {showTrialInvitePanel && isAdmin && (
          <TrialInvitePanel
            onClose={() => setShowTrialInvitePanel(false)}
            apiBase={import.meta.env.VITE_API_BASE ?? ''}
            accessToken={adminToken}
          />
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
          {isAllCorrect ? 'Correct! Rabbit, Dog, and Cat are animals.' : 'Not quite â€” only Rabbit, Dog, and Cat are animals.'}
        </div>
      )}
    </div>
  );
}



