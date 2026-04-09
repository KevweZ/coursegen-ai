export type PresetId = 'quick' | 'standard' | 'comprehensive';
export type PathwayId = 'corporate' | 'k12';

export interface PresetConfig {
  id: PresetId;
  label: string;
  k12Label: string;
  description: string;
  k12Description: string;

  slideCountTarget: number;
  slideCountMin: number;
  slideCountMax: number;
  objectiveFormat: 'AB' | 'ABC' | 'ABCD' | 'k12_ican';
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
  if (pathway === 'corporate') {
    switch (presetId) {
      case 'quick':
        return {
          id: 'quick',
          label: 'Quick Overview',
          k12Label: 'Bell Ringer / Mini-Lesson',
          description: '3-5 min • Awareness-level intro',
          k12Description: '3-5 min • Morning work or quick intro activity',
          slideCountTarget: 6,
          slideCountMin: 5,
          slideCountMax: 8,
          objectiveFormat: 'AB',
          objectiveCountGuide: '1-2',
          objectiveCountMin: 1,
          objectiveCountMax: 2,
          // Corporate Quick: Multiple Choice, Accordion, Flashcards
          interactions: ['quiz', 'accordion', 'flashcards'],
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
          k12Label: 'Standard Lesson',
          description: '10-15 min • Structured modules with assessments',
          k12Description: '10-15 min • Core curriculum daily lesson block',
          slideCountTarget: 17,
          slideCountMin: 15,
          slideCountMax: 20,
          objectiveFormat: 'ABC',
          objectiveCountGuide: '3-4',
          objectiveCountMin: 3,
          objectiveCountMax: 4,
          // Corporate Standard: Drag & Drop, Sorting, Hotspots, Multiple Choice
          interactions: ['quiz', 'sorting', 'hotspot'],
          includeModuleTitleSlides: true,
          includeObjectiveSlides: true,
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
          k12Label: 'Unit Module / Deep Dive',
          description: '20-30 min • Full curriculum with mastery tracking',
          k12Description: '20-30 min • Multi-session unit with cross-curricular depth',
          slideCountTarget: 35,
          slideCountMin: 30,
          slideCountMax: 40,
          objectiveFormat: 'ABCD',
          objectiveCountGuide: '5+',
          objectiveCountMin: 5,
          objectiveCountMax: 7,
          // Corporate Comprehensive: Branching, Timeline, Matching, Drag & Drop
          interactions: ['quiz', 'branching', 'timeline', 'matching', 'accordion', 'flashcards'],
          includeModuleTitleSlides: true,
          includeObjectiveSlides: true,
          includeKnowledgeChecks: true,
          includeSummarySlides: true,
          includeExitTickets: false,
          objectiveGenStrategy: 'Generate EXACTLY 5 to 7 detailed ABCD format objectives (Audience, Behavior, Condition, Degree). Cover Application, Analysis, Synthesis, Evaluation levels.',
          assessmentStrategy: 'Generate a pre-assessment, module-level checks, and a comprehensive mastery quiz (Kirkpatrick Level 2) requiring a passing score.',
          instructionalStrategy: 'Deep-dive mastery course. Use Branching scenarios, Timelines, complex interactions. Strict pre-assessments and mastery checks throughout.',
        };
    }
  } else {
    // K-12 Pathway
    switch (presetId) {
      case 'quick':
        return {
          id: 'quick',
          label: 'Quick Overview',
          k12Label: 'Bell Ringer / Mini-Lesson',
          description: '3-5 min • Basic intro with quick quiz',
          k12Description: '3-5 min • Morning work or quick intro activity',
          slideCountTarget: 5,
          slideCountMin: 4,
          slideCountMax: 6,
          objectiveFormat: 'k12_ican',
          objectiveCountGuide: '1',
          objectiveCountMin: 1,
          objectiveCountMax: 1,
          // K-12 Quick: Flashcards, Matching
          interactions: ['flashcards', 'matching'],
          includeModuleTitleSlides: false,
          includeObjectiveSlides: true,
          includeKnowledgeChecks: false,
          includeSummarySlides: false,
          includeExitTickets: true,
          objectiveGenStrategy: 'Generate EXACTLY 1 "I Can" statement for a fast entry task. Single sentence starting with "I can...". Use simple, age-appropriate language. Do NOT generate more than 1.',
          assessmentStrategy: 'Generate a single formative exit ticket question to gauge baseline readiness or immediate recall.',
          instructionalStrategy: 'Engaging hook or quick review. End with a formative exit ticket.',
        };
      case 'standard':
        return {
          id: 'standard',
          label: 'Standard Training',
          k12Label: 'Standard Lesson',
          description: '10-15 min • Structured modules with assessments',
          k12Description: '10-15 min • Core curriculum daily lesson block',
          slideCountTarget: 15,
          slideCountMin: 12,
          slideCountMax: 18,
          objectiveFormat: 'k12_ican',
          objectiveCountGuide: '2-3',
          objectiveCountMin: 2,
          objectiveCountMax: 3,
          // K-12 Standard: Drag & Drop, Hotspots, Multiple Choice
          interactions: ['quiz', 'hotspot', 'matching'],
          includeModuleTitleSlides: true,
          includeObjectiveSlides: true,
          includeKnowledgeChecks: true,
          includeSummarySlides: true,
          includeExitTickets: true,
          objectiveGenStrategy: 'Generate EXACTLY 2 to 3 sequential "I Can" statements tied to a specific standard. Each must start with "I can..." and use grade-appropriate action verbs.',
          assessmentStrategy: 'Continuous formative assessments throughout the lesson plus an exit ticket at the end to check for understanding before moving on.',
          instructionalStrategy: 'Strong scaffolding. Direct instruction to guided practice. Knowledge checks throughout, exit ticket at end.',
        };
      case 'comprehensive':
        return {
          id: 'comprehensive',
          label: 'Comprehensive Course',
          k12Label: 'Unit Module / Deep Dive',
          description: '20-30 min • Full curriculum with mastery tracking',
          k12Description: '20-30 min • Multi-session unit with cross-curricular depth',
          slideCountTarget: 30,
          slideCountMin: 25,
          slideCountMax: 35,
          objectiveFormat: 'k12_ican',
          objectiveCountGuide: '4+',
          objectiveCountMin: 4,
          objectiveCountMax: 6,
          // K-12 Comprehensive: Branching (Choose Your Own Adventure), Sorting, Drop Targets, Timeline
          interactions: ['quiz', 'branching', 'sorting', 'timeline', 'accordion', 'flashcards'],
          includeModuleTitleSlides: true,
          includeObjectiveSlides: true,
          includeKnowledgeChecks: true,
          includeSummarySlides: true,
          includeExitTickets: true,
          objectiveGenStrategy: 'Generate EXACTLY 4 to 6 comprehensive "I Can" statements aligned to cross-curricular standards for an entire unit. Include statements across multiple cognitive levels.',
          assessmentStrategy: 'Heavily scaffold content, provide extensive feedback on incorrect answers, and include a summative project/assessment prompt at the end.',
          instructionalStrategy: 'Rich immersive exploration unit. Storytelling and gamified interactions (Branching, Sorting, Timelines). Constant feedback loops and summative assessment.',
        };
    }
  }

  throw new Error(`Invalid preset: ${pathway}/${presetId}`);
}
