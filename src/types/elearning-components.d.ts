declare module '@zomako/elearning-components/dist/elearning-components.es.js' {
  import { ReactNode } from 'react';

  export interface AccordionItem {
    id: string;
    title: string;
    content: ReactNode;
  }

  export interface AccordionProps {
    items: AccordionItem[];
    allowMultiple?: boolean;
    defaultOpenId?: string | string[];
  }

  export const Accordion: React.FC<AccordionProps>;

  export interface Flashcard {
    front: string;
    back: string;
  }

  export interface FlashcardDeckProps {
    cards: Flashcard[];
  }

  export const FlashcardDeck: React.FC<FlashcardDeckProps>;

  export interface TimelineEvent {
    id: string;
    year: string;
    title: string;
    content: ReactNode;
  }

  export interface InteractiveTimelineProps {
    events: TimelineEvent[];
    defaultActiveId?: string;
  }

  export const InteractiveTimeline: React.FC<InteractiveTimelineProps>;

  export interface SortableItem {
    id: string;
    content: string;
  }

  export interface SortingActivityProps {
    items: SortableItem[];
    correctOrder: string[];
    onComplete: (result: { isCorrect: boolean }) => void;
  }

  export const SortingActivity: React.FC<SortingActivityProps>;

  export interface MatchItem {
    id: string;
    content: string;
    matchId: string;
  }

  export interface MatchTarget {
    id: string;
    content: string;
  }

  export interface MatchingActivityProps {
    items: MatchItem[];
    targets: MatchTarget[];
    onComplete: (result: { score: number; correct: number; total: number }) => void;
  }

  export const MatchingActivity: React.FC<MatchingActivityProps>;

  export interface DraggableItem {
    id: string;
    content: string;
  }

  export interface DropTarget {
    id: string;
    accepts: string[];
    label: string;
  }

  export interface DragAndDropProps {
    items: DraggableItem[];
    targets: DropTarget[];
    onComplete: (result: { score: number; correct: number; total: number }) => void;
  }

  export const DragAndDropActivity: React.FC<DragAndDropProps>;

  export interface Choice {
    id: string;
    text: string;
    nextNodeId: string;
    condition?: (variables: any) => boolean;
    outcomes?: any[];
    isCorrectPath?: boolean;
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

  export interface BranchingScenarioProps {
    nodes: Record<string, ScenarioNode>;
    startNodeId: string;
    onComplete: (result: { score: number; path: string[]; variables: any }) => void;
  }

  export const BranchingScenario: React.FC<BranchingScenarioProps>;
}
