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
  Library,
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
import { TAB_ACCENT_HEX, TAB_INTRO_DEFAULT_HEX, TAB_TITLE_HEX, tabAccentHex, resolveVerticalTabSkin, resolveVerticalTabColorMode, resolveProcessSkin, resolveProcessStepLabels, resolveHexColor, applyVerticalTabPresentation, BLOCKS_WELL_DEFAULT, BLOCKS_WELL_PRESETS } from './lib/tabAccents';
import { CAROUSEL_CARD_HEX } from './lib/colorContrast';
import { resolveClickRevealSlide } from './lib/parseHeadingSections';
import {
  splitKnowledgeCheckOst,
  SORTING_REORDER_HINT,
} from './lib/knowledgeCheckOst';
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
import { runFullQC, runStructuralQC, autoFixCourse, applyConfirmedFixes, simplifySlide, regenerateSlideData, normalizeRegenSlideType, isTabOrientationSwap, QCReport } from './services/qcService';

import { OutlinePreview } from './components/builder/OutlinePreview';
import { CourseSettingsPage } from './components/builder/CourseSettingsPage';
import { CourseReviewPage } from './components/builder/CourseReviewPage';
import { ConfirmDialog } from './components/builder/ConfirmDialog';
import { EditSlideItemFields, sanitizeInteractionOstOnSave } from './components/builder/EditSlideItemFields';
import { UploadPathModal, UploadPathChoice } from './components/builder/UploadPathModal';
import { PlayerPropertiesModal, PlayerConfig, defaultPlayerConfig } from './components/builder/PlayerPropertiesModal';
import {
  DEFAULT_COURSE_SETTINGS,
  resolveCourseSettings,
  saveCourseSettings,
  cacheCourseSettings,
  SavedCourseSettings,
} from './lib/courseSettingsStorage';
import { loadPlayerProperties, savePlayerProperties, cachePlayerProperties } from './lib/playerPropertiesStorage';
import { fetchAccountPreferences, pushAccountPreferences } from './lib/accountPreferences';
import { CourseOutline, Slide, TerminalObjectiveGroup, ExamConfig, ExamQuestion, ExamSessionState, NavigationMode } from './types/course';
import { extractTextFromFile, extractImagesFromFile, EXTRACT_DEADLINE_MS, SourceImage } from './lib/fileProcessor';
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
import { foundationFingerprint, type FoundationFingerprintInput } from './lib/courseReviewSync';
import { DraftCoursesPanel } from './components/player/DraftCoursesPanel';
import { ViewDraftsModal } from './components/player/ViewDraftsModal';
import { AppImagePickerModal } from './components/player/AppImagePickerModal';
import { EnlargeableImage } from './components/player/EnlargeableImage';
import { CourseTitleSlide } from './components/player/CourseTitleSlide';
import { ClosingSlide } from './components/player/ClosingSlide';
import { ModuleCoverSlide } from './components/player/ModuleCoverSlide';
import { LearningObjectivesSlide }  from './components/player/LearningObjectivesSlide';
import { CourseObjectivesSlide }   from './components/player/CourseObjectivesSlide';
import { ModuleOverviewSlide, MODULE_COLORS } from './components/player/ModuleOverviewSlide';
import { PlayerTourSlide }       from './components/player/PlayerTourSlide';
import { WheelDiagram } from './components/interactions/WheelDiagram';
import { MermaidDiagram } from './components/MermaidDiagram';
import { DiagramAlignFrame, type DiagramAlign } from './components/DiagramAlignFrame';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CustomMatchingActivity } from './components/interactions/CustomMatchingActivity';
import { CustomSortingActivity } from './components/interactions/CustomSortingActivity';
import { HotspotInteraction } from './components/interactions/HotspotInteraction';
import ClickRevealInteraction from './components/interactions/ClickRevealInteraction';
import { getRecommendedGames } from './lib/gameEngine';
import { DUMMY_COURSE, DUMMY_EXAM_QUESTIONS } from './lib/dummyCourse';
import { sanitizeOstText, coerceOstText } from './lib/formatTabIntroOst';
import { useScaleToFit } from './hooks/useScaleToFit';
import { FloatingImageCanvas } from './components/FloatingImageCanvas';
import { TrialInvitePanel } from './components/TrialInvitePanel';

import { FloatingImage } from './types/course';
import { stripCourseAutoPromotedFloating, floatingMapFromCourse } from './lib/promoteSlideImages';
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
import { getPaymentStatus } from './services/paymentService';
import { canUseAllVoices } from './lib/planEntitlements';
import {
  readAdminAccountView,
  planForAdminView,
  isTeamPreviewView,
  type AdminAccountView,
} from './lib/adminPreview';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { MarketingHomepage } from './components/marketing/MarketingHomepage';
import { MethodologyPage } from './components/marketing/MethodologyPage';
import { ExamplesPage } from './components/marketing/ExamplesPage';
import { HelpWidget } from './components/HelpWidget';
import { WelcomeTourModal, shouldShowWelcomeTour, dismissWelcomeTourForSession } from './components/WelcomeTourModal';
import { DevToolbarTourModal, shouldShowDevTour, migrateDevTourStorage } from './components/DevToolbarTourModal';
import { DropTargetsActivity } from './components/interactions/DropTargetsActivity';

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

type AppStep = 'marketing' | 'home' | 'details' | 'outline' | 'preview' | 'pricing' | 'account' | 'player-properties' | 'payment-success' | 'payment-cancel';
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
    // Keep markdown headings (### Section) — they are real OST, not chrome to strip.
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

