/**
 * Narration MP3 bytes: in-memory map + IndexedDB that is written as each
 * TTS clip arrives (not only at Save). Update Draft copies this store onto
 * the draft id so reopen does not depend on walking huge data: URLs.
 */

import type { NarrationRecord } from './draftMedia';
import { audioUrlToRecord, coerceStoredAudioBlob, narrationRecordToBlob } from './draftMedia';

const G = globalThis as any;
const CACHE_KEY = '__nexcourseNarrationCache';
const SCOPE_KEY = '__nexcourseNarrationScope';
const PENDING_KEY = '__nexcourseNarrationPending';

function memoryMap(): Map<string, NarrationRecord> {
  if (!G[CACHE_KEY]) G[CACHE_KEY] = new Map<string, NarrationRecord>();
  return G[CACHE_KEY] as Map<string, NarrationRecord>;
}

function pendingWrites(): Promise<void>[] {
  if (!G[PENDING_KEY]) G[PENDING_KEY] = [];
  return G[PENDING_KEY] as Promise<void>[];
}

export function setLiveNarrationScope(scope: string | null | undefined) {
  G[SCOPE_KEY] = String(scope || 'pending');
}

export function getLiveNarrationScope(): string {
  return String(G[SCOPE_KEY] || 'pending');
}

export function clearNarrationCache() {
  memoryMap().clear();
}

export function getNarrationCache(): Record<string, NarrationRecord> {
  const out: Record<string, NarrationRecord> = {};
  for (const [k, v] of memoryMap()) {
    if (v?.data && v.data.byteLength >= 64) {
      out[k] = { mime: v.mime || 'audio/mpeg', data: v.data.slice(0) };
    }
  }
  return out;
}

export function stashNarrationRecord(key: string, rec: NarrationRecord | null | undefined) {
  if (!key || !rec?.data || rec.data.byteLength < 64) return;
  const copy = { mime: rec.mime || 'audio/mpeg', data: rec.data.slice(0) };
  memoryMap().set(key, copy);
  queueLivePut(key, copy);
}

const LIVE_DB = 'nexcourse_live_narration';
const LIVE_VER = 1;
const LIVE_STORE = 'clips';

function openLiveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(LIVE_DB, LIVE_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LIVE_STORE)) db.createObjectStore(LIVE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open live narration DB'));
  });
}

function liveKey(clipKey: string) {
  return `${getLiveNarrationScope()}::${clipKey}`;
}

function queueLivePut(clipKey: string, rec: NarrationRecord) {
  const run = (async () => {
    try {
      const blob = narrationRecordToBlob(rec);
      if (!blob) return;
      const db = await openLiveDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(LIVE_STORE, 'readwrite');
        tx.objectStore(LIVE_STORE).put(blob, liveKey(clipKey));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[Narration] Live clip persist failed:', clipKey, e);
    }
  })();
  const list = pendingWrites();
  list.push(run);
  void run.finally(() => {
    const i = list.indexOf(run);
    if (i >= 0) list.splice(i, 1);
  });
}

export async function flushLiveNarration() {
  await Promise.allSettled([...pendingWrites()]);
}

export async function readLiveNarration(scope?: string): Promise<Record<string, NarrationRecord>> {
  await flushLiveNarration();
  const prefix = `${scope || getLiveNarrationScope()}::`;
  const raw: Array<{ clipKey: string; val: unknown }> = [];
  try {
    const db = await openLiveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LIVE_STORE, 'readonly');
      const req = tx.objectStore(LIVE_STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (key.startsWith(prefix)) {
          raw.push({ clipKey: key.slice(prefix.length), val: cursor.value });
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Narration] Live clip read failed:', e);
    return {};
  }
  const out: Record<string, NarrationRecord> = {};
  for (const { clipKey, val } of raw) {
    const blob = coerceStoredAudioBlob(val);
    if (!blob) continue;
    try {
      const data = await blob.arrayBuffer();
      if (data.byteLength < 64) continue;
      out[clipKey] = { mime: blob.type || 'audio/mpeg', data: data.slice(0) };
    } catch { /* skip corrupt clip */ }
  }
  return out;
}

export function playerElementHasAudio(): boolean {
  if (typeof document === 'undefined') return false;
  return Array.from(document.querySelectorAll('audio')).some((el) => {
    const src = String((el as HTMLAudioElement).currentSrc || (el as HTMLAudioElement).src || '');
    return src.length > 20 && (src.startsWith('blob:') || src.startsWith('data:') || /^https?:/.test(src));
  });
}

export async function harvestPlayerAudio(slideId?: string | null): Promise<Record<string, NarrationRecord>> {
  const out: Record<string, NarrationRecord> = {};
  if (typeof document === 'undefined' || !slideId) return out;
  for (const el of Array.from(document.querySelectorAll('audio'))) {
    const src = String((el as HTMLAudioElement).currentSrc || (el as HTMLAudioElement).src || '');
    if (src.length < 20) continue;
    try {
      const rec = await audioUrlToRecord(src);
      if (rec) {
        const key = `slide:${slideId}`;
        out[key] = rec;
        stashNarrationRecord(key, rec);
      }
    } catch { /* skip */ }
  }
  return out;
}

export function narrationKeyForJob(r: {
  id?: string;
  target?: string | null;
  slideId?: string | null;
  tabId?: string | null;
  listKey?: string | null;
}): string | null {
  const id = String(r.id || '');
  if (r.target === 'synthetic' || (id.startsWith('__') && id.endsWith('__'))) {
    return id ? `synth:${id}` : null;
  }
  if (r.target === 'tab' || r.tabId) {
    const slideId = String(r.slideId || id.split('::tab::')[0] || '');
    const tabId = String(r.tabId || id.split('::tab::')[1] || '');
    const listKey = r.listKey === 'items' ? 'items' : 'tabs';
    if (!slideId || !tabId) return null;
    return `tab:${slideId}:${listKey}:${tabId}`;
  }
  const slideId = String(r.slideId || id || '');
  return slideId ? `slide:${slideId}` : null;
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Stash job MP3 bytes (memory + IndexedDB) and return a session object URL. */
export function stashJobResultAudio(r: {
  id?: string;
  target?: string | null;
  slideId?: string | null;
  tabId?: string | null;
  listKey?: string | null;
  audioContentType?: string;
  audioBase64?: string;
}): string | null {
  const raw = String((r as any).audioBase64 || (r as any).audio || (r as any).base64 || '').replace(/\s+/g, '');
  if (raw.length < 80) return null;
  const key = narrationKeyForJob(r);
  if (!key) return null;
  let data: ArrayBuffer;
  try {
    data = base64ToArrayBuffer(raw);
  } catch {
    return null;
  }
  if (data.byteLength < 64) return null;
  const mime = r.audioContentType || 'audio/mpeg';
  stashNarrationRecord(key, { mime, data });
  return URL.createObjectURL(new Blob([data], { type: mime }));
}

export async function stashAudioUrl(key: string, url: string) {
  if (!key || !url) return;
  try {
    const rec = await audioUrlToRecord(url);
    stashNarrationRecord(key, rec);
  } catch { /* skip */ }
}

export async function stashNarrationBlobs(blobs: Record<string, Blob>) {
  for (const [k, blob] of Object.entries(blobs || {})) {
    if (!(blob instanceof Blob) || blob.size < 64) continue;
    try {
      const data = await blob.arrayBuffer();
      stashNarrationRecord(k, { mime: blob.type || 'audio/mpeg', data });
    } catch { /* skip corrupt */ }
  }
}
