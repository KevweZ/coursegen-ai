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
}

export interface CourseSettings {
  voiceOverEnabled: boolean;
  soundEffectsEnabled: boolean;
  theme: 'light' | 'dark' | 'unified';
  pathway?: 'corporate' | 'k12';
  k12config?: {
    gradeLevel: string;
    unitTitle?: string;
    lessonTitle?: string;
    standards?: string;
    uiStyle: 'early' | 'upper';
    includeFormative: boolean;
  };
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
  | 'content' 
  | 'quiz' 
  | 'interaction' 
  | 'intro' 
  | 'outro' 
  | 'accordion' 
  | 'flashcards' 
  | 'timeline' 
  | 'sorting' 
  | 'matching' 
  | 'drag-drop-activity' 
  | 'branching'
  | 'hotspot'
  | 'game-template';

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

export interface ScenarioNode {
  id: string;
  type: 'scenario' | 'ending';
  title: string;
  content: string;
  image?: string;
  choices: Choice[];
  feedback?: string;
  isDeadEnd?: boolean;
}

export interface Choice {
  id: string;
  text: string;
  nextNodeId: string;
  condition?: string;
  outcomes?: Outcome[];
  isCorrectPath?: boolean;
}

export interface Outcome {
  id: string;
  text: string;
  nextNodeId: string;
  scoreModifier?: number;
  variableUpdates?: Record<string, any>;
}

export interface Interaction {
  type: 'choice' | 'drag-drop' | 'hotspot';
  question: string;
  options: string[];
  correctAnswer: string | number;
  feedback: string;
}
