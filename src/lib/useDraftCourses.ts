/**
 * useDraftCourses — localStorage-backed course draft management.
 *
 * Shared slot pool for Design-phase and Development-phase drafts.
 * Tier limits (increase with higher plans):
 *   - Free (unauthenticated): 0
 *   - Pro / trial:            3
 *   - Team / enterprise:      10
 *
 * Storage key: "nexcourse_drafts_v1_<userId>"
 */

import { useState, useCallback, useEffect } from 'react';

export const MAX_PRO_DRAFTS = 3;
export const MAX_TEAM_DRAFTS = 10;
const STORAGE_PREFIX = 'nexcourse_drafts_v1_';

export type DraftPhase = 'design' | 'preview';

export interface DesignDraftSnapshot {
  phase: 'design';
  courseTitle: string;
  courseDescription: string;
  prompt: string;
  learningObjectives: any[];
  objectiveFormat: string;
  examConfig: any;
  navigationMode: string;
  requireInteractionsComplete?: boolean;
  preset: string;
  slideCount: number;
  includeModuleTitleSlides: boolean;
  includeModuleOverviewSlides: boolean;
  includeSummarySlides: boolean;
  interactionTypes: string[];
  scenarioConfig: any;
  outlineDraft: any | null;
  imageMode: string;
  voiceOverEnabled: boolean;
  ttsVoice: string;
  settingsMode?: 'defaults' | 'session' | 'quick';
}

export interface PreviewDraftSnapshot {
  phase: 'preview';
  course: any;
  playerConfig: any;
  theme: string;
}

export type DraftSnapshot = DesignDraftSnapshot | PreviewDraftSnapshot;

export interface CourseDraft {
  id: string;
  savedAt: string;
  courseTitle: string;
  slideCount: number;
  moduleCount: number;
  theme: string;
  phase: DraftPhase;
  courseSnapshot: string; // JSON.stringify(DraftSnapshot) — legacy payloads omit phase in JSON root
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readDrafts(userId: string): CourseDraft[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d: any) => ({
      ...d,
      phase: (d.phase as DraftPhase) || inferPhase(d.courseSnapshot),
    }));
  } catch {
    return [];
  }
}

function inferPhase(snapshot: string): DraftPhase {
  try {
    const data = JSON.parse(snapshot);
    if (data?.phase === 'design') return 'design';
    if (data?.phase === 'preview') return 'preview';
    // Legacy: had a full course object
    if (data?.course) return 'preview';
    return 'design';
  } catch {
    return 'preview';
  }
}

function writeDrafts(userId: string, drafts: CourseDraft[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(drafts));
  } catch (e) {
    console.error('[DraftCourses] Failed to write to localStorage:', e);
  }
}

function makeDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Draft slot limit from Supabase user_metadata.plan (or similar). */
export function getDraftLimitForPlan(plan?: string | null): number {
  if (!plan) return MAX_PRO_DRAFTS;
  const p = plan.toLowerCase();
  if (p.includes('enterprise') || p.includes('team') || p.includes('business')) return MAX_TEAM_DRAFTS;
  return MAX_PRO_DRAFTS;
}

