/**
 * useDraftCourses — course draft management (Design + Development).
 *
 * Storage (IndexedDB v2):
 *   - `draft_index`  → lightweight metadata list per user (fast to list)
 *   - `draft_payload` → one record per draft id (loaded only when opening)
 *
 * Older v1 localStorage / single-blob IDB formats are migrated on read.
 *
 * Tier limits:
 *   - Free (unauthenticated): 0
 *   - Pro / trial:            3
 *   - Team / enterprise:      10
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  detachHeavyMedia,
  mediaMapToRecord,
  approxCourseBytes,
} from './draftMedia';

export const MAX_PRO_DRAFTS = 3;
export const MAX_TEAM_DRAFTS = 10;
const STORAGE_PREFIX = 'nexcourse_drafts_v1_';
const IDB_NAME = 'nexcourse_drafts_db';
const IDB_VERSION = 3;
const STORE_INDEX = 'draft_index';
const STORE_PAYLOAD = 'draft_payload';
/** Heavy data-URL images keyed per draft — kept out of the course shell */
const STORE_ASSETS = 'draft_assets';
/** @deprecated v1 single-blob store — still read for migration */
const STORE_LEGACY = 'user_drafts';

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

/** List-row metadata — never includes the heavy course payload */
export interface CourseDraft {
  id: string;
  savedAt: string;
  courseTitle: string;
  slideCount: number;
  moduleCount: number;
  theme: string;
  phase: DraftPhase;
  /** @deprecated kept optional for migration only — not held in React state */
  courseSnapshot?: string;
}

export type DraftLoadProgressPhase =
  | 'fetch'
  | 'parse'
  | 'hydrate'
  | 'done'
  | 'error';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function payloadKey(userId: string, draftId: string) {
  return `${userId}::${draftId}`;
}

function inferPhaseFromSnapshot(data: any): DraftPhase {
  if (data?.phase === 'design') return 'design';
  if (data?.phase === 'preview') return 'preview';
  if (data?.course) return 'preview';
  return 'design';
}

function metaFromDraft(d: CourseDraft): CourseDraft {
  return {
    id: d.id,
    savedAt: d.savedAt,
    courseTitle: d.courseTitle,
    slideCount: d.slideCount,
    moduleCount: d.moduleCount,
    theme: d.theme,
    phase: d.phase,
  };
}

function openDraftsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_INDEX)) {
        db.createObjectStore(STORE_INDEX);
      }
      if (!db.objectStoreNames.contains(STORE_PAYLOAD)) {
        db.createObjectStore(STORE_PAYLOAD);
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS);
      }
      // Keep legacy store readable during migration
      if (!db.objectStoreNames.contains(STORE_LEGACY)) {
        db.createObjectStore(STORE_LEGACY);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open drafts DB'));
  });
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDraftsDb().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(store: string, key: string, value: unknown): Promise<void> {
  return openDraftsDb().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB put failed'));
        tx.onabort = () => reject(tx.error || new Error('IDB put aborted'));
      })
  );
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDraftsDb().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function parseSnapshotRaw(raw: unknown): DraftSnapshot | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object') return null;
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

/** Yield so the UI (progress bar) can paint between heavy steps */
export function yieldToUi(ms = 16): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, ms));
    } else {
      setTimeout(resolve, ms);
    }
  });
}

async function readIndex(userId: string): Promise<CourseDraft[]> {
  try {
    const idx = await idbGet<CourseDraft[]>(STORE_INDEX, userId);
    if (Array.isArray(idx) && idx.length > 0) {
      return idx.map(metaFromDraft);
    }
  } catch (e) {
    console.warn('[DraftCourses] Index read failed:', e);
  }
  return [];
}

