/**
 * useDraftCourses — course draft management (Design + Development).
 *
 * Storage: IndexedDB (large courses with AI images exceed localStorage quota).
 * Migrates any existing localStorage drafts on first load.
 *
 * Tier limits:
 *   - Free (unauthenticated): 0
 *   - Pro / trial:            3
 *   - Team / enterprise:      10
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export const MAX_PRO_DRAFTS = 3;
export const MAX_TEAM_DRAFTS = 10;
const STORAGE_PREFIX = 'nexcourse_drafts_v1_';
const IDB_NAME = 'nexcourse_drafts_db';
const IDB_STORE = 'user_drafts';
const IDB_VERSION = 1;

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
  courseSnapshot: string; // JSON.stringify(DraftSnapshot)
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function inferPhase(snapshot: string): DraftPhase {
  try {
    const data = JSON.parse(snapshot);
    if (data?.phase === 'design') return 'design';
    if (data?.phase === 'preview') return 'preview';
    if (data?.course) return 'preview';
    return 'design';
  } catch {
    return 'preview';
  }
}

function normalizeDraftList(parsed: any): CourseDraft[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.map((d: any) => ({
    ...d,
    phase: (d.phase as DraftPhase) || inferPhase(d.courseSnapshot),
  }));
}

function readDraftsFromLocalStorage(userId: string): CourseDraft[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return normalizeDraftList(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Open IndexedDB (or create store). */
function openDraftsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open drafts DB'));
  });
}

async function idbGetDrafts(userId: string): Promise<CourseDraft[] | null> {
  const db = await openDraftsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(userId);
    req.onsuccess = () => {
      const val = req.result;
      if (!val) resolve(null);
      else resolve(normalizeDraftList(val));
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbSetDrafts(userId: string, drafts: CourseDraft[]): Promise<void> {
  const db = await openDraftsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(drafts, userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to write drafts'));
    tx.onabort = () => reject(tx.error || new Error('Draft write aborted'));
  });
}

/**
 * Persist drafts to IndexedDB. Falls back to localStorage with a clear error
 * if IDB fails (localStorage often fails for image-heavy courses).
 */
async function persistDrafts(userId: string, drafts: CourseDraft[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await idbSetDrafts(userId, drafts);
    // Keep a lightweight metadata mirror in localStorage (no heavy snapshots)
    try {
      const meta = drafts.map(({ id, savedAt, courseTitle, slideCount, moduleCount, theme, phase }) => ({
        id, savedAt, courseTitle, slideCount, moduleCount, theme, phase,
      }));
      localStorage.setItem(`${STORAGE_PREFIX}meta_${userId}`, JSON.stringify(meta));
    } catch { /* meta is optional */ }
    return { ok: true };
  } catch (idbErr: any) {
    console.warn('[DraftCourses] IndexedDB write failed, trying localStorage:', idbErr);
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(drafts));
      return { ok: true };
    } catch (lsErr: any) {
      const quota = lsErr?.name === 'QuotaExceededError' || /quota/i.test(String(lsErr?.message || ''));
      const message = quota
        ? 'Storage is full — this course (with images) is too large for browser storage. Delete an older draft and try again, or remove some images first.'
        : (lsErr?.message || idbErr?.message || 'Failed to save draft to browser storage.');
      console.error('[DraftCourses] Persist failed:', lsErr || idbErr);
      return { ok: false, error: message };
    }
  }
}

async function loadDraftsForUser(userId: string): Promise<CourseDraft[]> {
  // Prefer IndexedDB
  try {
    const fromIdb = await idbGetDrafts(userId);
    if (fromIdb && fromIdb.length > 0) return fromIdb;

    // Migrate from localStorage if IDB empty
    const fromLs = readDraftsFromLocalStorage(userId);
    if (fromLs.length > 0) {
      await idbSetDrafts(userId, fromLs);
      return fromLs;
    }
    return fromIdb || [];
  } catch (e) {
    console.warn('[DraftCourses] IndexedDB read failed, using localStorage:', e);
    return readDraftsFromLocalStorage(userId);
  }
}

function makeDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseSnapshot(raw: string): DraftSnapshot | null {
  try {
    const data = JSON.parse(raw);
    if (data.phase === 'design' || data.phase === 'preview') return data as DraftSnapshot;
    if (data.course) {
      return {
        phase: 'preview',
        course: data.course,
        playerConfig: data.playerConfig,
        theme: data.theme || 'light',
      };
    }
    return null;
  } catch {
    return null;
  }
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
  isReady: boolean;
  canSave: boolean;
  slotsUsed: number;
  slotsTotal: number;
  refreshDrafts: () => Promise<void>;
  savePreviewDraft: (course: any, playerConfig: any, theme: string) => Promise<{ success: boolean; message: string; id?: string }>;
  saveDesignDraft: (design: Omit<DesignDraftSnapshot, 'phase'>) => Promise<{ success: boolean; message: string; id?: string }>;
  loadDraft: (id: string) => DraftSnapshot | null;
  deleteDraft: (id: string) => Promise<void>;
  replacePreviewDraft: (id: string, course: any, playerConfig: any, theme: string) => Promise<{ success: boolean; message: string }>;
  replaceDesignDraft: (id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => Promise<{ success: boolean; message: string }>;
  /** @deprecated use savePreviewDraft */
  saveDraft: (course: any, playerConfig: any, theme: string) => Promise<{ success: boolean; message: string; id?: string }>;
  /** @deprecated use replacePreviewDraft */
  replaceDraft: (id: string, course: any, playerConfig: any, theme: string) => Promise<{ success: boolean; message: string }>;
}

export function useDraftCourses(
  userId: string | null,
  plan?: string | null
): UseDraftCoursesReturn {
  const [drafts, setDrafts] = useState<CourseDraft[]>([]);
  const [isReady, setIsReady] = useState(false);
  const draftsRef = useRef<CourseDraft[]>([]);
  draftsRef.current = drafts;

  const refreshDrafts = useCallback(async () => {
    if (!userId) {
      setDrafts([]);
      setIsReady(true);
      return;
    }
    try {
      const list = await loadDraftsForUser(userId);
      setDrafts(list);
    } catch (e) {
      console.error('[DraftCourses] refresh failed:', e);
      setDrafts(readDraftsFromLocalStorage(userId));
    } finally {
      setIsReady(true);
    }
  }, [userId]);

  useEffect(() => {
    setIsReady(false);
    void refreshDrafts();
  }, [refreshDrafts]);

  const slotsTotal = userId ? getDraftLimitForPlan(plan) : 0;
  const slotsUsed = drafts.length;
  const canSave = !!userId && slotsUsed < slotsTotal;

  const savePreviewDraft = useCallback(async (course: any, playerConfig: any, theme: string) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const current = draftsRef.current;
    if (current.length >= slotsTotal) {
      return {
        success: false,
        message: `You've used all ${slotsTotal} draft slots. Delete an existing draft or upgrade your plan.`,
      };
    }
    if (!course?.modules) {
      return { success: false, message: 'Nothing to save — generate a course first.' };
    }

    const id = makeDraftId();
    const snapshot: PreviewDraftSnapshot = { phase: 'preview', course, playerConfig, theme };
    let courseSnapshot: string;
    try {
      courseSnapshot = JSON.stringify(snapshot);
    } catch (e: any) {
      return { success: false, message: 'Course data could not be serialized for saving.' };
    }

    const draft: CourseDraft = {
      id,
      savedAt: new Date().toISOString(),
      courseTitle: course.title || 'Untitled Course',
      slideCount: (course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
      moduleCount: (course.modules || []).length,
      theme,
      phase: 'preview',
      courseSnapshot,
    };
    const next = [...current, draft];
    const result = await persistDrafts(userId, next);
    if (!result.ok) {
      return { success: false, message: result.error || 'Failed to save draft.' };
    }
    setDrafts(next);
    return { success: true, message: `Draft "${draft.courseTitle}" saved!`, id };
  }, [userId, slotsTotal]);

  const saveDesignDraft = useCallback(async (design: Omit<DesignDraftSnapshot, 'phase'>) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const current = draftsRef.current;
    if (current.length >= slotsTotal) {
      return {
        success: false,
        message: `You've used all ${slotsTotal} draft slots. Delete an existing draft or upgrade your plan.`,
      };
    }
    const id = makeDraftId();
    const snapshot: DesignDraftSnapshot = { phase: 'design', ...design };
    let courseSnapshot: string;
    try {
      courseSnapshot = JSON.stringify(snapshot);
    } catch {
      return { success: false, message: 'Design data could not be serialized for saving.' };
    }
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
      courseSnapshot,
    };
    const next = [...current, draft];
    const result = await persistDrafts(userId, next);
    if (!result.ok) {
      return { success: false, message: result.error || 'Failed to save draft.' };
    }
    setDrafts(next);
    return { success: true, message: `Design draft "${draft.courseTitle}" saved!`, id };
  }, [userId, slotsTotal]);

  const loadDraft = useCallback((id: string): DraftSnapshot | null => {
    const draft = draftsRef.current.find(d => d.id === id);
    if (!draft) return null;
    return parseSnapshot(draft.courseSnapshot);
  }, []);

  const deleteDraft = useCallback(async (id: string) => {
    if (!userId) return;
    const next = draftsRef.current.filter(d => d.id !== id);
    const result = await persistDrafts(userId, next);
    if (result.ok) setDrafts(next);
  }, [userId]);

  const replacePreviewDraft = useCallback(async (id: string, course: any, playerConfig: any, theme: string) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const snapshot: PreviewDraftSnapshot = { phase: 'preview', course, playerConfig, theme };
    let courseSnapshot: string;
    try {
      courseSnapshot = JSON.stringify(snapshot);
    } catch {
      return { success: false, message: 'Course data could not be serialized for saving.' };
    }
    const next = draftsRef.current.map(d => {
      if (d.id !== id) return d;
      return {
        ...d,
        savedAt: new Date().toISOString(),
        courseTitle: course.title || 'Untitled Course',
        slideCount: (course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
        moduleCount: (course.modules || []).length,
        theme,
        phase: 'preview' as DraftPhase,
        courseSnapshot,
      };
    });
    const result = await persistDrafts(userId, next);
    if (!result.ok) return { success: false, message: result.error || 'Failed to update draft.' };
    setDrafts(next);
    return { success: true, message: 'Draft updated ✓' };
  }, [userId]);

  const replaceDesignDraft = useCallback(async (id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const snapshot: DesignDraftSnapshot = { phase: 'design', ...design };
    let courseSnapshot: string;
    try {
      courseSnapshot = JSON.stringify(snapshot);
    } catch {
      return { success: false, message: 'Design data could not be serialized for saving.' };
    }
    const next = draftsRef.current.map(d => {
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
        courseSnapshot,
      };
    });
    const result = await persistDrafts(userId, next);
    if (!result.ok) return { success: false, message: result.error || 'Failed to update draft.' };
    setDrafts(next);
    return { success: true, message: 'Design draft updated ✓' };
  }, [userId]);

  return {
    drafts,
    isReady,
    canSave,
    slotsUsed,
    slotsTotal,
    refreshDrafts,
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
