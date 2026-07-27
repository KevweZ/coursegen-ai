import { ExamConfig, NavigationMode } from '../types/course';

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
}

const STORAGE_KEY = 'nexcourse.courseSettings.v1';

function storageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function loadCourseSettings(userId?: string | null): SavedCourseSettings | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw && userId) {
      // Fall back to anonymous key if user-specific missing
      const fallback = localStorage.getItem(STORAGE_KEY);
      if (!fallback) return null;
      return JSON.parse(fallback) as SavedCourseSettings;
    }
    if (!raw) return null;
    return JSON.parse(raw) as SavedCourseSettings;
  } catch {
    return null;
  }
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
