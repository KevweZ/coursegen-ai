/**
 * useDraftCourses — course draft management (Design + Development).
 *
 * Storage:
 *   - Cloud (Supabase) = source of truth for signed-in users
 *   - IndexedDB = local cache + offline fallback
 *     - `draft_index` / `draft_payload` / `draft_assets`
 *
 * Older v1 localStorage / single-blob IDB formats are migrated on read,
 * then uploaded to cloud when available.
 *
 * Tier limits:
 *   - Free (unauthenticated): 0
 *   - Pro / trial:            3
 *   - Team / enterprise:      10
 *   - Admin:                  100
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  detachHeavyMedia,
  mediaMapToRecord,
  approxCourseBytes,
  cloneLeanCourse,
  stashLegacyMedia,
} from './draftMedia';
import {
  listCloudDrafts,
  upsertCloudDraft,
  fetchCloudDraft,
  downloadCloudAssets,
  deleteCloudDraft,
  isCloudDraftsAvailable,
  resetCloudDraftsProbe,
} from './draftCloudService';

export const MAX_PRO_DRAFTS = 3;
export const MAX_TEAM_DRAFTS = 10;
export const MAX_ADMIN_DRAFTS = 100;
const STORAGE_PREFIX = 'nexcourse_drafts_v1_';
const IDB_NAME = 'nexcourse_drafts_db';
const IDB_VERSION = 4;
const STORE_INDEX = 'draft_index';
const STORE_PAYLOAD = 'draft_payload';
/** Heavy data-URL images keyed per draft — kept out of the course shell */
const STORE_ASSETS = 'draft_assets';
/** Confirmed deletes — prevents cloud/legacy refresh from resurrecting a draft */
const STORE_TOMBSTONES = 'draft_tombstones';
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
  /** Restored so Course Objectives / module overview rebuild correctly */
  learningObjectives?: any[];
  syntheticSlideOverrides?: Record<string, { content?: string; voiceOverText?: string }>;
  /** Keys for synthetic cover/objectives/module audio stored in the assets map */
  syntheticAudioIds?: string[];
  /** Pre-built mastery quiz questions — restored so Begin never regenerates */
  examQuestions?: any[];
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
      if (!db.objectStoreNames.contains(STORE_TOMBSTONES)) {
        db.createObjectStore(STORE_TOMBSTONES);
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
    // Empty array is a valid migrated state (user deleted all drafts) — do not fall through to legacy.
    if (Array.isArray(idx)) {
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

async function readTombstones(userId: string): Promise<Set<string>> {
  try {
    const list = await idbGet<string[]>(STORE_TOMBSTONES, userId);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

async function writeTombstones(userId: string, ids: Set<string>): Promise<void> {
  await idbPut(STORE_TOMBSTONES, userId, Array.from(ids));
}

async function addTombstone(userId: string, draftId: string): Promise<void> {
  const ids = await readTombstones(userId);
  ids.add(draftId);
  await writeTombstones(userId, ids);
}

async function removeTombstones(userId: string, draftIds: string[]): Promise<void> {
  if (!draftIds.length) return;
  const ids = await readTombstones(userId);
  let changed = false;
  for (const id of draftIds) {
    if (ids.delete(id)) changed = true;
  }
  if (changed) await writeTombstones(userId, ids);
}

/** Strip a deleted draft from legacy v1 blobs so an empty index never resurrects it. */
async function purgeLegacyDraft(userId: string, draftId: string): Promise<void> {
  try {
    const fromLegacyStore = await idbGet<any[]>(STORE_LEGACY, userId);
    if (Array.isArray(fromLegacyStore) && fromLegacyStore.length) {
      const next = fromLegacyStore.filter(d => d?.id !== draftId);
      if (next.length !== fromLegacyStore.length) {
        await idbPut(STORE_LEGACY, userId, next);
      }
    }
  } catch { /* ok */ }
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((d: any) => d?.id !== draftId);
    if (next.length !== parsed.length) {
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
    }
  } catch { /* ok */ }
}

/**
 * Migrate v1 formats (localStorage blob / single IDB array with embedded snapshots)
 * into index + per-draft payloads.
 */
async function migrateLegacyIfNeeded(userId: string): Promise<CourseDraft[]> {
  // If an index key already exists (even []), migration already ran — never re-import legacy.
  try {
    const idx = await idbGet<CourseDraft[]>(STORE_INDEX, userId);
    if (Array.isArray(idx)) return idx.map(metaFromDraft);
  } catch { /* fall through to migrate */ }

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
  // Clear legacy sources so an empty index can never re-import deleted drafts
  try { await idbPut(STORE_LEGACY, userId, []); } catch { /* ok */ }
  try { localStorage.removeItem(storageKey(userId)); } catch { /* ok */ }
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
 * Drop leftover blob: URLs before save (cannot survive reload).
 * Call after persistCourseAudioUrls has converted live TTS blobs → data: URLs.
 * Keeps data: images and data: audio for IndexedDB detach.
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
        // Also strip blob URLs nested in tab / card lists
        if (next.data && typeof next.data === 'object') {
          const data = { ...next.data };
          for (const key of ['tabs', 'items', 'cards'] as const) {
            if (!Array.isArray(data[key])) continue;
            data[key] = data[key].map((item: any) => {
              if (!item || typeof item !== 'object') return item;
              const copy = { ...item };
              if (typeof copy.voiceOverUrl === 'string' && copy.voiceOverUrl.startsWith('blob:')) {
                delete copy.voiceOverUrl;
              }
              return copy;
            });
          }
          next.data = data;
        }
        return next;
      }),
    })),
  };
}

