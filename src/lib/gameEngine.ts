import { GameTemplateType } from "../types/game";

export interface GameTemplateMeta {
  id: GameTemplateType;
  name: string;
  shortName: string;
  description: string;
  corporateUseCase: string;
  k12UseCase: string;
  primaryMechanic: string;
  corporateEmphasis: boolean;
  k12Emphasis: boolean;
  minPreset: 'quick' | 'standard' | 'comprehensive';
  multiplayerSupport: 'yes' | 'optional' | 'no';
  icon: string;
}

export const GAME_TEMPLATES: GameTemplateMeta[] = [
  {
    id: 'jeopardy',
    name: 'Knowledge Board (Jeopardy)',
    shortName: 'Jeopardy',
    description: 'A classic category-grid with escalating point values. Players pick category + difficulty. Bloom-aligned questions from recall → evaluation.',
    corporateUseCase: 'Post-training review, team competition, pre-training gap assessment',
    k12UseCase: 'Unit exam review, standards-aligned category practice',
    primaryMechanic: 'Grid selection, point accumulation',
    corporateEmphasis: true,
    k12Emphasis: true,
    minPreset: 'quick',
    multiplayerSupport: 'yes',
    icon: 'Grid3X3'
  },
  {
    id: 'millionaire',
    name: 'Millionaire Challenge',
    shortName: 'Millionaire',
    description: 'Linear progression with exponentially increasing difficulty and lifeline mechanics (50:50, Phone a Friend, Ask the Audience). Safe-haven checkpoints prevent losing all progress.',
    corporateUseCase: 'Compliance training, regulatory knowledge, certification prep',
    k12UseCase: 'Scaffolded mastery check, confidence-building with prior knowledge activation',
    primaryMechanic: 'Linear progression, lifelines',
    corporateEmphasis: true,
    k12Emphasis: true,
    minPreset: 'quick',
    multiplayerSupport: 'no',
    icon: 'Trophy'
  },
  {
    id: 'family-feud',
    name: 'Ranked Survey (Family Feud)',
    shortName: 'Family Feud',
    description: 'Brainstorm the most common answers to open-ended prompts. Ranked by popularity. Fuzzy matching allows synonym variations. 3-strike limit per round.',
    corporateUseCase: 'Sales training, soft skills, customer service, team-building icebreaker',
    k12UseCase: 'Brainstorming, vocabulary building, categories/classification activities',
    primaryMechanic: 'Survey-based ranked guessing',
    corporateEmphasis: true,
    k12Emphasis: true,
    minPreset: 'standard',
    multiplayerSupport: 'yes',
    icon: 'Users'
  },
  {
    id: 'escape-room',
    name: 'Digital Escape Room',
    shortName: 'Escape Room',
    description: 'A narrative-driven series of locked puzzle stages. Navigation is gated — the learner cannot advance until the current "lock" condition is met. Sequential and story-driven.',
    corporateUseCase: 'Cybersecurity awareness, onboarding, compliance, process training',
    k12UseCase: 'Cross-curricular problem solving, STEM challenges, collaborative narrative',
    primaryMechanic: 'Sequential puzzle unlocking',
    corporateEmphasis: true,
    k12Emphasis: true,
    minPreset: 'comprehensive', // Requires deep content — not appropriate for Quick Overview
    multiplayerSupport: 'optional',
    icon: 'Lock'
  },
  {
    id: 'spin-wheel',
    name: 'Spin the Wheel',
    shortName: 'Spin Wheel',
    description: 'A randomized, animated wheel selector. Learner spins to land on a category, then answers a question from that pool. High energy, low-stakes formative activity.',
    corporateUseCase: 'Microlearning refresher, team warm-up, preventing strategic avoidance',
    k12UseCase: 'Vocabulary review, math fact practice, whole-class participation game',
    primaryMechanic: 'Random category/question selector',
    corporateEmphasis: true, // Good for warm-ups
    k12Emphasis: true,
    minPreset: 'quick',
    multiplayerSupport: 'optional',
    icon: 'Loader2'
  },
  {
    id: 'price-is-right',
    name: 'Price Estimator',
    shortName: 'Price Is Right',
    description: 'Estimate the value/cost of an item or scenario without going over the actual answer. Tests judgment and intuition, not just factual recall.',
    corporateUseCase: 'Budget management, pricing strategy, procurement, financial literacy',
    k12UseCase: 'Math estimation, number sense, place value, science measurements',
    primaryMechanic: 'Estimation and bidding',
    corporateEmphasis: true,
    k12Emphasis: false, // Lesser emphasis for K-12
    minPreset: 'standard',
    multiplayerSupport: 'optional',
    icon: 'DollarSign'
  }
];

export function getRecommendedGames(
  preset?: 'quick' | 'standard' | 'comprehensive'
): GameTemplateMeta[] {
  // ALL templates are always shown — sort by corporate emphasis (Best Fit first)
  return [...GAME_TEMPLATES].sort((a, b) => {
    const aScore = a.corporateEmphasis ? 1 : 0;
    const bScore = b.corporateEmphasis ? 1 : 0;
    return bScore - aScore;
  });
}
