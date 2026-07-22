export type PresetId = 'quick' | 'standard' | 'comprehensive';
export type PathwayId = 'corporate';

export interface PresetConfig {
  id: PresetId;
  label: string;
  description: string;

  slideCountTarget: number;
  slideCountMin: number;
  slideCountMax: number;
  objectiveFormat: 'AB' | 'ABC' | 'ABCD';
  objectiveCountGuide: string;
  objectiveCountMin: number;
  objectiveCountMax: number;
  interactions: string[];

  includeModuleTitleSlides: boolean;
  includeObjectiveSlides: boolean;
  includeKnowledgeChecks: boolean;
  includeSummarySlides: boolean;
  includeExitTickets: boolean;

  objectiveGenStrategy: string;
  assessmentStrategy: string;
  instructionalStrategy: string;
}

export function getPresetOptions(pathway: PathwayId): PresetConfig[] {
  return [
    getPresetConfig(pathway, 'quick'),
    getPresetConfig(pathway, 'standard'),
    getPresetConfig(pathway, 'comprehensive'),
  ];
}

export function getPresetConfig(pathway: PathwayId, presetId: PresetId): PresetConfig {
  switch (presetId) {
    case 'quick':
      return {
        id: 'quick',
        label: 'Quick Overview',
        description: '3-5 min • Awareness-level intro',
        slideCountTarget: 6,
        slideCountMin: 5,
        slideCountMax: 8,
        objectiveFormat: 'AB',
        objectiveCountGuide: '1-2',
        objectiveCountMin: 1,
        objectiveCountMax: 2,
        interactions: ['quiz', 'accordion', 'flashcards', 'click-reveal'],
        includeModuleTitleSlides: false,
        includeObjectiveSlides: false,
        includeKnowledgeChecks: true,
        includeSummarySlides: false,
        includeExitTickets: false,
        objectiveGenStrategy: 'Generate EXACTLY 1 or 2 highly focused AB format objectives. Awareness-level only (Know, Recognize, Identify). Do NOT exceed 2 objectives.',
        assessmentStrategy: 'Generate 1-2 simple knowledge check questions at the very end. No mastery tracking required.',
        instructionalStrategy: 'Keep it extremely brief. Focus on the most critical takeaways. Assess quickly at the end.',
      };
    case 'standard':
      return {
        id: 'standard',
        label: 'Standard Training',
        description: '10-15 min • Structured modules with assessments',
        slideCountTarget: 17,
        slideCountMin: 15,
        slideCountMax: 20,
        objectiveFormat: 'ABC',
        objectiveCountGuide: '3-4',
        objectiveCountMin: 3,
        objectiveCountMax: 4,
        interactions: ['quiz', 'sorting', 'hotspot', 'tabbed-vertical', 'click-reveal'],
        includeModuleTitleSlides: true,
        // Off by default: the auto-injected "Module X — Overview" slide already
        // displays this module's objective (and sub-objectives) directly from the
        // canonical learningObjectives list. A separate AI-authored objectives
        // slide duplicated that content with different, disconnected wording.
        includeObjectiveSlides: false,
        includeKnowledgeChecks: true,
        includeSummarySlides: true,
        includeExitTickets: false,
        objectiveGenStrategy: 'Generate EXACTLY 3 to 4 ABC format objectives. Mix Bloom\'s levels: Knowledge, Comprehension, Application.',
        assessmentStrategy: 'Generate a knowledge check at the end of each module, plus a short 5-question summary quiz at the end.',
        instructionalStrategy: 'Follow adult learning principles. Multiple modules, test within each module, summarize at the end.',
      };
    case 'comprehensive':
      return {
        id: 'comprehensive',
        label: 'Comprehensive Course',
        description: '20-30 min • Full curriculum with mastery tracking',
        slideCountTarget: 35,
        slideCountMin: 30,
        slideCountMax: 40,
        objectiveFormat: 'ABCD',
        objectiveCountGuide: '5+',
        objectiveCountMin: 5,
        objectiveCountMax: 7,
        interactions: ['quiz', 'timeline', 'matching', 'accordion', 'flashcards', 'tabbed-vertical', 'carousel-panel'],
        includeModuleTitleSlides: true,
        // See note in 'standard' preset above — the Module Overview slide already
        // covers this module's objective, so a separate objectives slide is redundant.
        includeObjectiveSlides: false,
        includeKnowledgeChecks: true,
        includeSummarySlides: true,
        includeExitTickets: false,
        objectiveGenStrategy: 'Generate EXACTLY 5 to 7 detailed ABCD format objectives (Audience, Behavior, Condition, Degree). Cover Application, Analysis, Synthesis, Evaluation levels.',
        assessmentStrategy: 'Generate a pre-assessment, module-level checks, and a comprehensive mastery quiz (Kirkpatrick Level 2) requiring a passing score.',
        instructionalStrategy: 'Deep-dive mastery course. Use Timelines, complex interactions. Strict pre-assessments and mastery checks throughout.',
      };
  }

  throw new Error(`Invalid preset: ${presetId}`);
}
