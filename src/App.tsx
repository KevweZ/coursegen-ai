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
  SlidersHorizontal,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { 
  Accordion, 
  InteractiveTimeline, 
  SortingActivity, 
  MatchingActivity, 
  DragAndDropActivity
} from '@zomako/elearning-components/dist/elearning-components.es.js';
import { 
  HotspotPreview, MultipleChoicePreview, 
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
import { CourseSettingsPage } from './components/builder/CourseSettingsPage';
import { UploadPathModal, UploadPathChoice } from './components/builder/UploadPathModal';
import { PlayerPropertiesModal, PlayerConfig, defaultPlayerConfig } from './components/builder/PlayerPropertiesModal';
import { loadCourseSettings, saveCourseSettings, SavedCourseSettings } from './lib/courseSettingsStorage';
import { loadPlayerProperties, savePlayerProperties } from './lib/playerPropertiesStorage';
import { CourseOutline, Slide, TerminalObjectiveGroup, ExamConfig, ExamQuestion, ExamSessionState, NavigationMode } from './types/course';
import { extractTextFromFile, extractImagesFromFile, SourceImage } from './lib/fileProcessor';
import { generateGameTemplate, generateStandaloneGame } from './services/aiGameService';
import { GameContainer } from './components/game-templates/core/GameContainer';
import { getRandomBackgroundForTheme } from './lib/backgrounds';
import { getPresetOptions, getPresetConfig } from './lib/presetEngine';
import { GameTemplateType } from './types/game';
import {
  generateCourseCoverImage,
  attachSourceImagesToCourse,
  generateContentSlideImages,
  imageModeFlags,
  normalizeImageMode,
  type CourseImageMode,
} from './services/imageService';
import { usePlayer } from './lib/usePlayer';
import { PlayerBar } from './components/player/PlayerBar';
import { ClosedCaptionOverlay } from './components/player/ClosedCaptionOverlay';

import { SlideHeader } from './components/player/SlideHeader';
import { SlideErrorBoundary } from './components/player/SlideErrorBoundary';
import { useDraftCourses } from './lib/useDraftCourses';
import type { DesignDraftSnapshot } from './lib/useDraftCourses';
import {
  attachHeavyMedia,
  mediaRecordToMap,
  takeLegacyMedia,
} from './lib/draftMedia';
import {
  ROUTES,
  parseAppPath,
  isProtectedPath,
  navigateTo,
  stashReturnTo,
  consumeReturnTo,
} from './lib/routes';
import type { SandboxDemo } from './lib/routes';
import { DraftCoursesPanel } from './components/player/DraftCoursesPanel';
import { ViewDraftsModal } from './components/player/ViewDraftsModal';
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
import { LandscapePhoneFrame } from './components/player/LandscapePhoneFrame';
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

type AppStep = 'home' | 'details' | 'outline' | 'preview' | 'pricing' | 'account' | 'player-properties' | 'payment-success' | 'payment-cancel';
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
    // Ensure a blank line between the last list item and the first non-list paragraph
    // so ReactMarkdown renders them as separate block elements with proper spacing
    .replace(/(^[-*+][ \t]+.+)\n(?!\n)(?![ \t]*[-*+][ \t])/gm, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Group B fix: lightweight Markdown → HTML converter for accordion / interaction item content.
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
 * autoFormatAsBullets — converts multi-paragraph plain text to bullet points.
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

/** Count markdown/HTML list items for multi-column layout decisions */
function countListItems(raw: string): number {
  if (!raw) return 0;
  if (/<[uo]l[\s>]/i.test(raw)) {
    return (raw.match(/<li[\s>]/gi) || []).length;
  }
  return raw.split('\n').filter(l => /^\s*([-*+]|\d+\.)\s+/.test(l)).length;
}

/**
 * Fetch-only overlay. Must unmount the instant `active` is false —
 * never use a delayed "finishing" hide: a blocked main thread after
 * setCourse would freeze the overlay at 100% forever (see production bug).
 */
const DraftOpeningOverlay: React.FC<{ active: boolean; progress: number; statusText?: string }> = ({
  active,
  progress,
  statusText,
}) => {
  if (!active) return null;

  const pct = Math.round(Math.max(2, Math.min(99, progress)));
  const phase =
    statusText ||
    (pct < 25 ? 'Fetching saved draft…'
    : pct < 55 ? 'Reading course data…'
    : pct < 85 ? 'Preparing course…'
    : 'Opening preview…');

  return (
    <div className="fixed inset-0 z-[800] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-5 px-6">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
      <div className="text-center space-y-1.5">
        <p className="text-white font-bold text-base">Opening draft…</p>
        <p className="text-slate-400 text-sm">{phase}</p>
      </div>
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <span>Progress</span>
          <span className="text-indigo-300 tabular-nums">{pct}%</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-150 ease-out"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const EmptySlideRegenerate = ({
  title,
  onRegenerate,
  isRegenerating,
  compact = false,
}: {
  title: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
  compact?: boolean;
}) => (
  <div className={cn(
    'flex flex-col items-center justify-center text-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50',
    compact ? 'py-10 px-6' : 'h-full min-h-[280px] px-8'
  )}>
    <AlertCircle className="w-8 h-8 text-amber-500" />
    <div>
      <p className="text-slate-800 font-bold text-lg">{title || 'This slide'}</p>
      <p className="text-slate-500 text-sm mt-1 max-w-md">
        Content didn’t generate for this slide. Regenerate to fill it from the course topic.
      </p>
    </div>
    <button
      type="button"
      onClick={onRegenerate}
      disabled={isRegenerating}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-60"
    >
      {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
      {isRegenerating ? 'Regenerating…' : 'Regenerate Slide Content'}
    </button>
  </div>
);

const SlideContent = ({ content, theme, accentColor }: { content: string; theme: string; accentColor?: string }) => {
  // Bullet markers: use the module accent when provided so lists match the
  // module chrome (header / divider). Fall back to near-black so we never
  // leave the old hardcoded indigo/light-blue markers that clashed with
  // non-indigo modules (e.g. teal Module 2 headers with blue bullets).
  const markerColor = accentColor || (theme === 'light' ? '#0f172a' : '#94a3b8');
  const bulletCount = countListItems(content);
  // 7–9 bullets: two columns so dense lists don't stretch into a long single stack
  const multiCol = bulletCount >= 7 && bulletCount <= 12;

  if (isHTML(content)) {
    return (
      <div
        className={cn(
          'prose max-w-none text-lg lg:text-xl leading-relaxed rich-slide-content',
          theme !== 'light' ? 'prose-invert text-gray-200' : 'text-gray-800',
          multiCol && '[&_ul]:columns-2 [&_ul]:gap-x-8 [&_ol]:columns-2 [&_ol]:gap-x-8 [&_li]:break-inside-avoid'
        )}
        style={{ ['--slide-marker' as any]: markerColor }}
        dangerouslySetInnerHTML={{ __html: stripBulletBold(content) }}
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
          if (instructional) {
            return (
              <li {...props} className="marker:[color:var(--slide-marker,#0f172a)] break-inside-avoid">
                {instructional}
              </li>
            );
          }
          return (
            <li
              {...props}
              className={cn(
                'marker:[color:var(--slide-marker,#0f172a)] break-inside-avoid',
                theme === 'light' ? 'text-gray-800' : 'text-gray-200'
              )}
            >
              {children}
            </li>
          );
        },
        ul: ({ node, children, ...props }) => (
          <ul
            {...props}
            className={cn(
              'pl-6 space-y-2 list-disc border-l-0 mb-4',
              multiCol && 'columns-2 gap-x-8 [column-fill:balance]'
            )}
            style={{ ['--slide-marker' as any]: markerColor }}
          >
            {children}
          </ul>
        ),
        ol: ({ node, children, ...props }) => (
          <ol
            {...props}
            className={cn(
              'pl-6 space-y-2 list-decimal pb-4 marker:[color:var(--slide-marker,#0f172a)]',
              multiCol && 'columns-2 gap-x-8 [column-fill:balance]'
            )}
            style={{ ['--slide-marker' as any]: markerColor }}
          >
            {children}
          </ol>
        ),
        // Body bold is intentionally subdued: headers already carry hierarchy, so
        // mid-bullet **keywords** should not compete with the title (looked noisy).
        strong: ({ node, children, ...props }) => (
          <strong {...props} className="font-medium text-inherit">{children}</strong>
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
      {stripBulletBold(autoFormatAsBullets(content))}
    </ReactMarkdown>
  );
};

/**
 * Strip partial **bold** markers from bullet lines so on-screen lists don't
 * compete with already-bold slide titles. Leaves headings (#) untouched.
 * Existing courses that were generated with "**Keyword** rest of sentence"
 * patterns get cleaned at render time — no re-generation required.
 */
function stripBulletBold(raw: string): string {
  if (!raw) return raw;
  // Skip if it's already HTML from the rich-text editor
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    // Soften <strong>/<b> inside list items only
    return raw.replace(/<(ul|ol)[\s\S]*?<\/\1>/gi, (block) =>
      block.replace(/<\/?(strong|b)\b[^>]*>/gi, '')
    );
  }
  return raw
    .split('\n')
    .map(line => {
      // Only touch bullet / numbered lines — leave headings & paragraphs alone
      if (!/^\s*([-*+]|\d+\.)\s+/.test(line)) return line;
      return line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
    })
    .join('\n');
}

/**
 * SmartContent — handles the numerous inline `<ReactMarkdown>` usages in the slide renderer.
 * Automatically switches between HTML rendering and Markdown based on content type.
 */
const SmartContent = ({ content, className, theme, accentColor }: { content: string; className?: string; theme?: string; accentColor?: string }) => {
  const markerColor = accentColor || (theme === 'light' ? '#0f172a' : '#94a3b8');
  if (isHTML(content)) {
    return (
      <div
        className={cn(className, 'rich-slide-content')}
        style={{ ['--slide-marker' as any]: markerColor }}
        dangerouslySetInnerHTML={{ __html: stripBulletBold(content) }}
      />
    );
  }
  return (
    <ReactMarkdown
      className={className}
      components={{
        ul: ({ node, children, ...props }) => (
          <ul {...props} className="pl-6 space-y-2 list-disc mb-4" style={{ ['--slide-marker' as any]: markerColor }}>{children}</ul>
        ),
        ol: ({ node, children, ...props }) => (
          <ol {...props} className="pl-6 space-y-2 list-decimal mb-4" style={{ ['--slide-marker' as any]: markerColor }}>{children}</ol>
        ),
        li: ({ node, children, ...props }) => (
          <li {...props} className="marker:[color:var(--slide-marker,#0f172a)]">{children}</li>
        ),
        strong: ({ node, children, ...props }) => (
          <strong {...props} className="font-medium text-inherit">{children}</strong>
        ),
      }}
    >
      {stripBulletBold(autoFormatAsBullets(content))}
    </ReactMarkdown>
  );
};

// ─── Grid interaction IDs (must match the interactive-elements grid in the UI) ──
const GRID_INTERACTION_IDS = [
  'multiple-choice', 'multiple-answers', 'hotspot', 'flashcards',
  'timeline', 'sorting', 'matching', 'drop-targets', 'scenario',
  'tabbed-horizontal', 'tabbed-vertical', 'folder-explorer', 'carousel-panel',
  'click-reveal',
];
// Map legacy / AI-prompt IDs → visual grid IDs so the UI checkboxes stay in sync
const PRESET_TO_GRID: Record<string, string> = {
  quiz: 'multiple-choice',
  choice: 'multiple-choice',
  'drag-drop': 'drop-targets',
  'drag-drop-activity': 'drop-targets',
  accordion: 'click-reveal', // accordion folded into click-reveal (same UX pattern)
};
const mapToGridIds = (ids: string[]): string[] =>
  [...new Set(ids.map(id => PRESET_TO_GRID[id] ?? id).filter(id => GRID_INTERACTION_IDS.includes(id)))];

export default function App() {
  const isScormPlayer = typeof window !== 'undefined' && !!(window as any).__COURSE_DATA__;
  const { user, session, loading: authLoading, signOut, isAdmin, isTrial, isTrialExpired } = useAuth();

  // ── Draft Courses (shared Design + Development slots) ─────────────────────
  const userPlan = (user?.user_metadata?.plan as string | undefined) ?? null;
  const draftManager = useDraftCourses(user?.id ?? null, userPlan, isAdmin);
  const [showDraftsPanel, setShowDraftsPanel] = React.useState(false);
  const [showViewDraftsModal, setShowViewDraftsModal] = React.useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = React.useState(false);
  const [draftLoadProgress, setDraftLoadProgress] = React.useState(0);
  const [draftLoadStatus, setDraftLoadStatus] = React.useState('');
  const [showAppImagePicker, setShowAppImagePicker] = React.useState(false);
  const [showImageDropdown, setShowImageDropdown] = React.useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = React.useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
  const [designDraftSavedFlash, setDesignDraftSavedFlash] = React.useState(false);
  const playerDefaultsLoadedFor = React.useRef<string | null>(null);

  const showDraftMessage = (msg: string) => {
    setDraftSaveMessage(msg);
    const long = /fail|full|error|quota|sign in|cannot|not found/i.test(msg);
    setTimeout(() => setDraftSaveMessage(null), long ? 6000 : 3500);
  };

  const collectDesignSnapshot = (): Omit<DesignDraftSnapshot, 'phase'> => ({
    courseTitle,
    courseDescription,
    prompt,
    learningObjectives,
    objectiveFormat,
    examConfig,
    navigationMode,
    requireInteractionsComplete,
    preset,
    slideCount,
    includeModuleTitleSlides,
    includeModuleOverviewSlides,
    includeSummarySlides,
    interactionTypes,
    scenarioConfig,
    outlineDraft,
    imageMode,
    voiceOverEnabled,
    ttsVoice,
    settingsMode: settingsMode === 'quick' ? 'session' : settingsMode,
  });

  const handleSaveDraft = async () => {
    if (!course) {
      showDraftMessage('Nothing to save — open or generate a course first.');
      return;
    }
    showDraftMessage('Saving draft…');
    try {
    if (activeDraftId) {
      // Prefer async payload (sync cache may be empty after refresh)
      const existing = await draftManager.loadDraftAsync(activeDraftId);
      if (existing?.phase === 'preview') {
        const updated = await draftManager.replacePreviewDraft(activeDraftId, course, playerConfig, theme);
        showDraftMessage(updated.message);
        if (updated.success) navigateTo(ROUTES.preview(activeDraftId), true);
        return;
      }
    }
      const result = await draftManager.savePreviewDraft(course, playerConfig, theme);
      showDraftMessage(result.message);
      if (result.success && result.id) {
        setActiveDraftId(result.id);
        navigateTo(ROUTES.preview(result.id));
      }
    } catch (err: any) {
      console.error('[Drafts] Save failed:', err);
      showDraftMessage(err?.message || 'Failed to save draft.');
    }
  };

  const applyDesignSnapshot = (design: Omit<DesignDraftSnapshot, 'phase'> | DesignDraftSnapshot) => {
    setCourseTitle(design.courseTitle || '');
    setCourseDescription(design.courseDescription || '');
    setPrompt(design.prompt || '');
    setLearningObjectives(design.learningObjectives || []);
    if (design.objectiveFormat) setObjectiveFormat(design.objectiveFormat as any);
    if (design.examConfig) setExamConfig(design.examConfig);
    if (design.navigationMode) setNavigationMode(design.navigationMode as any);
    if (typeof design.requireInteractionsComplete === 'boolean') {
      setRequireInteractionsComplete(design.requireInteractionsComplete);
    }
    if (design.preset) { setPreset(design.preset as any); setCourseType(design.preset as any); }
    if (typeof design.slideCount === 'number') setSlideCount(design.slideCount);
    if (typeof design.includeModuleTitleSlides === 'boolean') setIncludeModuleTitleSlides(design.includeModuleTitleSlides);
    if (typeof design.includeModuleOverviewSlides === 'boolean') setIncludeModuleOverviewSlides(design.includeModuleOverviewSlides);
    if (typeof design.includeSummarySlides === 'boolean') setIncludeSummarySlides(design.includeSummarySlides);
    if (design.interactionTypes) setInteractionTypes(design.interactionTypes);
    if (design.scenarioConfig) setScenarioConfig(design.scenarioConfig);
    setOutlineDraft(design.outlineDraft ?? null);
    if (design.imageMode) setImageMode(normalizeImageMode(design.imageMode));
    if (typeof design.voiceOverEnabled === 'boolean') setVoiceOverEnabled(design.voiceOverEnabled);
    if (design.ttsVoice) setTtsVoice(design.ttsVoice);
    setSettingsMode(design.settingsMode === 'defaults' ? 'defaults' : 'session');
    setIsSandboxMode(false);
    setMobileDesignDemo(false);
    setStep('details');
  };

  const handleSaveDesignDraft = async () => {
    const design = collectDesignSnapshot();
    showDraftMessage('Saving design draft…');
    try {
      if (activeDraftId) {
        const existing = await draftManager.loadDraftAsync(activeDraftId);
        if (existing?.phase === 'design') {
          const updated = await draftManager.replaceDesignDraft(activeDraftId, design);
          showDraftMessage(updated.message);
          if (updated.success) {
            setDesignDraftSavedFlash(true);
            setTimeout(() => setDesignDraftSavedFlash(false), 2500);
            navigateTo(ROUTES.design(activeDraftId), true);
          }
          return;
        }
      }
      const result = await draftManager.saveDesignDraft(design);
      showDraftMessage(result.message);
      if (result.success && result.id) {
        setActiveDraftId(result.id);
        setDesignDraftSavedFlash(true);
        setTimeout(() => setDesignDraftSavedFlash(false), 2500);
        navigateTo(ROUTES.design(result.id));
      }
    } catch (err: any) {
      console.error('[Drafts] Design save failed:', err);
      showDraftMessage(err?.message || 'Failed to save design draft.');
    }
  };

  /** Open a full interactive preview from a lean draft shell (images attach in the background). */
  const openPreviewFromSnapshot = async (id: string, snapshot: Extract<Awaited<ReturnType<typeof draftManager.loadDraftAsync>>, object>) => {
    if (snapshot.phase !== 'preview' || !snapshot.course?.modules?.length) {
      showDraftMessage('This draft has no course content and cannot be opened.');
      setStep('home');
      navigateTo(ROUTES.upload, true);
      return false;
    }

    const shell = snapshot.course;
    const legacyMedia = mediaRecordToMap(takeLegacyMedia(id));
    const cfg = snapshot.playerConfig || defaultPlayerConfig;

    // Ensure no modal/backdrop can sit on top of the player and eat clicks
    setShowViewDraftsModal(false);
    setShowDraftsPanel(false);
    setShowPlayerProperties(false);
    setIsLoadingDraft(false);
    setDraftLoadProgress(0);
    setDraftLoadStatus('');

    setPlayerConfig(cfg);
    setTheme((snapshot.theme as any) || 'light');
    // Authoring preview: always allow free navigation so drafts aren't "frozen"
    // (linear/restricted + interaction gates make the player feel like a screenshot).
    setNavigationMode('free');
    setRequireInteractionsComplete(false);

    setCurrentSlideIndex(0);
    setHighestVisitedIndex(0);
    setQuizState({});
    setExploredBySlide({});
    setKcCheckedSlideIds(new Set());
    setFloatingImagesMap({});
    setIsSandboxMode(false);
    setMobileDesignDemo(false);
    setScenarioCompleted(false);
    setCourseBg(null);

    // One commit with the full lean course — progressive stub hydration left a non-interactive shell
    setCourse(shell);
    setOriginalCourse(shell);
    setStep('preview');
    setActiveDraftId(id);
    navigateTo(ROUTES.preview(id));
    showDraftMessage('Draft loaded ✓');

    // Images after first paint — idle so Nav/Next stay responsive
    const attachImages = async () => {
      try {
        await new Promise<void>(r => setTimeout(r, 100));
        const stored = await draftManager.loadDraftAssets(id);
        const media = mediaRecordToMap(stored);
        legacyMedia.forEach((v, k) => { if (!media.has(k)) media.set(k, v); });
        if (!media.size) return;

        const keys = [...media.keys()];
        let working = shell;
        const BATCH = 2;
        for (let i = 0; i < keys.length; i += BATCH) {
          const subset = new Map<string, string>();
          for (const k of keys.slice(i, i + BATCH)) {
            const v = media.get(k);
            if (v) subset.set(k, v);
          }
          if (!subset.size) continue;
          attachHeavyMedia(working, subset);
          working = {
            ...working,
            modules: working.modules?.map((m: any) => ({
              ...m,
              slides: m.slides ? m.slides.map((s: any) => ({ ...s })) : [],
            })),
          };
          setCourse(working);
          setOriginalCourse(working);
          if (working.coverImage) setCourseBg(working.coverImage);
          await new Promise<void>(r => setTimeout(r, 32));
        }
        console.log(`[Drafts] Attached ${media.size} image(s) after preview open`);
      } catch (e) {
        console.warn('[Drafts] Image attach after open failed:', e);
      }
    };
    void attachImages();
    return true;
  };

  const handleLoadDraft = (id: string) => {
    // Tear down every full-screen overlay first (blur backdrops were freezing the preview)
    setShowDraftsPanel(false);
    setShowViewDraftsModal(false);
    setAdminDropdownOpen(false);
    setShowPlayerProperties(false);
    setIsLoadingDraft(false);
    setDraftLoadProgress(0);
    setDraftLoadStatus('');
    showDraftMessage('Opening draft…');

    // Wait one frame so portal modals leave the DOM before mounting the player
    window.requestAnimationFrame(() => {
      void (async () => {
        const t0 = performance.now();
        try {
          const snapshot = await draftManager.loadDraftAsync(id);

          if (!snapshot) {
            showDraftMessage('Draft not found. It may have failed to save — try saving again.');
            setStep('home');
            navigateTo(ROUTES.upload, true);
            return;
          }

          setActiveDraftId(id);

          if (snapshot.phase === 'design') {
            applyDesignSnapshot(snapshot);
            navigateTo(ROUTES.design(id));
            showDraftMessage('Design draft loaded ✓');
            return;
          }

          await openPreviewFromSnapshot(id, snapshot);
          console.log(`[Drafts] Open complete in ${Math.round(performance.now() - t0)}ms`);
        } catch (err: any) {
          console.error('[Drafts] Open failed:', err);
          showDraftMessage(err?.message || 'Failed to open draft. It may be corrupted.');
          setStep('home');
          navigateTo(ROUTES.upload, true);
        } finally {
          setIsLoadingDraft(false);
          setDraftLoadProgress(0);
          setDraftLoadStatus('');
          setShowViewDraftsModal(false);
          setShowDraftsPanel(false);
        }
      })();
    });
  };

  const handleReplaceDraft = async (id: string) => {
    if (!course) return;
    const result = await draftManager.replacePreviewDraft(id, course, playerConfig, theme);
    showDraftMessage(result.message);
    if (result.success) {
      setActiveDraftId(id);
      navigateTo(ROUTES.preview(id), true);
    }
  };

  // Controls which pre-auth view to show: public marketing homepage OR login/signup
  const [publicView, setPublicView] = useState<'homepage' | 'auth' | 'methodology' | 'pricing' | 'examples'>('homepage');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  
  const [step, setStep] = useState<AppStep>(isScormPlayer ? 'preview' : 'home');

  const goHome = () => {
    setShowPlayerProperties(false);
    setStep('home');
    setMobileDesignDemo(false);
    setActiveDraftId(null);
    setIsSandboxMode(false);
    navigateTo(ROUTES.upload);
  };

  /** Modal overlay — Course Development / Design only. Keeps the current course URL. */
  const openPlayerPropertiesModal = () => {
    setShowPlayerProperties(true);
  };

  const closePlayerPropertiesModal = () => {
    setShowPlayerProperties(false);
  };

  const dismissPlayerProperties = () => {
    setShowPlayerProperties(false);
  };

  const applyPlayerConfig = (cfg: PlayerConfig) => {
    setPlayerConfig(cfg);
    setNavigationMode(cfg.navigationMode);
    setExamConfig(c => ({ ...c, presentationMode: cfg.examPresentationMode }));
  };

  const persistPlayerPropertyDefaults = (cfg: PlayerConfig) => {
    applyPlayerConfig(cfg);
    savePlayerProperties(cfg, user?.id);
  };

  /** Assigned after sandbox state hooks exist */
  const launchSandboxDemoRef = React.useRef<(demo: SandboxDemo, pushUrl?: boolean) => void>(() => {});
  const launchSandboxDemo = (demo: SandboxDemo, pushUrl = true) => launchSandboxDemoRef.current(demo, pushUrl);

  const [activeTab, setActiveTab] = useState<'topic' | 'file' | 'url'>('topic');
  const [courseTitle, setCourseTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [showUploadPathModal, setShowUploadPathModal] = useState(false);
  /** defaults = profile menu; session = after customize upload; quick = one-click build */
  const [settingsMode, setSettingsMode] = useState<'defaults' | 'session' | 'quick'>('session');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [settingsSavedFlash, setSettingsSavedFlash] = useState(false);
  const [lastUploadPath, setLastUploadPath] = useState<UploadPathChoice | null>(null);
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(null);
  /** Ref so runAnalysis (defined earlier) can call finalize after hydrate */
  const finalizeGeneratedCourseRef = useRef<(course: any) => Promise<void>>(async () => {});
  
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
  // 'light' is the default course theme: white background, black body text,
  // clean minimal slide layouts (per global visual redesign direction).
  const [theme, setTheme] = useState<'light' | 'dark' | 'unified'>('light');
  const [courseBg, setCourseBg] = useState<string | null>(null);
  const [scormVersion, setScormVersion] = useState<ScormVersion>('1.2');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Mobile portrait orientation detection
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 && window.innerHeight > window.innerWidth
  );
  // Compact / phone layouts: use dropdown TOC (not fixed left rail) for max slide space.
  // Covers mobile preview mode, portrait phones, and landscape phones (short edge < 520).
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 520
  );
  const useMobileTocDropdown = viewMode === 'mobile' || isPortrait || isCompactViewport;

  const [showSettings, setShowSettings] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [showImageGalleryForSlide, setShowImageGalleryForSlide] = useState<string | null>(null);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);

  // Interaction Previews
  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);
  const [previewModalViewMode, setPreviewModalViewMode] = useState<'desktop' | 'mobile'>('desktop');
  /** Admin Demo — Design (Mobile): wrap Course Settings inside enlarged phone chrome */
  const [mobileDesignDemo, setMobileDesignDemo] = useState(false);
  
  // Player Properties
  const [showPlayerProperties, setShowPlayerProperties] = useState(false);
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(defaultPlayerConfig);
  
  // Edit Drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  /** Always-current ref so Save Changes captures the latest editingSlide even after async edits */
  const editingSlideRef = useRef<any>(null);
  const [editDrawerTab, setEditDrawerTab] = useState<'text'|'audio'|'regenerate'>('text');
  const [regenTargetType, setRegenTargetType] = useState<string>('content');
  const [regenNoInteraction, setRegenNoInteraction] = useState(false);
  const [isRegenSlideRunning, setIsRegenSlideRunning] = useState(false);
  /** Knowledge-check slides where learner clicked Check Answers / Submit */
  const [kcCheckedSlideIds, setKcCheckedSlideIds] = useState<Set<string>>(() => new Set());

  // Player / Game
  const [quizState, setQuizState] = useState<Record<string, any>>({});
  // Sandbox / Admin dropdowns
  const [sandboxDropdownOpen, setSandboxDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false); // kept for compat
  // Sandbox mode flag (dummy course active)
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // ── Sandbox demo launcher (shared by menu + deep links) ───────────────────
  launchSandboxDemoRef.current = (demo: SandboxDemo, pushUrl = true) => {
    setActiveDraftId(null);
    setShowPlayerProperties(false);
    if (demo === 'settings') {
      setCourseTitle('Advanced Workplace Communication');
      setCourseDescription('A comprehensive eLearning course covering modern workplace communication strategies.');
      setLearningObjectives([{ terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration.', enablingObjectives: [] }]);
      setCourseType('standard'); setPreset('standard');
      setSettingsMode('session');
      setPreviewModalViewMode('desktop');
      setMobileDesignDemo(false);
      setViewMode('desktop');
      setIsSandboxMode(true);
      setStep('details');
      if (pushUrl) navigateTo(ROUTES.sandboxSettings);
      return;
    }
    if (demo === 'designMobile') {
      setCourseTitle('Advanced Workplace Communication');
      setCourseDescription('A comprehensive eLearning course covering modern workplace communication strategies.');
      setLearningObjectives([{ terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration.', enablingObjectives: [] }]);
      setCourseType('standard'); setPreset('standard');
      setSettingsMode('session');
      setPreviewModalViewMode('mobile');
      setMobileDesignDemo(true);
      setViewMode('mobile');
      setIsSandboxMode(true);
      setStep('details');
      if (pushUrl) navigateTo(ROUTES.sandboxDesignMobile);
      return;
    }
    // development | mobile
    setCourse(DUMMY_COURSE); setOriginalCourse(DUMMY_COURSE);
    setCurrentSlideIndex(0); setQuizState({}); setTheme('light');
    setViewMode(demo === 'mobile' ? 'mobile' : 'desktop');
    setFloatingImagesMap({}); setSyntheticSlideOverrides({}); setCourseBg(null);
    setIsSandboxMode(true);
    setMobileDesignDemo(false);
    setImageMode('ai');
    setExamQuestions(DUMMY_EXAM_QUESTIONS); setExamConfig(DUMMY_COURSE.examConfig!);
    setExamPhase('idle'); setExamError(null); setIsGeneratingExam(false);
    setHighestVisitedIndex(0);
    setPlayerConfig(prev => ({ ...prev, playerResolution: '16:9' }));
    setNavigationMode(DUMMY_COURSE.navigationMode ?? 'free');
    setStep('preview');
    if (pushUrl) navigateTo(demo === 'mobile' ? ROUTES.sandboxMobile : ROUTES.sandboxDevelopment);
    setIsGeneratingImages(true);
    generateCourseCoverImage(DUMMY_COURSE.title, DUMMY_COURSE.description)
      .then((url) => {
        setCourse((prev: any) => prev ? { ...prev, coverImage: url } : prev);
        setOriginalCourse((prev: any) => prev ? { ...prev, coverImage: url } : prev);
        setCourseBg(url);
      })
      .catch((err) => {
        console.warn('[Demo] AI cover failed:', err);
        showDraftMessage('Demo cover image generation failed.');
      })
      .finally(() => setIsGeneratingImages(false));
  };

  const applyAuthenticatedPath = React.useCallback((target: string) => {
    const parsed = parseAppPath(target);

    if (parsed.kind === 'auth' || target === '/' || target === '') {
      navigateTo(ROUTES.upload, true);
      setStep('home');
      return;
    }
    if (parsed.kind === 'upload') {
      setStep('home');
      setActiveDraftId(null);
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
      setShowPlayerProperties(false);
      return;
    }
    if (parsed.kind === 'courseSettings') {
      setSettingsMode('defaults');
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
      setActiveDraftId(null);
      setShowPlayerProperties(false);
      setStep('details');
      return;
    }
    if (parsed.kind === 'courseDevelopment') {
      setShowPlayerProperties(false);
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
      if (course) setStep('preview');
      else { navigateTo(ROUTES.upload, true); setStep('home'); }
      return;
    }
    if (parsed.kind === 'myAccount') {
      setShowPlayerProperties(false);
      setStep('account');
      return;
    }
    if (parsed.kind === 'pricingAuthed' || (parsed.kind === 'marketing' && parsed.view === 'pricing')) {
      setShowPlayerProperties(false);
      setStep('pricing');
      return;
    }
    if (parsed.kind === 'playerProperties') {
      setShowPlayerProperties(false);
      const saved = loadPlayerProperties(user?.id);
      if (saved) {
        setPlayerConfig(saved);
        setNavigationMode(saved.navigationMode);
        setExamConfig(c => ({ ...c, presentationMode: saved.examPresentationMode }));
      }
      setStep('player-properties');
      return;
    }
    if (parsed.kind === 'design') {
      void (async () => {
        setIsLoadingDraft(false);
        showDraftMessage('Opening design draft…');
        const snap = await draftManager.loadDraftAsync(parsed.draftId);
        if (snap?.phase === 'design') {
          setActiveDraftId(parsed.draftId);
          setShowPlayerProperties(false);
          applyDesignSnapshot(snap);
          showDraftMessage('Design draft loaded ✓');
        } else {
          showDraftMessage('Design draft not found.');
          navigateTo(ROUTES.upload, true);
          setStep('home');
        }
      })();
      return;
    }
    if (parsed.kind === 'preview') {
      void (async () => {
        // Never block the UI with the draft overlay on deep-link restore
        setIsLoadingDraft(false);
        setDraftLoadProgress(0);
        setDraftLoadStatus('');
        showDraftMessage('Opening draft…');
        try {
          const snap = await draftManager.loadDraftAsync(parsed.draftId);
          if (snap?.phase === 'preview' && snap.course?.modules?.length) {
            setActiveDraftId(parsed.draftId);
            await openPreviewFromSnapshot(parsed.draftId, snap);
          } else {
            showDraftMessage('Course draft not found.');
            navigateTo(ROUTES.upload, true);
            setStep('home');
          }
        } catch (e: any) {
          console.error('[Drafts] Deep-link open failed:', e);
          showDraftMessage(e?.message || 'Failed to open draft.');
          navigateTo(ROUTES.upload, true);
          setStep('home');
        } finally {
          setIsLoadingDraft(false);
        }
      })();
      return;
    }
    if (parsed.kind === 'sandbox') {
      if (!isAdmin) {
        navigateTo(ROUTES.upload, true);
        setStep('home');
        return;
      }
      launchSandboxDemo(parsed.demo, false);
      return;
    }
    if (parsed.kind === 'payment') {
      setStep(parsed.outcome === 'success' ? 'payment-success' : 'payment-cancel');
      navigateTo(ROUTES.upload, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftManager, isAdmin, course]);

  const pathBootstrappedForUser = React.useRef<string | null>(null);

  // ── Deep-link restore (auth + protected paths) ─────────────────────────────
  useEffect(() => {
    if (isScormPlayer || authLoading) return;
    const path = window.location.pathname;

    if (!user) {
      pathBootstrappedForUser.current = null;
      if (isProtectedPath(path)) {
        stashReturnTo(path);
        setPublicView('auth');
        setAuthInitialMode('login');
        navigateTo(ROUTES.login, true);
        return;
      }
      const parsed = parseAppPath(path);
      if (parsed.kind === 'marketing') setPublicView(parsed.view === 'homepage' ? 'homepage' : parsed.view);
      else if (parsed.kind === 'auth') {
        setPublicView('auth');
        setAuthInitialMode(parsed.mode);
      } else if (parsed.kind === 'payment') {
        setStep(parsed.outcome === 'success' ? 'payment-success' : 'payment-cancel');
        navigateTo(ROUTES.home, true);
      }
      return;
    }

    // Authenticated bootstrap once per user session (honor returnTo after login)
    if (pathBootstrappedForUser.current === user.id) return;
    pathBootstrappedForUser.current = user.id;
    const returnTo = consumeReturnTo();
    const target = returnTo || path;
    if (returnTo) navigateTo(returnTo, true);
    applyAuthenticatedPath(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isScormPlayer, isAdmin]);

  // Keep URL in sync with major authenticated steps
  useEffect(() => {
    if (!user || isScormPlayer) return;
    const path = window.location.pathname;
    if (path.startsWith('/sandbox/')) return;

    if (step === 'home' && path !== ROUTES.upload) navigateTo(ROUTES.upload, true);
    else if (step === 'details' && !isSandboxMode) {
      if (activeDraftId && !path.startsWith('/design/')) navigateTo(ROUTES.design(activeDraftId), true);
      else if (!activeDraftId && path !== ROUTES.courseSettings && !path.startsWith('/design/')) {
        navigateTo(ROUTES.courseSettings, true);
      }
    } else if (step === 'account' && path !== ROUTES.myAccount) navigateTo(ROUTES.myAccount, true);
    else if (step === 'pricing' && path !== ROUTES.pricing) navigateTo(ROUTES.pricing, true);
    else if (step === 'player-properties' && path !== ROUTES.playerProperties) {
      navigateTo(ROUTES.playerProperties, true);
    } else if (step === 'preview' && !isSandboxMode) {
      if (activeDraftId && !path.startsWith('/preview/')) navigateTo(ROUTES.preview(activeDraftId), true);
      else if (!activeDraftId && path !== ROUTES.courseDevelopment && !path.startsWith('/preview/')) {
        navigateTo(ROUTES.courseDevelopment, true);
      }
    }
  }, [step, user, isScormPlayer, isSandboxMode, activeDraftId]);

  // ── Browser back / forward ────────────────────────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!user) {
        if (isProtectedPath(path)) {
          stashReturnTo(path);
          setPublicView('auth');
          setAuthInitialMode('login');
          navigateTo(ROUTES.login, true);
          return;
        }
        const parsed = parseAppPath(path);
        if (parsed.kind === 'marketing') { setPublicView(parsed.view === 'homepage' ? 'homepage' : parsed.view); window.scrollTo(0, 0); }
        else if (parsed.kind === 'auth') { setPublicView('auth'); setAuthInitialMode(parsed.mode); }
        else setPublicView('homepage');
        return;
      }
      applyAuthenticatedPath(path);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, applyAuthenticatedPath]);

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


  // ── Undo history (max 20 snapshots) ─────────────────────────────────────────
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
  // Module Overview (1.1, 2.1, …): synthetic objectives accordion after Module Title.
  // On by default — Course Settings → Objectives → Structure Components.
  const [includeModuleOverviewSlides, setIncludeModuleOverviewSlides] = useState(true);
  const [includeSummarySlides, setIncludeSummarySlides] = useState(true);
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(true);
  const [imageMode, setImageMode] = useState<CourseImageMode>('ai');
  const [generatedCourseTitle, setGeneratedCourseTitle] = useState('');
  const [qcFocusSlideId, setQcFocusSlideId] = useState<string | null>(null);

  // Mastery Quiz state
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    enabled: true,
    passingScore: 80,
    questionMode: 'total',
    questionCount: 10,
    allowRetake: true,
    questionTypes: ['mc', 'ma', 'tf'],
    presentationMode: 'one-at-a-time',
    knowledgeCheckMode: 'per-module',
    knowledgeCheckCount: 1,
    knowledgeCheckQuestionTypes: ['mc', 'ma', 'tf', 'sorting', 'matching'],
  });
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examPhase, setExamPhase] = useState<'idle' | 'active' | 'complete'>('idle');
  const [examError, setExamError] = useState<string | null>(null);
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
  const [requireInteractionsComplete, setRequireInteractionsComplete] = useState(false);
  const [highestVisitedIndex, setHighestVisitedIndex] = useState(0);
  /** Per-slide set of explored interaction item ids (for requireInteractionsComplete) */
  const [exploredBySlide, setExploredBySlide] = useState<Record<string, string[]>>({});

  // Load saved account-level player defaults once per signed-in user
  useEffect(() => {
    if (!user?.id) {
      playerDefaultsLoadedFor.current = null;
      return;
    }
    if (playerDefaultsLoadedFor.current === user.id) return;
    playerDefaultsLoadedFor.current = user.id;
    const saved = loadPlayerProperties(user.id);
    if (saved) {
      setPlayerConfig(saved);
      setNavigationMode(saved.navigationMode);
      setExamConfig(c => ({ ...c, presentationMode: saved.examPresentationMode }));
    }
  }, [user?.id]);

  const markInteractionExplored = (slideId: string | undefined, itemId: string) => {
    if (!slideId || !itemId) return;
    setExploredBySlide(prev => {
      const cur = prev[slideId] || [];
      if (cur.includes(itemId)) return prev;
      return { ...prev, [slideId]: [...cur, itemId] };
    });
  };

  const normItemId = (raw: any, fallback: string) => {
    const s = raw != null ? String(raw).trim() : '';
    return s || fallback;
  };

  const expectedInteractionIds = (slide: any): string[] => {
    if (!slide) return [];
    const d = slide.data || {};
    const ix = slide.interactions?.[0] || {};
    switch (slide.type) {
      case 'hotspot':
        return (d.points || d.hotspots || ix.points || ix.hotspots || []).map((p: any, i: number) =>
          normItemId(p.id, `hs-${i}`)
        );
      case 'accordion':
      case 'click-reveal':
        return (d.items || ix.items || []).map((it: any, i: number) =>
          normItemId(it.id, slide.type === 'click-reveal' ? `cr-${i}` : `acc-${i}`)
        );
      case 'timeline':
        return (d.events || ix.events || []).map((ev: any, i: number) =>
          normItemId(ev.id, `ev-${i}`)
        );
      case 'tabbed-horizontal':
      case 'tabbed-vertical':
        return (d.tabs || d.items || ix.tabs || ix.items || []).map((t: any, i: number) =>
          normItemId(t.id, `tab-${i}`)
        );
      case 'carousel-panel':
        return (d.cards || d.items || ix.cards || ix.items || []).map((c: any, i: number) =>
          normItemId(c.id, `card-${i}`)
        );
      case 'flashcards':
        return (d.cards || ix.cards || []).map((c: any, i: number) =>
          normItemId(c.id, `fc-${i}`)
        );
      default:
        return [];
    }
  };

  // Player Audio/Refs
  const player = usePlayer();
  const { progress: ttsProgress, generateTTS, resetTTS } = useTTSGeneration();

  // Virtual exam slides appended after all content slides.
  // Module Title (module-cover) and Module Overview are injected per Course Settings.
  const contentSlides: Slide[] = course
    ? course.modules.flatMap((m: any, moduleIdx: number) => {
        const moduleObj = (learningObjectives as any)?.[moduleIdx] ?? null;
        const modNum = moduleIdx + 1;
        const cleanTitle = (m.title || `Module ${modNum}`).replace(/^Module\s+\d+\s*[—\-]\s*/i, '').trim();
        const synthetics: Slide[] = [];

        if (includeModuleTitleSlides) {
          // Full-bleed Module Title — announces module number + name.
          synthetics.push({
            id: `__module-cover-${modNum}__`,
            title: m.title || `Module ${modNum}`,
            type: 'module-cover' as any,
            content: m.description || '',
            voiceOverText: `Module ${modNum}: ${cleanTitle}.${m.description ? ' ' + m.description : ''}`.trim(),
            _moduleNumber: modNum,
            _moduleTitle: m.title || `Module ${modNum}`,
          } as Slide);
        }

        if (includeModuleOverviewSlides) {
          // Module Overview (e.g. 1.1, 2.1): objectives accordion after the title slide.
          // If the title slide is present, narration continues without re-announcing the name.
          const overviewVo = includeModuleTitleSlides
            ? (m.description ? `Here's what you'll cover: ${m.description}` : "Let's look at the learning objectives for this module.")
            : `Module ${modNum}: ${cleanTitle}. ${m.description ? `Here's what you'll cover: ${m.description}` : "Let's look at the learning objectives for this module."}`.trim();
          synthetics.push({
            id: `__module-overview-${modNum}__`,
            title: `Module ${modNum} — Overview`,
            type: 'module-overview' as any,
            content: syntheticSlideOverrides[`__module-overview-${modNum}__`]?.content ?? (m.description || ''),
            voiceOverText: syntheticSlideOverrides[`__module-overview-${modNum}__`]?.voiceOverText ?? overviewVo,
            _moduleNumber: modNum,
            _moduleTitle: m.title || `Module ${modNum}`,
            _objectives: moduleObj ? [moduleObj] : [],
          } as Slide);
        }

        return [...synthetics, ...(m.slides || []).filter((s: any) => s?.type !== 'game-template')];
      })
    : [];
  // Item 12: Inject a synthetic cover slide at position 0 — short blurb only (narration carries detail)
  const coverSlide: Slide = course ? {
    id: '__cover__',
    title: course.title,
    type: 'cover' as any,
    content: (() => {
      const raw = (course.description || '').trim();
      if (!raw) return '';
      const sentences = raw.match(/[^.!?]+[.!?]+/g) || [raw];
      return sentences.slice(0, 2).join(' ').trim().slice(0, 200);
    })(),
    narration: `Welcome to ${course.title}. ${course.description || ''}`.trim(),
    // Only the AI/user cover — never stock photo archive (courseBg)
    coverImage: (course as any).coverImage || undefined,
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
        const m = (s as any).id.match(/__module-(?:overview|cover)-(\d+)__/);
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

  const KNOWLEDGE_CHECK_TYPES = new Set([
    'matching', 'sorting', 'drop-targets', 'quiz', 'multiple-choice',
    'multiple-answers', 'true-false', 'knowledge-check', 'multiple-answer',
  ]);

  const markKcChecked = (slideId?: string) => {
    if (!slideId) return;
    setKcCheckedSlideIds(prev => {
      if (prev.has(slideId)) return prev;
      const next = new Set(prev);
      next.add(slideId);
      return next;
    });
  };

  const isKnowledgeCheckSlide = (slide?: Slide | null) =>
    !!slide && KNOWLEDGE_CHECK_TYPES.has(slide.type as string);

  const isKcCheckSatisfied = (): boolean => {
    if (navigationMode === 'free') return true;
    if (!currentSlide || !isKnowledgeCheckSlide(currentSlide)) return true;
    return kcCheckedSlideIds.has(currentSlide.id);
  };

  const isCurrentSlideInteractionsComplete = (): boolean => {
    if (!requireInteractionsComplete) return true;
    if (navigationMode === 'free') return true;
    if (!currentSlide) return true;
    const expected = expectedInteractionIds(currentSlide);
    if (expected.length === 0) return true;
    const explored = new Set(exploredBySlide[currentSlide.id] || []);
    return expected.every(id => explored.has(id));
  };

  const interactionProgressLabel = (() => {
    if (navigationMode !== 'free' && currentSlide && isKnowledgeCheckSlide(currentSlide) && !kcCheckedSlideIds.has(currentSlide.id)) {
      return 'Check your answers to continue';
    }
    if (!requireInteractionsComplete || navigationMode === 'free' || !currentSlide) return null;
    const expected = expectedInteractionIds(currentSlide);
    if (expected.length === 0) return null;
    const explored = new Set(exploredBySlide[currentSlide.id] || []);
    const done = expected.filter(id => explored.has(id)).length;
    if (done >= expected.length) return null;
    return `Explore all parts to continue (${done}/${expected.length})`;
  })();

  /** TOC-aligned slide refs (1.1 = overview when enabled, then content slides) */
  const tocRefBySlideId = React.useMemo(() => {
    const map = new Map<string, string>();
    if (!course?.modules) return map;
    course.modules.forEach((mod: any, mi: number) => {
      let n = 1;
      if (includeModuleOverviewSlides) {
        map.set(`__module-overview-${mi + 1}__`, `${mi + 1}.${n++}`);
      }
      (mod.slides || []).forEach((s: any) => {
        if (s?.id) map.set(s.id, `${mi + 1}.${n++}`);
      });
    });
    return map;
  }, [course, includeModuleOverviewSlides]);

  const qcReportWithTocRefs = React.useMemo(() => {
    if (!qcReport) return null;
    return {
      ...qcReport,
      issues: qcReport.issues.map(i => ({
        ...i,
        slideRef: tocRefBySlideId.get(i.slideId) || i.slideRef,
      })),
    };
  }, [qcReport, tocRefBySlideId]);

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
    if (!isKcCheckSatisfied()) return;
    if (!isCurrentSlideInteractionsComplete()) return;
    const next = Math.min(allSlides.length - 1, currentSlideIndex + 1);
    setHighestVisitedIndex(prev => Math.max(prev, next));
    setCurrentSlideIndex(next);
  };

  const handlePrev = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  // Orientation / compact-viewport listener
  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
      setIsCompactViewport(Math.min(window.innerWidth, window.innerHeight) < 520);
    };
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
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

  // SCORM lifecycle — safe no-op when not inside an LMS
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

  // Set courseBg stably — Item 11: skip background for light theme (stays white)
  useEffect(() => {
    if (course && !courseBg) {
      // Light theme stays white by default; dark/unified get the themed background
      if (course.visualTheme !== 'light') {
        setCourseBg(getRandomBackgroundForTheme(course.visualTheme));
      }
    }
  }, [course]);

  // Item 13: Auto-play voice-over when slide changes
  // Uses a ref so the setTimeout closure always calls the LATEST play() — avoids stale isPlaying=true skip
  const playerPlayRef = useRef<() => void>(() => {});
  useEffect(() => { playerPlayRef.current = player.play; }, [player.play]);
  useEffect(() => {
    if (!voiceOverEnabled) return;
    const timer = setTimeout(() => {
      // Call via ref — guaranteed to use state from the most recent render
      playerPlayRef.current();
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide?.id, player.hasAudio, voiceOverEnabled]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  /** When set, shows a non-error warm-up UI and auto-retries analysis at 0 */
  const [coldStartCountdown, setColdStartCountdown] = useState<number | null>(null);
  const coldStartTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearColdStartCountdown = () => {
    if (coldStartTimerRef.current) {
      clearInterval(coldStartTimerRef.current);
      coldStartTimerRef.current = null;
    }
    setColdStartCountdown(null);
  };

  const retryAnalysisAfterWarmup = () => {
    if (!uploadedFile) return;
    clearColdStartCountdown();
    setAnalyzeError(null);
    if (lastUploadPath) {
      const override = lastUploadPath === 'quick' ? loadCourseSettings(user?.id) : null;
      if (override) applySavedSettings(override);
      runAnalysis(uploadedFile, lastUploadPath, override);
    } else {
      runAnalysis(uploadedFile);
    }
  };

  const startColdStartCountdown = () => {
    clearColdStartCountdown();
    setAnalyzeError(null);
    setColdStartCountdown(30);
    setProgress(80);
    coldStartTimerRef.current = setInterval(() => {
      setColdStartCountdown(prev => {
        if (prev == null) return null;
        if (prev <= 1) {
          if (coldStartTimerRef.current) {
            clearInterval(coldStartTimerRef.current);
            coldStartTimerRef.current = null;
          }
          // Defer retry so we don't call setState during this updater
          setTimeout(() => retryAnalysisAfterWarmup(), 0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const applySavedSettings = (saved: SavedCourseSettings) => {
    setPreset(saved.preset);
    setCourseType(saved.preset);
    setObjectiveFormat(saved.objectiveFormat);
    setExamConfig(saved.examConfig);
    setNavigationMode(saved.navigationMode);
    setRequireInteractionsComplete(!!saved.requireInteractionsComplete);
    // Assessment types moved to Assessments tab — strip from interactive elements.
    // Accordion is folded into click-reveal (same progressive-disclosure UX).
    const QUIZ_ONLY = new Set(['multiple-choice', 'multiple-answers', 'sorting', 'matching', 'drop-targets']);
    setInteractionTypes(mapToGridIds((saved.interactionTypes || []).filter(t => !QUIZ_ONLY.has(t))));
    setGameTemplateIds([]); // Games temporarily disabled
    setVoiceOverEnabled(saved.voiceOverEnabled);
    setTtsVoice(saved.ttsVoice);
    setIncludeModuleTitleSlides(saved.includeModuleTitleSlides ?? true);
    // New key (default ON). Do not inherit legacy includeObjectiveSlides — that
    // flag meant "AI-authored objectives slide" and was false by default.
    setIncludeModuleOverviewSlides(
      typeof saved.includeModuleOverviewSlides === 'boolean'
        ? saved.includeModuleOverviewSlides
        : true
    );
    setIncludeSummarySlides(saved.includeSummarySlides ?? true);
    setSlideCount(saved.slideCount);
    setImageMode(normalizeImageMode(saved.imageMode));
  };

  const collectCurrentSettings = (): SavedCourseSettings => ({
    preset,
    objectiveFormat,
    examConfig,
    navigationMode,
    requireInteractionsComplete,
    interactionTypes,
    gameTemplateIds: [], // Games temporarily disabled — do not persist selections
    voiceOverEnabled,
    ttsVoice,
    includeModuleTitleSlides,
    includeModuleOverviewSlides,
    includeSummarySlides,
    slideCount,
    imageMode,
  });

  const persistCourseSettings = () => {
    saveCourseSettings(collectCurrentSettings(), user?.id);
    setSettingsSavedFlash(true);
    setTimeout(() => setSettingsSavedFlash(false), 2000);
  };

  // Load saved course defaults once auth is ready
  useEffect(() => {
    if (authLoading) return;
    const saved = loadCourseSettings(user?.id);
    if (saved) applySavedSettings(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const buildOutlineFromCurrentSettings = async (): Promise<CourseOutlineDraft> => {
    // Quiz activity types must NOT be merged into content interactionTypes —
    // they only appear as Knowledge Check slides (see aiService outline prompt).
    const contentInteractions = (interactionTypes || []).filter(
      t => !['sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers', 'quiz'].includes(t)
    );
    return generateCourseOutline(
      prompt,
      learningObjectives,
      {
        courseType,
        interactionTypes: contentInteractions,
        slideCount,
        includeModuleTitleSlides,
        includeModuleOverviewSlides,
        includeSummarySlides,
        // Games temporarily disabled in UI — never request game slides
        gameTemplateIds: undefined,
        includeKnowledgeChecks: true,
        knowledgeCheckMode: examConfig.knowledgeCheckMode || 'per-module',
        knowledgeCheckCount: examConfig.knowledgeCheckCount ?? 1,
        quizActivityTypes: (examConfig.knowledgeCheckQuestionTypes || examConfig.questionTypes || []).filter(t =>
          ['sorting', 'matching', 'drop-targets', 'mc', 'ma', 'tf'].includes(t)
        ),
      }
    );
  };

  /**
   * Runs the full AI document analysis. Can be called directly for retries.
   * Stays on the analyzing screen on failure — shows error + Retry button in-place.
   * @param path 'quick' skips settings UI and builds; 'customize' opens Course Settings with outline;
   *             'game' extracts text only; undefined keeps legacy → details without outline.
   */
  const runAnalysis = async (
    file: File,
    path?: UploadPathChoice | 'game',
    settingsOverride?: SavedCourseSettings | null
  ) => {
    clearColdStartCountdown();
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setProgress(15);
    const analysisTimer = setInterval(() => {
      setProgress(prev => prev < 80 ? Math.min(80, prev + 5) : prev);
    }, 500);
    try {
      const text = await extractTextFromFile(file);
      setExtractedFileText(text);

      const effectivePath = path ?? (buildMode === 'game' ? 'game' : undefined);

      if (effectivePath === 'game' || buildMode === 'game') {
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

      // Snapshot settings for outline/hydrate (avoid stale React state after setState)
      let outlineCourseType: 'quick' | 'standard' | 'comprehensive' = settingsOverride?.preset ?? preset;
      let outlineInteractions = (settingsOverride?.interactionTypes ?? interactionTypes).filter(
        t => !['sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers', 'quiz'].includes(t)
      );
      let outlineSlideCount = settingsOverride?.slideCount ?? slideCount;
      let outlineIncludeModuleTitles = settingsOverride?.includeModuleTitleSlides ?? includeModuleTitleSlides;
      let outlineIncludeModuleOverviews = settingsOverride?.includeModuleOverviewSlides ?? includeModuleOverviewSlides;
      const outlineExamCfg = settingsOverride?.examConfig ?? examConfig;

      // Quick build: keep user-saved defaults. Customize: allow AI preset recommendations.
      if (effectivePath !== 'quick') {
        if (result.recommendedObjectiveFormat) setObjectiveFormat(result.recommendedObjectiveFormat as any);
        if (result.recommendedPreset) {
          const rp = result.recommendedPreset as 'quick' | 'standard' | 'comprehensive';
          setPreset(rp);
          setCourseType(rp);
          const config = getPresetConfig('corporate', rp);
          setSlideCount(config.slideCountTarget);
          setInteractionTypes(mapToGridIds(config.interactions).filter(
            t => !['sorting', 'matching', 'drop-targets', 'quiz'].includes(t)
          ));
          if (config.objectiveFormat) setObjectiveFormat(config.objectiveFormat);
          outlineCourseType = rp;
          outlineInteractions = mapToGridIds(config.interactions).filter(
            t => !['sorting', 'matching', 'drop-targets', 'quiz'].includes(t)
          );
          outlineSlideCount = config.slideCountTarget;
        }
      }

      await new Promise(r => setTimeout(r, 300));

      if (effectivePath === 'quick') {
        setSettingsMode('quick');
        setIsAnalyzing(false);
        setIsGenerating(true);
        setProgress(20);
        try {
          const draft = await generateCourseOutline(
            result.title || file.name,
            result.objectives || learningObjectives,
            {
              courseType: outlineCourseType,
              interactionTypes: outlineInteractions,
              slideCount: outlineSlideCount,
              includeModuleTitleSlides: outlineIncludeModuleTitles,
              includeModuleOverviewSlides: outlineIncludeModuleOverviews,
              gameTemplateIds: undefined,
              includeKnowledgeChecks: true,
              knowledgeCheckMode: outlineExamCfg.knowledgeCheckMode || 'per-module',
              knowledgeCheckCount: outlineExamCfg.knowledgeCheckCount ?? 1,
              quizActivityTypes: outlineExamCfg.knowledgeCheckQuestionTypes || outlineExamCfg.questionTypes,
            }
          );
          setOutlineDraft(draft);
          setProgress(45);
          const finalCourse = await hydrateCourseContent(
            draft,
            result.title || file.name,
            {
              courseType: outlineCourseType,
              scenarioConfig: outlineInteractions.includes('scenario') ? scenarioConfig : undefined,
            },
            // Leave 55–100% for images + audio in finalize
            (pct) => setProgress(20 + Math.round(pct * 0.35))
          );
          // Apply Course Settings + wait for images/audio before showing Development
          await finalizeGeneratedCourseRef.current({
            ...finalCourse,
            learningObjectives: result.objectives || learningObjectives,
            title: result.title || finalCourse.title,
            description: result.summary || finalCourse.description,
          });
        } catch (e: any) {
          setError(e?.message || 'Quick build failed.');
          setSettingsMode('session');
          setStep('details');
        } finally {
          setIsGenerating(false);
          setProgress(0);
        }
        return;
      }

      // Customize path: open Course Settings and generate outline for Design tab
      setSettingsMode('session');
      setIsAnalyzing(false);
      setProgress(0);
      setActiveDraftId(null);
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
      setStep('details');
      navigateTo(ROUTES.courseSettings);
      setIsGeneratingOutline(true);
      try {
        const draft = await generateCourseOutline(
          result.title || file.name,
          result.objectives || learningObjectives,
          {
            courseType: outlineCourseType,
            interactionTypes: outlineInteractions,
            slideCount: outlineSlideCount,
            includeModuleTitleSlides: outlineIncludeModuleTitles,
            includeModuleOverviewSlides: outlineIncludeModuleOverviews,
            gameTemplateIds: undefined,
            includeKnowledgeChecks: true,
            knowledgeCheckMode: outlineExamCfg.knowledgeCheckMode || 'per-module',
            knowledgeCheckCount: outlineExamCfg.knowledgeCheckCount ?? 1,
            quizActivityTypes: outlineExamCfg.knowledgeCheckQuestionTypes || outlineExamCfg.questionTypes,
          }
        );
        setOutlineDraft(draft);
      } catch (e: any) {
        console.warn('[runAnalysis] Outline generation failed:', e);
        setError(e?.message || 'Could not generate course structure. You can retry from the Design tab.');
      } finally {
        setIsGeneratingOutline(false);
      }
    } catch (err: any) {
      clearInterval(analysisTimer);
      console.error('File analysis error:', err);
      const isColdStart = err?.message?.includes('COLD_START') || err?.message?.includes('warming up') || err?.message?.includes('503');
      const isTrialErr = err?.message?.includes('TRIAL_LIMIT_EXCEEDED') || err?.message?.includes('trial limit');
      if (isColdStart) {
        // Friendly warm-up state with auto-retry — not framed as a failure
        startColdStartCountdown();
        return;
      }
      setAnalyzeError(
        isTrialErr
          ? 'Trial generation limit reached. Please upgrade your plan to continue.'
          : `Analysis failed: ${err?.message ?? 'Unknown error'}. Please try again.`
      );
      // Keep progress at 80% and stay on the analyzing screen so the user can retry
      setProgress(80);
      // Do NOT call setIsAnalyzing(false) — stay on the overlay to show the error
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (buildMode === 'game') {
      setUploadedFile(file);
      await runAnalysis(file, 'game');
      return;
    }
    // Course Builder: choose quick vs customize before analysis
    setPendingUploadFile(file);
    setUploadedFile(file);
    setShowUploadPathModal(true);
  };

  const confirmUploadPath = async (choice: UploadPathChoice) => {
    const file = pendingUploadFile || uploadedFile;
    setShowUploadPathModal(false);
    setPendingUploadFile(null);
    setLastUploadPath(choice);
    if (!file) return;
    let settingsOverride: SavedCourseSettings | null = null;
    if (choice === 'quick') {
      settingsOverride = loadCourseSettings(user?.id);
      if (settingsOverride) applySavedSettings(settingsOverride);
    }
    await runAnalysis(file, choice, settingsOverride);
  };

  const cancelUploadPath = () => {
    setShowUploadPathModal(false);
    setPendingUploadFile(null);
    setUploadedFile(null);
  };

  const regenerateOutlineForSettings = async () => {
    setIsGeneratingOutline(true);
    setError(null);
    setProgress(15);
    try {
      const draft = await buildOutlineFromCurrentSettings();
      setOutlineDraft(draft);
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || 'Failed to regenerate course structure.');
    } finally {
      setIsGeneratingOutline(false);
      setProgress(0);
    }
  };

  const handleGenerateCourseFromSettings = async () => {
    if (isSandboxMode) {
      // Sandbox: jump to preview with dummy course (optionally reordered from outline)
      if (outlineDraft) {
        const allDummySlides: any[] = [];
        DUMMY_COURSE.modules.forEach((m: any) => m.slides.forEach((s: any) => allDummySlides.push(s)));
        const reorderedCourse = {
          ...DUMMY_COURSE,
          modules: outlineDraft.modules.map((mod: any, mi: number) => ({
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
      } else {
        setCourse(DUMMY_COURSE);
        setOriginalCourse(DUMMY_COURSE);
      }
      setCurrentSlideIndex(0);
      setCourseBg(null);
      setExamError(null);
      setIsGeneratingExam(false);
      setTheme('light');
      if (mobileDesignDemo) {
        setViewMode('mobile');
        setMobileDesignDemo(false);
      }
      setStep('preview');
      return;
    }
    if (!outlineDraft) {
      await regenerateOutlineForSettings();
      return;
    }
    await hydrateCourse();
  };

/**
   * Client-side objective reformatter.
   * Extracts the core "verb + outcome" from any AB/ABC/ABCD formatted string,
   * then re-wraps it cleanly in the target format.
   *
   * Strip order:  Given[condition],  →  The learner will  →  trailing .  →  trailing degree clause  →  trailing .
   * Reapply:       AB / ABC / ABCD wrappers
   */
  const reformatObjectivesClientSide = (
    objectives: (string | TerminalObjectiveGroup)[],
    fmt: string
  ): TerminalObjectiveGroup[] => {

    const applyFormat = (raw: string): string => {
      let s = raw.trim();

      // ── 1. Capture + strip "Given [condition], " ──────────────────────────
      // Preserve the original condition so ABC→ABCD doesn't lose specificity
      let condition = ''; // will be derived from verb if no existing Given
      const givenMatch = s.match(/^Given\s+([^,]+),\s+/i);
      if (givenMatch) {
        condition = givenMatch[1].trim();
        s = s.slice(givenMatch[0].length).trim();
      }

      // ── 2. Strip "The learner will " / "the learner will " ────────────────
      s = s.replace(/^[Tt]he learner will\s+/i, '').trim();

      // ── 3. Strip trailing period ──────────────────────────────────────────
      s = s.replace(/\.+$/, '').trim();

      // ── 4. Strip trailing degree / standard clause ────────────────────────
      s = s.replace(/\s+(?:to\s+\S|with\s+\S).+$/i, '').trim();

      // ── 5. Strip any trailing period that snuck through ───────────────────
      s = s.replace(/\.+$/, '').trim();

      // ── 6. Derive condition from verb when none was present ───────────────
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

      // ── 6. Re-apply the selected format ──────────────────────────────────
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
        // API failed — client-side reformatted objectives remain visible
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
    setInteractionTypes(mapToGridIds(config.interactions).filter(
      t => !['sorting', 'matching', 'drop-targets', 'quiz', 'multiple-choice', 'multiple-answers'].includes(t)
    ));
    setIncludeModuleTitleSlides(config.includeModuleTitleSlides);
    setIncludeModuleOverviewSlides(config.includeModuleOverviewSlides);
    setIncludeSummarySlides(config.includeSummarySlides);
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
    // With a file already chosen, show the quick/customize chooser first.
    if (uploadedFile && buildMode === 'course') {
      setPendingUploadFile(uploadedFile);
      setShowUploadPathModal(true);
      return;
    }
    setSettingsMode('session');
    setActiveDraftId(null);
    setIsSandboxMode(false);
    setMobileDesignDemo(false);
    setStep('details');
    navigateTo(ROUTES.courseSettings);
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
      const contentInteractions = (interactionTypes || []).filter(
        t => !['sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers', 'quiz'].includes(t)
      );
      const draft = await generateCourseOutline(
        prompt, 
        learningObjectives, 
        { 
          courseType, 
          interactionTypes: contentInteractions, 
          slideCount,
          includeModuleTitleSlides,
          includeModuleOverviewSlides,
          includeSummarySlides,
          gameTemplateIds: undefined,
          includeKnowledgeChecks: true,
          knowledgeCheckMode: examConfig.knowledgeCheckMode || 'per-module',
          knowledgeCheckCount: examConfig.knowledgeCheckCount ?? 1,
          quizActivityTypes: examConfig.knowledgeCheckQuestionTypes || examConfig.questionTypes,
        }
      );
      setOutlineDraft(draft);
      if (skipOutlineReview) {
        setProgress(45);
        const finalCourse = await hydrateCourseContent(
          draft,
          prompt,
          { courseType, scenarioConfig: interactionTypes.includes('scenario') ? scenarioConfig : undefined },
          (pct) => setProgress(45 + Math.round(pct * 0.1))
        );
        // Wait for images + audio before opening Course Development
        await finalizeGeneratedCourse(finalCourse);
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

  /** Apply Course Settings, finish images + audio, then open Course Development. */
  const finalizeGeneratedCourse = async (finalCourse: any) => {
    const stamped = {
      ...finalCourse,
      examConfig,
      navigationMode,
      settings: {
        ...(finalCourse.settings || {}),
        voiceOverEnabled,
        soundEffectsEnabled,
        theme: finalCourse.settings?.theme || 'light',
      },
      learningObjectives: finalCourse.learningObjectives?.length
        ? finalCourse.learningObjectives
        : learningObjectives,
    };
    setCourse(stamped);
    setOriginalCourse(stamped);
    setSyntheticAudioMap({});
    setExploredBySlide({});
    // Leaving Design phase — unsaved design draft id must not stick to Development
    setActiveDraftId(null);
    setIsSandboxMode(false);
    setMobileDesignDemo(false);
    // Do NOT open Course Development until images + audio below finish

    // Pre-generate mastery quiz in parallel (does not gate the preview)
    if (examConfig.enabled) {
      setIsGeneratingExam(true);
      setExamError(null);
      generateMasteryExam(stamped, examConfig)
        .then((questions) => {
          if (questions?.length) setExamQuestions(questions);
          else setExamError('No quiz questions could be generated. You can retry from the Mastery Quiz intro.');
        })
        .catch((err: any) => {
          console.error('[Mastery Quiz] Pre-generation failed:', err);
          setExamError(err?.message || 'Quiz generation failed.');
        })
        .finally(() => setIsGeneratingExam(false));
    } else {
      setExamQuestions([]);
    }

    const modeSnapshot = imageMode;
    const fileSnapshot = uploadedFile;
    const sourceSnapshot = sourceImages;
    const voiceSnapshot = voiceOverEnabled;
    const voiceIdSnapshot = ttsVoice;
    const { ai: wantsAi, source: wantsSource } = imageModeFlags(modeSnapshot);

    const seedFloatingFromCourse = (c: any) => {
      const map: Record<string, FloatingImage[]> = {};
      for (const m of c?.modules || []) {
        for (const s of m.slides || []) {
          if (Array.isArray(s.floatingMedia) && s.floatingMedia.length) {
            map[s.id] = s.floatingMedia;
          }
        }
      }
      if (Object.keys(map).length) {
        setFloatingImagesMap(prev => ({ ...prev, ...map }));
      }
    };

    const mergeImageryInto = (base: any, imagery: any, coverFallback: string | null) => {
      if (!imagery) {
        return { ...base, coverImage: base.coverImage || coverFallback || undefined };
      }
      const byId: Record<string, any> = {};
      for (const m of imagery.modules || []) {
        for (const s of m.slides || []) byId[s.id] = s;
      }
      return {
        ...base,
        coverImage: base.coverImage || imagery.coverImage || coverFallback || undefined,
        modules: (base.modules || []).map((m: any) => ({
          ...m,
          slides: (m.slides || []).map((s: any) => {
            const src = byId[s.id];
            if (!src) return s;
            const mergedData = (() => {
              if (!src.data) return s.data;
              if (!s.data) return src.data;
              const out = { ...s.data };
              if (src.data.imageUrl && !out.imageUrl) out.imageUrl = src.data.imageUrl;
              for (const key of ['tabs', 'items'] as const) {
                const srcList = src.data[key];
                const baseList = out[key];
                if (!Array.isArray(srcList)) continue;
                if (!Array.isArray(baseList)) {
                  out[key] = srcList;
                  continue;
                }
                out[key] = baseList.map((item: any, i: number) => {
                  const fromSrc = srcList[i];
                  if (!fromSrc?.imageUrl || item?.imageUrl) return item;
                  return { ...item, imageUrl: fromSrc.imageUrl };
                });
              }
              return out;
            })();
            return {
              ...s,
              coverImage: s.coverImage || src.coverImage,
              imageUrl: s.imageUrl || src.imageUrl,
              floatingMedia: (s.floatingMedia?.length ? s.floatingMedia : src.floatingMedia) || s.floatingMedia,
              data: mergedData,
            };
          }),
        })),
      };
    };

    let imgs = sourceSnapshot;
    let working: any = stamped;
    let coverUrl: string | null = null;

    // ── Images (55–78%) ──────────────────────────────────────────────
    if (wantsAi || wantsSource) {
      setIsGeneratingImages(true);
      setProgress(56);
      try {
        if (wantsSource && imgs.length === 0 && fileSnapshot) {
          try {
            imgs = await extractImagesFromFile(fileSnapshot);
            if (imgs.length) {
              setSourceImages(imgs);
              showDraftMessage(`Extracted ${imgs.length} image(s) from ${fileSnapshot.name}`);
            } else {
              console.warn('[ImageService] Source extract returned 0 images from', fileSnapshot.name);
              showDraftMessage('No extractable images found in the uploaded file (PNG/JPEG in PPTX media).');
            }
          } catch (e) {
            console.warn('[ImageService] Late source extract failed:', e);
            showDraftMessage('Could not extract images from the uploaded file.');
          }
        }
        setProgress(60);

        if (wantsSource && imgs.length > 0) {
          working = attachSourceImagesToCourse(working, imgs);
          seedFloatingFromCourse(working);
          setCourse(working);
          setOriginalCourse(working);
        }
        setProgress(63);

        if (wantsAi) {
          try {
            coverUrl = await generateCourseCoverImage(working.title || 'Course', working.description);
            working = { ...working, coverImage: coverUrl };
            setCourseBg(coverUrl);
            setCourse(working);
            setOriginalCourse(working);
            showDraftMessage('AI cover image ready ✓');
          } catch (err: any) {
            console.warn('[ImageService] Cover generation failed:', err);
            showDraftMessage(err?.message || 'Cover image generation failed — add one via Upload Image.');
          }
        }
        setProgress(68);

        try {
          const { enrichHotspotAndCarouselImages } = await import('./services/imageService');
          working = await enrichHotspotAndCarouselImages(working, imgs, {
            generateAi: wantsAi,
            useSource: wantsSource,
          });
          if (coverUrl) working = { ...working, coverImage: coverUrl };
          seedFloatingFromCourse(working);
          setCourse(working);
          setOriginalCourse(working);
        } catch (err) {
          console.warn('[ImageService] Hotspot/carousel enrich failed:', err);
        }
        setProgress(72);

        if (wantsAi) {
          try {
            showDraftMessage('Generating content visuals…');
            working = await generateContentSlideImages(working, (done, total) => {
              setProgress(72 + Math.round((done / Math.max(1, total)) * 6));
              if (done === total) showDraftMessage(`Content visuals ready (${total}) ✓`);
            });
            if (coverUrl) working = { ...working, coverImage: coverUrl };
            seedFloatingFromCourse(working);
            setCourse(working);
            setOriginalCourse(working);
          } catch (err) {
            console.warn('[ImageService] Content slide images failed:', err);
          }
        }
      } finally {
        setIsGeneratingImages(false);
      }
    }

    // ── QC (78–82%) ──────────────────────────────────────────────────
    setProgress(78);
    try {
      setIsRunningQC(true);
      setQcPhase('structural');
      const report = await runFullQC(working, voiceSnapshot, (phase) => setQcPhase(phase));
      setQcReport(report);
      if (report.issues.some(i => i.autoFixable)) {
        const { course: fixedCourse } = autoFixCourse(working, report);
        const merged = mergeImageryInto(fixedCourse, working, coverUrl);
        seedFloatingFromCourse(merged);
        setCourse(merged);
        setOriginalCourse(merged);
        working = merged;
      }
    } catch {
      // QC failure is non-fatal
    } finally {
      setIsRunningQC(false);
      setQcPhase(null);
    }
    setProgress(82);

    // ── Audio (82–98%) ───────────────────────────────────────────────
    if (voiceSnapshot) {
      try {
        await generateTTS(working, setCourse, voiceIdSnapshot, (current, total) => {
          setProgress(82 + Math.round((current / Math.max(1, total)) * 12));
        });
      } catch (err) {
        console.warn('[TTS] Slide narration generation failed:', err);
      }

      try {
        const { generateSlideTTS: genSlideTTS } = await import('./services/ttsService');
        const syntheticJobs: Array<{ id: string; text: string }> = [
          { id: '__cover__', text: `Welcome to ${working.title}. ${working.description || ''}`.trim() },
          { id: '__player-tour__', text: 'Before we begin, take a moment to explore the player controls. Hover over each card to see the corresponding element highlighted in the player preview.' },
        ];
        const moduleSynthetics: Array<{ id: string; text: string }> = (working.modules || []).flatMap(
          (m: any, idx: number) => {
            const modNum = idx + 1;
            const ct = (m.title || `Module ${modNum}`).replace(/^Module\s+\d+\s*[\u2014\-]\s*/i, '').trim();
            const items: Array<{ id: string; text: string }> = [];
            if (includeModuleTitleSlides) {
              items.push({
                id: `__module-cover-${modNum}__`,
                text: `Module ${modNum}: ${ct}.${m.description ? ' ' + m.description : ''}`.trim(),
              });
            }
            if (includeModuleOverviewSlides) {
              items.push({
                id: `__module-overview-${modNum}__`,
                text: includeModuleTitleSlides
                  ? (m.description
                    ? `Here's what you'll cover: ${m.description}`
                    : "Let's look at the learning objectives for this module.")
                  : `Module ${modNum}: ${ct}. ${m.description ? `Here's what you'll cover: ${m.description}` : "Let's look at the learning objectives for this module."}`.trim(),
              });
            }
            return items;
          }
        );
        const allSynthetic = [...syntheticJobs, ...moduleSynthetics].filter(j => j.text.trim());
        for (let i = 0; i < allSynthetic.length; i++) {
          const { id, text } = allSynthetic[i];
          try {
            const url = await genSlideTTS(text, { voice: voiceIdSnapshot as any });
            setSyntheticAudioMap(prev => ({ ...prev, [id]: url }));
          } catch { /* non-fatal */ }
          setProgress(94 + Math.round(((i + 1) / Math.max(1, allSynthetic.length)) * 4));
          if (i < allSynthetic.length - 1) await new Promise(r => setTimeout(r, 300));
        }
      } catch { /* silently ignore */ }
    }

    // Course is complete — open Development preview
    if (coverUrl) working = { ...working, coverImage: coverUrl };
    setCourse(working);
    setOriginalCourse(working);
    setProgress(100);
    await new Promise(r => setTimeout(r, 250));
    setStep('preview');
    navigateTo(ROUTES.courseDevelopment);
  };
  finalizeGeneratedCourseRef.current = finalizeGeneratedCourse;

  /** Regenerate a blank/empty slide in-place from the course topic. */
  const regenerateBlankSlide = async (slide: Slide) => {
    if (!course || !slide?.id) return;
    setRegeneratingSlideId(slide.id);
    try {
      const modIdx = course.modules.findIndex(m => m.slides.some(s => s.id === slide.id));
      const moduleTitle = modIdx >= 0 ? course.modules[modIdx].title : course.title;
      const isTakeaway = slide.type === 'key-takeaways' || /key\s*takeaway/i.test(slide.title || '');
      const promptText = isTakeaway
        ? `Regenerate a key-takeaways slide titled "${slide.title}" for the module "${moduleTitle}" in the course "${course.title}".
Return ONLY JSON: { "content": "## Key Takeaways\\n\\n- bullet1\\n- bullet2...", "voiceOverText": "2-3 sentences", "data": { "objectives": [{ "id": "1", "label": "short takeaway", "content": "" }] } }
Rules: 4-6 short action-verb bullets (5-8 words), no mid-bullet bold, data.objectives required.`
        : `Regenerate a ${slide.type} slide titled "${slide.title}" for the module "${moduleTitle}" in the course "${course.title}".
Return ONLY JSON: { "content": "markdown with short bullets", "voiceOverText": "2-4 spoken sentences" }
Rules: MAXIMUM 6 short bullets for summary/content lists; plain text (no **bold** in bullets).`;

      let parsed: any = null;
      try {
        const apiBase = (import.meta as any).env?.VITE_SERVER_URL || '';
        const res = await fetch(`${apiBase}/api/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, complexity: 'simple' }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const aiRes = await res.json();
        const text: string = aiRes.content?.[0]?.text ?? aiRes.text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in AI response');
        parsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.warn('[regenerateBlankSlide] AI failed, using title-derived fallback', err);
        parsed = {
          content: isTakeaway
            ? `## Key Takeaways\n\n- Review ${slide.title}\n- Apply the core module practices\n- Confirm understanding before moving on\n- Follow up with next steps`
            : `## ${slide.title}\n\n- Key point related to ${slide.title}\n- Practical application for learners\n- Common pitfall to avoid\n- Next step to take`,
          voiceOverText: `Let's review the key points for ${slide.title}.`,
          data: isTakeaway
            ? {
                objectives: [
                  { id: '1', label: `Review ${slide.title}`, content: '' },
                  { id: '2', label: 'Apply the core module practices', content: '' },
                  { id: '3', label: 'Confirm understanding before moving on', content: '' },
                  { id: '4', label: 'Follow up with next steps', content: '' },
                ],
              }
            : undefined,
        };
      }

      pushUndo();
      setCourse(prev => {
        if (!prev) return prev;
        const cloned = JSON.parse(JSON.stringify(prev));
        for (const mod of cloned.modules) {
          const idx = mod.slides.findIndex((s: any) => s.id === slide.id);
          if (idx >= 0) {
            mod.slides[idx] = {
              ...mod.slides[idx],
              content: parsed.content || mod.slides[idx].content,
              voiceOverText: parsed.voiceOverText || mod.slides[idx].voiceOverText,
              narration: parsed.voiceOverText || mod.slides[idx].narration,
              data: parsed.data
                ? { ...(mod.slides[idx].data || {}), ...parsed.data }
                : mod.slides[idx].data,
            };
            break;
          }
        }
        return cloned;
      });
    } finally {
      setRegeneratingSlideId(null);
    }
  };

  const hydrateCourse = async () => {
    setIsHydrating(true);
    setProgress(10);
    try {
      const finalCourse = await hydrateCourseContent(
        outlineDraft!, prompt, { courseType, scenarioConfig: interactionTypes.includes('scenario') ? scenarioConfig : undefined },
        // Leave 55–100% for images + audio in finalize
        (pct) => setProgress(Math.round(pct * 0.55))
      );
      await finalizeGeneratedCourse(finalCourse);
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
    const title = isGeneratingImages
      ? 'Adding Course Visuals…'
      : ttsProgress.isRunning
        ? 'Generating Narration Audio…'
        : isRunningQC
          ? (qcPhase === 'structural' ? 'Checking Structure & Format…'
             : qcPhase === 'ai' ? 'Running AI Quality Scan…'
             : 'Finalising…')
          : isGenerating && progress < 55
            ? 'Structuring Module Flow...'
            : progress < 55
              ? 'Synthesizing Course Content...'
              : progress < 78
                ? 'Adding Course Visuals…'
                : progress < 98
                  ? 'Generating Narration Audio…'
                  : 'Finishing Up…';
    const subtitle = isGeneratingImages
      ? 'Creating the cover, placing source images, and adding visuals where they help learning…'
      : ttsProgress.isRunning
        ? `Recording slide ${ttsProgress.currentSlide} of ${ttsProgress.totalSlides}${ttsProgress.currentSlideTitle ? ` — ${ttsProgress.currentSlideTitle}` : ''}…`
        : isRunningQC
          ? (qcPhase === 'ai' ? 'AI is reviewing spelling, grammar, and clarity. Almost there…' : 'Running instant checks on your course content…')
          : isGenerating && progress < 55
            ? 'Analyzing topics and creating progressive learning paths. This usually takes 10-15 seconds.'
            : progress < 55
              ? 'Generating detailed slide content, interactions, and knowledge checks. This can take up to a minute.'
              : progress < 78
                ? 'Inserting AI and source images into the course before preview…'
                : progress < 98
                  ? 'Generating voice-over for every slide before opening the course…'
                  : 'Opening Course Development…';
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
                {title}
              </h3>
              <p className="text-slate-400 text-lg">
                {subtitle}
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
            <p className="text-sm font-bold text-indigo-400 font-mono">{Math.round(progress)}% Complete</p>
            
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

  // ── Auth Gate ────────────────────────────────────────────────────────────
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

  // Not authenticated — show Public Marketing Homepage OR Sign In/Up page
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
      {/* Help & Support floating widget — hidden during course preview to avoid covering Next button */}
      {step !== 'preview' && !mobileDesignDemo && <HelpWidget userEmail={user?.email ?? ''} userId={user?.id} />}
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen overflow-hidden transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen transform -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Global marketing/nav header — hidden during course preview so the player
          gets the full viewport height (more height => bigger scale-to-fit => a
          visibly wider/larger player frame, not just taller). */}
      {step !== 'preview' && !mobileDesignDemo && (
      <header className="relative z-[600] border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 relative group cursor-pointer" onClick={goHome}>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all">
              <Zap className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>
          
          <div className="flex gap-3 items-center">


            {/* ── Pricing Button ── */}
            <button
              onClick={() => { dismissPlayerProperties(); setStep('pricing'); navigateTo(ROUTES.pricing); }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-bold text-sm transition-all ${
                step === 'pricing'
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-300'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Pricing
            </button>

            {/* ── User Profile ── */}
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
                {/* Dropdown — click controlled */}
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
                    {/* Sandbox — admin only */}
                    {isAdmin && (
                      <>
                        <div className="px-3 py-1.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Sandbox</p>
                        </div>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            launchSandboxDemo('settings');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <FileText className="w-3.5 h-3.5" /> Demo — Course Settings
                        </button>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            launchSandboxDemo('development');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <Eye className="w-3.5 h-3.5" /> Demo — Course Development
                        </button>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            launchSandboxDemo('mobile');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Demo — Mobile (Landscape)
                        </button>
                        <button
                          onClick={() => {
                            setAdminDropdownOpen(false);
                            launchSandboxDemo('designMobile');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-all text-left"
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Demo — Design (Mobile)
                        </button>
                        {/* Game Mode demo temporarily hidden — code retained for future re-enable
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
                          <Gamepad2 className="w-3.5 h-3.5" /> Demo — Game Mode
                        </button>
                        */}
                        <div className="border-t border-slate-800 my-1" />
                        {/* Trial Invites — admin only */}
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
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        dismissPlayerProperties();
                        const saved = loadCourseSettings(user?.id);
                        if (saved) applySavedSettings(saved);
                        setSettingsMode('defaults');
                        setIsSandboxMode(false);
                        setMobileDesignDemo(false);
                        setActiveDraftId(null);
                        setStep('details');
                        navigateTo(ROUTES.courseSettings);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all text-left"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      Course Settings
                    </button>
                    <button
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        setStep('player-properties');
                        navigateTo(ROUTES.playerProperties);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all text-left"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-orange-400" />
                      Player Properties
                    </button>
                    <button
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        void draftManager.refreshDrafts();
                        setShowViewDraftsModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all text-left"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                      View Drafts
                    </button>
                    <button
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        dismissPlayerProperties();
                        setStep('account');
                        navigateTo(ROUTES.myAccount);
                      }}
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
      )}

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
              <AccountPage onUpgrade={() => { dismissPlayerProperties(); setStep('pricing'); navigateTo(ROUTES.pricing); }} />
            </motion.div>
          )}
          {step === 'player-properties' && (
            <motion.div
              key="player-properties"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="relative z-10"
            >
              <PlayerPropertiesModal
                variant="page"
                config={{
                  ...playerConfig,
                  navigationMode,
                  examPresentationMode: examConfig.presentationMode,
                }}
                onChange={persistPlayerPropertyDefaults}
                onClose={goHome}
              />
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

          {/* Publish Warning — pending QC items */}
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
                    onClick={() => { setShowQcPublishWarning(false); setQcFocusSlideId(null); setQcModalOpen(true); }}
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

          {/* AI Edit Drawer — scenario and game-template slides */}
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
              onDelete={(id) => { void draftManager.deleteDraft(id); }}
              onReplace={(id) => { void handleReplaceDraft(id); }}
              saveMessage={draftSaveMessage}
            />
          )}

          <ViewDraftsModal
            isOpen={showViewDraftsModal}
            onClose={() => setShowViewDraftsModal(false)}
            drafts={draftManager.drafts}
            isReady={draftManager.isReady}
            cloudEnabled={draftManager.cloudEnabled}
            slotsUsed={draftManager.slotsUsed}
            slotsTotal={draftManager.slotsTotal}
            onRefresh={() => draftManager.refreshDrafts()}
            onLoad={handleLoadDraft}
            onDelete={(id) => { void draftManager.deleteDraft(id); }}
          />

          <DraftOpeningOverlay
            active={isLoadingDraft}
            progress={draftLoadProgress}
            statusText={draftLoadStatus}
          />

          {/* QC Track Changes Modal — overlays preview, persists across open/close */}
          <QCTrackChangesModal
            open={qcModalOpen}
            report={qcReportWithTocRefs}
            loading={qcLoading}
            loadingPhase={qcPhase}
            confirmed={qcConfirmed}
            declined={qcDeclined}
            focusSlideId={qcFocusSlideId}
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
            onClose={() => { setQcModalOpen(false); setQcFocusSlideId(null); }}
            onGoToSlide={(moduleIndex, slideIndex) => {
              const slideId = course?.modules?.[moduleIndex]?.slides?.[slideIndex]?.id;
              if (slideId) {
                const idx = allSlides.findIndex(s => s.id === slideId);
                if (idx >= 0) {
                  setCurrentSlideIndex(idx);
                  setQcModalOpen(false);
                  return;
                }
              }
              // Fallback: account for pre-content synthetics + per-module title/overview
              if (course?.modules) {
                let globalIdx = PRE_CONTENT;
                for (let m = 0; m < moduleIndex; m++) {
                  globalIdx += (includeModuleTitleSlides ? 1 : 0) + (includeModuleOverviewSlides ? 1 : 0);
                  globalIdx += course.modules[m]?.slides?.length ?? 0;
                }
                globalIdx += (includeModuleTitleSlides ? 1 : 0) + (includeModuleOverviewSlides ? 1 : 0);
                globalIdx += slideIndex;
                setCurrentSlideIndex(Math.min(globalIdx, allSlides.length - 1));
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
                const result = await regenerateSlideData(slide, course.title ?? '');
                const cloned = JSON.parse(JSON.stringify(course));
                const target = cloned.modules[moduleIndex].slides[slideIndex];
                target.type = result.type;
                target.data = result.data;
                if (result.content != null) target.content = result.content;
                pushUndo(); setCourse(cloned);
                setQcReport(prev => prev ? {
                  ...prev,
                  issues: prev.issues.filter(i => !(i.slideId === slideId && i.type === 'interaction_empty')),
                  totalIssues: Math.max(0, prev.totalIssues - 1),
                  errors: Math.max(0, prev.errors - 1),
                } : null);
              } catch (err) {
                console.error('[QC] Regeneration failed:', err);
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


              {(isAnalyzing || coldStartCountdown != null || (isGenerating && settingsMode === 'quick')) ? (
                 <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8 w-full px-6 py-16 bg-slate-950/80 backdrop-blur-xl rounded-[3rem] border border-indigo-500/30 shadow-2xl">
                   {coldStartCountdown != null ? (
                     /* ——— Cold start: warm-up countdown + auto-retry ——— */
                     <>
                       <div className="relative w-32 h-32 mx-auto mb-2">
                         <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-xl animate-pulse" />
                         <div className="absolute inset-0 border-2 border-amber-500/40 rounded-full" />
                         <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-5xl font-black text-amber-300 tabular-nums">{coldStartCountdown}</span>
                         </div>
                       </div>
                       <div>
                         <h3 className="text-2xl font-bold text-white">Server is warming up</h3>
                         <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-md mx-auto">
                           This is normal after a period of inactivity — nothing is wrong with your file or account.
                           The app will automatically try again in <span className="text-amber-300 font-bold">{coldStartCountdown} second{coldStartCountdown === 1 ? '' : 's'}</span>.
                         </p>
                       </div>
                       <div className="w-full max-w-sm mx-auto h-2.5 bg-slate-800 rounded-full overflow-hidden">
                         <div
                           className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-1000 ease-linear"
                           style={{ width: `${((30 - coldStartCountdown) / 30) * 100}%` }}
                         />
                       </div>
                       <div className="flex gap-3 justify-center">
                         <button
                           onClick={retryAnalysisAfterWarmup}
                           className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                         >
                           Try Now
                         </button>
                         <button
                           onClick={() => {
                             clearColdStartCountdown();
                             setIsAnalyzing(false);
                             setAnalyzeError(null);
                             setUploadedFile(null);
                             setProgress(0);
                           }}
                           className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                         >
                           Cancel
                         </button>
                       </div>
                     </>
                   ) : analyzeError && isAnalyzing ? (
                     /* ——— Error state: stay on overlay, show message + actions ——— */
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
                           onClick={() => {
                             if (!uploadedFile) return;
                             if (lastUploadPath) {
                               const override = lastUploadPath === 'quick' ? loadCourseSettings(user?.id) : null;
                               if (override) applySavedSettings(override);
                               runAnalysis(uploadedFile, lastUploadPath, override);
                             } else {
                               setPendingUploadFile(uploadedFile);
                               setIsAnalyzing(false);
                               setAnalyzeError(null);
                               setShowUploadPathModal(true);
                             }
                           }}
                           className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                         >
                           Try Again
                         </button>
                         <button
                           onClick={() => { setIsAnalyzing(false); setAnalyzeError(null); setUploadedFile(null); setProgress(0); clearColdStartCountdown(); }}
                           className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                         >
                           Cancel
                         </button>
                       </div>
                     </>
                   ) : (
                     /* ——— Normal loading state ——— */
                     <>
                       <div className="relative w-32 h-32 mx-auto mb-4">
                         <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                         <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin" />
                         <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite]" />
                         <FileText className="w-10 h-10 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                       </div>
                       <div>
                         <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                           {isGenerating && settingsMode === 'quick' && !isAnalyzing ? 'Building Your Course' : 'Analyzing Document'}
                         </h3>
                         <p className="text-slate-400 mt-2">
                           {isGenerating && settingsMode === 'quick' && !isAnalyzing
                             ? 'Using your saved defaults to generate the full course…'
                             : 'Extracting structure, topics, and generating learning objectives...'}
                         </p>
                       </div>
                       {/* Progress bar — driven by the analysisTimer in runAnalysis */}
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
                           {isGenerating && settingsMode === 'quick' && !isAnalyzing
                             ? (progress < 40 ? 'Creating course structure...' :
                                progress < 55 ? 'Writing slides and interactions...' :
                                progress < 78 ? 'Adding course visuals…' :
                                progress < 98 ? 'Generating narration audio…' :
                                'Opening course preview…')
                             : (progress < 30 ? 'Reading document structure...' :
                                progress < 55 ? 'Extracting topics and key concepts...' :
                                progress < 80 ? 'Generating learning objectives...' :
                                'Finalizing course blueprint...')}
                         </p>
                       </div>
                     </>
                   )}
                 </div>
              ) : (
                <div className="relative z-10 max-w-4xl mx-auto text-center w-full px-4 sm:px-6 py-8 sm:py-12 bg-slate-950/40 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] border border-indigo-500/20 shadow-2xl space-y-4 sm:space-y-6 my-4 sm:my-8 landscape:py-6 landscape:my-2">
                  {/* Title */}
                  <div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white mb-4 sm:mb-6 landscape:text-3xl landscape:mb-2">
                      NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-extrabold pb-2">AI</span>
                    </h1>
                    <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto">
                      Transform Any Document Into a Complete eLearning Experience
                    </p>
                  </div>

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
                          {uploadedFile ? 'File Ready ✓' : 'Upload File to Begin'}
                        </span>
                        <span className="text-sm text-indigo-300/70 font-medium group-hover:text-indigo-300 transition-colors">
                          {uploadedFile ? uploadedFile.name : 'Drop PDF, Word, or PowerPoint files here'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 font-medium">AI-powered authoring that analyzes your content and builds a complete, SCORM-compliant, interactive course — automatically.</p>
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
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              className={cn(
                'w-full relative z-10',
                mobileDesignDemo && 'fixed inset-0 z-50 bg-slate-950 flex flex-col'
              )}
            >
              {mobileDesignDemo ? (
                <>
                  <div className="px-3 bg-slate-900 border-b border-slate-800 shrink-0">
                    <div className="h-11 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={goHome}
                          className="p-1.5 -ml-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                          title="Back to home"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                          <h1 className="text-white font-bold text-sm truncate max-w-[260px]">
                            Design Demo
                          </h1>
                          <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Mobile
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <LandscapePhoneFrame label="Design Demo — Mobile Landscape" screenClassName="bg-slate-950 overflow-y-auto custom-scrollbar">
                      <CourseSettingsPage
                        mode={settingsMode === 'defaults' ? 'defaults' : 'session'}
                        isSandboxMode={isSandboxMode}
                        compactMobile
                        isGenerating={isGenerating}
                        isHydrating={isHydrating}
                        isSuggesting={isSuggesting}
                        isGeneratingOutline={isGeneratingOutline}
                        progress={progress}
                        error={error}
                        renderProgressState={renderProgressState}
                        courseTitle={courseTitle}
                        setCourseTitle={setCourseTitle}
                        courseDescription={courseDescription}
                        setCourseDescription={setCourseDescription}
                        prompt={prompt}
                        setPrompt={setPrompt}
                        objectiveFormat={objectiveFormat}
                        learningObjectives={learningObjectives}
                        setLearningObjectives={setLearningObjectives}
                        onFormatChange={settingsMode === 'defaults' ? (fmt) => setObjectiveFormat(fmt) : handleFormatChange}
                        onSuggestObjectives={handleSuggestObjectives}
                        examConfig={examConfig}
                        setExamConfig={setExamConfig}
                        navigationMode={navigationMode}
                        setNavigationMode={setNavigationMode}
                        requireInteractionsComplete={requireInteractionsComplete}
                        setRequireInteractionsComplete={setRequireInteractionsComplete}
                        preset={preset}
                        onPresetChange={handlePresetChange}
                        slideCount={slideCount}
                        setSlideCount={setSlideCount}
                        includeModuleTitleSlides={includeModuleTitleSlides}
                        setIncludeModuleTitleSlides={setIncludeModuleTitleSlides}
                        includeModuleOverviewSlides={includeModuleOverviewSlides}
                        setIncludeModuleOverviewSlides={setIncludeModuleOverviewSlides}
                        includeSummarySlides={includeSummarySlides}
                        setIncludeSummarySlides={setIncludeSummarySlides}
                        interactionTypes={interactionTypes}
                        setInteractionTypes={setInteractionTypes}
                        scenarioConfig={scenarioConfig}
                        setScenarioConfig={setScenarioConfig}
                        onPreviewOption={setPreviewModalOption}
                        gameTemplateIds={gameTemplateIds}
                        setGameTemplateIds={setGameTemplateIds}
                        voiceOverEnabled={voiceOverEnabled}
                        setVoiceOverEnabled={setVoiceOverEnabled}
                        ttsVoice={ttsVoice}
                        setTtsVoice={setTtsVoice}
                        imageMode={imageMode}
                        setImageMode={setImageMode}
                        previewingVoice={previewingVoice}
                        onPreviewVoice={previewVoice}
                        outlineDraft={outlineDraft}
                        onOutlineChange={setOutlineDraft}
                        onRegenerateOutline={regenerateOutlineForSettings}
                        onBack={goHome}
                        onReplaceDocument={(e) => { if (e.target.files?.[0]) handleFileUpload(e); }}
                        onSaveSettings={persistCourseSettings}
                        onGenerateCourse={handleGenerateCourseFromSettings}
                        onOpenPlayerProperties={openPlayerPropertiesModal}
                        onSaveDesignDraft={handleSaveDesignDraft}
                        designDraftSavedFlash={designDraftSavedFlash}
                        settingsSavedFlash={settingsSavedFlash}
                      />
                    </LandscapePhoneFrame>
                  </div>
                </>
              ) : (
              <CourseSettingsPage
                mode={settingsMode === 'defaults' ? 'defaults' : 'session'}
                isSandboxMode={isSandboxMode}
                isGenerating={isGenerating}
                isHydrating={isHydrating}
                isSuggesting={isSuggesting}
                isGeneratingOutline={isGeneratingOutline}
                progress={progress}
                error={error}
                renderProgressState={renderProgressState}
                courseTitle={courseTitle}
                setCourseTitle={setCourseTitle}
                courseDescription={courseDescription}
                setCourseDescription={setCourseDescription}
                prompt={prompt}
                setPrompt={setPrompt}
                objectiveFormat={objectiveFormat}
                learningObjectives={learningObjectives}
                setLearningObjectives={setLearningObjectives}
                onFormatChange={settingsMode === 'defaults' ? (fmt) => setObjectiveFormat(fmt) : handleFormatChange}
                onSuggestObjectives={handleSuggestObjectives}
                examConfig={examConfig}
                setExamConfig={setExamConfig}
                navigationMode={navigationMode}
                setNavigationMode={setNavigationMode}
                requireInteractionsComplete={requireInteractionsComplete}
                setRequireInteractionsComplete={setRequireInteractionsComplete}
                preset={preset}
                onPresetChange={handlePresetChange}
                slideCount={slideCount}
                setSlideCount={setSlideCount}
                includeModuleTitleSlides={includeModuleTitleSlides}
                setIncludeModuleTitleSlides={setIncludeModuleTitleSlides}
                includeModuleOverviewSlides={includeModuleOverviewSlides}
                setIncludeModuleOverviewSlides={setIncludeModuleOverviewSlides}
                includeSummarySlides={includeSummarySlides}
                setIncludeSummarySlides={setIncludeSummarySlides}
                interactionTypes={interactionTypes}
                setInteractionTypes={setInteractionTypes}
                scenarioConfig={scenarioConfig}
                setScenarioConfig={setScenarioConfig}
                onPreviewOption={setPreviewModalOption}
                gameTemplateIds={gameTemplateIds}
                setGameTemplateIds={setGameTemplateIds}
                voiceOverEnabled={voiceOverEnabled}
                setVoiceOverEnabled={setVoiceOverEnabled}
                ttsVoice={ttsVoice}
                setTtsVoice={setTtsVoice}
                imageMode={imageMode}
                setImageMode={setImageMode}
                previewingVoice={previewingVoice}
                onPreviewVoice={previewVoice}
                outlineDraft={outlineDraft}
                onOutlineChange={setOutlineDraft}
                onRegenerateOutline={regenerateOutlineForSettings}
                onBack={goHome}
                onReplaceDocument={(e) => { if (e.target.files?.[0]) handleFileUpload(e); }}
                onSaveSettings={persistCourseSettings}
                onGenerateCourse={handleGenerateCourseFromSettings}
                onOpenPlayerProperties={openPlayerPropertiesModal}
                onSaveDesignDraft={handleSaveDesignDraft}
                designDraftSavedFlash={designDraftSavedFlash}
                settingsSavedFlash={settingsSavedFlash}
              />
              )}
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
                     setCourseBg(null);
                     setExamError(null); setIsGeneratingExam(false);
                     setTheme('light');
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
            // top-0 (not top-20) -- the global header is hidden during preview (see above),
            // so the player now owns the full viewport height.
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed top-0 left-0 right-0 bottom-0 z-50">
              {/* Auto-landscape wrapper: CSS-rotates 90° on mobile portrait so the player
                  appears landscape immediately — no user action required. On desktop or
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
              {/* ── Preview Top Bar — hidden in SCORM/published view ── */}
              {!isScormPlayer && <div className="px-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="h-11 flex items-center justify-between gap-2">
                  {/* Left: back + title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button onClick={goHome} className="p-1.5 -ml-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="text-white font-bold text-sm truncate max-w-[220px]">
                        {isSandboxMode ? 'Demo Course' : course.title}
                      </h1>
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">Dev</span>
                    </div>
                  </div>

                  {/* ✨ Image generation in-progress badge */}
                  {isGeneratingImages && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block" />
                      Generating visuals…
                    </div>
                  )}

                  {/* Single unified toolbar — L→R: View mode, Player Props, Quality, Undo, Reset, Add Image, Edit Text & Audio, Save, Publish */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    <button
                      title={viewMode === 'desktop' ? 'Switch to mobile landscape preview' : 'Switch to desktop preview'}
                      onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                        viewMode === 'mobile'
                          ? 'border-cyan-600/50 bg-cyan-500/10 text-cyan-300'
                          : 'border-slate-600/60 hover:bg-slate-700/30 text-slate-300'
                      }`}
                    >
                      {viewMode === 'desktop' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                      <span className="hidden lg:inline">{viewMode === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                    </button>

                    <button
                      title="Player Properties"
                      onClick={openPlayerPropertiesModal}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-orange-700/50 hover:bg-orange-800/20 text-orange-300 text-[11px] font-semibold"
                    >
                      <Settings2 className="w-3 h-3" /><span className="hidden lg:inline">Player Props</span>
                    </button>

                    {(() => {
                      const pendingCount = qcReport
                        ? qcReport.issues.filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)).length
                        : 0;
                      const hasPending = pendingCount > 0;
                      return (
                        <button
                          id="qc-check-button"
                          title={hasPending
                            ? `Quality — ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending review`
                            : 'Quality — scan for spelling, grammar, and formatting issues'}
                          onClick={async () => {
                            setQcFocusSlideId(null);
                            if (qcReport && hasPending) {
                              setQcModalOpen(true);
                              return;
                            }
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
                          className={`relative flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                            hasPending
                              ? 'border-amber-700/50 hover:bg-amber-800/20 text-amber-300'
                              : 'border-emerald-700/50 hover:bg-emerald-800/20 text-emerald-300'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span className="hidden lg:inline">Quality</span>
                          {hasPending && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                              {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                          )}
                        </button>
                      );
                    })()}

                    <button
                      title={undoHistory.length > 0 ? `Undo (${undoHistory.length})` : 'Nothing to undo'}
                      onClick={handleUndo}
                      disabled={undoHistory.length === 0}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-600/60 hover:bg-slate-700/30 text-slate-300 text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Undo2 className="w-3 h-3" /><span className="hidden lg:inline">Undo</span>
                    </button>

                    <button
                      title="Reset — restore to original generated state"
                      onClick={() => { if (originalCourse) { setCourse(originalCourse); setCurrentSlideIndex(0); setQuizState({}); setFloatingImagesMap({}); setCourseBg(null); setUndoHistory([]); setSyntheticSlideOverrides({}); } }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-700/50 hover:bg-amber-800/20 text-amber-300 text-[11px] font-semibold"
                    >
                      <RotateCw className="w-3 h-3" /><span className="hidden lg:inline">Reset</span>
                    </button>

                    <label
                      htmlFor="topbar-img-upload"
                      title="Upload Image"
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-violet-700/50 hover:bg-violet-800/20 text-violet-300 text-[11px] font-semibold cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /><span className="hidden lg:inline">Upload Image</span>
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

                    <button
                      title="Edit Slide"
                      onClick={() => {
                        editingSlideRef.current = currentSlide;
                        setEditingSlide(currentSlide);
                        setEditDrawerOpen(true);
                        setEditDrawerTab('text');
                        setRegenTargetType((currentSlide?.type as string) || 'content');
                        setRegenNoInteraction(currentSlide?.type === 'content' || currentSlide?.type === 'summary');
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-700/50 hover:bg-indigo-800/20 text-indigo-300 text-[11px] font-semibold"
                    >
                      <Edit3 className="w-3 h-3" /><span className="hidden lg:inline">Edit Slide</span>
                    </button>

                    {(currentSlide?.type === 'scenario' || currentSlide?.type === 'game-template' || ['knowledge-check', 'mastery-exam'].includes(currentSlide?.type ?? '')) && (
                      <button
                        title="Edit via AI"
                        onClick={() => setShowAIEditDrawer(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-cyan-700/50 hover:bg-cyan-800/20 text-cyan-300 text-[11px] font-semibold"
                      >
                        <Sparkles className="w-3 h-3" /><span className="hidden lg:inline">Edit via AI</span>
                      </button>
                    )}

                    <button
                      title={`Save Draft (${draftManager.slotsUsed}/${draftManager.slotsTotal} slots used)`}
                      onClick={() => setShowDraftsPanel(true)}
                      className="relative flex items-center gap-1 px-2 py-1 rounded-md border border-slate-600/60 hover:bg-slate-700/30 text-slate-300 text-[11px] font-semibold"
                    >
                      <Save className="w-3 h-3" />
                      <span className="hidden lg:inline">Save</span>
                      {draftManager.slotsUsed > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          {draftManager.slotsUsed}
                        </span>
                      )}
                    </button>

                    {isTrial ? (
                      <button
                        title="Publish Course — not available in trial"
                        onClick={() => setShowTrialExportModal(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-600/60 text-slate-500 text-[11px] font-semibold"
                      >
                        <Download className="w-3 h-3" /> <span className="hidden lg:inline">Publish Course</span>
                      </button>
                    ) : (
                      <div className="flex items-center rounded-md overflow-hidden border border-violet-700/50">
                        <button
                          title={`SCORM version (current: ${scormVersion})`}
                          onClick={() => setScormVersion(v => v === '1.2' ? '2004' : '1.2')}
                          className="px-1.5 py-1 text-violet-300 text-[10px] font-black tracking-wide hover:bg-violet-800/20 border-r border-violet-700/40"
                        >
                          {scormVersion}
                        </button>
                        <button
                          title={`Publish Course as SCORM ${scormVersion}`}
                          disabled={isExporting}
                          onClick={() => {
                            const pendingCount = qcReport
                              ? qcReport.issues.filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)).length
                              : 0;
                            if (pendingCount > 0) setShowQcPublishWarning(true);
                            else exportScorm();
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-violet-300 text-[11px] font-semibold hover:bg-violet-800/20 disabled:opacity-60"
                        >
                          {isExporting ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-violet-300/30 border-t-violet-300 animate-spin" />
                              <span className="hidden lg:inline">{exportProgress < 100 ? `${exportProgress}%` : '…'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span className="hidden lg:inline">Publish Course</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>}



              {/* ── Body: Sidebar + Main Player Area ── */}
              <div className={cn("flex flex-row flex-1 overflow-hidden", playerConfig.playerResolution === 'full' ? 'overflow-x-hidden' : 'min-h-0')}>
                {/* Course Navigation — fixed left sidebar on desktop only.
                    Mobile / landscape-phone uses a clickable dropdown inside the
                    player frame so the TOC never steals content width. */}
                {!useMobileTocDropdown && (
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
                  defaultCollapsed={playerConfig.tocStartsCollapsed}
                  variant="sidebar"
                  qcPendingSlideIds={
                    qcReport
                      ? new Set(
                          qcReport.issues
                            .filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id))
                            .map(i => i.slideId)
                        )
                      : undefined
                  }
                  qcResolvedSlideIds={
                    qcReport
                      ? new Set(
                          qcReport.issues
                            .filter(i => qcConfirmed.has(i.id) || qcDeclined.has(i.id))
                            .map(i => i.slideId)
                        )
                      : undefined
                  }
                />
                )}

                {/* Main slide area — swipe left/right on mobile to navigate slides */}
                <div
                  className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden"
                  onTouchStart={handlePlayerTouchStart}
                  onTouchEnd={handlePlayerTouchEnd}
                >
                  {/* Background canvas — scaler measures this div to compute transform scale.
                      Always plain white behind the frame (the courseBg photo backdrop was removed
                      per design feedback) -- courseBg/coverImage is still used as the actual COVER
                      SLIDE's own background further below, this only affects the letterboxed margin
                      around the scaled frame. */}
                  <div
                    ref={viewMode === 'desktop' ? scaler.containerRef : undefined}
                    className={cn(
                      "relative flex flex-col flex-1 overflow-hidden bg-white",
                      viewMode === 'desktop' && playerConfig.playerResolution !== 'full' ? 'items-center justify-center' : undefined,
                      viewMode === 'mobile' ? 'items-center justify-center bg-slate-950 gap-2' : undefined
                    )}
                  >
                  {viewMode === 'mobile' && isSandboxMode && (
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80 shrink-0 pt-2">
                      Development Demo — Mobile Landscape
                    </p>
                  )}

                  {/* Slide frame — aspect ratio driven by playerConfig.playerResolution.
                      16:9 / 4:3 modes render at a FIXED design size (scaler.frameStyle) and are
                      visually scaled to fit with CSS transform -- transform never affects layout,
                      so this can never overflow/crop its container the way the old `zoom`-based
                      approach did (which double-scaled an already-100%-wide flex box). 'full'
                      mode intentionally skips scaling and fills the available space directly.
                      Mobile preview uses a landscape phone bezel (held sideways) so the
                      eLearning player fits the same 16:9 canvas used on desktop. */}
                  <div className={cn(`theme-${theme}`,
                    "transition-all duration-500 flex flex-col relative z-10",
                    viewMode === 'desktop'
                      ? (playerConfig.playerResolution !== 'full' ? 'overflow-hidden' : 'flex-1 overflow-hidden w-full')
                      : 'shadow-2xl overflow-hidden w-[min(96vw,calc((100vh-7rem)*16/9))] h-[min(calc(100vh-7rem),calc(96vw*9/16))] max-w-[1280px] max-h-[720px] my-2 rounded-[2rem] border-[10px] border-gray-800',
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
                    {useMobileTocDropdown && (
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
                        variant="dropdown"
                        qcPendingSlideIds={
                          qcReport
                            ? new Set(
                                qcReport.issues
                                  .filter(i => !qcConfirmed.has(i.id) && !qcDeclined.has(i.id))
                                  .map(i => i.slideId)
                              )
                            : undefined
                        }
                        qcResolvedSlideIds={
                          qcReport
                            ? new Set(
                                qcReport.issues
                                  .filter(i => qcConfirmed.has(i.id) || qcDeclined.has(i.id))
                                  .map(i => i.slideId)
                              )
                            : undefined
                        }
                      />
                    )}
                    {/* ── Content zone + accent strip ── */}
                    <div className="flex-1 flex flex-row overflow-hidden">
                    {/* Per-module accent strip — flex column, no z-index issues */}
                    {!isFullBleed && (
                      <div
                        className="w-[3px] shrink-0 self-stretch pointer-events-none"
                        style={{ background: `linear-gradient(to bottom, ${slideAccentColor}, ${slideAccentColor}40)` }}
                      />
                    )}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                    {/* ── Full-bleed slide frame ─────────────────────── */}
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
                              ? "w-full h-full relative"
                              : "flex-1 w-full max-w-6xl flex flex-col justify-start relative"
                          )}>
                               <SlideErrorBoundary
                                 slideId={currentSlide?.id}
                                 regenerating={regeneratingSlideId === currentSlide?.id}
                                 onRegenerate={
                                   currentSlide && !['cover', 'player-tour', 'course-objectives', 'module-cover', 'module-overview', 'exam-intro', 'mastery-exam', 'exam-results', 'closing'].includes(currentSlide.type as string)
                                     ? () => regenerateBlankSlide(currentSlide)
                                     : undefined
                                 }
                               >
                               {/* QA marker for current slide */}
                               {currentSlide?.id && qcReport && (() => {
                                 const pending = qcReport.issues.filter(
                                   i => i.slideId === currentSlide.id && !qcConfirmed.has(i.id) && !qcDeclined.has(i.id)
                                 );
                                 const resolved = qcReport.issues.filter(
                                   i => i.slideId === currentSlide.id && (qcConfirmed.has(i.id) || qcDeclined.has(i.id))
                                 );
                                 if (!pending.length && !resolved.length) return null;
                                 return (
                                   <button
                                     type="button"
                                     onClick={() => {
                                       setQcFocusSlideId(currentSlide.id);
                                       setQcModalOpen(true);
                                     }}
                                     className={`absolute top-3 right-3 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border ${
                                       pending.length
                                         ? 'bg-red-500/90 border-red-300 text-white'
                                         : 'bg-emerald-500/90 border-emerald-300 text-white'
                                     }`}
                                     title={pending.length ? `${pending.length} QA issue(s)` : 'QA issues resolved'}
                                   >
                                     <Shield className="w-3 h-3" />
                                     {pending.length ? `QA ${pending.length}` : 'QA OK'}
                                   </button>
                                 );
                               })()}
                               {/* Knowledge Check label only — no generic interaction type headers */}
                               {!isFullBleed && ['quiz', 'multiple-choice', 'multiple-answers', 'sorting', 'matching', 'drop-targets'].includes(currentSlide?.type as string) && (
                                 <div className="mb-4">
                                   <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: slideAccentColor }}>
                                     Knowledge Check
                                   </p>
                                 </div>
                               )}

                               {/* TITLE / COVER SLIDE — Course Introduction (TOC) */}
                               {(currentSlide?.type === 'title' || currentSlide?.type === 'cover') && (
                                 <div className="w-full h-full">
                                   <CourseTitleSlide
                                     title={currentSlide.title}
                                     description={currentSlide.content || undefined}
                                     coverImage={(currentSlide as any).coverImage || (course as any)?.coverImage || undefined}
                                     theme={theme}
                                     isPreviewMode={true}
                                     hideImagePanel={normalizeImageMode(imageMode) === 'none'}
                                     isGeneratingCover={
                                       normalizeImageMode(imageMode) !== 'none' &&
                                       isGeneratingImages &&
                                       !(currentSlide as any).coverImage &&
                                       !(course as any)?.coverImage
                                     }
                                     onImageUpload={(url) => {
                                       setCourse((prev: any) => prev ? { ...prev, coverImage: url } : prev);
                                       setCourseBg(url);
                                     }}
                                   />
                                 </div>
                               )}

                               {/* CONTENT / KEY-TAKEAWAYS / SUMMARY */}
                               {currentSlide?.type === 'key-takeaways' && (() => {
                                  const raw: any[] = (currentSlide as any).interactions || (currentSlide as any).data?.objectives || [];
                                  const fromContent = (currentSlide.content || '')
                                    .split(/\n+/)
                                    .map((line: string) => line.replace(/^#{1,6}\s+/, '').replace(/^[-*•]\s+/, '').trim())
                                    .filter((line: string) => line.length > 2 && !/^key\s*takeaways?/i.test(line));
                                  const objectives = raw.length > 0
                                    ? raw
                                    : fromContent.map((line: string, i: number) => ({ id: String(i), label: line, content: '' }));
                                  const modIdx = course?.modules.findIndex((m: any) => m.slides.some((s: any) => s.id === currentSlide.id)) ?? -1;
                                  const slideModuleNumber = modIdx >= 0 ? modIdx + 1 : undefined;
                                  const isEmpty = objectives.length === 0;
                                  return (
                                    <div className="w-full h-full absolute inset-0">
                                      {isEmpty ? (
                                        <EmptySlideRegenerate
                                          title={currentSlide.title || 'Key Takeaways'}
                                          isRegenerating={regeneratingSlideId === currentSlide.id}
                                          onRegenerate={() => regenerateBlankSlide(currentSlide)}
                                        />
                                      ) : (
                                        <LearningObjectivesSlide
                                          title={currentSlide.title}
                                          objectives={objectives}
                                          theme={theme}
                                          moduleNumber={slideModuleNumber}
                                        />
                                      )}
                                    </div>
                                  );
                               })()}

                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {
                                 const typeLabel = currentSlide.type === 'summary' ? 'Summary' : 'Overview';
                                 const body = (currentSlide.content || '').trim();
                                 const isEmpty = body.length < 8;
                                 // Source extraction places imageUrl; keep clear of floating overlays / interactions
                                 const slideImg = (currentSlide as any).imageUrl || null;
                                 const textCol = (
                                   <div className="space-y-4 min-w-0 flex-1">
                                     <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: slideAccentColor }}>
                                       {typeLabel}
                                     </p>
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {isEmpty ? (
                                       <EmptySlideRegenerate
                                         title={currentSlide.title}
                                         isRegenerating={regeneratingSlideId === currentSlide.id}
                                         onRegenerate={() => regenerateBlankSlide(currentSlide)}
                                         compact
                                       />
                                     ) : (
                                       <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} />
                                     )}
                                   </div>
                                 );
                                 if (!slideImg) return <div className="w-full">{textCol}</div>;
                                 return (
                                   <div className="w-full flex flex-row gap-6 items-start">
                                     {textCol}
                                     <div className="hidden md:block w-[38%] max-w-[340px] shrink-0 rounded-xl overflow-hidden border border-slate-700/40 shadow-lg self-center">
                                       <img src={slideImg} alt="" className="w-full h-auto max-h-72 object-contain bg-slate-900/40" />
                                     </div>
                                   </div>
                                 );
                               })()}

                               {/* PLAYER TOUR SLIDE */}
                               {(currentSlide as any)?.type === 'player-tour' && (
                                 <div className="w-full h-full">
                                   <PlayerTourSlide theme={theme} onSkip={() => setCurrentSlideIndex((si: number) => Math.min(allSlides.length - 1, si + 1))} />
                                 </div>
                               )}
                               {/* COURSE OBJECTIVES SLIDE — course-level, no module number */}
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
                                         onClick={() => {
                                           setQuizState(s => ({ ...s, [qKey]: { ...qs, submitted: true } }));
                                           markKcChecked(currentSlide.id);
                                         }}
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
                                         onClick={() => {
                                           setQuizState((s: any) => ({ ...s, [qKey]: { ...maState, submitted: true } }));
                                           markKcChecked(currentSlide.id);
                                         }}
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
                               {currentSlide?.type === 'matching' && (() => {
                                  // MatchingActivity expects {items:[{id,content}], targets:[{id,content}]}
                                  // AI may produce {pairs:[{id,term,definition}]} — normalise either format
                                  const rawData = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  const matchingProps = (() => {
                                    if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {
                                      const items   = rawData.pairs.map((p: any) => ({ id: p.id + '_item',   content: p.term || p.left || '' }));
                                      const targets = rawData.pairs.map((p: any) => ({ id: p.id + '_target', content: p.definition || p.right || '' }));
                                      const correctAnswers = rawData.correctAnswers ||
                                        Object.fromEntries(rawData.pairs.map((p: any) => [p.id + '_item', p.id + '_target']));
                                      return { items, targets, correctAnswers };
                                    }
                                    if (Array.isArray(rawData.items) && rawData.items.length > 0) {
                                      const items = rawData.items;
                                      const targets = rawData.targets || [];
                                      let correctAnswers = rawData.correctAnswers || {};
                                      if (!correctAnswers || Object.keys(correctAnswers).length === 0) {
                                        const inferred: Record<string, string> = {};
                                        for (const it of items) {
                                          const mid = (it as any).matchId || (it as any).targetId;
                                          if (mid && targets.some((t: any) => t.id === mid)) inferred[it.id] = mid;
                                        }
                                        if (Object.keys(inferred).length === 0) {
                                          for (const it of items) {
                                            if (targets.some((t: any) => t.id === it.id)) inferred[it.id] = it.id;
                                          }
                                        }
                                        if (Object.keys(inferred).length === 0 && items.length === targets.length) {
                                          items.forEach((it: any, i: number) => { inferred[it.id] = targets[i].id; });
                                        }
                                        correctAnswers = inferred;
                                      }
                                      return { items, targets, correctAnswers };
                                    }
                                    return { items: [], targets: [], correctAnswers: {} };
                                  })();
                                  if (!matchingProps.items.length || !matchingProps.targets.length) {
                                    return (
                                      <div className="space-y-6 w-full">
                                        <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                        <EmptySlideRegenerate
                                          title={currentSlide.title}
                                          isRegenerating={regeneratingSlideId === currentSlide.id || isRegenSlideRunning}
                                          onRegenerate={async () => {
                                            setIsRegenSlideRunning(true);
                                            try {
                                              const result = await regenerateSlideData(currentSlide, course?.title ?? '', 'matching');
                                              pushUndo();
                                              setCourse((prev: any) => {
                                                if (!prev) return prev;
                                                return {
                                                  ...prev,
                                                  modules: prev.modules.map((m: any) => ({
                                                    ...m,
                                                    slides: m.slides.map((s: any) =>
                                                      s.id === currentSlide.id
                                                        ? { ...s, type: result.type, data: result.data, content: result.content ?? s.content }
                                                        : s
                                                    ),
                                                  })),
                                                };
                                              });
                                              setQcReport(prev => prev ? {
                                                ...prev,
                                                issues: prev.issues.filter(i => !(i.slideId === currentSlide.id && i.type === 'interaction_empty')),
                                              } : null);
                                            } catch (err: any) {
                                              alert(err?.message || 'Regeneration failed');
                                            } finally {
                                              setIsRegenSlideRunning(false);
                                            }
                                          }}
                                        />
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="space-y-6 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                                                             <CustomMatchingActivity
                                        items={matchingProps.items || []}
                                        targets={matchingProps.targets || []}
                                        correctAnswers={matchingProps.correctAnswers || {}}
                                        theme={theme}
                                        onChecked={() => markKcChecked(currentSlide.id)}
                                       />
                                    </div>
                                  );
                               })()}
                               {currentSlide?.type === 'accordion' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <VerticalTimeline
                                       events={((currentSlide.data || currentSlide.interactions?.[0] || {}).items || []).map((item: any, idx: number) => ({
                                         id: item.id || ('acc-' + idx),
                                         year: item.subtitle || item.category || undefined,
                                         title: item.title || item.label || '',
                                         content: markdownToHtml(item.content || item.description || ''),
                                       }))}
                                       theme={theme}
                                       accentColor={slideAccentColor}
                                       onStepOpen={(id) => markInteractionExplored(currentSlide.id, id)}
                                     />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'flashcards' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <FlashcardGrid
                                     cards={currentSlide.data?.cards || currentSlide.interactions?.[0]?.cards || []}
                                     theme={theme}
                                     onCardView={(id) => markInteractionExplored(currentSlide.id, id)}
                                   />
                                 </div>
                               )}
                               {currentSlide?.type === 'timeline' && (
                                   <div className="space-y-4 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {currentSlide.content && (
                                       <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} />
                                     )}
                                     <HorizontalTimeline
                                       events={((currentSlide.data || currentSlide.interactions?.[0] || {}).events || []).map((ev: any, idx: number) => ({
                                        ...ev,
                                        id: (ev?.id != null && String(ev.id).trim()) ? String(ev.id) : `ev-${idx}`,
                                        content: markdownToHtml(ev.content || ''),
                                      }))}
                                       theme={theme}
                                       accentColor={slideAccentColor}
                                       onEventOpen={(id) => markInteractionExplored(currentSlide.id, id)}
                                     />
                                   </div>
                                 )}

                               {currentSlide?.type === 'sorting' && (
                                  <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     <SmartContent content={sanitizeContent(currentSlide.content) + '\n\nDrag items or use ↑ ↓ arrows to reorder.'} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                        <CustomSortingActivity items={(currentSlide.data || currentSlide.interactions?.[0] || {}).items || []} correctOrder={(currentSlide.data || currentSlide.interactions?.[0] || {}).correctOrder || []} theme={theme} onChecked={() => markKcChecked(currentSlide.id)} />
                                     </div>
                                  </div>
                               )}
                               {currentSlide?.type === 'wheel-diagram' && (() => {
                                  const wd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  return (
                                    <div className="space-y-4 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
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
                                        <div className={cn(
                                          'w-full overflow-auto rounded-xl p-4',
                                          // Light theme: blend straight into the white slide canvas (no boxed
                                          // "card" look) so the diagram reads as part of the page, not a widget
                                          // floating in a dark gray container.
                                          theme === 'light' ? 'bg-transparent' : 'bg-slate-800/40 border border-slate-700/40'
                                        )}>
                                          <MermaidDiagram
                                            code={mermaidCode}
                                            theme={theme as any}
                                            className="mx-auto"
                                          />
                                        </div>
                                      ) : (
                                        <div className={cn(
                                          'rounded-xl p-6 text-sm text-center',
                                          theme === 'light' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-slate-800/50 border border-amber-700/30 text-amber-400'
                                        )}>
                                          No diagram code found. Edit this slide to add Mermaid markup.
                                        </div>
                                      )}
                                    </div>
                                  );
                               })()}


                               {currentSlide?.type === 'tabbed-horizontal' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <TabbedHorizontal
                                       tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []}
                                       theme={theme as any}
                                       onTabView={(id) => markInteractionExplored(currentSlide.id, id)}
                                     />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'tabbed-vertical' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <TabbedVertical
                                     tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []}
                                     theme={theme}
                                     onTabView={(id) => markInteractionExplored(currentSlide.id, id)}
                                   />
                                 </div>
                               )}
                               {currentSlide?.type === 'folder-explorer' && (
                                  <div className="space-y-6 w-full">
                                    <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                    <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                    <div className={cn('overflow-visible', theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                      <FolderExplorer items={currentSlide.data?.items || currentSlide.interactions?.[0]?.items || []} />
                                    </div>
                                  </div>
                                )}
                               {currentSlide?.type === 'carousel-panel' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <CarouselPanel
                                       cards={currentSlide.data?.cards || currentSlide.data?.items || currentSlide.interactions?.[0]?.cards || currentSlide.interactions?.[0]?.items || []}
                                       onCardView={(id) => markInteractionExplored(currentSlide.id, id)}
                                     />
                                   </div>
                                 </div>
                               )}

                               {/* CLICK & REVEAL INTERACTION */}
                               {currentSlide?.type === 'click-reveal' && (() => {
                                 const crItems = currentSlide.data?.items || currentSlide.interactions?.[0]?.items || [];
                                 return (
                                   <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {currentSlide.content && <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />}
                                     <ClickRevealInteraction
                                       items={crItems}
                                       theme={theme as any}
                                       onItemReveal={(id) => markInteractionExplored(currentSlide.id, id)}
                                     />
                                   </div>
                                 );
                               })()}

                               {/* EXAM INTRO */}
                               {currentSlide?.type === 'exam-intro' && (
                                 <ExamIntroSlide
                                   examConfig={examConfig}
                                   courseTitle={course?.title}
                                   isGenerating={isGeneratingExam}
                                   errorMessage={examError}
                                   onBegin={async () => {
                                     setExamError(null);
                                     if (!course) {
                                       setExamError('Course data is missing. Please reload the preview and try again.');
                                       return;
                                     }

                                     // Resolve the quiz slide by id — more reliable than arithmetic
                                     // indices when synthetic slides are injected around content.
                                     const qIdx = allSlides.findIndex(s => (s as any).id === '__mastery-exam__');
                                     if (qIdx < 0) {
                                       setExamError('Quiz Questions slide is missing. Enable Mastery Quiz in course settings and regenerate.');
                                       return;
                                     }

                                     let questions = examQuestions;
                                     if (!questions || questions.length === 0) {
                                       // Fallback only if pre-generation failed or was skipped
                                       setIsGeneratingExam(true);
                                       try {
                                         questions = await generateMasteryExam(course, examConfig);
                                         if (!questions?.length) {
                                           setExamError('No quiz questions could be generated from this course. Try again, or check that slides have content.');
                                           return;
                                         }
                                         setExamQuestions(questions);
                                       } catch (err: any) {
                                         console.error('[Mastery Quiz] Generation failed:', err);
                                         setExamError(err?.message || 'Quiz generation failed. Please try again.');
                                         return;
                                       } finally {
                                         setIsGeneratingExam(false);
                                       }
                                     }

                                     setExamSession({
                                       questions,
                                       answers: Object.fromEntries(questions.map(q => [q.id, null])),
                                       currentQuestionIdx: 0,
                                       submitted: false,
                                       score: null,
                                       passed: null,
                                     });
                                     setExamPhase('active');
                                     setHighestVisitedIndex(prev => Math.max(prev, qIdx));
                                     setCurrentSlideIndex(qIdx);
                                   }}
                                 />
                               )}

                               {/* MASTERY EXAM QUESTIONS */}
                               {currentSlide?.type === 'mastery-exam' && (
                                 isGeneratingExam ? (
                                   // Still generating — show progress spinner
                                   <div className="flex flex-col items-center justify-center gap-4 h-full">
                                     <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                                     <p className="text-slate-300 font-semibold">Generating quiz questions…</p>
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
                                   // Landed on mastery-exam slide without going through intro — redirect back
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
                                 <div className="w-full h-full min-h-0 flex-1 flex items-stretch justify-center">
                                   <GameContainer payload={currentSlide.data} />
                                 </div>
                               )}

                               {/* ANY UNHANDLED GENERIC INTERACTION */}
                               {currentSlide?.type === 'hotspot' && (() => {
                                  const hd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  return (
                                    <div className="space-y-4 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div style={{ minHeight: '320px' }}>
                                        <HotspotInteraction
                                          imageUrl={hd.imageUrl || hd.image || hd.backgroundImage || (currentSlide as any).imageUrl || (currentSlide as any).coverImage}
                                          points={hd.points || hd.hotspots || []}
                                          theme={theme}
                                          onPinOpen={(pinId) => markInteractionExplored(currentSlide.id, pinId)}
                                        />
                                      </div>
                                    </div>
                                  );
                               })()}

                               {['drop-targets', 'memory-match'].includes(currentSlide?.type) && (
                                  <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                     <div className="p-8 border-2 border-dashed border-indigo-400/50 bg-indigo-500/10 rounded-2xl text-center space-y-4">
                                       <Gamepad2 className="w-12 h-12 text-indigo-400 mx-auto opacity-50" />
                                       <p className="text-xl font-bold text-indigo-300">[{currentSlide.type}] interaction is under construction.</p>
                                       {navigationMode !== 'free' && !kcCheckedSlideIds.has(currentSlide.id) && (
                                         <button
                                           type="button"
                                           onClick={() => markKcChecked(currentSlide.id)}
                                           className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm"
                                         >
                                           Check Answers
                                         </button>
                                       )}
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
                                         <span>Scenario data is missing. Use <strong>Edit Slide → Regenerate</strong> to rebuild this slide.</span>
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

                           {/* Slide media tools — Edit/Reset/Upload are in the top bar.
                               "Source Image" was removed from here: it duplicated the identical
                               "Source Image" option already in the top bar's Add Image dropdown,
                               and this on-slide absolutely-positioned copy was prone to being
                               clipped at the slide edge on some layouts. */}
                           <div className="absolute top-2 right-2 z-[100] flex flex-wrap max-w-sm justify-end gap-2 shrink-0">
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

                       {/* Floating images — inside scroll so they scroll with content */}
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

                      {/* Closed Caption Overlay - above player bar. Hides once narration
                          finishes; reappears automatically on replay or seeking backward
                          (usePlayer clears isEnded in both of those cases). */}
                      {showCC && player.hasAudio && !player.isEnded && (
                        <ClosedCaptionOverlay
                          narrationText={currentSlide?.voiceOverText || (currentSlide as any)?.narration || null}
                          currentTime={player.currentTime}
                          duration={player.duration}
                          isPlaying={player.isPlaying}
                        />
                      )}
                     </div>{/* end inner content */}
                     </div>{/* end accent+content row */}


                     {/* Learner Player Navigation Bar — sticky at bottom in full-screen mode */}
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
                        disableNext={
                          currentSlide?.type === 'exam-intro' ||
                          currentSlide?.type === 'mastery-exam' ||
                          currentSlide?.type === 'exam-results' ||
                          (currentSlide?.type === 'scenario' && !scenarioCompleted) ||
                          !isKcCheckSatisfied() ||
                          !isCurrentSlideInteractionsComplete()
                        }
                        disableNextReason={interactionProgressLabel}
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
                    { id: 'audio', icon: '🎤', label: 'Audio', activeColor: 'border-emerald-500 text-emerald-300 bg-emerald-500/10' },
                    { id: 'regenerate', icon: '↻', label: 'Regenerate', activeColor: 'border-amber-500 text-amber-300 bg-amber-500/10' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setEditDrawerTab(tab.id as any);
                        if (tab.id === 'regenerate' && editingSlide) {
                          const t = (editingSlide.type as string) || 'content';
                          const plain = t === 'content' || t === 'summary' || t === 'key-takeaways';
                          setRegenNoInteraction(plain);
                          setRegenTargetType(plain ? 'content' : t);
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-3 text-[11px] sm:text-sm font-bold border-b-2 transition-all ${editDrawerTab === tab.id ? tab.activeColor : 'border-transparent text-slate-500 hover:text-slate-300'}`}
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

                  {editDrawerTab === 'regenerate' && editingSlide && (() => {
                    const slideType = (editingSlide.type as string) || 'content';
                    const isKc = KNOWLEDGE_CHECK_TYPES.has(slideType);
                    const contentOptions = [
                      { id: 'content', label: 'Plain content' },
                      { id: 'tabbed-horizontal', label: 'Tabs (Horizontal)' },
                      { id: 'tabbed-vertical', label: 'Tabs (Vertical)' },
                      { id: 'click-reveal', label: 'Click & Reveal' },
                      { id: 'flashcards', label: 'Flashcards' },
                      { id: 'timeline', label: 'Timeline' },
                      { id: 'carousel-panel', label: 'Carousel' },
                      { id: 'hotspot', label: 'Hotspot' },
                    ];
                    const kcOptions = [
                      { id: 'matching', label: 'Matching' },
                      { id: 'sorting', label: 'Sorting' },
                      { id: 'drop-targets', label: 'Drop Targets' },
                      { id: 'quiz', label: 'Multiple Choice' },
                      { id: 'multiple-answers', label: 'Multiple Answers' },
                      { id: 'true-false', label: 'True / False' },
                    ];
                    const options = isKc ? kcOptions : contentOptions;
                    const effectiveType = regenNoInteraction ? 'content' : regenTargetType;
                    return (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                          Regenerate only this slide. Choose an interaction type (or plain content), then click Regenerate.
                        </div>
                        <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-700 bg-slate-950 cursor-pointer">
                          <div>
                            <p className="text-sm font-bold text-white">No interaction</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Simple bullet-point content slide</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={regenNoInteraction}
                            onChange={e => {
                              setRegenNoInteraction(e.target.checked);
                              if (e.target.checked) setRegenTargetType('content');
                            }}
                            className="w-4 h-4 rounded border-slate-600 text-amber-500"
                          />
                        </label>
                        {!regenNoInteraction && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                              {isKc ? 'Knowledge check type' : 'Interactive element'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {options.map(opt => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setRegenTargetType(opt.id)}
                                  className={cn(
                                    'px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all',
                                    regenTargetType === opt.id
                                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          disabled={isRegenSlideRunning}
                          onClick={async () => {
                            if (!editingSlide || !course) return;
                            setIsRegenSlideRunning(true);
                            try {
                              const result = await regenerateSlideData(
                                editingSlide,
                                course.title ?? '',
                                effectiveType
                              );
                              pushUndo();
                              setCourse((prev: any) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  modules: prev.modules.map((m: any) => ({
                                    ...m,
                                    slides: m.slides.map((s: any) => {
                                      if (s.id !== editingSlide.id) return s;
                                      return {
                                        ...s,
                                        type: result.type,
                                        data: result.data,
                                        content: result.content != null ? result.content : s.content,
                                      };
                                    }),
                                  })),
                                };
                              });
                              const updated = {
                                ...editingSlide,
                                type: result.type as any,
                                data: result.data,
                                content: result.content != null ? result.content : editingSlide.content,
                              };
                              editingSlideRef.current = updated;
                              setEditingSlide(updated);
                              setQcReport(prev => prev ? {
                                ...prev,
                                issues: prev.issues.filter(i => !(i.slideId === editingSlide.id && i.type === 'interaction_empty')),
                              } : null);
                              showDraftMessage('Slide regenerated ✓');
                            } catch (err: any) {
                              console.error('[Edit Slide] Regenerate failed:', err);
                              alert(err?.message || 'Regeneration failed. Please try again.');
                            } finally {
                              setIsRegenSlideRunning(false);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                        >
                          {isRegenSlideRunning ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</>
                          ) : (
                            <><RefreshCw className="w-4 h-4" /> Regenerate This Slide</>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                  </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/40 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => { editingSlideRef.current = null; setEditingSlide(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  {editDrawerTab !== 'regenerate' && (
                  <button
                    onClick={() => {
                      if (editingSlideRef.current) {
                        const latest = editingSlideRef.current;
                        pushUndo();
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
                  )}
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
          {showUploadPathModal && (pendingUploadFile || uploadedFile) && (
            <UploadPathModal
              fileName={(pendingUploadFile || uploadedFile)!.name}
              onConfirm={confirmUploadPath}
              onCancel={cancelUploadPath}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPlayerProperties && step !== 'player-properties' && (
            <PlayerPropertiesModal
              variant="modal"
              config={{
                ...playerConfig,
                navigationMode,
                examPresentationMode: examConfig.presentationMode,
              }}
              onChange={applyPlayerConfig}
              onClose={closePlayerPropertiesModal}
            />
          )}
        </AnimatePresence>

        {/* TTS toast only after generation — initial audio is on the main progress bar */}
        {!(isGenerating || isHydrating) && (
          <TTSProgressToast
            progress={ttsProgress}
            onDismiss={resetTTS}
          />
        )}

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
                    <div className="flex items-center gap-2">
                      <button
                        title={previewModalViewMode === 'desktop' ? 'Switch to mobile landscape' : 'Switch to desktop'}
                        onClick={() => setPreviewModalViewMode(previewModalViewMode === 'desktop' ? 'mobile' : 'desktop')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          previewModalViewMode === 'mobile'
                            ? 'border-cyan-600/50 bg-cyan-500/10 text-cyan-300'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {previewModalViewMode === 'desktop' ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                        {previewModalViewMode === 'desktop' ? 'Desktop' : 'Mobile'}
                      </button>
                      <button onClick={() => setPreviewModalOption(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                 </div>
                 <div className={cn(
                   "flex-1 overflow-y-auto p-8 bg-slate-900 custom-scrollbar theme-dark InteractionPreviewBodyWrapper",
                   previewModalViewMode === 'mobile' && "flex items-center justify-center bg-slate-950"
                 )}>
                     <div className={cn(
                       previewModalViewMode === 'mobile'
                         ? "w-[min(96vw,calc((100vh-8rem)*16/9))] h-[min(calc(100vh-8rem),calc(96vw*9/16))] max-w-[1280px] max-h-[720px] overflow-auto rounded-[2rem] border-[10px] border-gray-800 bg-slate-900 shadow-2xl p-3"
                         : "w-full min-h-[420px] flex flex-wrap items-start justify-center gap-6 py-6 px-2"
                     )}>
                         {previewModalOption === 'Multiple Choice' && <MultipleChoicePreview />}
                         {previewModalOption === 'Multiple Answers' && <MultipleAnswersPreviewDemo />}
                         {previewModalOption === 'Hotspot' && <HotspotPreview />}
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

      {/* ── Trial Expiry Interstitial ── */}
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
                <span className="text-2xl">⏳</span>
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

      {/* ── Trial Export Blocked Modal ── */}
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

      {/* ── Admin Invite Panel ── */}
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
          {isAllCorrect ? 'Correct! Rabbit, Dog, and Cat are animals.' : 'Not quite — only Rabbit, Dog, and Cat are animals.'}
        </div>
      )}
    </div>
  );
}