async function writeIndex(userId: string, drafts: CourseDraft[]): Promise<void> {
  const meta = drafts.map(metaFromDraft);
  await idbPut(STORE_INDEX, userId, meta);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}meta_${userId}`, JSON.stringify(meta));
  } catch { /* optional */ }
}

/**
 * Migrate v1 formats (localStorage blob / single IDB array with embedded snapshots)
 * into index + per-draft payloads.
 */
async function migrateLegacyIfNeeded(userId: string): Promise<CourseDraft[]> {
  const existing = await readIndex(userId);
  if (existing.length > 0) return existing;

  let legacy: any[] = [];

  try {
    const fromLegacyStore = await idbGet<any[]>(STORE_LEGACY, userId);
    if (Array.isArray(fromLegacyStore) && fromLegacyStore.length) {
      legacy = fromLegacyStore;
    }
  } catch { /* ignore */ }

  if (!legacy.length) {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) legacy = parsed;
      }
    } catch { /* ignore */ }
  }

  if (!legacy.length) return [];

  console.log(`[DraftCourses] Migrating ${legacy.length} legacy draft(s) to split storage…`);
  const metas: CourseDraft[] = [];

  for (const d of legacy) {
    const id = d.id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let snapshot: DraftSnapshot | null = null;
    if (d.courseSnapshot) {
      snapshot = parseSnapshotRaw(d.courseSnapshot);
    } else if (d.phase === 'preview' || d.course) {
      snapshot = parseSnapshotRaw(d);
    } else if (d.phase === 'design') {
      snapshot = parseSnapshotRaw({ phase: 'design', ...d });
    }

    const phase: DraftPhase =
      (d.phase as DraftPhase) ||
      (snapshot ? inferPhaseFromSnapshot(snapshot) : 'preview');

    const titleFromSnap =
      snapshot?.phase === 'design'
        ? snapshot.courseTitle
        : snapshot?.phase === 'preview'
          ? snapshot.course?.title
          : undefined;
    const meta: CourseDraft = {
      id,
      savedAt: d.savedAt || new Date().toISOString(),
      courseTitle: d.courseTitle || titleFromSnap || 'Untitled Course',
      slideCount: d.slideCount ?? 0,
      moduleCount: d.moduleCount ?? 0,
      theme: d.theme || 'light',
      phase,
    };

    if (snapshot) {
      // Store as structured object (no JSON.stringify of multi‑MB base64)
      await idbPut(STORE_PAYLOAD, payloadKey(userId, id), snapshot);
    }
    metas.push(meta);
  }

  await writeIndex(userId, metas);
  return metas;
}

async function loadDraftsForUser(userId: string): Promise<CourseDraft[]> {
  try {
    return await migrateLegacyIfNeeded(userId);
  } catch (e) {
    console.warn('[DraftCourses] load failed:', e);
    return [];
  }
}

function makeDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Drop ephemeral blob: URLs before save (they die on reload anyway).
 * Keeps data: images. Shrinks payloads and speeds open significantly when TTS was generated.
 */
function stripEphemeralMedia(course: any): any {
  if (!course?.modules) return course;
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        const next = { ...s };
        if (typeof next.voiceOverUrl === 'string' && next.voiceOverUrl.startsWith('blob:')) {
          delete next.voiceOverUrl;
        }
        if (typeof next.audioUrl === 'string' && next.audioUrl.startsWith('blob:')) {
          delete next.audioUrl;
        }
        return next;
      }),
    })),
  };
}

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
  /** Sync peek from in-memory cache only — prefer loadDraftAsync */
  loadDraft: (id: string) => DraftSnapshot | null;
  /** Async load of a single draft payload (shell only — media via loadDraftAssets) */
  loadDraftAsync: (
    id: string,
    onProgress?: (pct: number, phase: DraftLoadProgressPhase) => void
  ) => Promise<DraftSnapshot | null>;
  /** Heavy data-URL images for a draft (may be empty for legacy inline payloads) */
  loadDraftAssets: (id: string) => Promise<Record<string, string>>;
  deleteDraft: (id: string) => Promise<void>;
  replacePreviewDraft: (id: string, course: any, playerConfig: any, theme: string) => Promise<{ success: boolean; message: string }>;
  replaceDesignDraft: (id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => Promise<{ success: boolean; message: string }>;
  saveDraft: (course: any, playerConfig: any, theme: string) => Promise<{ success: boolean; message: string; id?: string }>;
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
  /** Small cache of recently opened payloads (not the whole library) */
  const payloadCacheRef = useRef<Map<string, DraftSnapshot>>(new Map());

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
      setDrafts([]);
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

  /** Clone course lightly for save, strip blob URLs + extract heavy data-URLs to assets store */
  const preparePreviewSnapshot = (course: any, playerConfig: any, theme: string, draftId: string) => {
    // structuredClone keeps us from mutating the live editor course
    let working: any;
    try {
      working = typeof structuredClone === 'function'
        ? structuredClone(course)
        : JSON.parse(JSON.stringify(course));
    } catch {
      working = JSON.parse(JSON.stringify(course));
    }
    working = stripEphemeralMedia(working);
    const before = approxCourseBytes(working);
    const media = detachHeavyMedia(working);
    const after = approxCourseBytes(working);
    console.log(
      `[DraftCourses] Media split for save: ${media.size} asset(s), ` +
      `${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB shell`
    );
    const snapshot: PreviewDraftSnapshot = { phase: 'preview', course: working, playerConfig, theme };
    const assets = mediaMapToRecord(media);
    return { snapshot, assets, draftId };
  };

  const persistNew = async (
    meta: CourseDraft,
    snapshot: DraftSnapshot,
    assets?: Record<string, string>
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Sign in to save drafts.' };
    try {
      const t0 = performance.now();
      await idbPut(STORE_PAYLOAD, payloadKey(userId, meta.id), snapshot);
      if (assets && Object.keys(assets).length) {
        await idbPut(STORE_ASSETS, payloadKey(userId, meta.id), assets);
      } else {
        try { await idbDelete(STORE_ASSETS, payloadKey(userId, meta.id)); } catch { /* ok */ }
      }
      const next = [...draftsRef.current, metaFromDraft(meta)];
      await writeIndex(userId, next);
      setDrafts(next);
      // Cache shell only (assets re-applied on load) — keeps memory smaller
      payloadCacheRef.current.set(meta.id, snapshot);
      console.log(`[DraftCourses] Saved "${meta.courseTitle}" in ${Math.round(performance.now() - t0)}ms`);
      return { ok: true };
    } catch (e: any) {
      console.error('[DraftCourses] Save failed:', e);
      return {
        ok: false,
        error: e?.message || 'Failed to save draft to browser storage.',
      };
    }
  };

  const persistReplace = async (
    id: string,
    metaPatch: Partial<CourseDraft>,
    snapshot: DraftSnapshot,
    assets?: Record<string, string>
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Sign in to save drafts.' };
    try {
      await idbPut(STORE_PAYLOAD, payloadKey(userId, id), snapshot);
      if (assets && Object.keys(assets).length) {
        await idbPut(STORE_ASSETS, payloadKey(userId, id), assets);
      } else {
        try { await idbDelete(STORE_ASSETS, payloadKey(userId, id)); } catch { /* ok */ }
      }
      const next = draftsRef.current.map(d =>
        d.id === id ? metaFromDraft({ ...d, ...metaPatch, id } as CourseDraft) : d
      );
      await writeIndex(userId, next);
      setDrafts(next);
      payloadCacheRef.current.set(id, snapshot);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Failed to update draft.' };
    }
  };

  const savePreviewDraft = useCallback(async (course: any, playerConfig: any, theme: string) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    if (draftsRef.current.length >= slotsTotal) {
      return {
        success: false,
        message: `You've used all ${slotsTotal} draft slots. Delete an existing draft or upgrade your plan.`,
      };
    }
    if (!course?.modules) {
      return { success: false, message: 'Nothing to save — generate a course first.' };
    }

    const id = makeDraftId();
    const { snapshot, assets } = preparePreviewSnapshot(course, playerConfig, theme, id);
    const meta: CourseDraft = {
      id,
      savedAt: new Date().toISOString(),
      courseTitle: snapshot.course.title || 'Untitled Course',
      slideCount: (snapshot.course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
      moduleCount: (snapshot.course.modules || []).length,
      theme,
      phase: 'preview',
    };
    const result = await persistNew(meta, snapshot, assets);
    if (!result.ok) return { success: false, message: result.error || 'Failed to save draft.' };
    return { success: true, message: `Draft "${meta.courseTitle}" saved!`, id };
  }, [userId, slotsTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDesignDraft = useCallback(async (design: Omit<DesignDraftSnapshot, 'phase'>) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    if (draftsRef.current.length >= slotsTotal) {
      return {
        success: false,
        message: `You've used all ${slotsTotal} draft slots. Delete an existing draft or upgrade your plan.`,
      };
    }
    const id = makeDraftId();
    const snapshot: DesignDraftSnapshot = { phase: 'design', ...design };
    const meta: CourseDraft = {
      id,
      savedAt: new Date().toISOString(),
      courseTitle: design.courseTitle || 'Untitled Course',
      slideCount: design.outlineDraft?.modules?.reduce(
        (a: number, m: any) => a + (m.slides?.length || 0), 0
      ) ?? 0,
      moduleCount: design.outlineDraft?.modules?.length ?? 0,
      theme: 'light',
      phase: 'design',
    };
    const result = await persistNew(meta, snapshot);
    if (!result.ok) return { success: false, message: result.error || 'Failed to save draft.' };
    return { success: true, message: `Design draft "${meta.courseTitle}" saved!`, id };
  }, [userId, slotsTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDraftAsync = useCallback(async (
    id: string,
    onProgress?: (pct: number, phase: DraftLoadProgressPhase) => void
  ): Promise<DraftSnapshot | null> => {
    if (!userId) return null;
    const t0 = performance.now();

    onProgress?.(8, 'fetch');
    await yieldToUi(10);

    try {
      onProgress?.(20, 'fetch');
      const raw = await idbGet<unknown>(STORE_PAYLOAD, payloadKey(userId, id));
      onProgress?.(40, 'parse');
      await yieldToUi(10);

      if (raw == null) {
        onProgress?.(0, 'error');
        return null;
      }

      onProgress?.(55, 'parse');
      const snapshot = parseSnapshotRaw(raw);
      await yieldToUi(10);

      if (!snapshot) {
        onProgress?.(0, 'error');
        return null;
      }

      // Keep shell lean: do NOT re-attach heavy media here.
      // App mounts the shell first, then loads assets in the background.
      if (snapshot.phase === 'preview' && snapshot.course) {
        onProgress?.(70, 'hydrate');
        // Strip any legacy inline data-URLs so setCourse never freezes the UI
        const stripped = detachHeavyMedia(snapshot.course);
        if (stripped.size) {
          // Stash on the snapshot object for one-shot open (not persisted)
          (snapshot as any).__legacyMedia = mediaMapToRecord(stripped);
          console.log(`[DraftCourses] Detached ${stripped.size} legacy inline asset(s) from shell`);
        }
      }

      payloadCacheRef.current.set(id, snapshot);
      if (payloadCacheRef.current.size > 2) {
        const oldest = payloadCacheRef.current.keys().next().value;
        if (oldest && oldest !== id) payloadCacheRef.current.delete(oldest);
      }

      onProgress?.(85, 'hydrate');
      console.log(
        `[DraftCourses] Loaded payload "${id}" in ${Math.round(performance.now() - t0)}ms`,
        snapshot.phase === 'preview'
          ? `(shell ~${Math.round(approxCourseBytes(snapshot.course) / 1024)}KB)`
          : '(design)'
      );
      return snapshot;
    } catch (e) {
      console.error('[DraftCourses] loadDraftAsync failed:', e);
      onProgress?.(0, 'error');
      return null;
    }
  }, [userId]);

  const loadDraftAssets = useCallback(async (id: string): Promise<Record<string, string>> => {
    if (!userId) return {};
    try {
      const assetsRec = await idbGet<Record<string, string>>(STORE_ASSETS, payloadKey(userId, id));
      return assetsRec && typeof assetsRec === 'object' ? assetsRec : {};
    } catch (e) {
      console.warn('[DraftCourses] loadDraftAssets failed:', e);
      return {};
    }
  }, [userId]);

  /** Sync API — only returns cached payloads (kept for legacy callers) */
  const loadDraft = useCallback((id: string): DraftSnapshot | null => {
    return payloadCacheRef.current.get(id) ?? null;
  }, []);

  const deleteDraft = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await idbDelete(STORE_PAYLOAD, payloadKey(userId, id));
    } catch { /* continue */ }
    try {
      await idbDelete(STORE_ASSETS, payloadKey(userId, id));
    } catch { /* continue */ }
    const next = draftsRef.current.filter(d => d.id !== id);
    await writeIndex(userId, next);
    setDrafts(next);
    payloadCacheRef.current.delete(id);
  }, [userId]);

  const replacePreviewDraft = useCallback(async (id: string, course: any, playerConfig: any, theme: string) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const { snapshot, assets } = preparePreviewSnapshot(course, playerConfig, theme, id);
    const result = await persistReplace(id, {
      savedAt: new Date().toISOString(),
      courseTitle: snapshot.course.title || 'Untitled Course',
      slideCount: (snapshot.course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
      moduleCount: (snapshot.course.modules || []).length,
      theme,
      phase: 'preview',
    }, snapshot, assets);
    if (!result.ok) return { success: false, message: result.error || 'Failed to update draft.' };
    return { success: true, message: 'Draft updated ✓' };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const replaceDesignDraft = useCallback(async (id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const snapshot: DesignDraftSnapshot = { phase: 'design', ...design };
    const result = await persistReplace(id, {
      savedAt: new Date().toISOString(),
      courseTitle: design.courseTitle || 'Untitled Course',
      slideCount: design.outlineDraft?.modules?.reduce(
        (a: number, m: any) => a + (m.slides?.length || 0), 0
      ) ?? 0,
      moduleCount: design.outlineDraft?.modules?.length ?? 0,
      theme: 'light',
      phase: 'design',
    }, snapshot);
    if (!result.ok) return { success: false, message: result.error || 'Failed to update draft.' };
    return { success: true, message: 'Design draft updated ✓' };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    loadDraftAsync,
    loadDraftAssets,
    deleteDraft,
    replacePreviewDraft,
    replaceDesignDraft,
    saveDraft: savePreviewDraft,
    replaceDraft: replacePreviewDraft,
  };
}
