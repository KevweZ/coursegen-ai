import { ExamConfig, NavigationMode } from '../types/course';
import { normalizeImageMode, type CourseImageMode } from '../services/imageService';

export interface SavedCourseSettings {
  preset: 'quick' | 'standard' | 'comprehensive';
  objectiveFormat: string;
  examConfig: ExamConfig;
  navigationMode: NavigationMode;
  /** When true (and nav is linear/restricted), Next stays locked until interactions on the slide are explored */
  requireInteractionsComplete: boolean;
  interactionTypes: string[];
  gameTemplateIds: string[];
  voiceOverEnabled: boolean;
  ttsVoice: string;
  includeModuleTitleSlides: boolean;
  /** Auto-injected per-module overview (objectives accordion) after the Module Title slide. */
  includeModuleOverviewSlides: boolean;
  includeSummarySlides: boolean;
  slideCount: number;
  /** Multimedia: none | ai | source | ai-and-source (legacy ai-title* accepted) */
  imageMode: CourseImageMode;
}

const STORAGE_KEY = 'nexcourse.courseSettings.v1';

/**
 * Factory defaults for every new account (no saved Course Settings yet).
 * Once a user saves Course Settings, their saved values replace these.
 */
export const DEFAULT_COURSE_SETTINGS: SavedCourseSettings = {
  preset: 'standard',
  objectiveFormat: 'AB',
  examConfig: {
    enabled: true,
    passingScore: 70,
    questionMode: 'total',
    questionCount: 10,
    allowRetake: true,
    questionTypes: ['mc', 'ma', 'tf'],
    presentationMode: 'one-at-a-time',
    knowledgeCheckMode: 'per-module',
    knowledgeCheckCount: 2,
    knowledgeCheckQuestionTypes: ['sorting', 'matching', 'drop-targets'],
  },
  navigationMode: 'restricted',
  requireInteractionsComplete: true,
  interactionTypes: ['tabbed-horizontal', 'tabbed-vertical', 'click-reveal'],
  gameTemplateIds: [],
  voiceOverEnabled: true,
  ttsVoice: 'alloy',
  includeModuleTitleSlides: true,
  includeModuleOverviewSlides: true,
  includeSummarySlides: true,
  slideCount: 14,
  imageMode: 'none',
};

function storageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function cloneDefaults(): SavedCourseSettings {
  return {
    ...DEFAULT_COURSE_SETTINGS,
    examConfig: { ...DEFAULT_COURSE_SETTINGS.examConfig },
    interactionTypes: [...DEFAULT_COURSE_SETTINGS.interactionTypes],
    gameTemplateIds: [...DEFAULT_COURSE_SETTINGS.gameTemplateIds],
  };
}

export function loadCourseSettings(userId?: string | null): SavedCourseSettings | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw && userId) {
      // Fall back to anonymous key if user-specific missing
      const fallback = localStorage.getItem(STORAGE_KEY);
      if (!fallback) return null;
      const parsed = JSON.parse(fallback) as SavedCourseSettings;
      return { ...parsed, imageMode: normalizeImageMode(parsed.imageMode) };
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCourseSettings;
    return { ...parsed, imageMode: normalizeImageMode(parsed.imageMode) };
  } catch {
    return null;
  }
}

/** Saved settings when present; otherwise factory defaults for new accounts. */
export function resolveCourseSettings(userId?: string | null): SavedCourseSettings {
  return loadCourseSettings(userId) ?? cloneDefaults();
}

export function saveCourseSettings(settings: SavedCourseSettings, userId?: string | null): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  } catch (e) {
    console.warn('[courseSettingsStorage] Failed to save settings', e);
  }
}

export function collectCourseSettings(state: SavedCourseSettings): SavedCourseSettings {
  return { ...state };
}