export function getDraftLimitForPlan(plan?: string | null, isAdmin?: boolean): number {
  if (isAdmin) return MAX_ADMIN_DRAFTS;
  if (!plan) return MAX_PRO_DRAFTS;
  const p = plan.toLowerCase();
  if (p.includes('enterprise') || p.includes('team') || p.includes('business')) return MAX_TEAM_DRAFTS;
  return MAX_PRO_DRAFTS;
}

function mergeDraftLists(cloud: CourseDraft[], local: CourseDraft[]): CourseDraft[] {
  const byId = new Map<string, CourseDraft>();
  for (const d of local) byId.set(d.id, metaFromDraft(d));
  for (const d of cloud) {
    const prev = byId.get(d.id);
    if (!prev || new Date(d.savedAt).getTime() >= new Date(prev.savedAt).getTime()) {
      byId.set(d.id, metaFromDraft(d));
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export interface UseDraftCoursesReturn {
  drafts: CourseDraft[];
  isReady: boolean;
  /** True when Supabase course_drafts table is reachable */
  cloudEnabled: boolean;
  canSave: boolean;
  slotsUsed: number;
  slotsTotal: number;
  refreshDrafts: () => Promise<void>;
  savePreviewDraft: (
    course: any,
    playerConfig: any,
    theme: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => Promise<{ success: boolean; message: string; id?: string }>;
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
  replacePreviewDraft: (
    id: string,
    course: any,
    playerConfig: any,
    theme: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => Promise<{ success: boolean; message: string }>;
  replaceDesignDraft: (id: string, design: Omit<DesignDraftSnapshot, 'phase'>) => Promise<{ success: boolean; message: string }>;
  /** Rename a draft in the library (does not change course content). */
  renameDraft: (id: string, title: string) => Promise<{ success: boolean; message: string }>;
  saveDraft: (
    course: any,
    playerConfig: any,
    theme: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => Promise<{ success: boolean; message: string; id?: string }>;
  replaceDraft: (
    id: string,
    course: any,
    playerConfig: any,
    theme: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => Promise<{ success: boolean; message: string }>;
}

export function useDraftCourses(
  userId: string | null,
  plan?: string | null,
  isAdmin?: boolean,
  workspaceId?: string | null
): UseDraftCoursesReturn {
  const [drafts, setDrafts] = useState<CourseDraft[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);
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
      const tombstones = await readTombstones(userId);
      let local = (await loadDraftsForUser(userId)).filter(d => !tombstones.has(d.id));
      resetCloudDraftsProbe();
      const cloudOk = await isCloudDraftsAvailable();
      setCloudEnabled(cloudOk);

      let cloud: CourseDraft[] = [];
      if (cloudOk) {
        // Retry cloud deletes for any confirmed local deletes that may have failed
        const cleared: string[] = [];
        for (const id of tombstones) {
          const del = await deleteCloudDraft(userId, id);
          if (del.ok) cleared.push(id);
        }
        if (cleared.length) await removeTombstones(userId, cleared);

        const activeTombstones = await readTombstones(userId);
        cloud = (await listCloudDrafts(userId, workspaceId)).filter(d => !activeTombstones.has(d.id));

        // Migrate local-only drafts up to the cloud (never re-upload tombstoned ids)
        const cloudIds = new Set(cloud.map(d => d.id));
        for (const meta of local) {
          if (activeTombstones.has(meta.id) || cloudIds.has(meta.id)) continue;
          try {
            const raw = await idbGet<unknown>(STORE_PAYLOAD, payloadKey(userId, meta.id));
            const snapshot = parseSnapshotRaw(raw);
            if (!snapshot) continue;
            let assets =
              (await idbGet<Record<string, string>>(STORE_ASSETS, payloadKey(userId, meta.id))) || {};
            if (snapshot.phase === 'preview' && snapshot.course) {
              const detached = detachHeavyMedia(snapshot.course);
              if (detached.size) {
                assets = { ...assets, ...mediaMapToRecord(detached) };
                await idbPut(STORE_PAYLOAD, payloadKey(userId, meta.id), snapshot);
                await idbPut(STORE_ASSETS, payloadKey(userId, meta.id), assets);
              }
            }
            const up = await upsertCloudDraft(userId, meta, snapshot, assets, workspaceId);
            if (up.ok) {
              console.log(`[DraftCourses] Migrated "${meta.courseTitle}" → cloud`);
              cloudIds.add(meta.id);
            } else {
              console.warn(`[DraftCourses] Cloud migrate skipped for ${meta.id}:`, up.error);
            }
          } catch (e) {
            console.warn('[DraftCourses] Cloud migrate failed for', meta.id, e);
          }
        }
        cloud = (await listCloudDrafts(userId, workspaceId)).filter(d => !activeTombstones.has(d.id));
      }

      const remainingTombstones = await readTombstones(userId);
      // Team: cloud list is the shared pool — don't inflate slots with personal IndexedDB-only rows
      const merged = workspaceId
        ? cloud.filter(d => !remainingTombstones.has(d.id))
        : mergeDraftLists(cloud, local).filter(d => !remainingTombstones.has(d.id));
      await writeIndex(userId, merged);
      setDrafts(merged);
    } catch (e) {
      console.error('[DraftCourses] refresh failed:', e);
      setDrafts([]);
    } finally {
      setIsReady(true);
    }
  }, [userId, workspaceId]);

  useEffect(() => {
    setIsReady(false);
    void refreshDrafts();
  }, [refreshDrafts]);

  const slotsTotal = userId ? getDraftLimitForPlan(plan, isAdmin) : 0;
  const slotsUsed = drafts.length;
  const canSave = !!userId && slotsUsed < slotsTotal;

  /** Clone course lightly for save, strip blob URLs + extract heavy data-URLs to assets store */
  const preparePreviewSnapshot = async (
    course: any,
    playerConfig: any,
    theme: string,
    draftId: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => {
    // structuredClone keeps us from mutating the live editor course
    let working: any;
    try {
      working = typeof structuredClone === 'function'
        ? structuredClone(course)
        : JSON.parse(JSON.stringify(course));
    } catch {
      working = JSON.parse(JSON.stringify(course));
    }

    // Persist mastery quiz with the course shell so Begin never regenerates
    if (Array.isArray(extras?.examQuestions) && extras!.examQuestions!.length) {
      working.examQuestions = extras!.examQuestions;
    }

    // Convert in-memory blob: TTS URLs → durable data: URLs before strip/detach
    try {
      const { persistCourseAudioUrls, persistSyntheticAudioMap } = await import('../services/ttsService');
      working = await persistCourseAudioUrls(working);
      const synthPersisted = await persistSyntheticAudioMap(extras?.syntheticAudioMap || {});
      // Stash synthetic audio into assets under a reserved prefix
      (working as any).__syntheticAudioPending = synthPersisted;
    } catch (e) {
      console.warn('[DraftCourses] Audio persist step failed:', e);
    }

    working = stripEphemeralMedia(working);
    const before = approxCourseBytes(working);
    const media = detachHeavyMedia(working);

    // Move pending synthetic audio into the assets map
    const pendingSynth = (working as any).__syntheticAudioPending as Record<string, string> | undefined;
    delete (working as any).__syntheticAudioPending;
    const syntheticAudioIds: string[] = [];
    if (pendingSynth) {
      for (const [id, url] of Object.entries(pendingSynth)) {
        if (!url) continue;
        media.set(`__synthetic__.${id}`, url);
        syntheticAudioIds.push(id);
      }
    }

    const after = approxCourseBytes(working);
    console.log(
      `[DraftCourses] Media split for save: ${media.size} asset(s), ` +
      `${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB shell` +
      (syntheticAudioIds.length ? `, ${syntheticAudioIds.length} synthetic audio` : '')
    );
    const snapshot: PreviewDraftSnapshot = {
      phase: 'preview',
      course: working,
      playerConfig,
      theme,
      learningObjectives: extras?.learningObjectives,
      syntheticSlideOverrides: extras?.syntheticSlideOverrides,
      syntheticAudioIds,
      examQuestions: Array.isArray(extras?.examQuestions) ? extras!.examQuestions : working.examQuestions,
    };
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
      payloadCacheRef.current.set(meta.id, snapshot);

      let cloudNote = '';
      const cloud = await upsertCloudDraft(userId, meta, snapshot, assets, workspaceId);
      if (cloud.ok) setCloudEnabled(true);
      else if (cloud.error) cloudNote = ` (local only — ${cloud.error})`;

      console.log(`[DraftCourses] Saved "${meta.courseTitle}" in ${Math.round(performance.now() - t0)}ms`);
      return { ok: true, error: cloudNote || undefined };
    } catch (e: any) {
      console.error('[DraftCourses] Save failed:', e);
      return {
        ok: false,
        error: e?.message || 'Failed to save draft.',
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
      const nextMeta = metaFromDraft({ ...draftsRef.current.find(d => d.id === id), ...metaPatch, id } as CourseDraft);
      const next = draftsRef.current.map(d => (d.id === id ? nextMeta : d));
      await writeIndex(userId, next);
      setDrafts(next);
      payloadCacheRef.current.set(id, snapshot);

      const cloud = await upsertCloudDraft(userId, nextMeta, snapshot, assets, workspaceId);
      if (cloud.ok) setCloudEnabled(true);
      return { ok: true, error: cloud.ok ? undefined : cloud.error };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Failed to update draft.' };
    }
  };

  const savePreviewDraft = useCallback(async (
    course: any,
    playerConfig: any,
    theme: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => {
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
    const { snapshot, assets } = await preparePreviewSnapshot(course, playerConfig, theme, id, extras);
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
    if (result.error?.includes('local only')) {
      return {
        success: true,
        message: `Draft "${meta.courseTitle}" saved on this device only — cloud sync failed:${result.error.replace(/^ \(local only —/, '')} Open View Drafts on another device after sync succeeds.`,
        id,
      };
    }
    if (result.error) {
      return { success: true, message: `Draft "${meta.courseTitle}" saved to your account. ${result.error}`, id };
    }
    return {
      success: true,
      message: `Draft "${meta.courseTitle}" saved to your account (available on other devices).`,
      id,
    };
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
    if (result.error?.includes('local only')) {
      return {
        success: true,
        message: `Design draft "${meta.courseTitle}" saved on this device only — cloud sync failed:${result.error.replace(/^ \(local only —/, '')}`,
        id,
      };
    }
    if (result.error) {
      return { success: true, message: `Design draft "${meta.courseTitle}" saved. ${result.error}`, id };
    }
    return { success: true, message: `Design draft "${meta.courseTitle}" saved to your account.`, id };
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
      onProgress?.(18, 'fetch');
      // Local cache FIRST (fast). Cloud shell is a fallback — never wait on media downloads.
      let snapshot: DraftSnapshot | null = null;
      let cloudAssets: Record<string, string> = {};

      onProgress?.(25, 'fetch');
      const raw = await idbGet<unknown>(STORE_PAYLOAD, payloadKey(userId, id));
      if (raw != null) {
        snapshot = parseSnapshotRaw(raw);
        console.log(`[DraftCourses] Loaded "${id}" from local cache`);
      }

      if (!snapshot) {
        onProgress?.(32, 'fetch');
        const cloudPromise = fetchCloudDraft(userId, id);
        const timed = await Promise.race([
          cloudPromise.then(c => ({ ok: true as const, c })),
          new Promise<{ ok: false }>(r => setTimeout(() => r({ ok: false }), 4000)),
        ]);
        if (timed.ok && timed.c?.snapshot) {
          snapshot = parseSnapshotRaw(timed.c.snapshot);
          if (snapshot) {
            try {
              await idbPut(STORE_PAYLOAD, payloadKey(userId, id), snapshot);
            } catch { /* cache best-effort */ }
          }
          console.log(`[DraftCourses] Loaded "${id}" from cloud`);
        } else if (!timed.ok) {
          console.warn('[DraftCourses] Cloud fetch timed out — continuing without it');
        }
      }

      onProgress?.(45, 'parse');
      await yieldToUi(10);

      if (!snapshot) {
        onProgress?.(0, 'error');
        return null;
      }

      onProgress?.(60, 'parse');
      await yieldToUi(10);

      // Lean shell only — never keep base64 on the snapshot for setCourse
      if (snapshot.phase === 'preview' && snapshot.course) {
        onProgress?.(72, 'hydrate');
        await yieldToUi(10);
        const stripped = detachHeavyMedia(snapshot.course);
        if (stripped.size) {
          const rec = mediaMapToRecord(stripped);
          stashLegacyMedia(id, rec);
          // Persist out of the hot path so reopen is lean
          void idbPut(STORE_ASSETS, payloadKey(userId, id), {
            ...(cloudAssets || {}),
            ...rec,
          }).catch(() => {});
          console.log(`[DraftCourses] Detached ${stripped.size} inline asset(s)`);
        } else if (Object.keys(cloudAssets).length) {
          // Assets already separate in cloud/IDB — nothing to stash from shell
        }
        // Clone lean course so React never shares a fat object graph
        snapshot = {
          ...snapshot,
          course: cloneLeanCourse(snapshot.course),
        };
      }

      payloadCacheRef.current.set(id, snapshot);
      if (payloadCacheRef.current.size > 2) {
        const oldest = payloadCacheRef.current.keys().next().value;
        if (oldest && oldest !== id) payloadCacheRef.current.delete(oldest);
      }

      onProgress?.(85, 'hydrate');
      const kb =
        snapshot.phase === 'preview' ? Math.round(approxCourseBytes(snapshot.course) / 1024) : -1;
      console.log(
        `[DraftCourses] Ready to open "${id}" in ${Math.round(performance.now() - t0)}ms`,
        snapshot.phase === 'preview' ? `(lean shell ~${kb}KB)` : '(design)'
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
      // Local cache first (fast); cloud if empty
      const local = await idbGet<Record<string, string>>(STORE_ASSETS, payloadKey(userId, id));
      if (local && typeof local === 'object' && Object.keys(local).length) return local;

      const cloudAssets = await downloadCloudAssets(userId, id);
      if (Object.keys(cloudAssets).length) {
        try {
          await idbPut(STORE_ASSETS, payloadKey(userId, id), cloudAssets);
        } catch { /* ok */ }
        return cloudAssets;
      }
      return {};
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

    // Record the delete first so a refresh cannot resurrect this draft
    try {
      await addTombstone(userId, id);
    } catch (e) {
      console.warn('[DraftCourses] tombstone write failed:', e);
    }

    // Optimistic UI — remove from list immediately
    const next = draftsRef.current.filter(d => d.id !== id);
    setDrafts(next);
    payloadCacheRef.current.delete(id);

    try {
      await writeIndex(userId, next);
    } catch (e) {
      console.warn('[DraftCourses] index update after delete failed:', e);
    }

    try {
      await idbDelete(STORE_PAYLOAD, payloadKey(userId, id));
    } catch { /* continue */ }
    try {
      await idbDelete(STORE_ASSETS, payloadKey(userId, id));
    } catch { /* continue */ }

    await purgeLegacyDraft(userId, id);

    const cloud = await deleteCloudDraft(userId, id);
    if (cloud.ok) {
      try {
        await removeTombstones(userId, [id]);
      } catch { /* tombstone can clear on next refresh */ }
    } else {
      console.warn('[DraftCourses] Cloud delete incomplete; will retry on refresh:', cloud.error);
    }
  }, [userId]);

  const replacePreviewDraft = useCallback(async (
    id: string,
    course: any,
    playerConfig: any,
    theme: string,
    extras?: {
      learningObjectives?: any[];
      syntheticSlideOverrides?: Record<string, any>;
      syntheticAudioMap?: Record<string, string>;
      examQuestions?: any[];
    }
  ) => {
    if (!userId) return { success: false, message: 'Sign in to save drafts.' };
    const { snapshot, assets } = await preparePreviewSnapshot(course, playerConfig, theme, id, extras);
    const result = await persistReplace(id, {
      savedAt: new Date().toISOString(),
      courseTitle: snapshot.course.title || 'Untitled Course',
      slideCount: (snapshot.course.modules || []).reduce((a: number, m: any) => a + (m.slides?.length || 0), 0),
      moduleCount: (snapshot.course.modules || []).length,
      theme,
      phase: 'preview',
    }, snapshot, assets);
    if (!result.ok) return { success: false, message: result.error || 'Failed to update draft.' };
    return { success: true, message: 'Draft updated ✓ Reopen anytime from Save.' };
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

  const renameDraft = useCallback(async (id: string, title: string) => {
    if (!userId) return { success: false, message: 'Sign in to rename drafts.' };
    const trimmed = title.trim();
    if (!trimmed) return { success: false, message: 'Enter a draft name.' };
    const existing = draftsRef.current.find(d => d.id === id);
    if (!existing) return { success: false, message: 'Draft not found.' };

    let snapshot = payloadCacheRef.current.get(id) || null;
    if (!snapshot) {
      try {
        snapshot = (await idbGet(STORE_PAYLOAD, payloadKey(userId, id))) as DraftSnapshot | null;
      } catch {
        snapshot = null;
      }
    }
    if (!snapshot) {
      snapshot = await loadDraftAsync(id);
    }
    if (!snapshot) return { success: false, message: 'Could not load draft to rename.' };

    const nextSnap: DraftSnapshot =
      snapshot.phase === 'preview'
        ? {
            ...snapshot,
            course: { ...(snapshot as PreviewDraftSnapshot).course, title: trimmed },
          }
        : {
            ...snapshot,
            courseTitle: trimmed,
          };

    try {
      // Update payload + index only — never touch the assets store on rename.
      await idbPut(STORE_PAYLOAD, payloadKey(userId, id), nextSnap);
      const nextMeta = metaFromDraft({
        ...existing,
        id,
        courseTitle: trimmed,
        savedAt: new Date().toISOString(),
      });
      const next = draftsRef.current.map(d => (d.id === id ? nextMeta : d));
      await writeIndex(userId, next);
      setDrafts(next);
      payloadCacheRef.current.set(id, nextSnap);

      const assets = await loadDraftAssets(id).catch(() => ({} as Record<string, string>));
      const cloud = await upsertCloudDraft(userId, nextMeta, nextSnap, assets, workspaceId);
      if (cloud.ok) setCloudEnabled(true);
      return { success: true, message: `Draft renamed to "${trimmed}".` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to rename draft.' };
    }
  }, [userId, loadDraftAsync, loadDraftAssets, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    drafts,
    isReady,
    cloudEnabled,
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
    renameDraft,
    saveDraft: savePreviewDraft,
    replaceDraft: replacePreviewDraft,
  };
}