export interface UseDraftCoursesReturn {
  drafts: CourseDraft[];
  canSave: boolean;
  slotsUsed: number;
  slotsTotal: number;
  savePreviewDraft: (course: any, playerConfig: any, theme: string) => { success: boolean; message: string; id?: string };
  saveDesignDraft: (design: Omit<DesignDraftSnapshot, 'phase'>) => { success: boolean; message: string; id?: string };
  loadDraft: (id: string) => DraftSnapshot | null;
  deleteDraft: (id: string) => void;
  replacePreviewDraft: (id: string, course: any, playerConfig: any, theme: string) => void;
  replaceDesignDraft: (id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => void;
  /** @deprecated use savePreviewDraft */
  saveDraft: (course: any, playerConfig: any, theme: string) => { success: boolean; message: string; id?: string };
  /** @deprecated use replacePreviewDraft */
  replaceDraft: (id: string, course: any, playerConfig: any, theme: string) => void;
}

export function useDraftCourses(
  userId: string | null,
  plan?: string | null
): UseDraftCoursesReturn {
  const [drafts, setDrafts] = useState<CourseDraft[]>(() =>
    userId ? readDrafts(userId) : []
  );

  useEffect(() => {
    setDrafts(userId ? readDrafts(userId) : []);
  }, [userId]);

  const slotsTotal = userId ? getDraftLimitForPlan(plan) : 0;
  const slotsUsed = drafts.length;
  const canSave = !!userId && slotsUsed < slotsTotal;

  const savePreviewDraft = useCallback((course: any, playerConfig: any, theme: string) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    if (slotsUsed >= slotsTotal) {
      return {
        success: false,
        message: `You've used all ${slotsTotal} draft slots. Delete an existing draft or upgrade your plan.`,
      };
    }
    const id = makeDraftId();
    const snapshot: PreviewDraftSnapshot = { phase: 'preview', course, playerConfig, theme };
    const draft: CourseDraft = {
      id,
      savedAt: new Date().toISOString(),
      courseTitle: course.title || 'Untitled Course',
      slideCount: (course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
      moduleCount: (course.modules || []).length,
      theme,
      phase: 'preview',
      courseSnapshot: JSON.stringify(snapshot),
    };
    const next = [...drafts, draft];
    writeDrafts(userId, next);
    setDrafts(next);
    return { success: true, message: `Draft "${draft.courseTitle}" saved!`, id };
  }, [userId, drafts, slotsUsed, slotsTotal]);

  const saveDesignDraft = useCallback((design: Omit<DesignDraftSnapshot, 'phase'>) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    if (slotsUsed >= slotsTotal) {
      return {
        success: false,
        message: `You've used all ${slotsTotal} draft slots. Delete an existing draft or upgrade your plan.`,
      };
    }
    const id = makeDraftId();
    const snapshot: DesignDraftSnapshot = { phase: 'design', ...design };
    const draft: CourseDraft = {
      id,
      savedAt: new Date().toISOString(),
      courseTitle: design.courseTitle || 'Untitled Course',
      slideCount: design.outlineDraft?.modules?.reduce(
        (a: number, m: any) => a + (m.slides?.length || 0), 0
      ) ?? 0,
      moduleCount: design.outlineDraft?.modules?.length ?? 0,
      theme: 'light',
      phase: 'design',
      courseSnapshot: JSON.stringify(snapshot),
    };
    const next = [...drafts, draft];
    writeDrafts(userId, next);
    setDrafts(next);
    return { success: true, message: `Design draft "${draft.courseTitle}" saved!`, id };
  }, [userId, drafts, slotsUsed, slotsTotal]);

  const loadDraft = useCallback((id: string): DraftSnapshot | null => {
    if (!userId) return null;
    const draft = drafts.find(d => d.id === id);
    if (!draft) return null;
    try {
      const data = JSON.parse(draft.courseSnapshot);
      if (data.phase === 'design' || data.phase === 'preview') return data as DraftSnapshot;
      // Legacy preview shape: { course, playerConfig, theme }
      if (data.course) {
        return { phase: 'preview', course: data.course, playerConfig: data.playerConfig, theme: data.theme || 'light' };
      }
      return null;
    } catch {
      return null;
    }
  }, [userId, drafts]);

  const deleteDraft = useCallback((id: string) => {
    if (!userId) return;
    const next = drafts.filter(d => d.id !== id);
    writeDrafts(userId, next);
    setDrafts(next);
  }, [userId, drafts]);

  const replacePreviewDraft = useCallback((id: string, course: any, playerConfig: any, theme: string) => {
    if (!userId) return;
    const snapshot: PreviewDraftSnapshot = { phase: 'preview', course, playerConfig, theme };
    const next = drafts.map(d => {
      if (d.id !== id) return d;
      return {
        ...d,
        savedAt: new Date().toISOString(),
        courseTitle: course.title || 'Untitled Course',
        slideCount: (course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
        moduleCount: (course.modules || []).length,
        theme,
        phase: 'preview' as DraftPhase,
        courseSnapshot: JSON.stringify(snapshot),
      };
    });
    writeDrafts(userId, next);
    setDrafts(next);
  }, [userId, drafts]);

  const replaceDesignDraft = useCallback((id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => {
    if (!userId) return;
    const snapshot: DesignDraftSnapshot = { phase: 'design', ...design };
    const next = drafts.map(d => {
      if (d.id !== id) return d;
      return {
        ...d,
        savedAt: new Date().toISOString(),
        courseTitle: design.courseTitle || 'Untitled Course',
        slideCount: design.outlineDraft?.modules?.reduce(
          (a: number, m: any) => a + (m.slides?.length || 0), 0
        ) ?? 0,
        moduleCount: design.outlineDraft?.modules?.length ?? 0,
        theme: 'light',
        phase: 'design' as DraftPhase,
        courseSnapshot: JSON.stringify(snapshot),
      };
    });
    writeDrafts(userId, next);
    setDrafts(next);
  }, [userId, drafts]);

  return {
    drafts,
    canSave,
    slotsUsed,
    slotsTotal,
    savePreviewDraft,
    saveDesignDraft,
    loadDraft,
    deleteDraft,
    replacePreviewDraft,
    replaceDesignDraft,
    saveDraft: savePreviewDraft,
    replaceDraft: replacePreviewDraft,
  };
}
