export interface TerminalObjectiveGroup {
  terminalObjective: string;
  enablingObjectives: string[];
}

export interface CourseOutline {
  title: string;
  description: string;
  learningObjectives: (string | TerminalObjectiveGroup)[];
  modules: Module[];
  settings?: CourseSettings;
  visualTheme?: string;
  examConfig?: ExamConfig;
  navigationMode?: NavigationMode;
}

export interface CourseSettings {
  voiceOverEnabled: boolean;
  soundEffectsEnabled: boolean;
  theme: 'light' | 'dark' | 'unified';
  pathway?: 'corporate' | 'game';
}

export interface LearningObjective {
  audience: string;
  behavior: string;
  condition: string;
  degree?: string;
}

export interface Module {
  id: string;
  title: string;
  slides: Slide[];
}

export type SlideType = 
  | 'title'
  | 'content' 
  | 'key-takeaways'
  | 'summary'
  | 'quiz' 
  | 'interaction' 
  | 'intro' 
  | 'outro' 
  | 'accordion' 
  | 'flashcards' 
  | 'timeline' 
  | 'sorting' 
  | 'matching'
  | 'hotspot'
  | 'game-template'
  | 'exam-intro'
  | 'mastery-exam'
  | 'exam-results'
  | 'scenario'
  | 'diagram'
  // Virtual / synthetic slide types (cast via `as any` in JSX, listed here for type safety)
  | 'cover'
  | 'module-cover'
  | 'module-overview'
  | 'course-objectives'
  | 'player-tour'
  | 'closing'
  | 'multiple-answers'
  | 'wheel-diagram'
  | 'tabbed-horizontal'
  | 'tabbed-vertical'
  | 'folder-explorer'
  | 'carousel-panel'
  | 'click-reveal';

export interface FloatingImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  content: string;
  narration?: string;
  mediaPrompt?: string;
  mediaUrl?: string | null;
  floatingMedia?: FloatingImage[];
  imagePlaceholder?: boolean;
  /** AI-generated banner image data URL for title/cover slides */
  coverImage?: string;
  voiceOverText?: string;
  voiceOverUrl?: string;
  interactions?: Interaction[];
  data?: any; // For complex interaction data
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  content: string;
}

export interface SortableItem {
  id: string;
  content: string;
}

export interface MatchItem {
  id: string;
  content: string;
  matchId: string;
}

export interface MatchTarget {
  id: string;
  content: string;
}

export interface DraggableItem {
  id: string;
  content: string;
}

export interface DropTarget {
  id: string;
  accepts: string[];
  label: string;
}


export interface Interaction {
  type: 'choice'  | 'hotspot';
  question: string;
  options: string[];
  correctAnswer: string | number;
  feedback: string;
  // Extended interaction data for complex types (cards, tabs, items etc.)
  [key: string]: any;
}

// ─── Mastery Quiz + Navigation ────────────────────────────────────────────────

export type ExamPresentationMode = 'one-at-a-time' | 'scroll-all';
export type NavigationMode = 'free' | 'linear' | 'restricted';

export interface ExamQuestion {
  id: string;
  type: 'mc' | 'ma' | 'tf';
  question: string;
  /** TF always uses ['True', 'False'] */
  options: string[];
  /** Index (MC/TF) or indices array (MA) */
  correctAnswer: number | number[];
  explanation?: string;
  moduleIndex?: number;
}

export type ExamQuestionType = 'mc' | 'ma' | 'tf' | 'sorting' | 'matching' | 'drop-targets';

export interface ExamConfig {
  enabled: boolean;
  passingScore: number;                     // 0-100, default 80
  questionMode: 'total' | 'per-module';
  questionCount: number;
  allowRetake: boolean;
  /** Mastery quiz + knowledge-check question/activity types */
  questionTypes: ExamQuestionType[];
  presentationMode: ExamPresentationMode;   // default 'one-at-a-time'
  /** How many in-module Knowledge Checks to generate */
  knowledgeCheckMode?: 'total' | 'per-module';
  knowledgeCheckCount?: number;
}

/** When Linear/Restricted: require exploring interactions before Next */
export type RequireInteractionsComplete = boolean;

export interface ExamSessionState {
  questions: ExamQuestion[];
  answers: Record<string, number | number[] | null>;
  currentQuestionIdx: number;
  submitted: boolean;
  score: number | null;
  passed: boolean | null;
}
