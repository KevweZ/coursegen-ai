export type GameTemplateType = 
  | 'jeopardy'
  | 'millionaire'
  | 'family-feud'
  | 'escape-room'
  | 'spin-wheel'
  | 'price-is-right';

export interface BaseGameTemplate {
  templateType: GameTemplateType;
  audienceType: 'corporate' | 'k12';
  difficultyLevel: 'quick' | 'standard' | 'comprehensive';
  title: string;
  instructions: string;
  theme?: string; // e.g. 'Forest', 'Corporate Office'
  scoringEnabled?: boolean;
  timerEnabled?: boolean;
}

// ---------------------------------------------------------
// 1. JEOPARDY-STYLE KNOWLEDGE BOARD
// ---------------------------------------------------------
export interface JeopardyQuestion {
  id: string;
  value: number; // e.g., 100, 200, 300
  prompt: string;
  correctAnswer: string;
  options?: string[]; // When provided, renders as multiple choice instead of text input
  hint?: string;
  isDailyDouble?: boolean;
}

export interface JeopardyCategory {
  id: string;
  name: string;
  questions: JeopardyQuestion[];
}

export interface JeopardyPayload extends BaseGameTemplate {
  templateType: 'jeopardy';
  gamePayload: {
    categories: JeopardyCategory[];
    deductPointsOnWrong?: boolean;
  };
}

// ---------------------------------------------------------
// 2. WHO WANTS TO BE A MILLIONAIRE
// ---------------------------------------------------------
export interface MillionaireQuestion {
  id: string;
  prompt: string;
  options: string[]; // exactly 4 options
  correctAnswer: string;
  value: number; // e.g., 100, 500, 1000
  hint?: string;
  isSafeHaven?: boolean;
}

export interface MillionaireLifeline {
  type: '5050' | 'phone-friend' | 'ask-audience';
  available: boolean;
}

export interface MillionairePayload extends BaseGameTemplate {
  templateType: 'millionaire';
  gamePayload: {
    questions: MillionaireQuestion[]; // strictly ordered by difficulty
    lifelines: MillionaireLifeline[];
  };
}

// ---------------------------------------------------------
// 3. FAMILY FEUD
// ---------------------------------------------------------
export interface FamilyFeudAnswer {
  id: string;
  text: string;
  points: number; // e.g., 45, 20, 10
  synonyms: string[]; // For fuzzy matching ("car" -> "auto, automobile, vehicle")
  explanation?: string;
}

export interface FamilyFeudRound {
  id: string;
  prompt: string;
  answers: FamilyFeudAnswer[]; // Ranked list
}

export interface FamilyFeudPayload extends BaseGameTemplate {
  templateType: 'family-feud';
  gamePayload: {
    rounds: FamilyFeudRound[];
    maxStrikesPerRound: number; // Usually 3
  };
}

// ---------------------------------------------------------
// 4. DIGITAL ESCAPE ROOM
// ---------------------------------------------------------
export interface EscapeRoomLock {
  id: string;
  type: 'code' | 'choice' | 'sequence';
  prompt: string;
  correctAnswer: string | string[]; // Single string for code, array for sequence
  hint?: string;
}

export interface EscapeRoomStage {
  id: string;
  title: string;
  narrativeText: string;
  clues: string[];
  lock: EscapeRoomLock;
}

export interface EscapeRoomPayload extends BaseGameTemplate {
  templateType: 'escape-room';
  gamePayload: {
    scenarioIntro: string;
    stages: EscapeRoomStage[]; // Progressive gates
    successOutro: string;
  };
}

// ---------------------------------------------------------
// 5. SPIN THE WHEEL
// ---------------------------------------------------------
export interface SpinWheelSegment {
  id: string;
  label: string;
  color?: string;
  questionPool: { prompt: string; correctAnswer: string; options?: string[] }[];
}

export interface SpinWheelPayload extends BaseGameTemplate {
  templateType: 'spin-wheel';
  gamePayload: {
    segments: SpinWheelSegment[];
    spinsAllowed: number;
  };
}

// ---------------------------------------------------------
// 6. PRICE IS RIGHT
// ---------------------------------------------------------
export interface PriceIsRightItem {
  id: string;
  name: string;
  description: string;
  correctValue: number;
  toleranceRange?: number; // e.g., if set to 50, answer within +/- 50 is accepted (or exact for classic rules)
  explanation?: string;
}

export interface PriceIsRightPayload extends BaseGameTemplate {
  templateType: 'price-is-right';
  gamePayload: {
    items: PriceIsRightItem[];
    showcaseVariant?: boolean; // If true, round 3 requires guessing summary of all items
  };
}

// ---------------------------------------------------------
// MASTER UNION TYPE
// ---------------------------------------------------------
export type GameTemplatePayload =
  | JeopardyPayload
  | MillionairePayload
  | FamilyFeudPayload
  | EscapeRoomPayload
  | SpinWheelPayload
  | PriceIsRightPayload;