/** Direct <li> count for a markdown list (ignore nested wrappers / whitespace). */
function listChildCount(children: React.ReactNode): number {
  return React.Children.toArray(children).filter(c => React.isValidElement(c)).length;
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

const DraftsSyncOverlay: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[800] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-slate-900/90 border border-indigo-500/25 shadow-lg max-w-sm text-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-white font-bold text-base">Syncing drafts to your account…</p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Fetching saved drafts from the cloud. This can take a few seconds if the server is waking up.
        </p>
        <div className="relative h-1.5 w-44 rounded-full bg-indigo-950/80 overflow-hidden">
          <div className="regen-progress-indeterminate bg-indigo-400" />
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

const SlideContent = ({
  content,
  theme,
  accentColor,
  hasSideImage = false,
}: {
  content: string;
  theme: string;
  accentColor?: string;
  /** Right-column image already occupies the second column — keep bullets stacked. */
  hasSideImage?: boolean;
}) => {
  // Bullet markers: use the module accent when provided so lists match the
  // module chrome (header / divider). Fall back to near-black so we never
  // leave the old hardcoded indigo/light-blue markers that clashed with
  // non-indigo modules (e.g. teal Module 2 headers with blue bullets).
  const markerColor = accentColor || (theme === 'light' ? '#0f172a' : '#94a3b8');
  // Two columns only when a given list has 4+ items (avoids a dangling 2+1)
  // and the slide is not already sharing the row with a side image.
  const htmlMultiCol = !hasSideImage
    ? '[&_ul:has(>li:nth-child(4))]:columns-2 [&_ul:has(>li:nth-child(4))]:gap-x-8 [&_ul:has(>li:nth-child(4))]:[column-fill:balance] [&_ol:has(>li:nth-child(4))]:columns-2 [&_ol:has(>li:nth-child(4))]:gap-x-8 [&_ol:has(>li:nth-child(4))]:[column-fill:balance] [&_li]:break-inside-avoid'
    : '';

  if (isHTML(content)) {
    return (
      <div
        className={cn(
          'prose max-w-none text-lg lg:text-xl leading-relaxed rich-slide-content',
          theme !== 'light' ? 'prose-invert text-gray-200' : 'text-gray-800',
          htmlMultiCol
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
        ul: ({ node, children, ...props }) => {
          const n = listChildCount(children);
          if (n === 1) {
            const only = React.Children.toArray(children).find(c => React.isValidElement(c)) as
              | React.ReactElement<{ children?: React.ReactNode }>
              | undefined;
            return (
              <p {...props} className={cn('text-lg mb-4', theme === 'light' ? 'text-gray-800' : 'text-gray-200')}>
                {only?.props.children}
              </p>
            );
          }
          const twoCol = !hasSideImage && n >= 4;
          return (
            <ul
              {...props}
              className={cn(
                'pl-6 space-y-2 list-disc border-l-0 mb-4',
                twoCol && 'columns-2 gap-x-8 [column-fill:balance]'
              )}
              style={{ ['--slide-marker' as any]: markerColor }}
            >
              {children}
            </ul>
          );
        },
        ol: ({ node, children, ...props }) => {
          const twoCol = !hasSideImage && listChildCount(children) >= 4;
          return (
            <ol
              {...props}
              className={cn(
                'pl-6 space-y-2 list-decimal pb-4 marker:[color:var(--slide-marker,#0f172a)]',
                twoCol && 'columns-2 gap-x-8 [column-fill:balance]'
              )}
              style={{ ['--slide-marker' as any]: markerColor }}
            >
              {children}
            </ol>
          );
        },
        // Body bold is intentionally subdued: headers already carry hierarchy, so
        // mid-bullet **keywords** should not compete with the title (looked noisy).
        strong: ({ node, children, ...props }) => (
          <strong {...props} className="font-medium text-inherit">{children}</strong>
        ),
        h2: ({ node, children, ...props }) => (
          <h2
            {...props}
            className={cn(
              'text-base font-bold tracking-wide mt-5 mb-2 first:mt-0',
              theme === 'light' ? 'text-slate-900' : 'text-white'
            )}
          >
            {children}
          </h2>
        ),
        h3: ({ node, children, ...props }) => (
          <h3
            {...props}
            className={cn(
              'text-sm font-bold tracking-wide mt-4 mb-2 first:mt-0 uppercase',
              theme === 'light' ? 'text-slate-700' : 'text-slate-200'
            )}
          >
            {children}
          </h3>
        ),
        h4: ({ node, children, ...props }) => (
          <h4
            {...props}
            className={cn(
              'text-sm font-semibold mt-3 mb-1.5 first:mt-0',
              theme === 'light' ? 'text-slate-700' : 'text-slate-300'
            )}
          >
            {children}
          </h4>
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
/** Preserve author bold in preview (HTML <strong>/<b> and markdown **). */
function stripBulletBold(raw: string): string {
  return raw || '';
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
        ul: ({ node, children, ...props }) => {
          const items = React.Children.toArray(children).filter(c => React.isValidElement(c));
          if (items.length === 1) {
            const inner = (items[0] as React.ReactElement<{ children?: React.ReactNode }>).props.children;
            return <p className="mb-4">{inner}</p>;
          }
          return (
            <ul {...props} className="pl-6 space-y-2 list-disc mb-4" style={{ ['--slide-marker' as any]: markerColor }}>{children}</ul>
          );
        },
        ol: ({ node, children, ...props }) => (
          <ol {...props} className="pl-6 space-y-2 list-decimal mb-4" style={{ ['--slide-marker' as any]: markerColor }}>{children}</ol>
        ),
        li: ({ node, children, ...props }) => (
          <li {...props} className="marker:[color:var(--slide-marker,#0f172a)]">{children}</li>
        ),
        strong: ({ node, children, ...props }) => (
          <strong {...props} className="font-medium text-inherit">{children}</strong>
        ),
        h2: ({ node, children, ...props }) => (
          <h2 {...props} className={cn('text-base font-bold mt-4 mb-2 first:mt-0', theme === 'light' ? 'text-slate-900' : 'text-white')}>{children}</h2>
        ),
        h3: ({ node, children, ...props }) => (
          <h3 {...props} className={cn('text-sm font-bold mt-3 mb-1.5 first:mt-0 uppercase tracking-wide', theme === 'light' ? 'text-slate-700' : 'text-slate-200')}>{children}</h3>
        ),
        h4: ({ node, children, ...props }) => (
          <h4 {...props} className={cn('text-sm font-semibold mt-2 mb-1 first:mt-0', theme === 'light' ? 'text-slate-700' : 'text-slate-300')}>{children}</h4>
        ),
      }}
    >
      {stripBulletBold(autoFormatAsBullets(content))}
    </ReactMarkdown>
  );
};

/** Synopsis (course content) + optional player-chrome instruction caption. */
const KnowledgeCheckFraming = ({
  content,
  instruction,
  theme,
  accentColor,
}: {
  content: unknown;
  instruction?: string;
  theme?: string;
  accentColor?: string;
}) => {
  const { synopsis, instruction: hint } = splitKnowledgeCheckOst(content, instruction);
  if (!synopsis && !hint) return null;
  return (
    <div className="space-y-2">
      {synopsis ? (
        <SmartContent
          content={sanitizeContent(synopsis)}
          theme={theme}
          accentColor={accentColor}
          className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')}
        />
      ) : null}
      {hint ? (
        <p
          className={cn(
            'text-xs font-semibold leading-relaxed m-0',
            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
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
  const { user, session, loading: authLoading, signOut, isAdmin, isTrial, isTrialExpired, passwordRecovery, clearPasswordRecovery } = useAuth();

  // ── Plan entitlements (Stripe) — prefer over signup metadata for drafts/voices ─
  const [entitlementPlan, setEntitlementPlan] = React.useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [adminAccountView, setAdminAccountView] = React.useState<AdminAccountView>(() =>
    typeof window !== 'undefined' ? readAdminAccountView() : 'admin'
  );
  React.useEffect(() => {
    const sync = () => setAdminAccountView(readAdminAccountView());
    window.addEventListener('nexcourse-admin-view', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('nexcourse-admin-view', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  React.useEffect(() => {
    if (!user?.id) {
      setEntitlementPlan(null);
      setWorkspaceId(null);
      return;
    }
    let cancelled = false;
    getPaymentStatus(user.id)
      .then(s => {
        if (!cancelled) {
          setEntitlementPlan(s?.subscription ?? null);
          setWorkspaceId(s?.workspace_id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntitlementPlan(null);
          setWorkspaceId(null);
        }
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Draft Courses (shared Design + Development slots) ─────────────────────
  const realUserPlan =
    entitlementPlan
    ?? (user?.user_metadata?.plan as string | undefined)
    ?? null;
  // Admin can preview Free / Creator / Team plan gates without paying
  const userPlan = isAdmin
    ? planForAdminView(adminAccountView, realUserPlan)
    : realUserPlan;
  const draftsAsAdmin = isAdmin && adminAccountView === 'admin';
  const draftWorkspaceId =
    isAdmin && isTeamPreviewView(adminAccountView)
      ? workspaceId
      : (adminAccountView === 'admin' || !isAdmin)
        ? workspaceId
        : null;
  const draftManager = useDraftCourses(
    user?.id ?? null,
    userPlan,
    draftsAsAdmin,
    draftWorkspaceId
  );
  const [showDraftsPanel, setShowDraftsPanel] = React.useState(false);
  const [showViewDraftsModal, setShowViewDraftsModal] = React.useState(false);
  const [isSyncingDrafts, setIsSyncingDrafts] = React.useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = React.useState(false);
  const [draftLoadProgress, setDraftLoadProgress] = React.useState(0);
  const [draftLoadStatus, setDraftLoadStatus] = React.useState('');
  const [showAppImagePicker, setShowAppImagePicker] = React.useState(false);
  const [showImageDropdown, setShowImageDropdown] = React.useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = React.useState<string | null>(null);
  const draftMessageTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [designDraftSavedFlash, setDesignDraftSavedFlash] = React.useState(false);
  const playerDefaultsLoadedFor = React.useRef<string | null>(null);

  const showDraftMessage = (msg: string) => {
    setDraftSaveMessage(msg);
    if (draftMessageTimerRef.current) clearTimeout(draftMessageTimerRef.current);
    const long = /fail|full|error|quota|sign in|cannot|can’t|not found|narration|trial|credit|audio|eligible|skipped|system slide|sync/i.test(msg);
    draftMessageTimerRef.current = setTimeout(() => setDraftSaveMessage(null), long ? 10000 : 4500);
  };

  const allocateUniqueDraftTitle = (base: string) => {
    const used = new Set(
      draftManager.drafts.map(d => (d.courseTitle || '').trim().toLowerCase()).filter(Boolean)
    );
    const root = (base || 'Untitled Course').trim() || 'Untitled Course';
    if (!used.has(root.toLowerCase())) return root;
    let n = 1;
    while (used.has(`${root} (${n})`.toLowerCase())) n += 1;
    return `${root} (${n})`;
  };

  const draftSaveExtras = () => ({
    learningObjectives,
    syntheticSlideOverrides,
    syntheticAudioMap,
    examQuestions,
  });

  /** Always create a new library slot (never overwrites the active draft). */
  const handleSaveDraft = async () => {
    if (!course) {
      showDraftMessage('Nothing to save — open or generate a course first.');
      return;
    }
    if (!draftManager.canSave) {
      showDraftMessage(`All ${draftManager.slotsTotal} draft slots are full — delete one before saving a new draft.`);
      return;
    }
    setIsSavingDraft(true);
    showDraftMessage('Saving new draft…');
    try {
      const titleOverride = allocateUniqueDraftTitle(course.title || 'Untitled Course');
      const result = await draftManager.savePreviewDraft(course, playerConfig, theme, {
        ...draftSaveExtras(),
        titleOverride,
      });
      showDraftMessage(
        result.success
          ? `${result.message} You can refresh safely — reopen from Save.`
          : result.message
      );
      if (result.success && result.id) {
        setActiveDraftId(result.id);
        navigateTo(ROUTES.preview(result.id));
      }
    } catch (err: any) {
      console.error('[Drafts] Save failed:', err);
      showDraftMessage(err?.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  /** Overwrite the currently open draft (or fall back to a new slot). */
  const handleUpdateActiveDraft = async () => {
    if (!course) {
      showDraftMessage('Nothing to save — open or generate a course first.');
      return;
    }
    if (!activeDraftId) {
      await handleSaveDraft();
      return;
    }
    setIsSavingDraft(true);
    showDraftMessage('Updating current draft…');
    try {
      const existing = await draftManager.loadDraftAsync(activeDraftId);
      if (existing?.phase === 'preview') {
        const updated = await draftManager.replacePreviewDraft(activeDraftId, course, playerConfig, theme, draftSaveExtras());
        showDraftMessage(
          updated.success
            ? `${updated.message} You can refresh safely — reopen from Save.`
            : updated.message
        );
        if (updated.success) navigateTo(ROUTES.preview(activeDraftId), true);
        return;
      }
      // Active id isn’t a preview draft — create a new slot (do not nest handleSaveDraft busy state)
      if (!draftManager.canSave) {
        showDraftMessage(`All ${draftManager.slotsTotal} draft slots are full — delete one before saving a new draft.`);
        return;
      }
      showDraftMessage('Saving new draft…');
      const titleOverride = allocateUniqueDraftTitle(course.title || 'Untitled Course');
      const result = await draftManager.savePreviewDraft(course, playerConfig, theme, {
        ...draftSaveExtras(),
        titleOverride,
      });
      showDraftMessage(
        result.success
          ? `${result.message} You can refresh safely — reopen from Save.`
          : result.message
      );
      if (result.success && result.id) {
        setActiveDraftId(result.id);
        navigateTo(ROUTES.preview(result.id));
      }
    } catch (err: any) {
      console.error('[Drafts] Update failed:', err);
      showDraftMessage(err?.message || 'Failed to update draft.');
    } finally {
      setIsSavingDraft(false);
    }
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
    setOutlineSourceFingerprint(
      design.outlineDraft
        ? foundationFingerprint({
            courseTitle: design.courseTitle || '',
            courseDescription: design.courseDescription || '',
            prompt: design.prompt || '',
            learningObjectives: design.learningObjectives || [],
            objectiveFormat: design.objectiveFormat || 'AB',
            includeModuleTitleSlides: !!design.includeModuleTitleSlides,
            includeModuleOverviewSlides: !!design.includeModuleOverviewSlides,
            includeSummarySlides: !!design.includeSummarySlides,
          })
        : null
    );
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
    // Restore objectives / VO overrides so Course Objectives & module overview rebuild
    const restoredObjectives =
      snapshot.learningObjectives ||
      shell.learningObjectives ||
      null;
    if (Array.isArray(restoredObjectives) && restoredObjectives.length) {
      setLearningObjectives(restoredObjectives);
    }
    if (snapshot.syntheticSlideOverrides && typeof snapshot.syntheticSlideOverrides === 'object') {
      setSyntheticSlideOverrides(snapshot.syntheticSlideOverrides);
    }
    setSyntheticAudioMap({});
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
    // Restore pre-built mastery quiz questions (never regenerate on Begin)
    const restoredExamQs =
      (Array.isArray((shell as any).examQuestions) && (shell as any).examQuestions) ||
      (snapshot.phase === 'preview' && Array.isArray((snapshot as any).examQuestions)
        ? (snapshot as any).examQuestions
        : null);
    if (Array.isArray(restoredExamQs) && restoredExamQs.length) {
      setExamQuestions(restoredExamQs);
      setExamError(null);
    } else {
      setExamQuestions([]);
    }
    setExamPhase('idle');
    setIsGeneratingExam(false);
    examGenPromiseRef.current = null;
    setStep('preview');
    setActiveDraftId(id);
    navigateTo(ROUTES.preview(id));
    showDraftMessage('Draft loaded ✓');

    // Images + audio after first paint — idle so Nav/Next stay responsive
    const attachImages = async () => {
      try {
        await new Promise<void>(r => setTimeout(r, 100));
        const stored = await draftManager.loadDraftAssets(id);
        const media = mediaRecordToMap(stored);
        legacyMedia.forEach((v, k) => { if (!media.has(k)) media.set(k, v); });

        // Synthetic cover/objectives/module audio lives under __synthetic__.* keys
        const synthRestored: Record<string, string> = {};
        for (const [k, v] of [...media.entries()]) {
          if (k.startsWith('__synthetic__.')) {
            synthRestored[k.slice('__synthetic__.'.length)] = v;
            media.delete(k);
          }
        }
        if (Object.keys(synthRestored).length) {
          setSyntheticAudioMap(synthRestored);
        }

        if (!media.size) {
          const missingAudio = (shell.modules || []).some((m: any) =>
            (m.slides || []).some((s: any) =>
              (s.voiceOverText || s.narration) && !s.voiceOverUrl
            )
          );
          if (missingAudio && voiceOverEnabled) {
            showDraftMessage(
              'Draft loaded — narration was not saved with this draft. Use Edit → Regenerate all narration to restore audio.'
            );
          }
          return;
        }

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
        console.log(`[Drafts] Attached ${media.size} media asset(s) after preview open`);

        // Remove auto-promoted floating overlays that broke tab layouts
        try {
          const cleaned = stripCourseAutoPromotedFloating(working);
          const fmap = floatingMapFromCourse(cleaned);
          setFloatingImagesMap(fmap);
          if (cleaned !== working) {
            working = cleaned;
            setCourse(working);
            setOriginalCourse(working);
          }
        } catch (e) {
          console.warn('[Drafts] Floating cleanup failed:', e);
        }

        const missingAudio = (working.modules || []).some((m: any) =>
          (m.slides || []).some((s: any) =>
            (s.voiceOverText || s.narration) && !s.voiceOverUrl
          )
        );
        if (missingAudio && voiceOverEnabled && !Object.keys(synthRestored).length) {
          showDraftMessage(
            'Draft loaded — some narration is missing. Use Edit → Regenerate all narration to restore audio.'
          );
        }
      } catch (e) {
        console.warn('[Drafts] Media attach after open failed:', e);
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
    setIsSavingDraft(true);
    showDraftMessage('Overwriting draft…');
    try {
      const result = await draftManager.replacePreviewDraft(id, course, playerConfig, theme, draftSaveExtras());
      showDraftMessage(result.message);
      if (result.success) {
        setActiveDraftId(id);
        navigateTo(ROUTES.preview(id), true);
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Controls which pre-auth view to show: public marketing homepage OR login/signup
  const [publicView, setPublicView] = useState<'homepage' | 'auth' | 'methodology' | 'pricing' | 'examples'>('homepage');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  
  const [step, setStep] = useState<AppStep>(isScormPlayer ? 'preview' : 'home');

  /** Filled after usePlayer() — used by goHome before player is in scope */
  const playerCtlRef = useRef<{ pause: () => void; clearAudio: () => void }>({
    pause: () => {},
    clearAudio: () => {},
  });

  /** In-app home — Course upload / builder dashboard */
  const goHome = () => {
    try {
      playerCtlRef.current.pause();
      playerCtlRef.current.clearAudio();
    } catch { /* ignore */ }
    setShowPlayerProperties(false);
    setStep('home');
    setMobileDesignDemo(false);
    setActiveDraftId(null);
    setIsSandboxMode(false);
    navigateTo(ROUTES.upload);
  };

  /** Back from Course Settings / Review course — resume upload chooser if a file is still pending. */
  const backFromCourseSettings = () => {
    if (settingsMode !== 'defaults') {
      setOutlineDraft(null);
      setOutlineSourceFingerprint(null);
    }
    if (pendingUploadFile) {
      setStep('home');
      setMobileDesignDemo(false);
      navigateTo(ROUTES.upload);
      setShowUploadPathModal(true);
      return;
    }
    goHome();
  };

  /** From upload chooser: open saved Course Settings without discarding the pending file. */
  const viewCourseSettingsFromUploadPath = () => {
    setShowUploadPathModal(false);
    applySavedSettings(resolveCourseSettings(user?.id));
    setSettingsMode('defaults');
    setIsSandboxMode(false);
    setMobileDesignDemo(false);
    setActiveDraftId(null);
    setStep('details');
    navigateTo(ROUTES.courseSettings);
  };

  /** Public marketing landing (nexcourse.ai /) — logo + bare-domain default */
  const goToMarketingHome = () => {
    setShowPlayerProperties(false);
    setShowViewDraftsModal(false);
    setShowDraftsPanel(false);
    setAdminDropdownOpen(false);
    setMobileDesignDemo(false);
    setActiveDraftId(null);
    setIsSandboxMode(false);
    setPublicView('homepage');
    setStep('marketing');
    navigateTo(ROUTES.home);
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
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showDevTour, setShowDevTour] = useState(false);
  /** defaults = profile menu; session = after customize upload; quick = one-click build */
  const [settingsMode, setSettingsMode] = useState<'defaults' | 'session' | 'quick'>('session');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [settingsSavedFlash, setSettingsSavedFlash] = useState(false);
  const [lastUploadPath, setLastUploadPath] = useState<UploadPathChoice | null>(null);
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(null);
  const [showEditMenu, setShowEditMenu] = useState(false);
  /** Ref so runAnalysis (defined earlier) can call finalize after hydrate */
  const finalizeGeneratedCourseRef = useRef<
    (course: any, settingsOverride?: SavedCourseSettings | null) => Promise<void>
  >(async () => {});
  /** Bumps when a new finalize starts so stale background imagery/QC work aborts safely */
  const finalizeBackgroundTokenRef = useRef(0);
  
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
  /** Foundation snapshot that produced `outlineDraft` — drift means structure is stale. */
  const [outlineSourceFingerprint, setOutlineSourceFingerprint] = useState<string | null>(null);
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
  // Compact / phone layouts: letterbox gutters host TOC (rails or Menu) per playerConfig.
  // Covers mobile preview mode, portrait phones, and landscape phones (short edge < 520).
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 520
  );
  /** Touch / stylus phones & tablets — not resized desktop browser windows. */
  const [isCoarsePointer, setIsCoarsePointer] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  /** Real handheld preview — scale-to-fit in landscape; portrait shows a rotate prompt. */
  const isPhoneViewport = isCoarsePointer && isCompactViewport;
  /** Phone-like preview surfaces that should use gutter TOC instead of a desktop left rail. */
  const isPhoneLikeToc = viewMode === 'mobile' || isPortrait || isPhoneViewport;
  /** Touch phones in portrait: ask to rotate (no CSS fake-landscape). */
  const needsLandscapeForPreview = isPhoneViewport && isPortrait && !isScormPlayer;

  const [showSettings, setShowSettings] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [showImageGalleryForSlide, setShowImageGalleryForSlide] = useState<string | null>(null);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const sourceImagesRef = useRef<SourceImage[]>([]);
  sourceImagesRef.current = sourceImages;

  // Interaction Previews
  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);
  const [previewModalViewMode, setPreviewModalViewMode] = useState<'desktop' | 'mobile'>('desktop');
  /** Admin Demo — Design (Mobile): wrap Course Settings inside enlarged phone chrome */
  const [mobileDesignDemo, setMobileDesignDemo] = useState(false);
  
  // Player Properties
  const [showPlayerProperties, setShowPlayerProperties] = useState(false);
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(defaultPlayerConfig);
  const phoneTocPlacement: 'hidden' | 'rail-left' | 'rail-right' | 'dropdown-gutter' | null = !isPhoneLikeToc
    ? null
    : playerConfig.tocPosition === 'hidden'
      ? 'hidden'
      : playerConfig.tocPosition === 'sidebar-left'
        ? 'rail-left'
        : playerConfig.tocPosition === 'sidebar-right'
          ? 'rail-right'
          : 'dropdown-gutter';
  const showDesktopSidebar = !isPhoneLikeToc && playerConfig.tocPosition !== 'hidden';
  
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
  const [leavePreviewOpen, setLeavePreviewOpen] = useState(false);
  const leavePreviewConfirmRef = useRef<(() => void) | null>(null);
  const previewGuardRef = useRef({
    step: 'home' as string,
    hasCourse: false,
    isSandboxMode: false,
    isScormPlayer: false,
    activeDraftId: null as string | null,
  });
  previewGuardRef.current = {
    step,
    hasCourse: !!course,
    isSandboxMode,
    isScormPlayer,
    activeDraftId,
  };
  const requestLeavePreview = (onConfirm: () => void) => {
    const g = previewGuardRef.current;
    if (g.isScormPlayer || g.isSandboxMode || !g.hasCourse || g.step !== 'preview') {
      onConfirm();
      return;
    }
    leavePreviewConfirmRef.current = onConfirm;
    setLeavePreviewOpen(true);
  };

  // ── Sandbox demo launcher (shared by menu + deep links) ───────────────────
  launchSandboxDemoRef.current = (demo: SandboxDemo, pushUrl = true) => {
    setActiveDraftId(null);
    setShowPlayerProperties(false);
    if (demo === 'settings') {
      setCourseTitle('Advanced Workplace Communication');
      setCourseDescription('A comprehensive eLearning course covering modern workplace communication strategies.');
      setLearningObjectives([{ terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration.', enablingObjectives: [] }]);
      setCourseType('standard'); setPreset('standard');
      setSettingsMode('defaults');
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
      setPrompt('Advanced Workplace Communication');
      setLearningObjectives([{ terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration.', enablingObjectives: [] }]);
      setCourseType('standard'); setPreset('standard');
      setSettingsMode('session');
      setPreviewModalViewMode('mobile');
      setMobileDesignDemo(true);
      setViewMode('mobile');
      setIsSandboxMode(true);
      const dummyOutline = {
        title: DUMMY_COURSE.title,
        description: DUMMY_COURSE.description || '',
        learningObjectives: DUMMY_COURSE.learningObjectives || [],
        visualTheme: 'light',
        modules: DUMMY_COURSE.modules.map((m: any) => ({
          id: m.id,
          title: m.title,
          slides: (m.slides || []).map((s: any) => ({ id: s.id, type: s.type, title: s.title })),
        })),
      };
      setOutlineDraft(dummyOutline);
      setOutlineSourceFingerprint(foundationFingerprint({
        courseTitle: 'Advanced Workplace Communication',
        courseDescription: 'A comprehensive eLearning course covering modern workplace communication strategies.',
        prompt: 'Advanced Workplace Communication',
        learningObjectives: [{ terminalObjective: 'Given a workplace scenario, the learner will identify the communication strategy that best supports effective collaboration.', enablingObjectives: [] }],
        objectiveFormat,
        includeModuleTitleSlides,
        includeModuleOverviewSlides,
        includeSummarySlides,
      }));
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

    // After login/signup → app dashboard
    if (parsed.kind === 'auth') {
      navigateTo(ROUTES.upload, true);
      setStep('home');
      return;
    }
    // Bare nexcourse.ai (/) → marketing landing (even when signed in)
    if (parsed.kind === 'marketing' && parsed.view === 'homepage') {
      setPublicView('homepage');
      setStep('marketing');
      navigateTo(ROUTES.home, true);
      return;
    }
    if (target === '/' || target === '') {
      setPublicView('homepage');
      setStep('marketing');
      navigateTo(ROUTES.home, true);
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
    if (parsed.kind === 'building') {
      // Progress route — same home step UI; idle visits bounce back to /upload via sync effect
      setStep('home');
      setActiveDraftId(null);
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
      setShowPlayerProperties(false);
      setShowWelcomeTour(false);
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
    if (parsed.kind === 'courseReview') {
      setSettingsMode('session');
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
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
    if (isScormPlayer || authLoading || passwordRecovery) return;
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
  }, [user, authLoading, isScormPlayer, isAdmin, passwordRecovery]);

  // Keep URL in sync with major authenticated steps
  useEffect(() => {
    if (!user || isScormPlayer) return;
    const path = window.location.pathname;
    if (path.startsWith('/sandbox/')) return;

    if (step === 'marketing') {
      if (publicView === 'homepage' && path !== ROUTES.home) navigateTo(ROUTES.home, true);
      else if (publicView === 'methodology' && path !== ROUTES.methodology) navigateTo(ROUTES.methodology, true);
      else if (publicView === 'pricing' && path !== ROUTES.pricing) navigateTo(ROUTES.pricing, true);
      else if (publicView === 'examples' && path !== ROUTES.examples) navigateTo(ROUTES.examples, true);
      return;
    }
    // /upload vs /Building for step===home is handled in a later effect (needs analyze/generate flags)
    if (step === 'home') return;
    else if (step === 'details' && !isSandboxMode) {
      if (settingsMode === 'defaults') {
        if (path !== ROUTES.courseSettings) navigateTo(ROUTES.courseSettings, true);
      } else if (activeDraftId && !path.startsWith('/design/')) {
        navigateTo(ROUTES.design(activeDraftId), true);
      } else if (!activeDraftId && path !== ROUTES.courseReview && !path.startsWith('/design/')) {
        navigateTo(ROUTES.courseReview, true);
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
  }, [step, user, isScormPlayer, isSandboxMode, activeDraftId, publicView, settingsMode]);

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
      const g = previewGuardRef.current;
      if (g.step === 'preview' && g.hasCourse && !g.isScormPlayer && !g.isSandboxMode) {
        const parsed = parseAppPath(path);
        const stillPreview = parsed.kind === 'preview' || parsed.kind === 'courseDevelopment';
        if (!stillPreview) {
          const restore = g.activeDraftId ? ROUTES.preview(g.activeDraftId) : ROUTES.courseDevelopment;
          navigateTo(restore, true);
          leavePreviewConfirmRef.current = () => applyAuthenticatedPath(path);
          setLeavePreviewOpen(true);
          return;
        }
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
  const [objectiveFormat, setObjectiveFormat] = useState<string>(DEFAULT_COURSE_SETTINGS.objectiveFormat);
  const [slideCount, setSlideCount] = useState(DEFAULT_COURSE_SETTINGS.slideCount);
  const [interactionTypes, setInteractionTypes] = useState<string[]>([...DEFAULT_COURSE_SETTINGS.interactionTypes]);
  const [gameTemplateIds, setGameTemplateIds] = useState<string[]>([]);
  // Build mode: 'course' = full course builder, 'game' = standalone game mode
  const [buildMode, setBuildMode] = useState<'course' | 'game' | 'workflow'>('course');
  const [selectedGameType, setSelectedGameType] = useState<GameTemplateType>('jeopardy');
  const [extractedFileText, setExtractedFileText] = useState<string>('');
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(DEFAULT_COURSE_SETTINGS.voiceOverEnabled);

  // Phones and desktop 16:9/4:3: JS scale-to-fit (HDMI scale-up included).
  // Measure an empty overlay; keep a full-size in-flow host so the stage cannot
  // collapse. Never toggle flex-fill vs transform. Desktop Mobile bezel is separate.
  const measureScaleToFit =
    step === 'preview' &&
    playerConfig?.playerResolution !== 'full' &&
    (isPhoneViewport || viewMode === 'desktop');
  const scaler = useScaleToFit(
    playerConfig?.playerResolution ?? '16:9',
    measureScaleToFit
  );
  const useScaleTransform = measureScaleToFit;
  /** Phones dock PlayerBar outside the CSS-scaled frame. Desktop keeps it inside. */
  const dockPlayerBarOutside = isPhoneViewport;
  const themeStageBg =
    theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900';
  const [ttsVoice, setTtsVoice] = useState<string>(DEFAULT_COURSE_SETTINGS.ttsVoice);
  // Creator/free: Alloy only — clamp if plan can't use other voices
  React.useEffect(() => {
    if (!canUseAllVoices(userPlan) && ttsVoice !== 'alloy') {
      setTtsVoice('alloy');
    }
  }, [userPlan, ttsVoice]);
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
  const [includeModuleOverviewSlides, setIncludeModuleOverviewSlides] = useState(DEFAULT_COURSE_SETTINGS.includeModuleOverviewSlides);
  const [includeSummarySlides, setIncludeSummarySlides] = useState(DEFAULT_COURSE_SETTINGS.includeSummarySlides);
  const [includeModuleTitleSlides, setIncludeModuleTitleSlides] = useState(DEFAULT_COURSE_SETTINGS.includeModuleTitleSlides);
  const [imageMode, setImageMode] = useState<CourseImageMode>(DEFAULT_COURSE_SETTINGS.imageMode);
  /** When Hotspot is on but Multimedia AI/source are off, still AI-generate hotspot backdrops */
  const [hotspotGenerateBackdrop, setHotspotGenerateBackdrop] = useState(
    !!DEFAULT_COURSE_SETTINGS.hotspotGenerateBackdrop
  );
  const [verticalTabSkin, setVerticalTabSkin] = useState<'default' | 'blocks'>(
    resolveVerticalTabSkin(DEFAULT_COURSE_SETTINGS.verticalTabSkin)
  );
  const [verticalTabColorMode, setVerticalTabColorMode] = useState(
    resolveVerticalTabColorMode(DEFAULT_COURSE_SETTINGS.verticalTabColorMode)
  );
  const [verticalTabUnifyColor, setVerticalTabUnifyColor] = useState(
    resolveHexColor(DEFAULT_COURSE_SETTINGS.verticalTabUnifyColor, TAB_ACCENT_HEX[0])
  );
  const [verticalTabWellColor, setVerticalTabWellColor] = useState(
    resolveHexColor(DEFAULT_COURSE_SETTINGS.verticalTabWellColor, BLOCKS_WELL_DEFAULT)
  );
  const [processSkin, setProcessSkin] = useState<'default' | 'blocks'>(
    resolveProcessSkin(DEFAULT_COURSE_SETTINGS.processSkin)
  );
  const [processShowStepLabels, setProcessShowStepLabels] = useState(
    resolveProcessStepLabels(DEFAULT_COURSE_SETTINGS.processShowStepLabels)
  );
  /** Per-tab narration override while on a tabbed slide (cleared on slide change) */
  const [activeTabAudioUrl, setActiveTabAudioUrl] = useState<string | null>(null);
  /** Per-tab CC script paired with activeTabAudioUrl (null = use slide-level voiceOverText) */
  const [activeTabNarrationText, setActiveTabNarrationText] = useState<string | null>(null);
  /** Active content tab id for tab-scoped floating images (null = intro / non-tab slide) */
  const [activeTabForImages, setActiveTabForImages] = useState<string | null>(null);
  /** Tab id under the pointer while dragging a floating image */
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [generatedCourseTitle, setGeneratedCourseTitle] = useState('');
  const [qcFocusSlideId, setQcFocusSlideId] = useState<string | null>(null);

  // Mastery Quiz state
  const [examConfig, setExamConfig] = useState<ExamConfig>({ ...DEFAULT_COURSE_SETTINGS.examConfig });
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
  /** In-flight mastery quiz generation — Begin Quiz awaits this instead of starting a new job */
  const examGenPromiseRef = useRef<Promise<ExamQuestion[]> | null>(null);

  // Navigation restriction state
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(DEFAULT_COURSE_SETTINGS.navigationMode);
  const [requireInteractionsComplete, setRequireInteractionsComplete] = useState(DEFAULT_COURSE_SETTINGS.requireInteractionsComplete);
  const [highestVisitedIndex, setHighestVisitedIndex] = useState(0);
  /** Per-slide set of explored interaction item ids (for requireInteractionsComplete) */
  const [exploredBySlide, setExploredBySlide] = useState<Record<string, string[]>>({});

  // Player defaults are loaded with Course Settings via account preferences (see effect below).
  useEffect(() => {
    if (!user?.id) playerDefaultsLoadedFor.current = null;
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
  playerCtlRef.current = {
    pause: () => player.pause(),
    clearAudio: () => player.loadSlide('', null, null),
  };
  const { progress: ttsProgress, generateTTS, resetTTS, clearTTSProgress } = useTTSGeneration();

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
          const coverId = `__module-cover-${modNum}__`;
          const coverVo = `Module ${modNum}: ${cleanTitle}.${m.description ? ' ' + m.description : ''}`.trim();
          synthetics.push({
            id: coverId,
            title: m.title || `Module ${modNum}`,
            type: 'module-cover' as any,
            content: syntheticSlideOverrides[coverId]?.content ?? '',
            voiceOverText: syntheticSlideOverrides[coverId]?.voiceOverText ?? coverVo,
            voiceOverUrl: syntheticAudioMap[coverId] || undefined,
            // Title slides: no body OST — description is narration only
            _moduleNumber: modNum,
            _moduleTitle: m.title || `Module ${modNum}`,
          } as Slide);
        }

        if (includeModuleOverviewSlides) {
          // Module Overview (e.g. 1.1, 2.1): objectives accordion after the title slide.
          // If the title slide is present, narration continues without re-announcing the name.
          const overviewId = `__module-overview-${modNum}__`;
          const overviewVo = includeModuleTitleSlides
            ? `Let's revisit the objectives for this module.${m.description ? ' ' + m.description : ''}`.trim()
            : `Module ${modNum}: ${cleanTitle}. Let's revisit the objectives for this module.${m.description ? ' ' + m.description : ''}`.trim();
          synthetics.push({
            id: overviewId,
            title: `Module ${modNum} — Overview`,
            type: 'module-overview' as any,
            content: syntheticSlideOverrides[overviewId]?.content ?? (m.description || ''),
            voiceOverText: syntheticSlideOverrides[overviewId]?.voiceOverText ?? overviewVo,
            voiceOverUrl: syntheticAudioMap[overviewId] || undefined,
            _moduleNumber: modNum,
            _moduleTitle: m.title || `Module ${modNum}`,
            _objectives: moduleObj ? [moduleObj] : [],
          } as Slide);
        }

        return [...synthetics, ...(m.slides || []).filter((s: any) => s?.type !== 'game-template')];
      })
    : [];
  // Item 12: Title slides — OST is title only; description is narration/CC, not on-screen
  const coverDefaultVo = course ? `Welcome to ${course.title}. ${course.description || ''}`.trim() : '';
  const coverSlide: Slide = course ? {
    id: '__cover__',
    title: course.title,
    type: 'cover' as any,
    content: syntheticSlideOverrides['__cover__']?.content ?? '',
    narration: syntheticSlideOverrides['__cover__']?.voiceOverText ?? coverDefaultVo,
    voiceOverText: syntheticSlideOverrides['__cover__']?.voiceOverText ?? coverDefaultVo,
    voiceOverUrl: syntheticAudioMap['__cover__'] || undefined,
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
  const playerTourDefaultVo = 'Before we begin, take a moment to explore the player controls. Hover over each card to see the corresponding element highlighted.';
  const playerTourSlide: Slide = course ? {
    id: '__player-tour__',
    title: 'Player Navigation Guide',
    type: 'player-tour' as any,
    content: syntheticSlideOverrides['__player-tour__']?.content ?? '',
    narration: syntheticSlideOverrides['__player-tour__']?.voiceOverText ?? playerTourDefaultVo,
    voiceOverText: syntheticSlideOverrides['__player-tour__']?.voiceOverText ?? playerTourDefaultVo,
    voiceOverUrl: syntheticAudioMap['__player-tour__'] || undefined,
  } as Slide : null as any;
  const courseObjectivesDefaultVo = 'These are the objectives for this course. Review each one so you know what you will be able to do when you finish.';
  const courseObjectivesSlide: Slide = course ? {
    id: '__course-objectives__',
    title: 'Course Objectives',
    type: 'course-objectives' as any,
    content: syntheticSlideOverrides['__course-objectives__']?.content
      ?? syntheticSlideOverrides['__objectives__']?.content
      ?? '',
    voiceOverText: syntheticSlideOverrides['__course-objectives__']?.voiceOverText
      ?? syntheticSlideOverrides['__objectives__']?.voiceOverText
      ?? courseObjectivesDefaultVo,
    voiceOverUrl: syntheticAudioMap['__course-objectives__'] || undefined,
    _objectives: learningObjectives || [],
  } as Slide : null as any;
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
  const FULL_BLEED_TYPES = ['cover', 'title', 'module-cover', 'closing', 'key-takeaways', 'player-tour', 'course-objectives', 'module-overview', 'mastery-exam', 'exam-intro', 'exam-results'];
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
    const coarseMq = window.matchMedia('(pointer: coarse)');
    const check = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      setIsPortrait(w < 768 && h > w);
      setIsCompactViewport(Math.min(w, h) < 520);
      setIsCoarsePointer(coarseMq.matches);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    window.visualViewport?.addEventListener('resize', check);
    coarseMq.addEventListener?.('change', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      window.visualViewport?.removeEventListener('resize', check);
      coarseMq.removeEventListener?.('change', check);
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
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) handleNext(); else handlePrev();
    }
  };

  // Derive only the current slide's synthetic URL — do NOT put the whole syntheticAudioMap
  // object in the effect deps, because every setSyntheticAudioMap() call (each module's
  // background audio generation) creates a new reference, which would fire loadSlide for
  // the current slide over and over, resetting playback mid-sentence.
  const currentSyntheticUrl = syntheticAudioMap[currentSlide?.id ?? ''] ?? null;

  // Clear per-tab audio / CC / tab-image scope when leaving a slide
  useEffect(() => {
    setActiveTabAudioUrl(null);
    setActiveTabNarrationText(null);
    setActiveTabForImages(null);
    setDragOverTabId(null);
  }, [currentSlide?.id]);

  /** Switch tab audio + CC together so captions never lag on intro script. */
  const handleTabAudio = (tabId: string) => {
    if (!voiceOverEnabled || !currentSlide) return;
    if (tabId === '__intro__') {
      setActiveTabAudioUrl(null);
      setActiveTabNarrationText(null);
      return;
    }
    const tabs = currentSlide.data?.tabs || currentSlide.data?.items || [];
    const tab = (tabs || []).find((t: any) => t.id === tabId);
    if (tab?.voiceOverUrl) {
      setActiveTabAudioUrl(tab.voiceOverUrl);
      const script = String(tab.voiceOverText || tab.narration || '').trim();
      setActiveTabNarrationText(script || null);
    } else {
      player.pause();
      setActiveTabAudioUrl(null);
      setActiveTabNarrationText(null);
    }
  };

  useEffect(() => {
    // Only load/play audio while the course player is visible — never during generate/upload
    if (step !== 'preview' || !currentSlide) return;
    player.loadSlide(
      currentSlide.id,
      // AI audio only — never fall back to browser TTS
      voiceOverEnabled
        ? (activeTabAudioUrl || currentSlide.voiceOverUrl || (currentSlide as any).audioUrl || currentSyntheticUrl || null)
        : null,
      null  // ttsText always null: slides are silent while AI audio loads, then auto-play
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentSlide?.id, currentSlide?.voiceOverUrl, voiceOverEnabled, currentSyntheticUrl, activeTabAudioUrl]);


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

  // Warn before refresh/close while a course is open — drafts are not autosaved
  useEffect(() => {
    if (isScormPlayer || !course) return;
    if (step !== 'preview') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [course, step, isScormPlayer]);

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

  // Keep courseBg in sync with the AI/user cover; otherwise seed a theme backdrop
  useEffect(() => {
    const cover = (course as any)?.coverImage as string | undefined;
    if (cover) {
      if (courseBg !== cover) setCourseBg(cover);
      return;
    }
    if (course && !courseBg && course.visualTheme !== 'light') {
      setCourseBg(getRandomBackgroundForTheme(course.visualTheme));
    }
  }, [course]);

  // Item 13: Auto-play voice-over when slide changes
  // Uses a ref so the setTimeout closure always calls the LATEST play() — avoids stale isPlaying=true skip
  const playerPlayRef = useRef<() => void>(() => {});
  useEffect(() => { playerPlayRef.current = player.play; }, [player.play]);
  useEffect(() => {
    if (step !== 'preview' || !voiceOverEnabled) return;
    const timer = setTimeout(() => {
      // Call via ref — guaranteed to use state from the most recent render
      playerPlayRef.current();
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentSlide?.id, player.hasAudio, voiceOverEnabled, activeTabAudioUrl]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  /** Mirrors upload vs progress URL for tour gating (navigateTo does not re-render by itself). */
  const [homeRoutePath, setHomeRoutePath] = useState<string>(ROUTES.upload);
  /** When set, shows a non-error warm-up UI and auto-retries analysis at 0 */
  const [coldStartCountdown, setColdStartCountdown] = useState<number | null>(null);
  const coldStartTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // First-visit welcome tour — ONLY on exact /upload URL (never on /Building progress).
  // Closing sets sessionStorage; "Don't show again" sets localStorage.
  useEffect(() => {
    const busy =
      isAnalyzing ||
      isGenerating ||
      isHydrating ||
      isGeneratingImages ||
      coldStartCountdown != null;
    const onUploadUrl = homeRoutePath === ROUTES.upload;

    if (!user || step !== 'home' || busy || !onUploadUrl) {
      setShowWelcomeTour(false);
      return;
    }
    if (shouldShowWelcomeTour()) setShowWelcomeTour(true);
    else setShowWelcomeTour(false);
  }, [user?.id, step, isAnalyzing, isGenerating, isHydrating, isGeneratingImages, coldStartCountdown, homeRoutePath]);

  // Idle upload stays on /upload; analyze / quick-build progress uses /Building
  useEffect(() => {
    if (!user || isScormPlayer || step !== 'home') return;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/sandbox/')) return;
    const busy =
      isAnalyzing ||
      isGenerating ||
      isHydrating ||
      isGeneratingImages ||
      coldStartCountdown != null;
    const target = busy ? ROUTES.building : ROUTES.upload;
    if (path !== target) navigateTo(target, true);
    setHomeRoutePath(target);
  }, [
    user,
    isScormPlayer,
    step,
    isAnalyzing,
    isGenerating,
    isHydrating,
    isGeneratingImages,
    coldStartCountdown,
  ]);

  // Course Development toolbar tour — once per session (or forever if "Don't show again").
  // On phones, wait until landscape so the tour never covers the rotate prompt.
  useEffect(() => {
    migrateDevTourStorage();
    if (!user || step !== 'preview' || isSandboxMode) return;
    if (needsLandscapeForPreview) return;
    if (shouldShowDevTour()) setShowDevTour(true);
  }, [user?.id, step, isSandboxMode, course?.title, needsLandscapeForPreview]);

  // One-time heal: strip auto-promoted floating images that overlapped tab titles
  useEffect(() => {
    if (step !== 'preview' || !course?.modules) return;
    const cleaned = stripCourseAutoPromotedFloating(course);
    const hadPromoInCourse = cleaned !== course;

    setFloatingImagesMap(prev => {
      let changed = false;
      const next: typeof prev = {};
      for (const [id, imgs] of Object.entries(prev)) {
        const kept = (imgs || []).filter(f => !String(f.id || '').match(/^(fi-promo-|fi-ai-|fi-src-)/));
        if (kept.length !== (imgs || []).length) changed = true;
        if (kept.length) next[id] = kept;
      }
      if (!changed) return prev;
      return next;
    });

    if (hadPromoInCourse) {
      setCourse(cleaned);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- heal once when preview opens / course shell changes
  }, [step, course?.title, course?.modules?.length]);

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
      const override = resolveCourseSettings(user?.id);
      applySavedSettings(override);
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
    setHotspotGenerateBackdrop(!!saved.hotspotGenerateBackdrop);
    setVerticalTabSkin(resolveVerticalTabSkin(saved.verticalTabSkin));
    setVerticalTabColorMode(resolveVerticalTabColorMode(saved.verticalTabColorMode));
    setVerticalTabUnifyColor(resolveHexColor(saved.verticalTabUnifyColor, TAB_ACCENT_HEX[0]));
    setVerticalTabWellColor(resolveHexColor(saved.verticalTabWellColor, BLOCKS_WELL_DEFAULT));
    setProcessSkin(resolveProcessSkin(saved.processSkin));
    setProcessShowStepLabels(resolveProcessStepLabels(saved.processShowStepLabels));
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
    hotspotGenerateBackdrop,
    verticalTabSkin,
    verticalTabColorMode,
    verticalTabUnifyColor,
    verticalTabWellColor,
    processSkin,
    processShowStepLabels,
  });

  const persistCourseSettings = () => {
    saveCourseSettings(collectCurrentSettings(), user?.id);
    if (course) {
      setCourse(prev => prev
        ? applyVerticalTabPresentation(prev, {
            skin: verticalTabSkin,
            colorMode: verticalTabColorMode,
            unifyColor: verticalTabUnifyColor,
            wellColor: verticalTabWellColor,
            processSkin,
            processShowStepLabels,
          })
        : prev);
    }
    try {
      sessionStorage.setItem('nexcourse.courseSettings.savedAt', String(Date.now()));
    } catch { /* ignore */ }
    setSettingsSavedFlash(true);
    setTimeout(() => setSettingsSavedFlash(false), 2000);
  };

  // Load saved course defaults once auth is ready (cloud account prefs → local cache → factory defaults)
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        applySavedSettings(resolveCourseSettings(null));
        return;
      }
      const cloud = await fetchAccountPreferences();
      if (cancelled) return;
      const localSettings = resolveCourseSettings(user.id);
      const localPlayer = loadPlayerProperties(user.id);

      // Prefer this device's fresh Save for ~60s so a slow cloud round-trip cannot
      // overwrite Course Settings the user just edited before Build now / Review.
      let preferLocal = false;
      try {
        const savedAt = Number(sessionStorage.getItem('nexcourse.courseSettings.savedAt') || 0);
        preferLocal = !!savedAt && Date.now() - savedAt < 60_000;
      } catch { /* ignore */ }

      if (preferLocal && localSettings) {
        applySavedSettings(localSettings);
        void pushAccountPreferences({ courseSettings: localSettings });
      } else if (cloud?.courseSettings && typeof cloud.courseSettings === 'object') {
        cacheCourseSettings(cloud.courseSettings as SavedCourseSettings, user.id);
        applySavedSettings(cloud.courseSettings as SavedCourseSettings);
      } else {
        applySavedSettings(localSettings);
        // First-time migrate this device’s settings up to the account
        void pushAccountPreferences({ courseSettings: localSettings });
      }

      if (cloud?.playerProperties && typeof cloud.playerProperties === 'object') {
        const merged = { ...defaultPlayerConfig, ...cloud.playerProperties };
        cachePlayerProperties(merged, user.id);
        applyPlayerConfig(merged);
      } else if (localPlayer) {
        applyPlayerConfig(localPlayer);
        void pushAccountPreferences({ playerProperties: localPlayer });
      }
      playerDefaultsLoadedFor.current = user.id;
    })();
    return () => { cancelled = true; };
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
        quizActivityTypes: (
          Array.isArray(examConfig.knowledgeCheckQuestionTypes)
            ? examConfig.knowledgeCheckQuestionTypes
            : ['sorting', 'matching', 'drop-targets']
        ).filter(t =>
          ['sorting', 'matching', 'drop-targets', 'mc', 'ma', 'tf'].includes(t)
        ),
        objectiveFormat,
      }
    );
  };

  /**
   * Runs the full AI document analysis. Can be called directly for retries.
   * Stays on the analyzing screen on failure — shows error + Retry button in-place.
   * @param path 'quick' skips settings UI and builds; 'customize' opens Course review with outline;
   *             'game' extracts text only; undefined keeps legacy → details without outline.
   */
  const runAnalysis = async (
    file: File,
    path?: UploadPathChoice | 'game',
    settingsOverride?: SavedCourseSettings | null
  ) => {
    clearColdStartCountdown();
    // Leave /upload immediately so welcome tour cannot remount on the progress screen
    setShowWelcomeTour(false);
    dismissWelcomeTourForSession();
    setHomeRoutePath(ROUTES.building);
    navigateTo(ROUTES.building, true);
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
      // Honor Course Settings objective format — do not let AI recommendation overwrite AB/ABC/ABCD choice
      const lockedFmt = (settingsOverride?.objectiveFormat ?? objectiveFormat) as 'AB' | 'ABC' | 'ABCD';
      if (result.objectives?.length) {
        setLearningObjectives(reformatObjectivesClientSide(result.objectives, lockedFmt));
      }

      // Snapshot settings for outline/hydrate (avoid stale React state after setState)
      let outlineCourseType: 'quick' | 'standard' | 'comprehensive' = settingsOverride?.preset ?? preset;
      let outlineInteractions = (settingsOverride?.interactionTypes ?? interactionTypes).filter(
        t => !['sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers', 'quiz'].includes(t)
      );
      let outlineSlideCount = settingsOverride?.slideCount ?? slideCount;
      let outlineIncludeModuleTitles = settingsOverride?.includeModuleTitleSlides ?? includeModuleTitleSlides;
      let outlineIncludeModuleOverviews = settingsOverride?.includeModuleOverviewSlides ?? includeModuleOverviewSlides;
      const outlineIncludeSummarySlides = settingsOverride?.includeSummarySlides ?? includeSummarySlides;
      const outlineExamCfg = settingsOverride?.examConfig ?? examConfig;
      // Explicit array (including []) must win — never re-expand to factory KC types when the user cleared some.
      const outlineQuizActivityTypes = (
        Array.isArray(outlineExamCfg.knowledgeCheckQuestionTypes)
          ? outlineExamCfg.knowledgeCheckQuestionTypes
          : ['sorting', 'matching', 'drop-targets']
      ).filter(t =>
        ['sorting', 'matching', 'drop-targets', 'mc', 'ma', 'tf'].includes(t)
      );

      // Both Build now and Review before build honor saved Course Settings.
      // Do NOT let AI recommendedPreset overwrite interactions, slide count, or KC types —
      // that was wiping carousel / sorting / multimedia choices made in Course Settings.

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
              includeSummarySlides: outlineIncludeSummarySlides,
              gameTemplateIds: undefined,
              includeKnowledgeChecks: true,
              knowledgeCheckMode: outlineExamCfg.knowledgeCheckMode || 'per-module',
              knowledgeCheckCount: outlineExamCfg.knowledgeCheckCount ?? 1,
              quizActivityTypes: outlineQuizActivityTypes,
              objectiveFormat: settingsOverride?.objectiveFormat ?? objectiveFormat,
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
              interactionTypes: outlineInteractions,
            },
            // Leave 55–100% for images + audio in finalize
            (pct) => setProgress(20 + Math.round(pct * 0.35))
          );
          // Apply Course Settings; preview opens after cover — visuals/QC continue in background
          await finalizeGeneratedCourseRef.current(
            {
              ...finalCourse,
              learningObjectives: result.objectives || learningObjectives,
              title: result.title || finalCourse.title,
              description: result.summary || finalCourse.description,
            },
            settingsOverride
          );
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

      // Customize path: open Course review and generate outline for Structure tab
      setSettingsMode('session');
      setIsAnalyzing(false);
      setProgress(0);
      setActiveDraftId(null);
      setIsSandboxMode(false);
      setMobileDesignDemo(false);
      setOutlineDraft(null);
      setOutlineSourceFingerprint(null);
      setStep('details');
      navigateTo(ROUTES.courseReview);
      setIsGeneratingOutline(true);
      setProgress(12);
      const outlineTimer = setInterval(() => {
        setProgress(prev => (prev < 85 ? Math.min(85, prev + 4) : prev));
      }, 400);
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
            includeSummarySlides: outlineIncludeSummarySlides,
            gameTemplateIds: undefined,
            includeKnowledgeChecks: true,
            knowledgeCheckMode: outlineExamCfg.knowledgeCheckMode || 'per-module',
            knowledgeCheckCount: outlineExamCfg.knowledgeCheckCount ?? 1,
            quizActivityTypes: outlineQuizActivityTypes,
            objectiveFormat: settingsOverride?.objectiveFormat ?? objectiveFormat,
          }
        );
        setOutlineDraft(draft);
        setOutlineSourceFingerprint(foundationFingerprint({
          courseTitle: result.title || file.name,
          courseDescription: result.summary || '',
          prompt: result.title || file.name,
          learningObjectives: result.objectives?.length
            ? reformatObjectivesClientSide(result.objectives, lockedFmt)
            : learningObjectives,
          objectiveFormat: lockedFmt,
          includeModuleTitleSlides: outlineIncludeModuleTitles,
          includeModuleOverviewSlides: outlineIncludeModuleOverviews,
          includeSummarySlides: outlineIncludeSummarySlides,
        }));
      } catch (e: any) {
        console.warn('[runAnalysis] Outline generation failed:', e);
        setError(e?.message || 'Could not generate course structure. You can retry from the Course structure tab.');
      } finally {
        clearInterval(outlineTimer);
        setIsGeneratingOutline(false);
        setProgress(0);
      }
    } catch (err: any) {
      clearInterval(analysisTimer);
      console.error('File analysis error:', err);
      const isColdStart = err?.message?.includes('COLD_START') || err?.message?.includes('warming up') || err?.message?.includes('503');
      const isTrialExpiredErr = /TRIAL_EXPIRED|trial has expired/i.test(String(err?.message || ''));
      const isTrialLimitErr = /TRIAL_LIMIT_EXCEEDED|weekly AI generation limit|trial limit/i.test(String(err?.message || ''));
      if (isColdStart) {
        // Friendly warm-up state with auto-retry — not framed as a failure
        startColdStartCountdown();
        return;
      }
      setAnalyzeError(
        isTrialExpiredErr
          ? 'Your trial access period has ended. Contact support@nexcourse.ai to continue.'
          : isTrialLimitErr
            ? 'Weekly AI generation limit reached (this is not your trial end date). Wait for the weekly reset, open a saved draft from Save, or contact support@nexcourse.ai.'
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
    const maxMb = 50;
    if (file.size > maxMb * 1024 * 1024) {
      setAnalyzeError(
        `File is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max upload size is ${maxMb}MB. Compress or split the PDF/PPTX, then try again.`
      );
      setHomeRoutePath(ROUTES.building);
      navigateTo(ROUTES.building, true);
      setIsAnalyzing(true);
      setProgress(80);
      return;
    }
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
    // Capture before clearing — defaults mode means user just reviewed/edited Course Settings mid-upload.
    const cameFromSettings = settingsMode === 'defaults';
    setShowUploadPathModal(false);
    setPendingUploadFile(null);
    setLastUploadPath(choice);
    if (!file) return;
    // Both Build now and Review before build must honor Course Settings
    // (interactions, knowledge-check types, multimedia). Prefer live React state when the
    // user just edited/saved settings so we never regenerate from a stale localStorage/cloud copy.
    let preferLive = cameFromSettings;
    try {
      const savedAt = Number(sessionStorage.getItem('nexcourse.courseSettings.savedAt') || 0);
      if (savedAt && Date.now() - savedAt < 60_000) preferLive = true;
    } catch { /* ignore */ }
    let settingsOverride: SavedCourseSettings;
    if (preferLive) {
      settingsOverride = collectCurrentSettings();
      saveCourseSettings(settingsOverride, user?.id);
      try {
        sessionStorage.setItem('nexcourse.courseSettings.savedAt', String(Date.now()));
      } catch { /* ignore */ }
    } else {
      settingsOverride = resolveCourseSettings(user?.id);
    }
    applySavedSettings(settingsOverride);
    await runAnalysis(file, choice, settingsOverride);
  };

  const cancelUploadPath = () => {
    setShowUploadPathModal(false);
    setPendingUploadFile(null);
    setUploadedFile(null);
  };

  const captureFoundationFingerprint = (override?: Partial<FoundationFingerprintInput>) => {
    setOutlineSourceFingerprint(foundationFingerprint({
      courseTitle: override?.courseTitle ?? courseTitle,
      courseDescription: override?.courseDescription ?? courseDescription,
      prompt: override?.prompt ?? prompt,
      learningObjectives: override?.learningObjectives ?? learningObjectives,
      objectiveFormat: override?.objectiveFormat ?? objectiveFormat,
      includeModuleTitleSlides: override?.includeModuleTitleSlides ?? includeModuleTitleSlides,
      includeModuleOverviewSlides: override?.includeModuleOverviewSlides ?? includeModuleOverviewSlides,
      includeSummarySlides: override?.includeSummarySlides ?? includeSummarySlides,
    }));
  };

  const structureStale = !!outlineDraft && outlineSourceFingerprint != null
    && foundationFingerprint({
      courseTitle,
      courseDescription,
      prompt,
      learningObjectives,
      objectiveFormat,
      includeModuleTitleSlides,
      includeModuleOverviewSlides,
      includeSummarySlides,
    }) !== outlineSourceFingerprint;

  const regenerateOutlineForSettings = async () => {
    setIsGeneratingOutline(true);
    setError(null);
    setProgress(12);
    const timer = setInterval(() => {
      setProgress(prev => (prev < 85 ? Math.min(85, prev + 4) : prev));
    }, 400);
    try {
      const draft = await buildOutlineFromCurrentSettings();
      setOutlineDraft(draft);
      captureFoundationFingerprint();
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || 'Failed to regenerate course structure.');
    } finally {
      clearInterval(timer);
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
    navigateTo(ROUTES.courseReview);
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
          quizActivityTypes: (
            Array.isArray(examConfig.knowledgeCheckQuestionTypes)
              ? examConfig.knowledgeCheckQuestionTypes
              : ['sorting', 'matching', 'drop-targets']
          ).filter(t =>
            ['sorting', 'matching', 'drop-targets', 'mc', 'ma', 'tf'].includes(t)
          ),
          objectiveFormat,
        }
      );
      setOutlineDraft(draft);
      captureFoundationFingerprint();
      if (skipOutlineReview) {
        setProgress(45);
        const settingsSnap = collectCurrentSettings();
        const finalCourse = await hydrateCourseContent(
          draft,
          prompt,
          {
            courseType: settingsSnap.preset,
            scenarioConfig: contentInteractions.includes('scenario') ? scenarioConfig : undefined,
            interactionTypes: contentInteractions,
          },
          (pct) => setProgress(45 + Math.round(pct * 0.1))
        );
        // Preview opens after cover; visuals/QC continue in background
        await finalizeGeneratedCourse(finalCourse, settingsSnap);
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

  /** Apply Course Settings, generate cover, open preview; visuals/QC/TTS continue in background. */
  const finalizeGeneratedCourse = async (
    finalCourse: any,
    settingsOverride?: SavedCourseSettings | null
  ) => {
    // Snapshot from override when provided — React state can still be stale right after
    // applySavedSettings (imageMode / interactions / exam) during quick build.
    const objectiveFormatSnap = (settingsOverride?.objectiveFormat ?? objectiveFormat) as 'AB' | 'ABC' | 'ABCD';
    const examConfigSnap = settingsOverride?.examConfig ?? examConfig;
    const navigationModeSnap = settingsOverride?.navigationMode ?? navigationMode;
    const voiceSnapshot = settingsOverride?.voiceOverEnabled ?? voiceOverEnabled;
    const voiceIdSnapshot = settingsOverride?.ttsVoice ?? ttsVoice;
    const includeModuleTitlesSnapshot = settingsOverride?.includeModuleTitleSlides ?? includeModuleTitleSlides;
    const includeModuleOverviewsSnapshot = settingsOverride?.includeModuleOverviewSlides ?? includeModuleOverviewSlides;
    const modeSnapshot = normalizeImageMode(settingsOverride?.imageMode ?? imageMode);
    const hotspotBackdropSnapshot = settingsOverride?.hotspotGenerateBackdrop ?? hotspotGenerateBackdrop;
    const verticalTabSkinSnap = resolveVerticalTabSkin(settingsOverride?.verticalTabSkin ?? verticalTabSkin);
    const verticalTabColorModeSnap = resolveVerticalTabColorMode(settingsOverride?.verticalTabColorMode ?? verticalTabColorMode);
    const verticalTabUnifyColorSnap = resolveHexColor(settingsOverride?.verticalTabUnifyColor ?? verticalTabUnifyColor, TAB_ACCENT_HEX[0]);
    const verticalTabWellColorSnap = resolveHexColor(settingsOverride?.verticalTabWellColor ?? verticalTabWellColor, BLOCKS_WELL_DEFAULT);
    const processSkinSnap = resolveProcessSkin(settingsOverride?.processSkin ?? processSkin);
    const processShowStepLabelsSnap = resolveProcessStepLabels(
      settingsOverride?.processShowStepLabels ?? processShowStepLabels
    );
    const interactionTypesSnap = settingsOverride?.interactionTypes ?? interactionTypes;

    const rawObjectives = finalCourse.learningObjectives?.length
      ? finalCourse.learningObjectives
      : learningObjectives;
    const formattedObjectives = reformatObjectivesClientSide(
      rawObjectives,
      objectiveFormatSnap
    );
    setLearningObjectives(formattedObjectives);
    const stamped = applyVerticalTabPresentation({
      ...finalCourse,
      examConfig: examConfigSnap,
      navigationMode: navigationModeSnap,
      settings: {
        ...(finalCourse.settings || {}),
        voiceOverEnabled: voiceSnapshot,
        soundEffectsEnabled,
        theme: finalCourse.settings?.theme || 'light',
      },
      learningObjectives: formattedObjectives,
    }, {
      skin: verticalTabSkinSnap,
      colorMode: verticalTabColorModeSnap,
      unifyColor: verticalTabUnifyColorSnap,
      wellColor: verticalTabWellColorSnap,
      processSkin: processSkinSnap,
      processShowStepLabels: processShowStepLabelsSnap,
    });
    setCourse(stamped);
    setOriginalCourse(stamped);
    setSyntheticAudioMap({});
    setExploredBySlide({});
    // Always open a newly generated course on the title/cover slide — never reuse
    // the previous course's last-viewed index (e.g. Key Takeaways before quiz).
    setCurrentSlideIndex(0);
    setHighestVisitedIndex(0);
    setQuizState({});
    setKcCheckedSlideIds(new Set());
    setExamPhase('idle');
    setExamSession({
      questions: [],
      answers: {},
      currentQuestionIdx: 0,
      submitted: false,
      score: null,
      passed: null,
    });
    setActiveTabAudioUrl(null);
    setActiveTabNarrationText(null);
    setActiveTabForImages(null);
    setDragOverTabId(null);
    // Leaving Design phase — unsaved design draft id must not stick to Development
    setActiveDraftId(null);
    setIsSandboxMode(false);
    setMobileDesignDemo(false);
    // Perceived speed: open Course Development after cover (and hydrate).
    // Content visuals, QC, exam await, and TTS continue in the background.

    // Pre-generate mastery quiz in parallel — await it in background so Begin Quiz
    // still uses a ready bank without blocking first preview.
    if (examConfigSnap.enabled) {
      setIsGeneratingExam(true);
      setExamError(null);
      const examCfg = examConfigSnap;
      examGenPromiseRef.current = generateMasteryExam(stamped, examCfg)
        .then((questions) => {
          if (questions?.length) {
            setExamQuestions(questions);
            return questions;
          }
          setExamError('No quiz questions could be generated. You can retry from the Mastery Quiz intro.');
          return [] as ExamQuestion[];
        })
        .catch((err: any) => {
          console.error('[Mastery Quiz] Pre-generation failed:', err);
          setExamError(err?.message || 'Quiz generation failed.');
          return [] as ExamQuestion[];
        });
    } else {
      setExamQuestions([]);
      examGenPromiseRef.current = null;
      setIsGeneratingExam(false);
    }

    const fileSnapshot = uploadedFile;
    // Prefer live ref — generate/hydrate can outlive the render that closed over sourceImages,
    // so a stale [] here would re-run a multi-minute PPTX extract at 56%.
    let imgs =
      sourceImagesRef.current.length > 0 ? sourceImagesRef.current : sourceImages;
    const syntheticOverridesSnapshot = syntheticSlideOverrides;
    const { ai: wantsAi, source: wantsSource } = imageModeFlags(modeSnapshot);
    const wantsHotspotBackdrop =
      hotspotBackdropSnapshot &&
      (interactionTypesSnap || []).includes('hotspot');
    const runImagery = wantsAi || wantsSource || wantsHotspotBackdrop;
    const genToken = ++finalizeBackgroundTokenRef.current;
    const stillActive = () => genToken === finalizeBackgroundTokenRef.current;

    const seedFloatingFromCourse = (c: any) => {
      // Strip bad auto-promoted floats from prior beta; keep author uploads only
      const cleaned = stripCourseAutoPromotedFloating(c);
      const map = floatingMapFromCourse(cleaned);
      setFloatingImagesMap(prev => {
        const next = { ...prev };
        // Drop auto-promoted entries from map too
        for (const [slideId, imgs] of Object.entries(next)) {
          const kept = (imgs || []).filter(f => !String(f.id || '').match(/^(fi-promo-|fi-ai-|fi-src-)/));
          if (kept.length) next[slideId] = kept;
          else delete next[slideId];
        }
        return { ...next, ...map };
      });
      return cleaned;
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

    /** After TTS starts, never replace course wholesale — keep slide + tab voiceOverUrls. */
    const mergeCoursePreservingAudio = (prev: any, next: any) => {
      if (!prev) return next;
      if (!next) return prev;
      const prevById: Record<string, any> = {};
      for (const m of prev.modules || []) {
        for (const s of m.slides || []) {
          if (s?.id) prevById[s.id] = s;
        }
      }
      const mergeTabAudio = (baseList: any[] | undefined, prevList: any[] | undefined) => {
        if (!Array.isArray(baseList)) return baseList;
        if (!Array.isArray(prevList) || !prevList.length) return baseList;
        const prevTabById = new Map(prevList.filter((t: any) => t?.id).map((t: any) => [t.id, t]));
        return baseList.map((item: any) => {
          const fromPrev = item?.id ? prevTabById.get(item.id) : null;
          if (!fromPrev?.voiceOverUrl || item?.voiceOverUrl) return item;
          return { ...item, voiceOverUrl: fromPrev.voiceOverUrl };
        });
      };
      return {
        ...next,
        coverImage: next.coverImage || prev.coverImage,
        modules: (next.modules || []).map((m: any) => ({
          ...m,
          slides: (m.slides || []).map((s: any) => {
            const p = prevById[s.id];
            if (!p) return s;
            const data = s.data || p.data
              ? {
                  ...(s.data || {}),
                  tabs: mergeTabAudio(s.data?.tabs, p.data?.tabs),
                  items: mergeTabAudio(s.data?.items, p.data?.items),
                }
              : s.data;
            return {
              ...s,
              voiceOverUrl: s.voiceOverUrl || p.voiceOverUrl,
              audioUrl: s.audioUrl || p.audioUrl,
              data,
            };
          }),
        })),
      };
    };

    const commitCourse = (next: any) => {
      working = next;
      setCourse(prev => mergeCoursePreservingAudio(prev, next));
      setOriginalCourse(prev => mergeCoursePreservingAudio(prev, next));
    };

    let working: any = stamped;
    let coverUrl: string | null = null;

    // ── Cover only (blocks preview) ──────────────────────────────────
    if (runImagery) {
      setIsGeneratingImages(true);
      setProgress(56);
      try {
        // Prefer early-upload extract (ref/cache). Never re-run a full extract when we
        // already have images — and never block cover/preview > EXTRACT_DEADLINE_MS.
        if (wantsSource && fileSnapshot) {
          if (imgs.length === 0) {
            try {
              const extractPromise = extractImagesFromFile(fileSnapshot, (done, total) => {
                // Stay in the "Adding course visuals" band (56–59) while media extracts
                const pct = 56 + Math.min(3, Math.round((done / Math.max(1, total)) * 3));
                setProgress(pct);
              });
              let timedOut = false;
              imgs = await Promise.race([
                extractPromise,
                new Promise<SourceImage[]>((resolve) => {
                  setTimeout(() => {
                    timedOut = true;
                    // Prefer whatever the upload effect already stored
                    resolve(sourceImagesRef.current.length ? sourceImagesRef.current : []);
                  }, EXTRACT_DEADLINE_MS);
                }),
              ]);
              // If race returned empty due to timeout but extract later fills ref, don't wait —
              // cover phase must proceed. Background extract still updates sourceImages via upload effect.
              if (timedOut) {
                console.warn(
                  `[ImageService] Source extract hit ${EXTRACT_DEADLINE_MS}ms cover deadline — proceeding with ${imgs.length} image(s)`
                );
                if (imgs.length) {
                  setSourceImages(imgs);
                  showDraftMessage(
                    `Using ${imgs.length} image(s) from your upload (extract time-capped so preview can open).`
                  );
                } else {
                  showDraftMessage(
                    'Source image extract is taking too long — continuing without them for now. You can still insert from the gallery later if they finish loading.'
                  );
                }
              } else if (imgs.length) {
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
        }
        setProgress(60);

        if (wantsSource && imgs.length > 0) {
          working = attachSourceImagesToCourse(working, imgs);
          // Prefer the largest extracted image as a temporary title cover until AI cover lands
          if (!coverUrl && !working.coverImage) {
            const best = [...imgs].sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
            if (best?.dataUrl) {
              coverUrl = best.dataUrl;
              working = { ...working, coverImage: coverUrl };
              setCourseBg(coverUrl);
            }
          }
          working = seedFloatingFromCourse(working) || working;
          setCourse(working);
          setOriginalCourse(working);
        }
        setProgress(63);

        if (wantsAi) {
          try {
            const aiCover = await generateCourseCoverImage(working.title || 'Course', working.description);
            coverUrl = aiCover;
            working = { ...working, coverImage: coverUrl };
            setCourseBg(coverUrl);
            setCourse(working);
            setOriginalCourse(working);
            showDraftMessage('AI cover image ready ✓');
          } catch (err: any) {
            console.warn('[ImageService] Cover generation failed, retrying once:', err);
            try {
              await new Promise(r => setTimeout(r, 2000));
              const aiCover = await generateCourseCoverImage(working.title || 'Course', working.description);
              coverUrl = aiCover;
              working = { ...working, coverImage: coverUrl };
              setCourseBg(coverUrl);
              setCourse(working);
              setOriginalCourse(working);
              showDraftMessage('AI cover image ready ✓');
            } catch (err2: any) {
              console.warn('[ImageService] Cover generation failed:', err2);
              if (coverUrl) {
                showDraftMessage('AI cover failed — using an image from your upload on the title slide.');
              } else {
                showDraftMessage(err2?.message || 'Cover image generation failed — hover the title image panel to upload one, or Edit → Generate AI images.');
              }
            }
          }
        } else if (coverUrl) {
          showDraftMessage('Title cover set from your uploaded file (AI Images is off).');
        }
        setProgress(72);
      } catch (err) {
        console.warn('[ImageService] Cover phase failed:', err);
      }
      // Keep isGeneratingImages true while content visuals continue in background
    }

    if (coverUrl) {
      working = { ...working, coverImage: coverUrl };
      setCourseBg(coverUrl);
    } else if (wantsAi) {
      console.warn('[ImageService] AI images enabled but no cover URL after cover phase');
      showDraftMessage('AI cover did not generate — use Edit → Generate AI images or Upload Image on the title slide.');
    } else if (!wantsAi && !wantsSource) {
      showDraftMessage('Multimedia images are off in Course Settings — enable AI Images to generate a cover.');
    }
    working = seedFloatingFromCourse(working) || working;
    setCourse(working);
    setOriginalCourse(working);
    if (coverUrl) {
      const finalCover = coverUrl;
      setCourse((prev: any) => (prev ? { ...prev, coverImage: prev.coverImage || finalCover } : prev));
      setOriginalCourse((prev: any) => (prev ? { ...prev, coverImage: prev.coverImage || finalCover } : prev));
      setCourseBg(finalCover);
    }
    setProgress(100);
    setCurrentSlideIndex(0);
    setHighestVisitedIndex(0);
    setStep('preview');
    navigateTo(ROUTES.courseDevelopment);

    // Cancel any prior course's in-flight TTS immediately before starting the new job
    resetTTS();

    // ── Audio in background (server job + poll; toast shows progress) ─────
    if (voiceSnapshot) {
      const courseForTts = working;
      const voiceForTts = voiceIdSnapshot;
      const ov = syntheticOverridesSnapshot || {};
      const titlesOn = includeModuleTitlesSnapshot;
      const overviewsOn = includeModuleOverviewsSnapshot;
      const syntheticJobs: Array<{ id: string; text: string; title?: string }> = [
        {
          id: '__cover__',
          title: 'Course cover',
          text: (ov['__cover__']?.voiceOverText || `Welcome to ${courseForTts.title}. ${courseForTts.description || ''}`).trim(),
        },
        {
          id: '__player-tour__',
          title: 'Player tour',
          text: (ov['__player-tour__']?.voiceOverText
            || 'Before we begin, take a moment to explore the player controls. Hover over each card to see the corresponding element highlighted in the player preview.').trim(),
        },
        {
          id: '__course-objectives__',
          title: 'Course objectives',
          text: (ov['__course-objectives__']?.voiceOverText
            || ov['__objectives__']?.voiceOverText
            || 'These are the learning objectives for this course. Review each one so you know what you will be able to do when you finish.').trim(),
        },
      ];
      const moduleSynthetics: Array<{ id: string; text: string; title?: string }> = (courseForTts.modules || []).flatMap(
        (m: any, idx: number) => {
          const modNum = idx + 1;
          const ct = (m.title || `Module ${modNum}`).replace(/^Module\s+\d+\s*[\u2014\-]\s*/i, '').trim();
          const items: Array<{ id: string; text: string; title?: string }> = [];
          if (titlesOn) {
            const id = `__module-cover-${modNum}__`;
            items.push({
              id,
              title: `Module ${modNum} title`,
              text: (ov[id]?.voiceOverText
                || `Module ${modNum}: ${ct}.${m.description ? ' ' + m.description : ''}`).trim(),
            });
          }
          if (overviewsOn) {
            const id = `__module-overview-${modNum}__`;
            const fallback = titlesOn
              ? `Let's revisit the objectives for this module.${m.description ? ' ' + m.description : ''}`.trim()
              : `Module ${modNum}: ${ct}. Let's revisit the objectives for this module.${m.description ? ' ' + m.description : ''}`.trim();
            items.push({
              id,
              title: `Module ${modNum} overview`,
              text: (ov[id]?.voiceOverText || fallback).trim(),
            });
          }
          return items;
        }
      );
      const allSynthetic = [...syntheticJobs, ...moduleSynthetics].filter(j => j.text.trim());
      void (async () => {
        try {
          await generateTTS(courseForTts, setCourse, voiceForTts, undefined, {
            synthetic: allSynthetic,
            setSyntheticAudioMap,
          });
        } catch (err) {
          console.warn('[TTS] Narration job failed:', err);
          const { formatTtsErrorForUser } = await import('./services/ttsService');
          showDraftMessage(`${formatTtsErrorForUser(err)} — use Edit → Regenerate all narration to retry.`);
        }
      })();
    } else {
      showDraftMessage('Voice-over is off in Course Settings — enable it and use Edit → Regenerate all narration if you want audio.');
    }

    // ── Content visuals + QC + exam (after preview) ───────────────────
    void (async () => {
      try {
        if (runImagery) {
          try {
            showDraftMessage('Generating content visuals…');
            const { enrichHotspotAndCarouselImages } = await import('./services/imageService');
            let next = await enrichHotspotAndCarouselImages(working, imgs, {
              generateAi: wantsAi || wantsHotspotBackdrop,
              useSource: wantsSource,
              hotspotOnly: !wantsAi && wantsHotspotBackdrop,
            });
            if (coverUrl) next = { ...next, coverImage: coverUrl };
            next = seedFloatingFromCourse(next) || next;
            if (!stillActive()) return;
            commitCourse(next);

            if (wantsAi) {
              next = await generateContentSlideImages(next, (done, total) => {
                if (done === total) showDraftMessage(`Content visuals ready (${total}) ✓`);
              }).then(r => r.course);
              if (coverUrl) next = { ...next, coverImage: coverUrl };
              next = seedFloatingFromCourse(next) || next;
              if (!stillActive()) return;
              commitCourse(next);
            }
          } catch (err) {
            console.warn('[ImageService] Background imagery failed:', err);
          } finally {
            if (stillActive()) setIsGeneratingImages(false);
          }
        }

        if (!stillActive()) return;

        try {
          setIsRunningQC(true);
          setQcPhase('structural');
          showDraftMessage('Running quality check…');
          const report = await runFullQC(working, voiceSnapshot, (phase) => {
            if (stillActive()) setQcPhase(phase);
          });
          if (!stillActive()) return;
          setQcReport(report);
          if (report.issues.some(i => i.autoFixable)) {
            const { course: fixedCourse } = autoFixCourse(working, report);
            const merged = mergeImageryInto(fixedCourse, working, coverUrl);
            const seeded = seedFloatingFromCourse(merged) || merged;
            if (!stillActive()) return;
            commitCourse(seeded);
          }
          showDraftMessage('Quality check ready ✓');
        } catch {
          // QC failure is non-fatal
        } finally {
          if (stillActive()) {
            setIsRunningQC(false);
            setQcPhase(null);
          }
        }

        if (!stillActive()) return;

        try {
          const diagramSlides = (working.modules || []).flatMap((m: any) =>
            (m.slides || []).filter((s: any) => s.type === 'diagram' && s.data?.mermaidCode)
          );
          if (diagramSlides.length) {
            const mermaid = (await import('mermaid')).default;
            mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'loose' });
            for (const s of diagramSlides.slice(0, 8)) {
              try {
                await mermaid.render(`prewarm-${s.id}-${Date.now()}`, String(s.data.mermaidCode));
              } catch { /* non-fatal */ }
            }
          }
        } catch { /* mermaid optional */ }

        if (examGenPromiseRef.current) {
          try {
            const qs = await examGenPromiseRef.current;
            if (qs?.length && stillActive()) {
              commitCourse({ ...working, examQuestions: qs });
            }
          } catch (e) {
            console.warn('[Mastery Quiz] Await pre-generation failed:', e);
          } finally {
            if (stillActive()) {
              setIsGeneratingExam(false);
              examGenPromiseRef.current = null;
            }
          }
        }
      } finally {
        if (stillActive()) {
          setIsGeneratingImages(false);
          setIsRunningQC(false);
          setQcPhase(null);
        }
      }
    })();
  };

  finalizeGeneratedCourseRef.current = finalizeGeneratedCourse;

  /** Regenerate a blank/empty slide in-place from the course topic. */
  const regenerateBlankSlide = async (slide: Slide) => {
    if (!course || !slide?.id) return;
    setRegeneratingSlideId(slide.id);
    try {
      const targetType = normalizeRegenSlideType(slide);
      const isTakeaway = slide.type === 'key-takeaways' || /key\s*takeaway/i.test(slide.title || '');
      try {
        const result = await regenerateSlideData(
          slide,
          course.title ?? '',
          isTakeaway ? 'content' : targetType
        );
        pushUndo();
        setCourse(prev => {
          if (!prev) return prev;
          const cloned = JSON.parse(JSON.stringify(prev));
          for (const mod of cloned.modules) {
            const idx = mod.slides.findIndex((s: any) => s.id === slide.id);
            if (idx >= 0) {
              mod.slides[idx] = {
                ...mod.slides[idx],
                type: isTakeaway ? 'key-takeaways' : result.type,
                content: result.content ?? mod.slides[idx].content,
                voiceOverText: result.voiceOverText || mod.slides[idx].voiceOverText,
                narration: result.voiceOverText || mod.slides[idx].narration,
                data: result.data !== undefined
                  ? (isTakeaway && !result.data
                      ? {
                          objectives: [
                            { id: '1', label: `Review ${slide.title}`, content: '' },
                            { id: '2', label: 'Apply the core module practices', content: '' },
                            { id: '3', label: 'Confirm understanding before moving on', content: '' },
                            { id: '4', label: 'Follow up with next steps', content: '' },
                          ],
                        }
                      : result.data)
                  : mod.slides[idx].data,
              };
              break;
            }
          }
          return cloned;
        });
        showDraftMessage('Slide regenerated ✓');
      } catch (err: any) {
        console.warn('[regenerateBlankSlide] AI failed, using title-derived fallback', err);
        const fetchHint = /failed to fetch|API error: 5/i.test(String(err?.message || ''))
          ? ' (API unreachable — often a cold start; try again in ~30s)'
          : '';
        showDraftMessage(`Regenerate failed${fetchHint}. Using a placeholder — edit or retry.`);
        pushUndo();
        setCourse(prev => {
          if (!prev) return prev;
          const cloned = JSON.parse(JSON.stringify(prev));
          for (const mod of cloned.modules) {
            const idx = mod.slides.findIndex((s: any) => s.id === slide.id);
            if (idx >= 0) {
              mod.slides[idx] = {
                ...mod.slides[idx],
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
                  : mod.slides[idx].data,
              };
              break;
            }
          }
          return cloned;
        });
      }
    } finally {
      setRegeneratingSlideId(null);
    }
  };

  /** Open Edit Slide drawer on Regenerate tab with intended type preselected. */
  const openRegenerateSlideDrawer = (slide?: Slide | null) => {
    const s = slide || currentSlide;
    if (!s) return;
    const normalized = normalizeRegenSlideType(s);
    editingSlideRef.current = s;
    setEditingSlide(s);
    setEditDrawerOpen(true);
    setEditDrawerTab('regenerate');
    setRegenTargetType(normalized);
    setRegenNoInteraction(normalized === 'content' || s.type === 'summary' || s.type === 'key-takeaways');
  };

  const isSyntheticSlideId = (id?: string | null) =>
    typeof id === 'string' && id.startsWith('__') && id.endsWith('__');

  /** Jobs for injected slides (cover / tour / objectives / module title+overview) currently in the player. */
  const collectSyntheticNarrationJobs = (slides: Slide[] = allSlides): Array<{ id: string; text: string }> =>
    slides
      .filter(s => isSyntheticSlideId(s?.id) && !['__closing__', '__exam-intro__', '__mastery-exam__', '__exam-results__'].includes(String(s.id)))
      .map(s => ({
        id: String(s.id),
        text: String(s.voiceOverText || s.narration || '').trim(),
      }))
      .filter(j => j.text.length > 0);

  /** Rebuild TTS for narratable slides + synthetic cover/objectives/module audio.
   *  If some clips already exist (e.g. after a Failed-to-fetch mid-run), only fill gaps
   *  so finished audio is not wiped or re-billed. */
  const regenerateAllNarration = async () => {
    if (!course?.modules) return;
    if (ttsProgress.isRunning) {
      showDraftMessage('Narration is already generating…');
      return;
    }
    setShowEditMenu(false);
    let existingClips = 0;
    for (const m of course.modules || []) {
      for (const s of m.slides || []) {
        if (s?.voiceOverUrl) existingClips += 1;
        for (const key of ['tabs', 'items'] as const) {
          for (const t of s?.data?.[key] || []) {
            if (t?.voiceOverUrl) existingClips += 1;
          }
        }
      }
    }
    existingClips += Object.keys(syntheticAudioMap || {}).length;
    const onlyMissing = existingClips > 0;
    showDraftMessage(onlyMissing ? 'Resuming missing narration…' : 'Regenerating all narration…');
    try {
      const syntheticJobs = collectSyntheticNarrationJobs(allSlides)
        .filter(j => !(onlyMissing && syntheticAudioMap[j.id]))
        .map(j => ({
          ...j,
          title: j.id,
        }));
      await generateTTS(course, setCourse, ttsVoice, undefined, {
        onlyMissing,
        synthetic: syntheticJobs,
        setSyntheticAudioMap,
      });
      setVoiceOverEnabled(true);
      showDraftMessage(
        onlyMissing
          ? 'Missing narration filled in. Save the draft to keep audio for next time.'
          : syntheticJobs.length > 0
            ? 'All narration regenerated (content + system slides). Save the draft to keep audio for next time.'
            : 'Content narration regenerated. No system-slide narration text was found — check Edit → Audio on module title/overview slides.'
      );
    } catch (err: any) {
      console.error('[TTS] Regenerate all failed:', err);
      const { formatTtsErrorForUser } = await import('./services/ttsService');
      showDraftMessage(formatTtsErrorForUser(err) || 'Failed to regenerate narration.');
    }
  };

  /** Strip slide imageUrl / coverImage / nested tab images (keeps course cover optional). */
  const clearCourseImages = () => {
    if (!course?.modules) return;
    if (!window.confirm('Remove images from all slides? (Course cover is kept. You can re-add via Upload or regenerate AI images later.)')) {
      return;
    }
    setShowEditMenu(false);
    pushUndo();
    setCourse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: (prev.modules || []).map((m: any) => ({
          ...m,
          slides: (m.slides || []).map((s: any) => {
            const next = { ...s };
            delete next.imageUrl;
            delete next.coverImage;
            if (next.data && typeof next.data === 'object') {
              const data = { ...next.data };
              delete data.imageUrl;
              delete data.introImageUrl;
              for (const key of ['tabs', 'items', 'cards'] as const) {
                if (!Array.isArray(data[key])) continue;
                data[key] = data[key].map((item: any) => {
                  if (!item || typeof item !== 'object') return item;
                  const copy = { ...item };
                  delete copy.imageUrl;
                  return copy;
                });
              }
              next.data = data;
            }
            return next;
          }),
        })),
      };
    });
    setFloatingImagesMap({});
    showDraftMessage('Slide images cleared. Save the draft when ready.');
  };

  /** Re-run AI content slide images for slides that lack imageUrl. */
  const regenerateAiImages = async () => {
    if (!course?.modules) return;
    setShowEditMenu(false);
    setIsGeneratingImages(true);
    showDraftMessage('Generating AI images for slides without visuals…');
    try {
      const { generateContentSlideImages, generateCourseCoverImage } = await import('./services/imageService');
      let working: any = course;
      let coverMade = false;
      if (!working.coverImage) {
        try {
          const cover = await generateCourseCoverImage(working.title || 'Course', working.description || '');
          if (cover) {
            coverMade = true;
            working = { ...working, coverImage: cover };
            setCourse(working);
            setCourseBg(cover);
          }
        } catch (e) {
          console.warn('[Images] Cover regen failed', e);
        }
      }
      const { course: withImages, jobsAttempted } = await generateContentSlideImages(working, (done, total) => {
        showDraftMessage(`Generating AI images… ${done}/${total}`);
      });
      working = stripCourseAutoPromotedFloating(withImages);
      setFloatingImagesMap(floatingMapFromCourse(working));
      setCourse(working);
      if (!coverMade && jobsAttempted === 0) {
        showDraftMessage(
          'No eligible slides for AI images. Objectives, overviews, and quizzes are skipped — only content/tabs that still need visuals are filled. Use Upload Image for a specific slide.'
        );
      } else {
        const parts = [
          coverMade ? 'cover updated' : null,
          jobsAttempted > 0 ? `${jobsAttempted} content visual${jobsAttempted === 1 ? '' : 's'}` : null,
        ].filter(Boolean);
        showDraftMessage(
          parts.length
            ? `AI images updated (${parts.join(', ')}). Save the draft to keep them.`
            : 'AI images updated. Save the draft to keep them.'
        );
      }
    } catch (err: any) {
      console.error('[Images] Regen failed:', err);
      showDraftMessage(err?.message || 'Failed to regenerate AI images.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const hydrateCourse = async () => {
    setIsHydrating(true);
    setProgress(10);
    try {
      // Snapshot live Course Settings so multimedia / VO aren't stale vs React batching.
      const settingsSnap = collectCurrentSettings();
      const contentInteractions = (settingsSnap.interactionTypes || []).filter(
        t => !['sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers', 'quiz'].includes(t)
      );
      const finalCourse = await hydrateCourseContent(
        outlineDraft!,
        prompt,
        {
          courseType: settingsSnap.preset,
          scenarioConfig: contentInteractions.includes('scenario') ? scenarioConfig : undefined,
          interactionTypes: contentInteractions,
        },
        // Leave 55–100% for images + audio in finalize
        (pct) => setProgress(Math.round(pct * 0.55))
      );
      await finalizeGeneratedCourse(finalCourse, settingsSnap);
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
    setCourse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: (prev.modules || []).map((mod: any) => ({
          ...mod,
          slides: (mod.slides || []).map((s: any) =>
            s.id === slideId ? { ...s, ...updates } : s
          ),
        })),
      };
    });
  };

  /** Keep floatingImagesMap and course.floatingMedia in sync (drafts / SCORM). */
  const syncFloatingImages = (slideId: string, imgs: FloatingImage[]) => {
    if (!slideId) return;
    setFloatingImagesMap(prev => ({ ...prev, [slideId]: imgs }));
    handleUpdateSlideMedia(slideId, { floatingMedia: imgs });
  };

  const promoteInFlowToFloat = (
    info: { src: string; x: number; y: number; width: number; height: number },
    tabId: string | null,
    clear: (slide: any) => any
  ) => {
    if (!currentSlide?.id) return;
    const slideId = currentSlide.id;
    const w = Number.isFinite(info.width) && info.width > 32 ? info.width : 240;
    const h = Number.isFinite(info.height) && info.height > 32 ? info.height : 180;
    const newImg: FloatingImage = {
      id: `fi-${Date.now()}`,
      url: info.src,
      x: Number.isFinite(info.x) ? info.x : 40,
      y: Number.isFinite(info.y) ? info.y : 40,
      width: w,
      height: h,
      tabId,
    };
    pushUndo();
    setFloatingImagesMap(prev => ({ ...prev, [slideId]: [...(prev[slideId] || []), newImg] }));
    setCourse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: (prev.modules || []).map((mod: any) => ({
          ...mod,
          slides: (mod.slides || []).map((s: any) => {
            if (s.id !== slideId) return s;
            return clear({ ...s, floatingMedia: [...(s.floatingMedia || []), newImg] });
          }),
        })),
      };
    });
  };

  const pinFloatBackToFlow = (img: FloatingImage) => {
    if (!currentSlide?.id) return;
    const slideId = currentSlide.id;
    pushUndo();
    const next = (floatingImagesMap[slideId] || []).filter(i => i.id !== img.id);
    setFloatingImagesMap(prev => ({ ...prev, [slideId]: next }));
    setCourse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: (prev.modules || []).map((mod: any) => ({
          ...mod,
          slides: (mod.slides || []).map((s: any) => {
            if (s.id !== slideId) return s;
            const floatingMedia = (s.floatingMedia || []).filter((i: FloatingImage) => i.id !== img.id);
            if (img.tabId === '__intro__') {
              return { ...s, floatingMedia, data: { ...s.data, introImageUrl: img.url } };
            }
            if (img.tabId) {
              const key = s.data?.tabs ? 'tabs' : 'items';
              return {
                ...s,
                floatingMedia,
                data: {
                  ...s.data,
                  [key]: (s.data?.[key] || []).map((t: any) =>
                    t.id === img.tabId ? { ...t, imageUrl: img.url } : t
                  ),
                },
              };
            }
            return { ...s, floatingMedia, imageUrl: img.url };
          }),
        })),
      };
    });
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

  const renderCoursePrepPage = (compactMobile = false) => (
    settingsMode === 'defaults' ? (
      <CourseSettingsPage
        mode="defaults"
        isSandboxMode={isSandboxMode}
        compactMobile={compactMobile}
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
        onFormatChange={(fmt) => setObjectiveFormat(fmt)}
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
        subscriptionPlan={userPlan}
        imageMode={imageMode}
        setImageMode={setImageMode}
        hotspotGenerateBackdrop={hotspotGenerateBackdrop}
        setHotspotGenerateBackdrop={setHotspotGenerateBackdrop}
        verticalTabSkin={verticalTabSkin}
        setVerticalTabSkin={setVerticalTabSkin}
        verticalTabColorMode={verticalTabColorMode}
        setVerticalTabColorMode={setVerticalTabColorMode}
        verticalTabUnifyColor={verticalTabUnifyColor}
        setVerticalTabUnifyColor={setVerticalTabUnifyColor}
        verticalTabWellColor={verticalTabWellColor}
        setVerticalTabWellColor={setVerticalTabWellColor}
        processSkin={processSkin}
        setProcessSkin={setProcessSkin}
        processShowStepLabels={processShowStepLabels}
        setProcessShowStepLabels={setProcessShowStepLabels}
        previewingVoice={previewingVoice}
        onPreviewVoice={previewVoice}
        outlineDraft={outlineDraft}
        onOutlineChange={setOutlineDraft}
        onRegenerateOutline={regenerateOutlineForSettings}
        onBack={backFromCourseSettings}
        onReplaceDocument={(e) => { if (e.target.files?.[0]) handleFileUpload(e); }}
        onSaveSettings={persistCourseSettings}
        onGenerateCourse={handleGenerateCourseFromSettings}
        onOpenPlayerProperties={openPlayerPropertiesModal}
        onSaveDesignDraft={handleSaveDesignDraft}
        designDraftSavedFlash={designDraftSavedFlash}
        settingsSavedFlash={settingsSavedFlash}
      />
    ) : (
      <CourseReviewPage
        compactMobile={compactMobile}
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
        onFormatChange={handleFormatChange}
        onSuggestObjectives={handleSuggestObjectives}
        includeModuleTitleSlides={includeModuleTitleSlides}
        setIncludeModuleTitleSlides={setIncludeModuleTitleSlides}
        includeModuleOverviewSlides={includeModuleOverviewSlides}
        setIncludeModuleOverviewSlides={setIncludeModuleOverviewSlides}
        includeSummarySlides={includeSummarySlides}
        setIncludeSummarySlides={setIncludeSummarySlides}
        outlineDraft={outlineDraft}
        onOutlineChange={setOutlineDraft}
        onRegenerateOutline={regenerateOutlineForSettings}
        structureStale={structureStale}
        interactionTypes={interactionTypes}
        onBack={backFromCourseSettings}
        onReplaceDocument={(e) => { if (e.target.files?.[0]) handleFileUpload(e); }}
        onGenerateCourse={handleGenerateCourseFromSettings}
        onOpenPlayerProperties={openPlayerPropertiesModal}
        onSaveDesignDraft={handleSaveDesignDraft}
        designDraftSavedFlash={designDraftSavedFlash}
      />
    )
  );

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

  // Password-reset email must show set-password UI before marketing/home routing.
  // Also honor /reset-password path directly (PKCE often drops ?reset=true).
  const onResetPasswordPath =
    typeof window !== 'undefined'
    && (window.location.pathname.replace(/\/+$/, '') || '/') === '/reset-password';
  if (!isScormPlayer && (passwordRecovery || onResetPasswordPath)) {
    if (!user) {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const stillExchanging =
        hash.includes('access_token') ||
        hash.includes('type=recovery') ||
        /[?&]code=/.test(search) ||
        /[?&]token_hash=/.test(search);
      if (stillExchanging) {
        return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm font-medium">Confirming reset link…</p>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6 text-center space-y-4">
            <p className="text-lg font-extrabold text-white">Reset link expired or invalid</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Request a new password reset from the sign-in page, then open the latest email link.
              If this keeps happening, add <span className="text-slate-300">https://nexcourse.ai/reset-password</span> under Supabase Auth → Redirect URLs.
            </p>
            <button
              type="button"
              onClick={() => {
                clearPasswordRecovery();
                setPublicView('auth');
                setAuthInitialMode('login');
                navigateTo(ROUTES.login);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      );
    }
    return (
      <ResetPasswordPage
        onComplete={() => {
          clearPasswordRecovery();
          setStep('home');
          navigateTo(ROUTES.upload);
        }}
      />
    );
  }

  // Marketing / auth pages — also shown to signed-in users on the landing URL (/)
  if (!isScormPlayer && (!user || step === 'marketing')) {
    const enterApp = () => {
      setStep('home');
      navigateTo(ROUTES.upload);
    };
    const goMarketing = () => {
      setPublicView('homepage');
      if (user) setStep('marketing');
      navigateTo(ROUTES.home);
    };

    if (!user && publicView === 'auth') {
      return (
        <AuthPage
          onBackToHome={goMarketing}
          initialMode={authInitialMode}
        />
      );
    }
    if (publicView === 'methodology') {
      return (
        <MethodologyPage
          onGetStarted={user ? enterApp : () => { setAuthInitialMode('signup'); setPublicView('auth'); navigateTo(ROUTES.signup); }}
          onBack={goMarketing}
        />
      );
    }
    if (publicView === 'pricing') {
      return (
        <div className="min-h-screen bg-slate-950">
          <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <button onClick={goMarketing}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="font-extrabold text-lg text-white">NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span></span>
              </div>
              <button onClick={user ? enterApp : () => { setAuthInitialMode('signup'); setPublicView('auth'); navigateTo(ROUTES.signup); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap shrink-0">
                {user ? 'Go to App' : 'Get Started'} <ArrowRight className="w-4 h-4" />
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
          onBack={goMarketing}
          onGetStarted={user ? enterApp : () => { setAuthInitialMode('signup'); setPublicView('auth'); navigateTo(ROUTES.signup); }}
        />
      );
    }
    return (
      <MarketingHomepage
        onGetStarted={user ? enterApp : () => { setAuthInitialMode('signup'); setPublicView('auth'); navigateTo(ROUTES.signup); }}
        onSignIn={user ? enterApp : () => { setAuthInitialMode('login'); setPublicView('auth'); navigateTo(ROUTES.login); }}
        onMethodology={() => { setPublicView('methodology'); if (user) setStep('marketing'); navigateTo(ROUTES.methodology); }}
        onViewPricing={() => { setPublicView('pricing'); if (user) setStep('marketing'); navigateTo(ROUTES.pricing); window.scrollTo(0, 0); }}
        onExamples={() => { setPublicView('examples'); if (user) setStep('marketing'); navigateTo(ROUTES.examples); }}
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
          owns the full viewport height. */}
      {step !== 'preview' && !mobileDesignDemo && (
      <header className="relative z-[600] border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3 relative group cursor-pointer"
            onClick={goToMarketingHome}
            title="NexCourse AI home"
            role="link"
          >
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
                        applySavedSettings(resolveCourseSettings(user?.id));
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
                        setShowViewDraftsModal(true);
                        setIsSyncingDrafts(true);
                        void (async () => {
                          try {
                            const report = await draftManager.refreshDrafts();
                            if (report.migrated > 0 && report.failed === 0) {
                              showDraftMessage(
                                `Synced ${report.migrated} draft${report.migrated === 1 ? '' : 's'} to your account — open View Drafts on your iPhone to see them.`
                              );
                            } else if (report.failed > 0) {
                              showDraftMessage(
                                `Cloud sync issue: ${report.errors[0] || `${report.failed} draft(s) failed`}. Local drafts: ${report.localCount}, cloud: ${report.cloudCount}.`
                              );
                            } else if (report.cloudCount > 0) {
                              showDraftMessage(
                                `Account has ${report.cloudCount} draft${report.cloudCount === 1 ? '' : 's'} ready on other devices.`
                              );
                            } else if (report.localCount > 0) {
                              showDraftMessage(
                                `Found ${report.localCount} draft(s) on this device but none in the cloud yet. Tap Sync in View Drafts, or re-save the draft.`
                              );
                            } else {
                              showDraftMessage('No drafts found on this device yet.');
                            }
                          } finally {
                            setIsSyncingDrafts(false);
                          }
                        })();
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
        {/* Do NOT use mode="wait" here: modals + drafts panel are siblings of step pages.
            mode=wait + unkeyed siblings flooded console with empty key "" + multiple-children
            warnings on every setProgress during Building, thrashing the main thread. */}
        <AnimatePresence>
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
              <PaymentSuccessPage
                userId={user?.id}
                onContinue={() => {
                  setStep('account');
                  navigateTo(ROUTES.myAccount);
                }}
              />
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
            <div key="qc-publish-warning" className="fixed inset-0 z-[900] flex items-center justify-center p-4">
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
            key="app-image-picker"
            isOpen={showAppImagePicker}
            onClose={() => setShowAppImagePicker(false)}
            theme={theme}
            onInsert={(url) => {
              if (!currentSlide) return;
              pushUndo();
              syncFloatingImages(currentSlide.id, [
                ...(floatingImagesMap[currentSlide.id] || []),
                { id: `fi-lib-${Date.now()}`, url, x: 40, y: 40, width: 320, height: 240, tabId: activeTabForImages || null },
              ]);
            }}
          />

          {/* AI Edit Drawer — scenario and game-template slides */}
          <AnimatePresence>
            {showAIEditDrawer && currentSlide && (['scenario', 'game-template', 'knowledge-check', 'mastery-exam', 'quiz', 'multiple-choice', 'multiple-answers', 'true-false', 'matching', 'sorting', 'drop-targets'].includes(currentSlide.type)) && (
              <AIEditDrawer
                key="ai-edit-drawer"
                slideType={
                  currentSlide.type === 'scenario' || currentSlide.type === 'game-template' || currentSlide.type === 'mastery-exam'
                    ? currentSlide.type
                    : 'knowledge-check'
                }
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

          {/* Draft Courses Panel - Pro feature (skip while Building — avoids presence key thrash) */}
          {course && !isGenerating && (
            <DraftCoursesPanel
              key="draft-courses-panel"
              isOpen={showDraftsPanel}
              onClose={() => setShowDraftsPanel(false)}
              theme={theme}
              drafts={draftManager.drafts}
              slotsUsed={draftManager.slotsUsed}
              slotsTotal={draftManager.slotsTotal}
              canSave={draftManager.canSave}
              isAuthenticated={!!user}
              currentCourseTitle={course?.title}
              activeDraftId={activeDraftId}
              isSaving={isSavingDraft}
              onSave={handleSaveDraft}
              onUpdateCurrent={activeDraftId ? () => { void handleUpdateActiveDraft(); } : undefined}
              onLoad={handleLoadDraft}
              onDelete={(id) => { void draftManager.deleteDraft(id); }}
              onReplace={(id) => { void handleReplaceDraft(id); }}
              onRename={async (id, title) => {
                const result = await draftManager.renameDraft(id, title);
                showDraftMessage(result.message);
              }}
              saveMessage={draftSaveMessage}
            />
          )}

          <ViewDraftsModal
            key="view-drafts-modal"
            isOpen={showViewDraftsModal}
            onClose={() => setShowViewDraftsModal(false)}
            drafts={draftManager.drafts}
            isReady={draftManager.isReady}
            cloudEnabled={draftManager.cloudEnabled}
            slotsUsed={draftManager.slotsUsed}
            slotsTotal={draftManager.slotsTotal}
            onRefresh={async () => {
              setIsSyncingDrafts(true);
              try {
                const report = await draftManager.refreshDrafts();
                if (report.migrated > 0 && report.failed === 0) {
                  showDraftMessage(
                    `Synced ${report.migrated} draft${report.migrated === 1 ? '' : 's'} — they should now appear on your iPhone after refresh.`
                  );
                } else if (report.failed > 0) {
                  showDraftMessage(
                    `Sync problem: ${report.errors[0] || 'upload failed'}`
                  );
                } else if (report.cloudCount > 0) {
                  showDraftMessage(`Up to date — ${report.cloudCount} draft(s) on your account.`);
                } else {
                  showDraftMessage(
                    report.localCount > 0
                      ? 'Drafts are on this device only — re-save a draft, then Sync again.'
                      : 'No drafts to sync yet.'
                  );
                }
              } finally {
                setIsSyncingDrafts(false);
              }
            }}
            onLoad={handleLoadDraft}
            onDelete={(id) => { void draftManager.deleteDraft(id); }}
            onRename={async (id, title) => {
              const result = await draftManager.renameDraft(id, title);
              showDraftMessage(result.message);
            }}
          />

          <DraftsSyncOverlay active={isSyncingDrafts} />

          <DraftOpeningOverlay
            key="draft-opening-overlay"
            active={isLoadingDraft}
            progress={draftLoadProgress}
            statusText={draftLoadStatus}
          />

          {/* QC Track Changes Modal — overlays preview, persists across open/close */}
          <QCTrackChangesModal
            key="qc-track-changes"
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
            onGoToSlide={(moduleIndex, slideIndex, field) => {
              const slideId = course?.modules?.[moduleIndex]?.slides?.[slideIndex]?.id;
              let targetSlide: any = null;
              if (slideId) {
                const idx = allSlides.findIndex(s => s.id === slideId);
                if (idx >= 0) {
                  setCurrentSlideIndex(idx);
                  targetSlide = allSlides[idx];
                }
              }
              if (!targetSlide && course?.modules) {
                let globalIdx = PRE_CONTENT;
                for (let m = 0; m < moduleIndex; m++) {
                  globalIdx += (includeModuleTitleSlides ? 1 : 0) + (includeModuleOverviewSlides ? 1 : 0);
                  globalIdx += course.modules[m]?.slides?.length ?? 0;
                }
                globalIdx += (includeModuleTitleSlides ? 1 : 0) + (includeModuleOverviewSlides ? 1 : 0);
                globalIdx += slideIndex;
                const idx = Math.min(globalIdx, allSlides.length - 1);
                setCurrentSlideIndex(idx);
                targetSlide = allSlides[idx];
              }
              setQcModalOpen(false);
              setQcFocusSlideId(null);
              if (targetSlide) {
                const f = String(field || '').toLowerCase();
                const openAudio = /voiceover|narration|audio/.test(f);
                editingSlideRef.current = {
                  ...targetSlide,
                  _objectives: targetSlide.id === '__course-objectives__'
                    ? JSON.parse(JSON.stringify(learningObjectives || []))
                    : (targetSlide as any)._objectives,
                };
                setEditingSlide(editingSlideRef.current);
                setEditDrawerTab(openAudio ? 'audio' : 'text');
                showDraftMessage(
                  openAudio
                    ? 'Opened Audio editor — check Narration script for this finding.'
                    : 'Opened Edit Text — look for the highlighted finding on this slide.'
                );
              }
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
                const result = await regenerateSlideData(slide, course.title ?? '', normalizeRegenSlideType(slide));
                const cloned = JSON.parse(JSON.stringify(course));
                const target = cloned.modules[moduleIndex].slides[slideIndex];
                target.type = result.type;
                if (result.data !== undefined) target.data = result.data;
                if (result.content != null) target.content = result.content;
                if (result.voiceOverText) {
                  target.voiceOverText = result.voiceOverText;
                  target.narration = result.voiceOverText;
                }
                pushUndo(); setCourse(cloned);
                setQcReport(prev => prev ? {
                  ...prev,
                  issues: prev.issues.filter(i =>
                    !(i.slideId === slideId && (i.type === 'interaction_empty' || i.fixActions?.includes('regenerate')))
                  ),
                  totalIssues: Math.max(0, prev.totalIssues - 1),
                  errors: Math.max(0, prev.errors - 1),
                } : null);
                showDraftMessage('Slide regenerated ✓');
              } catch (err: any) {
                console.error('[QC] Regeneration failed:', err);
                showDraftMessage(err?.message || 'Regeneration failed. Please try again.');
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
            onApply={(confirmedIds, options) => {
              if (course && qcReport) {
                const fixed = applyConfirmedFixes(course, confirmedIds, qcReport);
                pushUndo(); setCourse(fixed);
              }
              const dismissRemaining = !!options?.dismissRemaining;
              const applied = new Set(confirmedIds);

              if (dismissRemaining) {
                // Legacy: clear report + confirmation state and close (pending discarded)
                setQcReport(null);
                setQcConfirmed(new Set());
                setQcDeclined(new Set());
                setQcModalOpen(false);
                return;
              }

              // Keep pending + declined; remove only the applied issues
              const remaining = (qcReport?.issues ?? []).filter(i => !applied.has(i.id));
              if (remaining.length === 0) {
                setQcReport(null);
                setQcConfirmed(new Set());
                setQcDeclined(new Set());
                setQcModalOpen(false);
                return;
              }
              setQcReport(prev => prev ? {
                ...prev,
                issues: remaining,
                totalIssues: remaining.length,
                errors: remaining.filter(i => i.severity === 'error').length,
                warnings: remaining.filter(i => i.severity === 'warning').length,
                info: remaining.filter(i => i.severity === 'info').length,
              } : null);
              setQcConfirmed(new Set());
              const remainingIds = new Set(remaining.map(i => i.id));
              setQcDeclined(prev => {
                const next = new Set<string>();
                prev.forEach(id => { if (remainingIds.has(id)) next.add(id); });
                return next;
              });
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
                               const override = resolveCourseSettings(user?.id);
                               applySavedSettings(override);
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
                      {renderCoursePrepPage(true)}
                    </LandscapePhoneFrame>
                  </div>
                </>
              ) : (
              <>
              {pendingUploadFile && settingsMode === 'defaults' && (
                <div className="max-w-5xl mx-auto px-6 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-4 py-3 text-sm">
                    <p className="text-slate-300">
                      Upload waiting: <strong className="text-white">{pendingUploadFile.name}</strong>. Adjust Course Settings, then continue your build choice.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('home');
                        navigateTo(ROUTES.upload);
                        setShowUploadPathModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                    >
                      Back to build choices
                    </button>
                  </div>
                </div>
              )}
              {renderCoursePrepPage(false)}
              </>
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
               allowedInteractionTypes={interactionTypes}
             />
          )}

          {step === 'preview' && course && (
            // top-0 (not top-20) -- the global header is hidden during preview (see above),
            // so the player now owns the full viewport height.
            <motion.div
              key="preview"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-0 left-0 right-0 bottom-0 z-50"
            >
              {/* Phone portrait: rotate prompt. Landscape phones: scale-to-fit.
                  Desktop web: flex-fill, or scale-up when the stage is larger than the
                  design (HDMI). Tour opens after landscape on phones. */}
              <div
                className="bg-slate-900 overflow-hidden flex flex-col"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              >
              {needsLandscapeForPreview && (
                <div className="absolute inset-0 z-[900] flex flex-col items-center justify-center gap-4 bg-slate-950 px-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-indigo-300 rotate-90" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h2 className="text-white font-black text-xl tracking-tight">Rotate to landscape</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Course preview works best in a wide handheld view. Turn your phone sideways to continue — other app pages still work in portrait.
                    </p>
                  </div>
                    <button
                    type="button"
                    onClick={() => requestLeavePreview(goHome)}
                    className="mt-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-600/60"
                  >
                    Back
                  </button>
                </div>
              )}
              {/* ── Preview Top Bar — hidden in SCORM/published view ── */}
              {!isScormPlayer && <div className={cn('px-3 bg-slate-900 border-b border-slate-800 shrink-0', isPhoneViewport && 'px-2')}>
                <div className={cn('h-11 flex items-center justify-between gap-2', isPhoneViewport && 'h-9 gap-1')}>
                  {/* Left: back + title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => requestLeavePreview(goHome)} className="p-1.5 -ml-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="text-white font-bold text-sm truncate max-w-[220px]">
                        {isSandboxMode ? 'Demo Course' : course.title}
                      </h1>
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">Dev</span>
                    </div>
                  </div>

                  {/* Background work after early preview */}
                  {isGeneratingImages && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block" />
                      Generating visuals…
                    </div>
                  )}
                  {isRunningQC && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block" />
                      Quality check…
                    </div>
                  )}
                  {isGeneratingExam && examQuestions.length === 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-900/50 border border-amber-700/50 text-amber-300 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                      Building quiz…
                    </div>
                  )}

                  {/* Single unified toolbar — L→R: Desktop, Player Props, Edit, Upload, Undo, Reset, Quality, Save, Publish */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {!isPhoneViewport && (
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
                    )}

                    <button
                      title="Player Properties"
                      onClick={openPlayerPropertiesModal}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-orange-700/50 hover:bg-orange-800/20 text-orange-300 text-[11px] font-semibold"
                    >
                      <Settings2 className="w-3 h-3" /><span className="hidden lg:inline">Player Props</span>
                    </button>

                    <div className="relative">
                      <button
                        title="Edit — slide text, narration, and course media"
                        onClick={() => setShowEditMenu(v => !v)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-700/50 hover:bg-indigo-800/20 text-indigo-300 text-[11px] font-semibold"
                      >
                        <Edit3 className="w-3 h-3" /><span className="hidden lg:inline">Edit</span>
                        <ChevronDown className="w-3 h-3 opacity-70" />
                      </button>
                      {showEditMenu && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setShowEditMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 z-[70] w-64 rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1 text-[12px]">
                            <button
                              type="button"
                              onClick={() => {
                                setShowEditMenu(false);
                                const seeded = currentSlide?.id === '__course-objectives__'
                                  ? {
                                      ...currentSlide,
                                      _objectives: JSON.parse(JSON.stringify(learningObjectives || [])),
                                    }
                                  : currentSlide;
                                // Sanitize so Edit Slide OST matches what the player shows (no orphan "-" bullets)
                                const cleaned = seeded
                                  ? { ...seeded, content: sanitizeOstText(String(seeded.content || '')) }
                                  : seeded;
                                editingSlideRef.current = cleaned;
                                setEditingSlide(cleaned);
                                setEditDrawerOpen(true);
                                setEditDrawerTab('text');
                                const n = normalizeRegenSlideType(currentSlide);
                                setRegenTargetType(n);
                                setRegenNoInteraction(n === 'content' || currentSlide?.type === 'summary');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-indigo-200 flex items-start gap-2"
                            >
                              <Edit3 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>
                                <span className="font-semibold block">Edit Slide</span>
                                <span className="text-slate-500 text-[10px]">Text, narration, and regenerate this slide</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowEditMenu(false);
                                const sid = String(currentSlide?.id || '');
                                if (sid.startsWith('__') && sid !== '__cover__') {
                                  showDraftMessage(
                                    'This system slide can’t be regenerated as an interaction. Use Edit Slide → Edit Text or Audio, or open a content/knowledge-check slide to regenerate.'
                                  );
                                  return;
                                }
                                openRegenerateSlideDrawer(currentSlide);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-amber-200 flex items-start gap-2"
                            >
                              <RefreshCw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>
                                <span className="font-semibold block">Regenerate slide</span>
                                <span className="text-slate-500 text-[10px]">Rebuild this slide’s interaction or content</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={ttsProgress.isRunning}
                              onClick={() => void regenerateAllNarration()}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-teal-200 disabled:opacity-40 flex items-start gap-2"
                            >
                              <Volume2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>
                                <span className="font-semibold block">Regenerate all narration</span>
                                <span className="text-slate-500 text-[10px]">Rebuild TTS for every slide</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isGeneratingImages}
                              onClick={() => void regenerateAiImages()}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-violet-200 disabled:opacity-40 flex items-start gap-2"
                            >
                              <ImageIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>
                                <span className="font-semibold block">Generate AI images</span>
                                <span className="text-slate-500 text-[10px]">Fill slides that don’t have an image yet</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={clearCourseImages}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-rose-200 flex items-start gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>
                                <span className="font-semibold block">Clear slide images</span>
                                <span className="text-slate-500 text-[10px]">Remove visuals across the course (keeps cover)</span>
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {(currentSlide?.type === 'scenario' || currentSlide?.type === 'game-template' || ['knowledge-check', 'mastery-exam', 'quiz', 'multiple-choice', 'multiple-answers', 'true-false', 'matching', 'sorting', 'drop-targets'].includes(currentSlide?.type ?? '')) && (
                      <button
                        title="Edit via AI"
                        onClick={() => setShowAIEditDrawer(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-cyan-700/50 hover:bg-cyan-800/20 text-cyan-300 text-[11px] font-semibold"
                      >
                        <Sparkles className="w-3 h-3" /><span className="hidden lg:inline">Edit via AI</span>
                      </button>
                    )}

                    <label
                      htmlFor="topbar-img-upload"
                      title="Upload Image"
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-violet-700/50 hover:bg-violet-800/20 text-violet-300 text-[11px] font-semibold cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /><span className="hidden lg:inline">Upload Image</span>
                      <input id="topbar-img-upload" type="file" accept="image/*" multiple className="hidden"
                        onChange={e => {
                          if (e.target.files?.length && currentSlide?.id) {
                            const newImgs: FloatingImage[] = Array.from(e.target.files).map((f, i) => ({
                              id: `fi-${Date.now()}-${i}`,
                              url: URL.createObjectURL(f),
                              x: 40 + i * 20, y: 40 + i * 20, width: 320, height: 240,
                              // Scope to active tab when uploading while a tab is open; otherwise slide-wide
                              tabId: activeTabForImages || null,
                            }));
                            pushUndo();
                            syncFloatingImages(currentSlide.id, [...(floatingImagesMap[currentSlide.id] || []), ...newImgs]);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>

                    {sourceImages.length > 0 && currentSlide?.id && (
                      <button
                        type="button"
                        title={`Source Image (${sourceImages.length} from upload)`}
                        onClick={() => setShowImageGalleryForSlide(currentSlide.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-teal-700/50 hover:bg-teal-800/20 text-teal-300 text-[11px] font-semibold"
                      >
                        <Library className="w-3 h-3" /><span className="hidden lg:inline">Source Image</span>
                      </button>
                    )}

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
                      title={`Save Draft (${draftManager.slotsUsed}/${draftManager.slotsTotal} slots used)`}
                      onClick={() => setShowDraftsPanel(true)}
                      className="relative flex items-center gap-1 px-2 py-1 rounded-md border border-slate-600/60 hover:bg-slate-700/30 text-slate-300 text-[11px] font-semibold"
                    >
                      {isSavingDraft ? <Loader2 className="w-3 h-3 animate-spin text-indigo-300" /> : <Save className="w-3 h-3" />}
                      <span className="hidden lg:inline">{isSavingDraft ? 'Saving…' : 'Save'}</span>
                      {draftManager.slotsUsed > 0 && !isSavingDraft && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                          {draftManager.slotsUsed}
                        </span>
                      )}
                    </button>

                    {/* Closed beta: trial users may export SCORM (same control as paid). */}
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
                  </div>
                </div>
              </div>}



              {/* ── Body: Sidebar + Main Player Area ── */}
              <div className={cn("flex flex-row flex-1 overflow-hidden min-h-0 h-full", playerConfig.playerResolution === 'full' ? 'overflow-x-hidden' : undefined)}>
                {/* Course Navigation — fixed left sidebar on desktop.
                    Phone / mobile preview uses letterbox gutters (rails or Menu). */}
                {showDesktopSidebar && (
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
                  className="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden"
                  onTouchStart={handlePlayerTouchStart}
                  onTouchEnd={handlePlayerTouchEnd}
                >
                  {/* Background canvas — scale-to-fit measures an empty overlay.
                      In-flow full-size host keeps the stage from collapsing. */}
                  <div
                    className={cn(
                      "relative flex flex-1 overflow-hidden min-h-0 h-full",
                      phoneTocPlacement
                        ? 'flex-row bg-slate-800'
                        : cn(
                            'flex-col',
                            useScaleTransform
                              ? (isPhoneViewport ? 'bg-slate-800' : themeStageBg)
                              : 'bg-white',
                            !useScaleTransform && !isPhoneViewport && viewMode === 'mobile' ? 'items-center justify-center bg-slate-950 gap-2' : undefined,
                            isPhoneViewport && playerConfig.playerResolution === 'full' ? 'bg-slate-900' : undefined
                          )
                    )}
                  >
                  {(phoneTocPlacement === 'rail-left' || phoneTocPlacement === 'dropdown-gutter') && (
                    <div
                      className={cn(
                        'shrink-0 h-full min-h-0 z-20',
                        phoneTocPlacement === 'dropdown-gutter' ? 'w-[3.25rem]' : 'w-[min(26%,11rem)]'
                      )}
                    >
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
                        defaultCollapsed={false}
                        variant={phoneTocPlacement === 'rail-left' ? 'gutter-rail' : 'dropdown'}
                        railSide="left"
                        gutterHosted={phoneTocPlacement === 'dropdown-gutter'}
                        dockSafeCorner
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
                    </div>
                  )}
                  <div
                    className={cn(
                      "relative flex flex-col flex-1 overflow-hidden min-h-0 min-w-0 h-full w-full",
                      !useScaleTransform && (phoneTocPlacement || (!isPhoneViewport && viewMode === 'mobile'))
                        ? 'items-center justify-center'
                        : undefined,
                      !useScaleTransform && !isPhoneViewport && viewMode === 'mobile' && !phoneTocPlacement ? 'bg-slate-950 gap-2' : undefined,
                      !phoneTocPlacement && useScaleTransform
                        ? (isPhoneViewport ? 'bg-slate-800' : themeStageBg)
                        : undefined,
                      !phoneTocPlacement && !useScaleTransform ? 'bg-white' : undefined,
                      isPhoneViewport && playerConfig.playerResolution === 'full' && !phoneTocPlacement ? 'bg-slate-900' : undefined
                    )}
                  >
                  {measureScaleToFit && (
                    <div
                      ref={scaler.containerRef}
                      className="absolute inset-0 pointer-events-none"
                      aria-hidden
                    />
                  )}
                  {viewMode === 'mobile' && isSandboxMode && !isPhoneViewport && (
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80 shrink-0 pt-2">
                      Development Demo — Mobile Landscape
                    </p>
                  )}

                  {/* Slide frame: 16:9/4:3 scaled into an in-flow full-size host (HDMI
                      scale-up). Absolute centering collapsed the stage to a blank screen. */}
                  <div className={useScaleTransform ? 'relative z-10 flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden' : 'contents'}>
                  <div
                    style={useScaleTransform ? scaler.outerStyle : undefined}
                    className={cn(
                      useScaleTransform
                        ? 'relative z-10'
                        : cn(
                            `theme-${theme}`,
                            "flex flex-col relative z-10",
                            isPhoneViewport
                              ? 'flex-1 overflow-hidden w-full min-h-0'
                              : viewMode === 'desktop'
                                ? 'flex-1 overflow-hidden w-full min-h-0 h-full'
                                : 'shadow-2xl overflow-hidden w-[min(96vw,calc((100vh-7rem)*16/9))] h-[min(calc(100vh-7rem),calc(96vw*9/16))] max-w-[1280px] max-h-[720px] my-2 rounded-[2rem] border-[10px] border-gray-800',
                            theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900'
                          )
                    )}
                  >
                  <div
                    className={cn(
                      useScaleTransform
                        ? cn(
                            `theme-${theme}`,
                            "flex flex-col relative overflow-hidden min-h-0",
                            theme === 'light' ? 'bg-white' : theme === 'unified' ? 'bg-indigo-950' : 'bg-slate-900'
                          )
                        : 'contents'
                    )}
                    style={useScaleTransform ? scaler.frameStyle : undefined}
                  >
                    {/* ── Content zone + accent strip ── */}
                    <div className="flex-1 flex flex-row overflow-hidden min-h-0">
                    {/* Per-module accent strip — flex column, no z-index issues */}
                    {!isFullBleed && (
                      <div
                        className="w-[3px] shrink-0 self-stretch pointer-events-none"
                        style={{ background: `linear-gradient(to bottom, ${slideAccentColor}, ${slideAccentColor}40)` }}
                      />
                    )}
                    <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                    {/* ── Full-bleed slide frame ─────────────────────── */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide?.id || `slide-${currentSlideIndex}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          "w-full min-h-0",
                          isFullBleed
                            ? "absolute inset-0 overflow-hidden"
                            : cn(
                                "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar",
                                isPhoneViewport
                                  ? 'px-4 pb-6 pt-4'
                                  : 'px-8 md:px-12 pb-4 pt-8 md:pt-12',
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
                            : "relative z-10 w-full flex flex-col min-h-full"
                        )}>
                          <div className={cn(
                            isFullBleed
                              ? "w-full h-full relative"
                              : "flex-1 w-full max-w-6xl flex flex-col justify-start relative min-h-0"
                          )}>
                               <SlideErrorBoundary
                                 slideId={currentSlide?.id}
                                 regenerating={regeneratingSlideId === currentSlide?.id || isRegenSlideRunning}
                                 onRegenerate={
                                   currentSlide && !['cover', 'player-tour', 'course-objectives', 'module-cover', 'module-overview', 'exam-intro', 'mastery-exam', 'exam-results', 'closing'].includes(currentSlide.type as string)
                                     ? () => regenerateBlankSlide(currentSlide)
                                     : undefined
                                 }
                               >
                               {/* Subtle overlay while Edit Slide → Regenerate is in flight */}
                               {isRegenSlideRunning && (
                                 <div
                                   className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/35 backdrop-blur-[1px] pointer-events-none"
                                   aria-live="polite"
                                   aria-busy="true"
                                 >
                                   <div className="flex flex-col items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-slate-900/85 border border-amber-500/25 shadow-lg">
                                     <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                     <p className="text-[11px] font-bold text-amber-200/90 uppercase tracking-wider">Regenerating…</p>
                                     <div className="relative h-1 w-36 rounded-full bg-amber-900/50 overflow-hidden">
                                       <div className="regen-progress-indeterminate bg-amber-400" />
                                     </div>
                                   </div>
                                 </div>
                               )}
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
                                          accentColor={slideAccentColor}
                                        />
                                      )}
                                    </div>
                                  );
                               })()}

                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {
                                 const typeLabel = currentSlide.type === 'summary' ? 'Summary' : 'Overview';
                                 const body = (currentSlide.content || '').trim();
                                 const isEmpty = body.length < 8;
                                 const slideImg = (currentSlide as any).imageUrl || null;
                                 const headerBlock = (
                                   <div className="space-y-4 w-full">
                                     <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: slideAccentColor }}>
                                       {typeLabel}
                                     </p>
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   </div>
                                 );
                                 const bodyBlock = isEmpty ? (
                                   <EmptySlideRegenerate
                                     title={currentSlide.title}
                                     isRegenerating={regeneratingSlideId === currentSlide.id}
                                     onRegenerate={() => regenerateBlankSlide(currentSlide)}
                                     compact
                                   />
                                 ) : (
                                   <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} accentColor={slideAccentColor} hasSideImage={!!slideImg} />
                                 );
                                 if (!slideImg) {
                                   return (
                                     <div className="w-full space-y-4">
                                       {headerBlock}
                                       {bodyBlock}
                                     </div>
                                   );
                                 }
                                 // Header + divider span full width; image sits beside body only (never over the rule)
                                 return (
                                   <div className="w-full space-y-4">
                                     {headerBlock}
                                     <div className="w-full flex flex-row gap-6 items-start">
                                       <div className="min-w-0 flex-1">{bodyBlock}</div>
                                       <div className="hidden md:block relative w-[46%] max-w-[480px] shrink-0 mt-1 group/slideimg">
                                         <EnlargeableImage
                                           src={slideImg}
                                           className="max-h-[28rem] bg-transparent"
                                           onRemove={!isScormPlayer ? () => {
                                             pushUndo();
                                             handleUpdateSlideMedia(currentSlide.id, { imageUrl: undefined });
                                           } : undefined}
                                           onCrop={!isScormPlayer ? (url) => {
                                             pushUndo();
                                             handleUpdateSlideMedia(currentSlide.id, { imageUrl: url });
                                           } : undefined}
                                           onPromoteToFloat={!isScormPlayer ? (info) => {
                                             promoteInFlowToFloat(info, null, (s) => ({ ...s, imageUrl: undefined }));
                                           } : undefined}
                                         />
                                       </div>
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

                               {/* QUIZ (multiple-choice / true-false with submit flow) */}
                               {(currentSlide?.type === 'quiz' || (currentSlide?.type as string) === 'multiple-choice' || (currentSlide?.type as string) === 'true-false') && (() => {
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
                                     <p className={cn('font-bold text-xl lg:text-2xl leading-snug', theme === 'light' ? 'text-slate-800' : 'text-slate-100')}>{quiz.questionText || quiz.prompt || quiz.question}</p>
                                     <div className="space-y-3 w-full max-w-4xl">
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
                                             <span className="flex-1 leading-snug text-base">{label}</span>
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
                                      <KnowledgeCheckFraming content={currentSlide.content} theme={theme} accentColor={slideAccentColor} />
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
                                     <KnowledgeCheckFraming content={currentSlide.content} instruction={SORTING_REORDER_HINT} theme={theme} accentColor={slideAccentColor} />
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
                                  const diagramHidden = !!(currentSlide.data?.diagramHidden);
                                  const diagramAlign = (currentSlide.data?.diagramAlign as DiagramAlign) || 'center';
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
                                      {mermaidCode && !diagramHidden ? (
                                        <DiagramAlignFrame
                                          code={mermaidCode}
                                          theme={theme as any}
                                          align={diagramAlign}
                                          isAuthoring={!isScormPlayer}
                                          onAlignChange={(align) => {
                                            if (!currentSlide?.id) return;
                                            pushUndo();
                                            handleUpdateSlideMedia(currentSlide.id, {
                                              data: { ...(currentSlide.data || {}), diagramAlign: align },
                                            });
                                          }}
                                          onDelete={() => {
                                            if (!currentSlide?.id) return;
                                            pushUndo();
                                            handleUpdateSlideMedia(currentSlide.id, {
                                              data: {
                                                ...(currentSlide.data || {}),
                                                diagramHidden: true,
                                                mermaidCode: '',
                                                code: '',
                                              },
                                            });
                                          }}
                                        />
                                      ) : (
                                        <div className={cn(
                                          'rounded-xl p-6 text-sm text-center',
                                          theme === 'light' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-slate-800/50 border border-amber-700/30 text-amber-400'
                                        )}>
                                          {diagramHidden
                                            ? 'Diagram removed. Use Edit → Regenerate slide or restore Mermaid markup to bring it back.'
                                            : 'No diagram code found. Edit this slide to add Mermaid markup.'}
                                        </div>
                                      )}
                                    </div>
                                  );
                               })()}


                               {currentSlide?.type === 'tabbed-horizontal' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <TabbedHorizontal
                                       tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []}
                                       theme={theme as any}
                                       skin={currentSlide.data?.tabSkin === 'blocks' ? 'blocks' : 'process'}
                                       wellColor={currentSlide.data?.blocksWellColor}
                                       showStepLabels={currentSlide.data?.showProcessStepLabels !== false}
                                       introContent={currentSlide.content || ''}
                                       introColor={currentSlide.data?.introColor || (currentSlide.data?.unifyTabColors ? tabAccentHex((currentSlide.data?.tabs || currentSlide.data?.items || [])[0], 0) : undefined)}
                                       introLabelColor={currentSlide.data?.introLabelColor}
                                       introVoiceOver={currentSlide.voiceOverText || currentSlide.narration || ''}
                                       introImageUrl={currentSlide.data?.introImageUrl}
                                       onActiveTabChange={setActiveTabForImages}
                                       highlightTabId={dragOverTabId}
                                       onTabView={(id) => { if (id !== '__intro__') markInteractionExplored(currentSlide.id, id); }}
                                       onTabAudio={handleTabAudio}
                                       onRemoveIntroImage={!isScormPlayer ? () => {
                                         pushUndo();
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: { ...currentSlide.data, introImageUrl: undefined },
                                         });
                                       } : undefined}
                                       onRemoveTabImage={!isScormPlayer ? (tabId) => {
                                         pushUndo();
                                         const key = currentSlide.data?.tabs ? 'tabs' : 'items';
                                         const list = [...(currentSlide.data?.[key] || [])];
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: {
                                             ...currentSlide.data,
                                             [key]: list.map((t: any) =>
                                               t.id === tabId ? { ...t, imageUrl: undefined } : t
                                             ),
                                           },
                                         });
                                       } : undefined}
                                       onCropIntroImage={!isScormPlayer ? (url) => {
                                         pushUndo();
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: { ...currentSlide.data, introImageUrl: url },
                                         });
                                       } : undefined}
                                       onCropTabImage={!isScormPlayer ? (tabId, url) => {
                                         pushUndo();
                                         const key = currentSlide.data?.tabs ? 'tabs' : 'items';
                                         const list = [...(currentSlide.data?.[key] || [])];
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: {
                                             ...currentSlide.data,
                                             [key]: list.map((t: any) =>
                                               t.id === tabId ? { ...t, imageUrl: url } : t
                                             ),
                                           },
                                         });
                                       } : undefined}
                                       onPromoteIntroImage={!isScormPlayer ? (info) => {
                                         promoteInFlowToFloat(info, '__intro__', (s) => ({
                                           ...s,
                                           data: { ...s.data, introImageUrl: undefined },
                                         }));
                                       } : undefined}
                                       onPromoteTabImage={!isScormPlayer ? (tabId, info) => {
                                         promoteInFlowToFloat(info, tabId, (s) => {
                                           const key = s.data?.tabs ? 'tabs' : 'items';
                                           return {
                                             ...s,
                                             data: {
                                               ...s.data,
                                               [key]: (s.data?.[key] || []).map((t: any) =>
                                                 t.id === tabId ? { ...t, imageUrl: undefined } : t
                                               ),
                                             },
                                           };
                                         });
                                       } : undefined}
                                     />
                                   </div>
                                 </div>
                               )}
                               {currentSlide?.type === 'tabbed-vertical' && (
                                 <div className="space-y-6 w-full">
                                   <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                   <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                     <TabbedVertical
                                       tabs={currentSlide.data?.tabs || currentSlide.data?.items || currentSlide.interactions?.[0]?.tabs || currentSlide.interactions?.[0]?.items || []}
                                       theme={theme as any}
                                       skin={currentSlide.data?.tabSkin === 'blocks' ? 'blocks' : 'default'}
                                       wellColor={currentSlide.data?.blocksWellColor}
                                       visitedTabIds={exploredBySlide[currentSlide.id] || []}
                                       introContent={currentSlide.content || ''}
                                       introColor={currentSlide.data?.introColor || (currentSlide.data?.unifyTabColors ? tabAccentHex((currentSlide.data?.tabs || currentSlide.data?.items || [])[0], 0) : undefined)}
                                       introLabelColor={currentSlide.data?.introLabelColor}
                                       introVoiceOver={currentSlide.voiceOverText || currentSlide.narration || ''}
                                       introImageUrl={currentSlide.data?.introImageUrl}
                                       onActiveTabChange={setActiveTabForImages}
                                       highlightTabId={dragOverTabId}
                                       onTabView={(id) => { if (id !== '__intro__') markInteractionExplored(currentSlide.id, id); }}
                                       onTabAudio={handleTabAudio}
                                       onRemoveIntroImage={!isScormPlayer ? () => {
                                         pushUndo();
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: { ...currentSlide.data, introImageUrl: undefined },
                                         });
                                       } : undefined}
                                       onRemoveTabImage={!isScormPlayer ? (tabId) => {
                                         pushUndo();
                                         const key = currentSlide.data?.tabs ? 'tabs' : 'items';
                                         const list = [...(currentSlide.data?.[key] || [])];
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: {
                                             ...currentSlide.data,
                                             [key]: list.map((t: any) =>
                                               t.id === tabId ? { ...t, imageUrl: undefined } : t
                                             ),
                                           },
                                         });
                                       } : undefined}
                                       onCropIntroImage={!isScormPlayer ? (url) => {
                                         pushUndo();
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: { ...currentSlide.data, introImageUrl: url },
                                         });
                                       } : undefined}
                                       onCropTabImage={!isScormPlayer ? (tabId, url) => {
                                         pushUndo();
                                         const key = currentSlide.data?.tabs ? 'tabs' : 'items';
                                         const list = [...(currentSlide.data?.[key] || [])];
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: {
                                             ...currentSlide.data,
                                             [key]: list.map((t: any) =>
                                               t.id === tabId ? { ...t, imageUrl: url } : t
                                             ),
                                           },
                                         });
                                       } : undefined}
                                       onPromoteIntroImage={!isScormPlayer ? (info) => {
                                         promoteInFlowToFloat(info, '__intro__', (s) => ({
                                           ...s,
                                           data: { ...s.data, introImageUrl: undefined },
                                         }));
                                       } : undefined}
                                       onPromoteTabImage={!isScormPlayer ? (tabId, info) => {
                                         promoteInFlowToFloat(info, tabId, (s) => {
                                           const key = s.data?.tabs ? 'tabs' : 'items';
                                           return {
                                             ...s,
                                             data: {
                                               ...s.data,
                                               [key]: (s.data?.[key] || []).map((t: any) =>
                                                 t.id === tabId ? { ...t, imageUrl: undefined } : t
                                               ),
                                             },
                                           };
                                         });
                                       } : undefined}
                                     />
                                   </div>
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
                                 const cr = resolveClickRevealSlide(currentSlide);
                                 return (
                                   <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     {cr.content && <SmartContent content={sanitizeContent(cr.content)} theme={theme} accentColor={slideAccentColor} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />}
                                     <ClickRevealInteraction
                                       items={cr.items}
                                       theme={theme as any}
                                       onItemReveal={(id) => markInteractionExplored(currentSlide.id, id)}
                                       onRemoveItemImage={!isScormPlayer ? (itemId) => {
                                         pushUndo();
                                         const items = (cr.items || []).map((it: any) =>
                                           it.id === itemId ? { ...it, imageUrl: undefined } : it
                                         );
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: { ...currentSlide.data, items },
                                         });
                                       } : undefined}
                                       onCropItemImage={!isScormPlayer ? (itemId, url) => {
                                         pushUndo();
                                         const items = (cr.items || []).map((it: any) =>
                                           it.id === itemId ? { ...it, imageUrl: url } : it
                                         );
                                         handleUpdateSlideMedia(currentSlide.id, {
                                           data: { ...currentSlide.data, items },
                                         });
                                       } : undefined}
                                       onPromoteItemImage={!isScormPlayer ? (itemId, info) => {
                                         promoteInFlowToFloat(info, null, (s) => ({
                                           ...s,
                                           data: {
                                             ...s.data,
                                             items: (s.data?.items || []).map((it: any) =>
                                               it.id === itemId ? { ...it, imageUrl: undefined } : it
                                             ),
                                           },
                                         }));
                                       } : undefined}
                                     />
                                   </div>
                                 );
                               })()}

                               {/* EXAM INTRO */}
                               {currentSlide?.type === 'exam-intro' && (
                                 <ExamIntroSlide
                                   examConfig={examConfig}
                                   courseTitle={course?.title}
                                   isGenerating={isGeneratingExam && examQuestions.length === 0}
                                   questionsReady={examQuestions.length > 0}
                                   errorMessage={examError}
                                   onBegin={async () => {
                                     setExamError(null);
                                     if (!course) {
                                       setExamError('Course data is missing. Please reload the preview and try again.');
                                       return;
                                     }

                                     const qIdx = allSlides.findIndex(s => (s as any).id === '__mastery-exam__');
                                     if (qIdx < 0) {
                                       setExamError('Quiz Questions slide is missing. Enable Mastery Quiz in course settings and regenerate.');
                                       return;
                                     }

                                     // Prefer questions already built at course finalize / draft load
                                     let questions = examQuestions;
                                     if ((!questions || questions.length === 0) && examGenPromiseRef.current) {
                                       setIsGeneratingExam(true);
                                       try {
                                         questions = await examGenPromiseRef.current;
                                       } finally {
                                         setIsGeneratingExam(false);
                                         examGenPromiseRef.current = null;
                                       }
                                     }
                                     if (!questions || questions.length === 0) {
                                       // Last-resort retry only when pre-build truly failed
                                       setIsGeneratingExam(true);
                                       try {
                                         questions = await generateMasteryExam(course, examConfig);
                                         if (!questions?.length) {
                                           setExamError('No quiz questions could be generated from this course. Try again, or check that slides have content.');
                                           return;
                                         }
                                         setExamQuestions(questions);
                                         setCourse(prev => prev ? { ...prev, examQuestions: questions } : prev);
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
                                   <div className="w-full h-full min-h-0">
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
                                   </div>
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

                               {['drop-targets', 'memory-match'].includes(currentSlide?.type as string) && (() => {
                                  const raw = currentSlide.data || currentSlide.interactions?.[0] || {};
                                  // Normalize common AI shapes into drop-targets schema
                                  let items = Array.isArray(raw.items) ? raw.items : [];
                                  let categories: string[] = Array.isArray(raw.categories) ? raw.categories.map((c: any) => String(c)) : [];
                                  if (!categories.length && Array.isArray(raw.targets)) {
                                    categories = raw.targets.map((t: any) => String(t.label || t.content || t.id || '')).filter(Boolean);
                                  }
                                  if (!items.length && Array.isArray(raw.pairs)) {
                                    items = raw.pairs.map((p: any, i: number) => ({
                                      id: p.id || `p-${i}`,
                                      content: p.term || p.left || p.content || '',
                                      category: p.definition || p.right || p.category || '',
                                    }));
                                    if (!categories.length) {
                                      categories = Array.from(
                                        new Set(items.map((it: any) => String(it.category || '')).filter(Boolean))
                                      ) as string[];
                                    }
                                  }
                                  // Sequence / single-bin-no-choice → sorting (up/down), not drop bins
                                  const uniqueCats = [...new Set(items.map((it: any) => String(it.category || '').trim()).filter(Boolean))];
                                  const hasDistractors = items.some((it: any) => !String(it.category || '').trim());
                                  const text = `${currentSlide.title || ''} ${currentSlide.content || ''}`;
                                  const sequenceCue = /order|sequence|arrange|phases?|steps?|chronolog|operational order|correct order/i.test(text);
                                  const singleBinNoChoice = uniqueCats.length <= 1 && categories.length <= 1 && !hasDistractors;
                                  if (items.length >= 2 && (sequenceCue || singleBinNoChoice)) {
                                    const sortItems = items.map((it: any, i: number) => ({
                                      id: String(it.id || `s-${i}`),
                                      content: String(it.content || it.text || it.label || ''),
                                    })).filter((it: any) => it.content);
                                    const correctOrder = Array.isArray(raw.correctOrder) && raw.correctOrder.length
                                      ? raw.correctOrder.map(String)
                                      : sortItems.map((it: any) => it.id);
                                    return (
                                      <div className="space-y-6 w-full">
                                        <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                        <KnowledgeCheckFraming content={currentSlide.content} instruction={SORTING_REORDER_HINT} theme={theme} accentColor={slideAccentColor} />
                                        <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                          <CustomSortingActivity items={sortItems} correctOrder={correctOrder} theme={theme} onChecked={() => markKcChecked(currentSlide.id)} />
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                  <div className="space-y-6 w-full">
                                     <SlideHeader title={currentSlide.title} theme={theme} accentColor={slideAccentColor} />
                                     <KnowledgeCheckFraming content={currentSlide.content} theme={theme} accentColor={slideAccentColor} />
                                     <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                       <DropTargetsActivity
                                         items={items}
                                         categories={categories}
                                         theme={theme}
                                         onChecked={() => markKcChecked(currentSlide.id)}
                                       />
                                     </div>
                                  </div>
                                  );
                               })()}

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

                             {/* Authoring uses floatingImagesMap canvas below — avoid a second copy from course.floatingMedia (caused inseparable duplicates). */}
                             {isScormPlayer && currentSlide?.floatingMedia && currentSlide.floatingMedia.length > 0 && viewMode === 'desktop' && (
                               <div className="hidden md:block w-[40%] max-w-[500px] shrink-0 pointer-events-none z-[60]">
                                 <FloatingImageCanvas
                                   isAuthoring={false}
                                   onChange={() => {}}
                                   onRemove={() => {}}
                                   images={currentSlide.floatingMedia}
                                   activeTabId={activeTabForImages}
                                 />
                               </div>
                             )}

                           </div>

                           {/* Slide media tools — Edit/Reset/Upload/Source Image live in the top bar. */}
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
                                        tabId: activeTabForImages || null,
                                      };
                                      pushUndo();
                                      syncFloatingImages(currentSlide.id, [...(floatingImagesMap[currentSlide.id] || []), newImg]);
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
                         activeTabId={activeTabForImages}
                         onDragOverTab={setDragOverTabId}
                         onChange={(imgs) => {
                           if (!currentSlide?.id) return;
                           syncFloatingImages(currentSlide.id, imgs);
                         }}
                         onRemove={(id) => {
                           if (!currentSlide?.id) return;
                           pushUndo();
                           const next = (floatingImagesMap[currentSlide.id] || []).filter(i => i.id !== id);
                           syncFloatingImages(currentSlide.id, next);
                         }}
                         onPinBack={pinFloatBackToFlow}
                       />
                        </motion.div>
                       </AnimatePresence>

                      {/* Closed captions stay inside the frame only when PlayerBar is also in-frame.
                          Phone scale-to-fit docks CC above the outside PlayerBar instead. */}
                      {!dockPlayerBarOutside && showCC && player.hasAudio && !player.isEnded && (
                        <ClosedCaptionOverlay
                          narrationText={
                            activeTabAudioUrl
                              ? activeTabNarrationText
                              : (currentSlide?.voiceOverText || (currentSlide as any)?.narration || null)
                          }
                          currentTime={player.currentTime}
                          duration={player.duration}
                          isPlaying={player.isPlaying}
                        />
                      )}
                     </div>{/* end inner content */}
                     </div>{/* end accent+content row */}

                    {/* Desktop “mobile bezel” demo keeps controls inside the phone chrome.
                        Real phones dock the bar outside the transformed frame so sticky
                        cannot pin it mid-slide. Desktop HDMI scale-up keeps the bar inside. */}
                    {!dockPlayerBarOutside && (
                    <div className={cn(
                      "w-full z-[100] shrink-0 border-t backdrop-blur-md",
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
                        disablePrev={currentSlide?.type === 'mastery-exam' || currentSlide?.type === 'exam-results'}
                        volume={player.volume}
                        onVolumeChange={player.setVolume}
                        showCC={showCC}
                        onToggleCC={voiceOverEnabled ? () => setShowCC(v => !v) : undefined}
                        narrationGenerating={ttsProgress.isRunning}
                      />
                     </div>
                    )}
                  </div>{/* end inner design frame (or contents) */}
                  </div>{/* end visual outer / slide frame */}
                  </div>{/* end absolute center host (or contents) */}
                  </div>{/* end scale measure stage */}

                  {phoneTocPlacement === 'rail-right' && (
                    <div className="w-[min(26%,11rem)] shrink-0 h-full min-h-0 z-20">
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
                        defaultCollapsed={false}
                        variant="gutter-rail"
                        railSide="right"
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
                    </div>
                  )}
                  </div>{/* end bg canvas / gutter row */}

                  {dockPlayerBarOutside && (
                    <>
                      {showCC && player.hasAudio && !player.isEnded && (
                        <ClosedCaptionOverlay
                          placement="docked"
                          narrationText={
                            activeTabAudioUrl
                              ? activeTabNarrationText
                              : (currentSlide?.voiceOverText || (currentSlide as any)?.narration || null)
                          }
                          currentTime={player.currentTime}
                          duration={player.duration}
                          isPlaying={player.isPlaying}
                        />
                      )}
                    <div className={cn(
                      "w-full z-[100] shrink-0 border-t backdrop-blur-md",
                      theme === 'light' ? 'bg-white/80 border-slate-200' : theme === 'unified' ? 'bg-indigo-950 border-indigo-800' : 'bg-slate-900 border-slate-800',
                      isPhoneViewport && 'max-h-[5.5rem]'
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
                        disablePrev={currentSlide?.type === 'mastery-exam' || currentSlide?.type === 'exam-results'}
                        volume={player.volume}
                        onVolumeChange={player.setVolume}
                        showCC={showCC}
                        onToggleCC={voiceOverEnabled ? () => setShowCC(v => !v) : undefined}
                        narrationGenerating={ttsProgress.isRunning}
                      />
                    </div>
                    </>
                  )}

                </div>{/* end main slide column */}
              </div>{/* end sidebar+main row */}
              {/* Tour stays inside the player shell (aligned with the toolbar) and only
                  opens in landscape so it never sits on the rotate prompt. */}
              <DevToolbarTourModal
                open={showDevTour && !needsLandscapeForPreview}
                onClose={() => setShowDevTour(false)}
              />
              </div>{/* end preview player shell */}
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
                  {sourceImages.length === 0 ? (
                    <p className="col-span-full text-sm text-slate-400 text-center py-8">
                      No source images extracted from the uploaded file yet.
                    </p>
                  ) : sourceImages.map((img: any, i: number) => (
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
                          tabId: activeTabForImages || null,
                        };
                        pushUndo();
                        syncFloatingImages(slideId, [...(floatingImagesMap[slideId] || []), newImg]);
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
                      key={tab.id || `edit-tab-${ti}`}
                      onClick={() => {
                        setEditDrawerTab(tab.id as any);
                        if (tab.id === 'regenerate' && editingSlide) {
                          const n = normalizeRegenSlideType(editingSlide);
                          const plain = n === 'content' || editingSlide.type === 'summary' || editingSlide.type === 'key-takeaways';
                          setRegenNoInteraction(plain);
                          setRegenTargetType(plain ? 'content' : n);
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
                  <div className="p-3 rounded-xl border border-slate-700 bg-slate-950 text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-white">Edit</strong> changes what’s on this slide.&nbsp;
                    <strong className="text-white">Regenerate</strong> asks AI to rebuild the slide (or interaction) from scratch.
                    {editDrawerTab === 'regenerate' ? ' Confirm the type below, then regenerate.' : ' Switch tabs above to edit text, audio, or regenerate.'}
                  </div>
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
                      {String(editingSlide.id) === '__course-objectives__' ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Course objectives</label>
                          <p className="text-[11px] text-slate-400">Edit terminal and enabling objectives. Saved changes update the Course Objectives slide.</p>
                          {(Array.isArray((editingSlide as any)._objectives) ? (editingSlide as any)._objectives : learningObjectives || []).map((obj: any, oi: number) => {
                            const term = typeof obj === 'string' ? obj : (obj?.terminalObjective || '');
                            const enablers: string[] = typeof obj === 'string' ? [] : (obj?.enablingObjectives || []);
                            return (
                              <div key={oi} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Objective {oi + 1}</label>
                                <textarea
                                  rows={2}
                                  value={term}
                                  onChange={(e) => {
                                    const list = [...(Array.isArray((editingSlideRef.current as any)?._objectives)
                                      ? (editingSlideRef.current as any)._objectives
                                      : learningObjectives || [])];
                                    const prev = list[oi];
                                    list[oi] = typeof prev === 'string'
                                      ? e.target.value
                                      : { ...(prev || {}), terminalObjective: e.target.value, enablingObjectives: enablers };
                                    const updated = { ...(editingSlideRef.current ?? editingSlide), _objectives: list };
                                    editingSlideRef.current = updated;
                                    setEditingSlide(updated);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                                  placeholder="Terminal objective…"
                                />
                                {enablers.map((en, ei) => (
                                  <input
                                    key={ei}
                                    value={en}
                                    onChange={(e) => {
                                      const list = [...(Array.isArray((editingSlideRef.current as any)?._objectives)
                                        ? (editingSlideRef.current as any)._objectives
                                        : learningObjectives || [])];
                                      const prev = typeof list[oi] === 'string'
                                        ? { terminalObjective: list[oi], enablingObjectives: [...enablers] }
                                        : { ...(list[oi] || {}), enablingObjectives: [...enablers] };
                                      const nextEn = [...(prev.enablingObjectives || [])];
                                      nextEn[ei] = e.target.value;
                                      list[oi] = { ...prev, enablingObjectives: nextEn };
                                      const updated = { ...(editingSlideRef.current ?? editingSlide), _objectives: list };
                                      editingSlideRef.current = updated;
                                      setEditingSlide(updated);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                                    placeholder={`Enabling objective ${ei + 1}`}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>
                            {(editingSlide.type === 'tabbed-horizontal')
                              ? <>Overview <span className="normal-case font-normal text-slate-600">(before steps)</span></>
                              : (editingSlide.type === 'tabbed-vertical')
                              ? <>Introduction <span className="normal-case font-normal text-slate-600">(Intro tab)</span></>
                              : <>On-Screen Text <span className="normal-case font-normal text-slate-600">(Rich Text)</span></>}
                          </span>
                        </label>
                        {editingSlide.type === 'tabbed-horizontal' && (
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            This is the Overview panel. Each step’s heading and body are edited in the list below — that is the text you see after clicking a numbered step.
                          </p>
                        )}
                        {editingSlide.type === 'tabbed-vertical' && (
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            This is the Intro panel only. Each tab’s heading and body are edited in the list below — that is the text you see after clicking a tab on the slide.
                          </p>
                        )}
                        <RichTextEditor
                          key={editingSlide.id}
                          value={coerceOstText(editingSlide.content)}
                          onChange={(html) => {
                            const updated = {
                              ...(editingSlideRef.current ?? editingSlide),
                              content: sanitizeOstText(html),
                            };
                            editingSlideRef.current = updated;
                            setEditingSlide(updated);
                          }}
                          placeholder="Slide content... Use the toolbar for bold, italic, colors, and lists."
                        />
                      </div>
                      )}
                      {(editingSlide.type === 'tabbed-horizontal' || editingSlide.type === 'tabbed-vertical') && (() => {
                        const listKey = Array.isArray(editingSlide.data?.tabs) ? 'tabs' : 'items';
                        const tabs: any[] = editingSlide.data?.[listKey] || [];
                        const unify = !!editingSlide.data?.unifyTabColors;
                        const introHex = String(editingSlide.data?.introColor || TAB_INTRO_DEFAULT_HEX);
                        const introTitleHex = String(editingSlide.data?.introLabelColor || '');
                        const unifiedHex = unify
                          ? (editingSlide.data?.introColor || tabs[0]?.color || TAB_ACCENT_HEX[0])
                          : (tabs[0]?.color || TAB_ACCENT_HEX[0]);
                        const patchTabs = (nextTabs: any[], extraData?: Record<string, unknown>) => {
                          const updated = {
                            ...(editingSlideRef.current ?? editingSlide),
                            data: { ...(editingSlide.data || {}), [listKey]: nextTabs, ...extraData },
                          };
                          editingSlideRef.current = updated;
                          setEditingSlide(updated);
                        };
                        const TitleDots = ({
                          value,
                          onPick,
                        }: { value?: string; onPick: (hex: string) => void }) => (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Title text</span>
                            {TAB_TITLE_HEX.map(preset => (
                              <button
                                key={preset}
                                type="button"
                                title={preset === '#ffffff' ? 'White' : preset === '#e2e8f0' ? 'Light gray' : 'Black'}
                                onClick={() => onPick(preset)}
                                className={cn(
                                  'w-5 h-5 rounded-full border-2',
                                  String(value || '').toLowerCase() === preset ? 'border-white' : 'border-slate-600'
                                )}
                                style={{ background: preset }}
                              />
                            ))}
                            <span className="text-[10px] text-slate-600">Auto-contrast if unset</span>
                          </div>
                        );
                        const ColorDots = ({
                          value,
                          onPick,
                          size = 'sm',
                        }: { value: string; onPick: (hex: string) => void; size?: 'sm' | 'md' }) => (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Color</span>
                            {TAB_ACCENT_HEX.map(preset => (
                              <button
                                key={preset}
                                type="button"
                                title={preset === '#64748b' ? 'Gray' : preset === '#0f172a' ? 'Black' : preset}
                                onClick={() => onPick(preset)}
                                className={cn(
                                  size === 'md' ? 'w-6 h-6' : 'w-5 h-5',
                                  'rounded-full border-2',
                                  String(value).toLowerCase() === preset ? 'border-white' : 'border-transparent'
                                )}
                                style={{ background: preset }}
                              />
                            ))}
                            <input
                              type="color"
                              value={value || '#6366f1'}
                              onChange={(e) => onPick(e.target.value)}
                              className={cn(size === 'md' ? 'w-7 h-7' : 'w-6 h-6', 'rounded cursor-pointer bg-transparent border-0 p-0')}
                              title="Custom color"
                            />
                          </div>
                        );
                        const tabSkin = editingSlide.data?.tabSkin === 'blocks' ? 'blocks' : 'default';
                        return (
                          <div className="space-y-3 pt-1">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                              {editingSlide.type === 'tabbed-horizontal' ? 'Step headings & bodies' : 'Tab headings & bodies'}
                            </label>
                            {(editingSlide.type === 'tabbed-vertical' || editingSlide.type === 'tabbed-horizontal') && (
                              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  {editingSlide.type === 'tabbed-horizontal' ? 'Process layout' : 'Tab layout'}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => patchTabs(tabs, { tabSkin: editingSlide.type === 'tabbed-horizontal' ? 'process' : 'default' })}
                                    className={cn(
                                      'px-3 py-2 rounded-lg border text-xs font-bold transition-all',
                                      tabSkin === 'default'
                                        ? 'border-indigo-400 bg-indigo-500/15 text-indigo-200'
                                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                                    )}
                                  >
                                    Classic
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => patchTabs(tabs, { tabSkin: 'blocks' })}
                                    className={cn(
                                      'px-3 py-2 rounded-lg border text-xs font-bold transition-all',
                                      tabSkin === 'blocks'
                                        ? 'border-indigo-400 bg-indigo-500/15 text-indigo-200'
                                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                                    )}
                                  >
                                    Blocks
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                  {editingSlide.type === 'tabbed-horizontal'
                                    ? 'Classic is the teal step bar on a light page. Blocks uses a dark (or colored) reading area behind the steps. Same interaction — switch back anytime.'
                                    : 'Classic is the current rounded tabs. Blocks uses a dark (or colored) reading area beside the tabs. Same interaction — switch back anytime.'}
                                </p>
                                {editingSlide.type === 'tabbed-horizontal' && (
                                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingSlide.data?.showProcessStepLabels !== false}
                                      onChange={(e) => patchTabs(tabs, { showProcessStepLabels: e.target.checked })}
                                      className="mt-0.5 w-4 h-4 rounded border-slate-600 text-indigo-500"
                                    />
                                    <span className="text-[11px] text-slate-300 leading-relaxed">
                                      Show STEP 01, STEP 02 labels. Turn off when the circles are topics or places, not a sequence.
                                    </span>
                                  </label>
                                )}
                                {tabSkin === 'blocks' && (
                                  <div className="space-y-2 pt-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Content well</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {BLOCKS_WELL_PRESETS.map(hex => (
                                        <button
                                          key={hex}
                                          type="button"
                                          title={hex}
                                          onClick={() => patchTabs(tabs, { blocksWellColor: hex })}
                                          className={cn(
                                            'w-6 h-6 rounded-full border-2',
                                            String(editingSlide.data?.blocksWellColor || BLOCKS_WELL_DEFAULT).toLowerCase() === hex
                                              ? 'border-white scale-110'
                                              : 'border-slate-600'
                                          )}
                                          style={{ background: hex }}
                                        />
                                      ))}
                                      <input
                                        type="color"
                                        value={editingSlide.data?.blocksWellColor || BLOCKS_WELL_DEFAULT}
                                        onChange={(e) => patchTabs(tabs, { blocksWellColor: e.target.value })}
                                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                                        title="Custom well color"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-700 bg-slate-950 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={unify}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  const hex = unifiedHex;
                                  patchTabs(
                                    tabs.map((t: any) => (on ? { ...t, color: hex } : t)),
                                    { unifyTabColors: on, introColor: on ? hex : introHex }
                                  );
                                }}
                                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-indigo-500"
                              />
                              <span className="text-[11px] text-slate-300 leading-relaxed">
                                Use one color for every selected tab — including Introduction — instead of a different color per tab.
                              </span>
                            </label>
                            {unify && (
                              <div className="space-y-2 px-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">All tabs</span>
                                {TAB_ACCENT_HEX.map(hex => (
                                  <button
                                    key={hex}
                                    type="button"
                                    title={hex === '#64748b' ? 'Gray' : hex === '#0f172a' ? 'Black' : hex}
                                    onClick={() => patchTabs(tabs.map((t: any) => ({ ...t, color: hex })), { unifyTabColors: true, introColor: hex })}
                                    className={cn(
                                      'w-6 h-6 rounded-full border-2 transition-transform',
                                      String(unifiedHex).toLowerCase() === hex ? 'border-white scale-110' : 'border-transparent'
                                    )}
                                    style={{ background: hex }}
                                  />
                                ))}
                                <input
                                  type="color"
                                  value={unifiedHex}
                                  onChange={(e) => patchTabs(tabs.map((t: any) => ({ ...t, color: e.target.value })), { unifyTabColors: true, introColor: e.target.value })}
                                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                                  title="Custom color"
                                />
                                </div>
                                <TitleDots
                                  value={introTitleHex}
                                  onPick={(hex) => patchTabs(tabs.map((t: any) => ({ ...t, labelColor: hex })), { introLabelColor: hex })}
                                />
                              </div>
                            )}
                            {!unify && (
                              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                                <p className="text-sm font-bold text-white">Introduction</p>
                                <p className="text-[11px] text-slate-500">Fill of the Intro tab. Title text is separate so dark fills stay readable.</p>
                                <ColorDots
                                  value={introHex}
                                  onPick={(hex) => patchTabs(tabs, { introColor: hex })}
                                />
                                <TitleDots
                                  value={introTitleHex}
                                  onPick={(hex) => patchTabs(tabs, { introLabelColor: hex })}
                                />
                              </div>
                            )}
                            {tabs.length === 0 ? (
                              <p className="text-xs text-slate-500">No tabs yet — use Regenerate to rebuild this interaction.</p>
                            ) : tabs.map((tab: any, ti: number) => {
                              const hex = tabAccentHex(tab, ti);
                              return (
                                <div key={tab.id || ti} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                                  <input
                                    value={tab.label || ''}
                                    onChange={(e) => {
                                      const next = [...tabs];
                                      next[ti] = { ...next[ti], label: e.target.value };
                                      patchTabs(next);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500"
                                    placeholder={`Tab ${ti + 1} heading`}
                                  />
                                  {!unify && (
                                    <>
                                    <ColorDots
                                      value={hex}
                                      onPick={(preset) => {
                                        const next = [...tabs];
                                        next[ti] = { ...next[ti], color: preset };
                                        patchTabs(next);
                                      }}
                                    />
                                    <TitleDots
                                      value={tab.labelColor}
                                      onPick={(preset) => {
                                        const next = [...tabs];
                                        next[ti] = { ...next[ti], labelColor: preset };
                                        patchTabs(next);
                                      }}
                                    />
                                    </>
                                  )}
                                  <textarea
                                    rows={4}
                                    value={coerceOstText(tab.content)}
                                    onChange={(e) => {
                                      const next = [...tabs];
                                      next[ti] = { ...next[ti], content: e.target.value };
                                      patchTabs(next);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none"
                                    placeholder="On-screen text for this tab…"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {(editingSlide.type === 'click-reveal' || editingSlide.type === 'accordion') && (() => {
                        const items: any[] = editingSlide.data?.items || [];
                        return (
                          <div className="space-y-3">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Click &amp; Reveal items</label>
                            {items.length === 0 ? (
                              <p className="text-xs text-slate-500">No items yet — use Regenerate to rebuild this interaction.</p>
                            ) : items.map((it, ii) => (
                              <div key={it.id || ii} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                                <input
                                  value={it.term || it.label || ''}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[ii] = { ...next[ii], term: e.target.value, label: e.target.value };
                                    const updated = {
                                      ...(editingSlideRef.current ?? editingSlide),
                                      data: { ...(editingSlide.data || {}), items: next },
                                    };
                                    editingSlideRef.current = updated;
                                    setEditingSlide(updated);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white outline-none focus:border-indigo-500"
                                  placeholder={`Item ${ii + 1} title`}
                                />
                                <textarea
                                  rows={3}
                                  value={it.definition || it.content || ''}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[ii] = { ...next[ii], definition: e.target.value, content: e.target.value };
                                    const updated = {
                                      ...(editingSlideRef.current ?? editingSlide),
                                      data: { ...(editingSlide.data || {}), items: next },
                                    };
                                    editingSlideRef.current = updated;
                                    setEditingSlide(updated);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none"
                                  placeholder="Short bullets shown on reveal (one per line). Put spoken explanation in Narration, not here."
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <EditSlideItemFields
                        slide={editingSlide}
                        onPatch={(updated) => {
                          editingSlideRef.current = updated;
                          setEditingSlide(updated);
                        }}
                      />
                    </>
                  )}


                  {editDrawerTab === 'audio' && (
                    <>
                      <div className="p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-xl text-xs text-emerald-300 space-y-1.5">
                        <p><strong>ISD Best Practice:</strong> Narration should <em>expand</em> on what's on screen — never read line-by-line. Aim for conversational, explanatory language.</p>
                        <p className="text-amber-200/90"><strong>Note:</strong> Editing this script does not change the spoken audio until you click <em>Regenerate audio</em> below (or Edit → Regenerate all narration). Use <em>Save</em> before refreshing so your draft is not lost.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>Main Slide Audio Narration</span>
                          <span className={`normal-case font-normal ${voiceOverEnabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {voiceOverEnabled ? '🔊 Voice-Over Enabled' : '🔇 Voice-Over Off'}
                          </span>
                        </label>
                        <textarea
                          rows={8}
                          value={editingSlide.voiceOverText || ''}
                          onChange={(e) => {
                            const updated = { ...(editingSlideRef.current ?? editingSlide), voiceOverText: e.target.value };
                            editingSlideRef.current = updated;
                            setEditingSlide(updated);
                          }}
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
                       {(editingSlide.type === 'tabbed-horizontal' || editingSlide.type === 'tabbed-vertical') && (() => {
                         const tabs: any[] = editingSlide.data?.tabs || editingSlide.data?.items || [];
                         if (!tabs.length) return null;
                         const listKey = Array.isArray(editingSlide.data?.tabs) ? 'tabs' : 'items';
                         return (
                           <div className="space-y-3 pt-2 border-t border-slate-800">
                             <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                               Per-tab interaction audio
                             </p>
                             {tabs.map((tab: any, ti: number) => (
                               <div key={tab.id || ti} className="space-y-1.5">
                                 <label className="text-xs font-bold text-emerald-300/90">
                                   Tab: {tab.label || `Tab ${ti + 1}`}
                                 </label>
                                 <textarea
                                   rows={3}
                                   value={tab.voiceOverText || ''}
                                   onChange={(e) => {
                                     const nextTabs = tabs.map((t: any, i: number) =>
                                       i === ti ? { ...t, voiceOverText: e.target.value } : t
                                     );
                                     setEditingSlide({
                                       ...editingSlide,
                                       data: { ...(editingSlide.data || {}), [listKey]: nextTabs },
                                     });
                                   }}
                                   className="w-full bg-slate-950 border border-emerald-700/30 rounded-xl px-3 py-2 text-emerald-100/90 focus:border-emerald-500 outline-none text-sm resize-none"
                                   placeholder={`Narration when learner opens “${tab.label || `Tab ${ti + 1}`}”…`}
                                 />
                               </div>
                             ))}
                           </div>
                         );
                       })()}
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
                                 {canUseAllVoices(userPlan) && (
                                   <>
                                     <option value="echo">Echo — Male / Measured</option>
                                     <option value="fable">Fable — Male / Warm</option>
                                     <option value="onyx">Onyx — Male / Deep</option>
                                     <option value="nova">Nova — Female / Bright</option>
                                     <option value="shimmer">Shimmer — Female / Soft</option>
                                   </>
                                 )}
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
                                const mainText = (editingSlide.voiceOverText || editingSlide.narration || editingSlide.content || '').trim();
                                const listKey = Array.isArray(editingSlide.data?.tabs)
                                  ? 'tabs'
                                  : Array.isArray(editingSlide.data?.items)
                                    ? 'items'
                                    : null;
                                const tabs: any[] = listKey ? [...(editingSlide.data?.[listKey] || [])] : [];
                                const tabJobs = tabs
                                  .map((t, i) => ({ t, i, text: (t?.voiceOverText || '').trim() }))
                                  .filter(j => j.text);
                                if (!mainText && !tabJobs.length) {
                                  alert('No narration text to regenerate.');
                                  return;
                                }
                                setRegenSlideId(editingSlide.id);
                                try {
                                  const { generateSlideTTS: genTTS, urlToDataUrl } = await import('./services/ttsService');
                                  const toDurable = async (blobUrl: string) => {
                                    try { return await urlToDataUrl(blobUrl); } catch { return blobUrl; }
                                  };
                                  let nextSlide = { ...editingSlide };
                                  const synthetic = isSyntheticSlideId(editingSlide.id);

                                  if (mainText) {
                                    showDraftMessage('Generating main slide audio…');
                                    const blobUrl = await genTTS(mainText, { voice: ttsVoice as any });
                                    const durable = await toDurable(blobUrl);
                                    nextSlide = { ...nextSlide, voiceOverUrl: durable };
                                    if (synthetic) {
                                      // Injected slides are not in course.modules — persist via syntheticAudioMap
                                      setSyntheticAudioMap(prev => ({ ...prev, [editingSlide.id]: durable }));
                                      setSyntheticSlideOverrides(prev => ({
                                        ...prev,
                                        [editingSlide.id]: {
                                          ...(prev[editingSlide.id] || {}),
                                          content: nextSlide.content,
                                          voiceOverText: mainText,
                                        },
                                      }));
                                    } else {
                                      handleUpdateSlideMedia(editingSlide.id, { voiceOverUrl: durable });
                                    }
                                  }
                                  if (!synthetic && listKey && tabJobs.length) {
                                    const nextTabs = [...tabs];
                                    for (let n = 0; n < tabJobs.length; n++) {
                                      const job = tabJobs[n];
                                      showDraftMessage(`Generating tab audio ${n + 1}/${tabJobs.length}…`);
                                      const tabUrl = await toDurable(await genTTS(job.text, { voice: ttsVoice as any }));
                                      nextTabs[job.i] = { ...nextTabs[job.i], voiceOverUrl: tabUrl };
                                      await new Promise(r => setTimeout(r, 200));
                                    }
                                    nextSlide = {
                                      ...nextSlide,
                                      data: { ...(nextSlide.data || {}), [listKey]: nextTabs },
                                    };
                                    setCourse(prev => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        modules: prev.modules.map((m: any) => ({
                                          ...m,
                                          slides: m.slides.map((s: any) =>
                                            s.id === editingSlide.id
                                              ? { ...s, voiceOverUrl: nextSlide.voiceOverUrl ?? s.voiceOverUrl, data: nextSlide.data }
                                              : s
                                          ),
                                        })),
                                      };
                                    });
                                  }
                                  editingSlideRef.current = nextSlide;
                                  setEditingSlide(nextSlide);
                                  showDraftMessage('Audio regenerated for all narration sections ✓');
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
                        {(editingSlide?.voiceOverUrl || editingSlide?.audioUrl || (editingSlide?.id && syntheticAudioMap[editingSlide.id])) && (
                          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                            <p className="text-xs text-emerald-400 font-bold">✅ Audio ready for this slide</p>
                          </div>
                        )}
                      </>
                    )}

                  {editDrawerTab === 'regenerate' && editingSlide && (() => {
                    const slideId = String(editingSlide.id || '');
                    const isCoverOrTitle =
                      slideId === '__cover__' ||
                      editingSlide.type === 'cover' ||
                      editingSlide.type === 'title';
                    const isSynthetic = slideId.startsWith('__');
                    const intendedType = normalizeRegenSlideType(editingSlide);
                    const isKc =
                      KNOWLEDGE_CHECK_TYPES.has(editingSlide.type as string) ||
                      KNOWLEDGE_CHECK_TYPES.has(intendedType) ||
                      /^knowledge\s*check/i.test(String(editingSlide.title || '')) ||
                      ['matching', 'sorting', 'drop-targets', 'quiz', 'multiple-answers', 'true-false'].includes(intendedType);
                    const contentOptions = [
                      { id: 'content', label: 'Plain content' },
                      { id: 'diagram', label: 'Diagram' },
                      { id: 'tabbed-horizontal', label: 'Process' },
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
                    const primaryOptions = isKc ? kcOptions : contentOptions;
                    const secondaryOptions = isKc ? contentOptions : kcOptions;
                    const effectiveType = regenNoInteraction ? 'content' : regenTargetType;

                    if (isCoverOrTitle) {
                      return (
                        <div className="space-y-4">
                          <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                            This is the course title slide. Title layout (bold subject / lighter subtitle) is applied automatically from the course title — edit the title under <strong>Edit Text</strong>, then regenerate the cover image here if you want a new visual.
                          </div>
                          <button
                            disabled={isRegenSlideRunning || isGeneratingImages}
                            onClick={async () => {
                              if (!editingSlide || !course) return;
                              const slideSnapshot = editingSlide;
                              editingSlideRef.current = null;
                              setEditingSlide(null);
                              setIsRegenSlideRunning(true);
                              try {
                                const nextTitle = (slideSnapshot.title || course.title || '').trim();
                                pushUndo();
                                setCourse((prev: any) => prev ? {
                                  ...prev,
                                  title: nextTitle || prev.title,
                                  description: (slideSnapshot.content || prev.description || '').trim() || prev.description,
                                } : prev);
                                showDraftMessage('Updating title slide…');
                                const { generateCourseCoverImage } = await import('./services/imageService');
                                setIsGeneratingImages(true);
                                try {
                                  const cover = await generateCourseCoverImage(
                                    nextTitle || course.title || 'Course',
                                    slideSnapshot.content || course.description || ''
                                  );
                                  if (cover) {
                                    setCourse((prev: any) => prev ? { ...prev, coverImage: cover } : prev);
                                    setCourseBg(cover);
                                  }
                                  showDraftMessage('Title slide updated ✓');
                                } finally {
                                  setIsGeneratingImages(false);
                                }
                              } catch (err: any) {
                                console.error('[Edit Slide] Cover regenerate failed:', err);
                                showDraftMessage(err?.message || 'Could not regenerate title slide.');
                                alert(err?.message || 'Could not regenerate title slide.');
                              } finally {
                                setIsRegenSlideRunning(false);
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                          >
                            {isRegenSlideRunning || isGeneratingImages ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</>
                            ) : (
                              <><RefreshCw className="w-4 h-4" /> Regenerate Cover Image</>
                            )}
                          </button>
                          {(isRegenSlideRunning || isGeneratingImages) && (
                            <div className="relative h-1.5 w-full rounded-full bg-amber-900/40 overflow-hidden" aria-hidden>
                              <div className="regen-progress-indeterminate bg-amber-400" />
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (isSynthetic) {
                      return (
                        <div className="space-y-4">
                          <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                            This is a <strong className="text-amber-100">system slide</strong> (objectives, module overview, player tour, etc.).
                            It can’t be rebuilt as Tabs, Click &amp; Reveal, or a knowledge check.
                            Use <strong className="text-white">Edit Text</strong> or <strong className="text-white">Audio</strong> to change this slide.
                            Open a regular content or knowledge-check slide to regenerate interactions.
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                          Regenerate only this slide. Intended type: <strong className="text-amber-100">{intendedType}</strong>.
                          Confirm or change it below, then click Regenerate.
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
                          <>
                            <div className="space-y-2">
                              <p className="text-[11px] font-extrabold text-yellow-300 uppercase tracking-widest">
                                {isKc ? 'Knowledge check type' : 'Interactive element'}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {primaryOptions.map(opt => (
                                  <button
                                    key={opt.id || `regen-primary-${opt.label}`}
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
                                    {intendedType === opt.id && regenTargetType !== opt.id ? (
                                      <span className="block text-[9px] font-normal text-slate-500 mt-0.5">current</span>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[11px] font-extrabold text-yellow-300 uppercase tracking-widest">
                                {isKc ? 'Or switch to interactive element' : 'Or switch to knowledge check'}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {secondaryOptions.map(opt => (
                                  <button
                                    key={opt.id || `regen-secondary-${opt.label}`}
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
                          </>
                        )}
                        <button
                          disabled={isRegenSlideRunning}
                          onClick={async () => {
                            if (!editingSlide || !course) return;
                            if (isSynthetic) {
                              showDraftMessage('This system slide can’t be regenerated as an interaction. Edit its text under Edit Text, or use Media tools for audio.');
                              return;
                            }
                            const slideSnapshot = editingSlide;
                            const courseTitle = course.title ?? '';
                            const typeToBuild = effectiveType;
                            editingSlideRef.current = null;
                            setEditingSlide(null);
                            setIsRegenSlideRunning(true);
                            try {
                              const result = await regenerateSlideData(
                                slideSnapshot,
                                courseTitle,
                                typeToBuild
                              );
                              const slideExists = (course.modules || []).some((m: any) =>
                                (m.slides || []).some((s: any) => s.id === slideSnapshot.id)
                              );
                              if (!slideExists) {
                                throw new Error('Could not find this slide in the course to update. Try closing Edit and opening the slide again.');
                              }
                              pushUndo();
                              setCourse((prev: any) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  modules: prev.modules.map((m: any) => ({
                                    ...m,
                                    slides: m.slides.map((s: any) => {
                                      if (s.id !== slideSnapshot.id) return s;
                                      const nextData = result.data !== undefined ? { ...result.data } : { ...(s.data || {}) };
                                      if (result.type === 'tabbed-vertical' && slideSnapshot.data?.tabSkin) {
                                        nextData.tabSkin = slideSnapshot.data.tabSkin;
                                      }
                                      if (result.type === 'tabbed-horizontal') {
                                        if (slideSnapshot.data?.tabSkin) nextData.tabSkin = slideSnapshot.data.tabSkin;
                                        if (slideSnapshot.data?.blocksWellColor) nextData.blocksWellColor = slideSnapshot.data.blocksWellColor;
                                        if (slideSnapshot.data?.showProcessStepLabels === false) nextData.showProcessStepLabels = false;
                                      }
                                      return {
                                        ...s,
                                        type: result.type,
                                        data: nextData,
                                        content: result.content != null ? result.content : s.content,
                                        voiceOverText: result.voiceOverText || s.voiceOverText,
                                        narration: result.voiceOverText || s.narration,
                                      };
                                    }),
                                  })),
                                };
                              });
                              setQcReport(prev => prev ? {
                                ...prev,
                                issues: prev.issues.filter(i =>
                                  !(i.slideId === slideSnapshot.id && (i.type === 'interaction_empty' || i.fixActions?.includes('regenerate')))
                                ),
                              } : null);
                              showDraftMessage(
                                isTabOrientationSwap(slideSnapshot, typeToBuild)
                                  ? 'Tab layout switched — existing content kept ✓'
                                  : 'Slide regenerated ✓'
                              );
                            } catch (err: any) {
                              console.error('[Edit Slide] Regenerate failed:', err);
                              const msg = String(err?.message || err || '');
                              const hint = /failed to fetch|networkerror|load failed|timeout/i.test(msg)
                                ? 'API unreachable (often a cold start). Wait ~20s and try Regenerate again.'
                                : (msg || 'Regeneration failed. Please try again.');
                              showDraftMessage(hint);
                              alert(hint);
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
                        {isRegenSlideRunning && (
                          <div className="relative h-1.5 w-full rounded-full bg-amber-900/40 overflow-hidden" aria-hidden>
                            <div className="regen-progress-indeterminate bg-amber-400" />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/40 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => { editingSlideRef.current = null; setEditingSlide(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-white/80 bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  {editDrawerTab !== 'regenerate' && (
                  <button
                    onClick={() => {
                      if (editingSlideRef.current) {
                        const latest = {
                          ...editingSlideRef.current,
                          content: sanitizeOstText(String(editingSlideRef.current.content || '')),
                        };
                        editingSlideRef.current = latest;
                        pushUndo();
                        if (isSyntheticSlideId(latest.id)) {
                          // Cover / module title / overview / tour / objectives are injected — not in course.modules
                          setSyntheticSlideOverrides(prev => ({
                            ...prev,
                            [latest.id]: { content: latest.content, voiceOverText: latest.voiceOverText },
                          }));
                          if (latest.voiceOverUrl) {
                            setSyntheticAudioMap(prev => ({ ...prev, [latest.id]: latest.voiceOverUrl as string }));
                          }
                          if (latest.id === '__course-objectives__' && Array.isArray((latest as any)._objectives)) {
                            setLearningObjectives((latest as any)._objectives);
                          }
                        } else {
                          setCourse((prevCourse: any) => {
                            if (!prevCourse) return prevCourse;
                            // Also sanitize tab/item OST so generated courses don't keep symbol-only bullets
                            const slideToSave = sanitizeInteractionOstOnSave(latest);
                            return {
                              ...prevCourse,
                              modules: prevCourse.modules.map((m: any) => ({
                                ...m,
                                slides: m.slides.map((s: any) => s.id === slideToSave.id ? slideToSave : s)
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

        <WelcomeTourModal
          open={showWelcomeTour}
          onClose={() => {
            dismissWelcomeTourForSession();
            setShowWelcomeTour(false);
          }}
        />

        {/* ★ Player Properties Modal ★ */}
        <AnimatePresence>
          {showUploadPathModal && (pendingUploadFile || uploadedFile) && (
            <UploadPathModal
              fileName={(pendingUploadFile || uploadedFile)!.name}
              onConfirm={confirmUploadPath}
              onCancel={cancelUploadPath}
              onViewCourseSettings={viewCourseSettingsFromUploadPath}
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

        {/* Media progress — bottom-center; visible during preview while TTS runs */}
        <TTSProgressToast
          progress={ttsProgress}
          onDismiss={clearTTSProgress}
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
                   "flex-1 overflow-y-auto p-8 bg-white custom-scrollbar theme-light interaction-light-fix InteractionPreviewBodyWrapper",
                   previewModalViewMode === 'mobile' && "flex items-center justify-center bg-slate-100"
                 )}>
                     <div className={cn(
                       previewModalViewMode === 'mobile'
                         ? "w-[min(96vw,calc((100vh-8rem)*16/9))] h-[min(calc(100vh-8rem),calc(96vw*9/16))] max-w-[1280px] max-h-[720px] overflow-x-visible overflow-y-auto rounded-[2rem] border-[10px] border-slate-300 bg-white shadow-2xl p-3"
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
                              ]} theme="light" />
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
                         {previewModalOption === 'Click & Reveal' && (
                           <div className="w-full max-w-2xl">
                             <ClickRevealInteraction
                               theme="light"
                               items={[
                                 { id: '1', term: 'Phishing', definition: 'A social engineering attack that uses disguised emails or messages to steal credentials or install malware.' },
                                 { id: '2', term: 'Multi-factor authentication', definition: 'A security method requiring two or more verification factors — something you know, have, or are.' },
                                 { id: '3', term: 'Need-to-know principle', definition: 'Limiting access to sensitive information only to people who need it to perform their job.' },
                               ]}
                             />
                           </div>
                         )}
                         {previewModalOption === 'Process' && (
                            <div className="w-full max-w-2xl">
                              <TabbedHorizontal theme="light" tabs={[
                                { id: '1', label: 'Overview', content: 'Welcome to this interactive learning module. Use the tabs to navigate between sections. Each section builds on the previous one to support progressive mastery.' },
                                { id: '2', label: 'Key Concepts', content: 'This section covers the essential principles and frameworks. Take time to understand each before moving on.' },
                                { id: '3', label: 'Practice', content: 'Apply what you have learned through real-world scenarios and hands-on exercises.' },
                                { id: '4', label: 'Summary', content: 'Review the key takeaways from this module and test your knowledge with a quick knowledge check.' },
                              ]} />
                            </div>
                         )}
                         {previewModalOption === 'Tabs (Vertical)' && (
                            <div className="w-full max-w-2xl">
                              <TabbedVertical theme="light" tabs={[
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
                              <CarouselPanel theme="light" cards={[
                                { id: 'c1', label: 'Discover', description: 'Gather requirements, understand learner needs, and analyze existing content to identify key learning gaps.', color: CAROUSEL_CARD_HEX[0], expandedContent: 'During the discovery phase, we use surveys, interviews, and performance data to build a clear picture of what learners already know and what they need to learn.' },
                                { id: 'c2', label: 'Design', description: 'Develop the instructional design blueprint including objectives, module structure, and interaction types.', color: CAROUSEL_CARD_HEX[1], expandedContent: 'In the design phase, we create storyboards, wireframes, and learning maps that guide the content authoring process.' },
                                { id: 'c3', label: 'Develop', description: 'Build the actual course content, interactions, assessments, and media elements.', color: CAROUSEL_CARD_HEX[2], expandedContent: 'Development transforms the design documents into a fully functional eLearning experience using tools like NexCourse AI.' },
                                { id: 'c4', label: 'Deliver', description: 'Deploy the course to your LMS and roll it out to your learner audience.', color: CAROUSEL_CARD_HEX[3], expandedContent: 'During delivery, we ensure SCORM compliance, LMS compatibility, and learner access before launch.' },
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

      {/* Global status toast — Drafts panel is often closed, so preview actions need visible feedback */}
      <AnimatePresence>
        {draftSaveMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] max-w-lg w-[min(92vw,32rem)] pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div className={cn(
              'rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md flex items-center gap-2',
              isSavingDraft || /saving|updating|overwriting/i.test(draftSaveMessage)
                ? 'bg-slate-900/95 border-indigo-500/40 text-indigo-100'
                : /fail|error|cannot|can’t|quota|not found/i.test(draftSaveMessage)
                  ? 'bg-amber-950/95 border-amber-600/40 text-amber-100'
                  : /eligible|skipped|system slide/i.test(draftSaveMessage)
                    ? 'bg-slate-900/95 border-slate-600 text-slate-100'
                    : 'bg-emerald-950/95 border-emerald-600/40 text-emerald-100'
            )}>
              {(isSavingDraft || /saving|updating|overwriting/i.test(draftSaveMessage)) && (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-300" />
              )}
              {draftSaveMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={leavePreviewOpen}
        title="Leave course development?"
        body="Drafts are not autosaved. Leave only if you already saved, or you may lose edits on this course."
        primaryLabel="Leave"
        cancelLabel="Stay"
        onPrimary={() => {
          setLeavePreviewOpen(false);
          const fn = leavePreviewConfirmRef.current;
          leavePreviewConfirmRef.current = null;
          fn?.();
        }}
        onCancel={() => {
          setLeavePreviewOpen(false);
          leavePreviewConfirmRef.current = null;
        }}
      />

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
      <p className="text-slate-900 font-bold text-lg mb-1">Which of the following are animals?</p>
      <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-3">Select all correct answers</p>
      {maOpts.map((opt, i) => {
        const isSelected = maSelected.includes(i);
        const isCorrect = correctSet.includes(i);
        let cls = 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700';
        if (maSubmitted) {
          if (isCorrect && isSelected) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800';
          else if (isCorrect) cls = 'border-emerald-400/60 text-emerald-700 border-dashed bg-transparent';
          else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-700';
        } else if (isSelected) cls = 'border-indigo-500 bg-indigo-50 text-indigo-800';
        return (
          <div key={i} onClick={() => !maSubmitted && setMaSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${cls}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
              {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
            </div>
            <span className="text-sm font-medium">{opt}</span>
            {maSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
          </div>
        );
      })}
      {!maSubmitted ? (
        <button onClick={() => setMaSubmitted(true)} disabled={maSelected.length === 0}
          className="mt-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all">
          Submit Answers
        </button>
      ) : (
        <div className={`mt-2 p-3 rounded-xl font-bold text-sm flex items-center gap-2 ${isAllCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {isAllCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {isAllCorrect ? 'Correct! Rabbit, Dog, and Cat are animals.' : 'Not quite — only Rabbit, Dog, and Cat are animals.'}
        </div>
      )}
    </div>
  );
}



