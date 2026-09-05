import { ExamConfig, NavigationMode } from '../types/course';
import { normalizeImageMode, type CourseImageMode } from '../services/imageService';
import { pushAccountPreferences } from './accountPreferences';
import {
  BLOCKS_WELL_DEFAULT,
  resolveHexColor,
  resolveProcessSkin,
  resolveVerticalTabColorMode,
  resolveVerticalTabSkin,
  TAB_ACCENT_HEX,
} from './tabAccents';

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
  /** Hotspot backdrop AI when global AI/source images are off */
  hotspotGenerateBackdrop?: boolean;
  /** Default presentation for vertical tabs. `'blocks'` is the full-bleed stack; `'default'` is classic. */
  verticalTabSkin?: 'default' | 'blocks';
  /** Course-wide vertical tab colors: rainbow per tab, one color, or each module's accent. */
  verticalTabColorMode?: 'per-tab' | 'unify' | 'module';
  /** Used when verticalTabColorMode is `'unify'`. */
  verticalTabUnifyColor?: string;
  /** Content-well fill for the Blocks vertical-tab and Process skins. */
  verticalTabWellColor?: string;
  /** `'blocks'` gives Process slides the dark/colored reading area. */
  processSkin?: 'default' | 'blocks';
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
  imageMode: 'ai',
  /** When hotspot is on but Multimedia AI/source are off, still AI-generate hotspot backdrops */
  hotspotGenerateBackdrop: false,
  verticalTabSkin: 'default',
  verticalTabColorMode: 'per-tab',
  verticalTabUnifyColor: TAB_ACCENT_HEX[0],
  verticalTabWellColor: BLOCKS_WELL_DEFAULT,
  processSkin: 'default',
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

function normalizeSaved(parsed: SavedCourseSettings): SavedCourseSettings {
  return {
    ...parsed,
    imageMode: normalizeImageMode(parsed.imageMode),
    verticalTabSkin: resolveVerticalTabSkin(parsed.verticalTabSkin),
    verticalTabColorMode: resolveVerticalTabColorMode(parsed.verticalTabColorMode),
    verticalTabUnifyColor: resolveHexColor(parsed.verticalTabUnifyColor, TAB_ACCENT_HEX[0]),
    verticalTabWellColor: resolveHexColor(parsed.verticalTabWellColor, BLOCKS_WELL_DEFAULT),
    processSkin: resolveProcessSkin(parsed.processSkin),
  };
}

export function loadCourseSettings(userId?: string | null): SavedCourseSettings | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw && userId) {
      const fallback = localStorage.getItem(STORAGE_KEY);
      if (!fallback) return null;
      return normalizeSaved(JSON.parse(fallback) as SavedCourseSettings);
    }
    if (!raw) return null;
    return normalizeSaved(JSON.parse(raw) as SavedCourseSettings);
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
  if (userId) {
    void pushAccountPreferences({ courseSettings: settings }).then(r => {
      if (!r.ok) console.warn('[courseSettingsStorage] Cloud sync failed:', r.error);
    });
  }
}

/** Apply settings from the account cloud without re-pushing. */
export function cacheCourseSettings(settings: SavedCourseSettings, userId?: string | null): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  } catch (e) {
    console.warn('[courseSettingsStorage] Failed to cache settings', e);
  }
}

export function collectCourseSettings(state: SavedCourseSettings): SavedCourseSettings {
  return { ...state };
}
