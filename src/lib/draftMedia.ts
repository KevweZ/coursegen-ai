/**
 * Split heavy data-URL media out of a course so React can mount quickly,
 * then re-attach images after the preview is visible.
 */

import { hasLiveNarrationUrl } from './narrationAudio';

const HEAVY_RE = /^data:/i;
const HEAVY_MIN = 1500; // chars — skip tiny placeholders

export type MediaMap = Map<string, string>;
export type NarrationRecord = { mime: string; data: ArrayBuffer };

function isHeavy(val: unknown): val is string {
  return typeof val === 'string' && HEAVY_RE.test(val) && val.length >= HEAVY_MIN;
}

/**
 * Walk the course and move heavy data: URLs into a map (path → url).
 * Mutates `course` in place (sets those fields to null).
 * Any large data: string is detached — not only known image keys —
 * so legacy fat drafts cannot freeze React on setCourse.
 */
export function detachHeavyMedia(course: any): MediaMap {
  const map: MediaMap = new Map();
  if (!course || typeof course !== 'object') return map;

  const walk = (obj: any, path: string) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) walk(obj[i], `${path}[${i}]`);
      return;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const childPath = path ? `${path}.${key}` : key;
      if (isHeavy(val)) {
        map.set(childPath, val);
        obj[key] = null;
      } else if (val && typeof val === 'object') {
        walk(val, childPath);
      }
    }
  };

  walk(course, '');
  return map;
}

/** Put media back onto a course object (mutates). */
export function attachHeavyMedia(course: any, map: MediaMap): void {
  if (!course || !map.size) return;
  for (const [path, url] of map) {
    setByPath(course, path, url);
  }
}

function setByPath(root: any, path: string, value: string) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  if (!parts.length) return;
  if (parts.length === 1) {
    root[parts[0]] = value;
    return;
  }
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur == null) return;
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  if (cur && last != null) cur[last] = value;
}

/** Serialize media map for IndexedDB */
export function mediaMapToRecord(map: MediaMap): Record<string, string> {
  const rec: Record<string, string> = {};
  map.forEach((v, k) => { rec[k] = v; });
  return rec;
}

export function mediaRecordToMap(rec?: Record<string, string> | null): MediaMap {
  const map: MediaMap = new Map();
  if (!rec) return map;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'string') map.set(k, v);
  }
  return map;
}

export function isAudioAssetPath(path: string): boolean {
  return (
    /voiceOverUrl$/i.test(path)
    || /audioUrl$/i.test(path)
    || path.startsWith('__synthetic__.')
    || path.startsWith('slide:')
    || path.startsWith('tab:')
    || path.startsWith('synth:')
  );
}

export function mimeForAssetPath(path: string, type?: string): string {
  const t = String(type || '').toLowerCase();
  if (t && t !== 'application/octet-stream' && t !== 'application/json') return String(type);
  if (isAudioAssetPath(path) || t.includes('mpeg') || t.includes('mp3') || t.includes('audio')) {
    return 'audio/mpeg';
  }
  if (t.includes('png') || /coverImage|imageUrl|\.png/i.test(path)) return 'image/png';
  if (t.includes('jpeg') || t.includes('jpg') || /\.jpe?g/i.test(path)) return 'image/jpeg';
  if (t.includes('gif')) return 'image/gif';
  if (t.includes('webp')) return 'image/webp';
  return String(type || 'application/octet-stream');
}

export function withAssetMime(path: string, blob: Blob): Blob {
  const type = mimeForAssetPath(path, blob.type);
  if (blob.type === type) return blob;
  return new Blob([blob], { type });
}

function copyBytes(view: ArrayBufferView): Uint8Array | null {
  try {
    const copy = new Uint8Array(view.byteLength);
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return copy;
  } catch {
    return null;
  }
}

/**
 * Turn anything IndexedDB may hand back (Blob, ArrayBuffer, Uint8Array,
 * `{ mime, bytes }`, array-like) into a real in-memory audio Blob.
 * Nested Uint8Array records often fail to play after a tab reload.
 */
export function coerceStoredAudioBlob(val: unknown, mimeHint = 'audio/mpeg'): Blob | null {
  try {
    if (val instanceof Blob) {
      if (val.size < 64) return null;
      const mime = mimeForAssetPath('synth:clip', val.type) || mimeHint;
      return val.type === mime ? val : new Blob([val], { type: mime });
    }
    const rec = val as { mime?: string; type?: string; bytes?: unknown; data?: unknown; buffer?: unknown } | null;
    const mime = rec?.mime || rec?.type || mimeHint;
    const raw = rec && typeof rec === 'object'
      ? (rec.bytes ?? rec.data ?? rec.buffer ?? val)
      : val;
    if (raw instanceof Blob) return coerceStoredAudioBlob(raw, mime);
    if (raw instanceof ArrayBuffer) {
      if (raw.byteLength < 64) return null;
      return new Blob([raw.slice(0)], { type: mime || 'audio/mpeg' });
    }
    if (ArrayBuffer.isView(raw)) {
      const copy = copyBytes(raw as ArrayBufferView);
      if (!copy || copy.byteLength < 64) return null;
      return new Blob([copy], { type: mime || 'audio/mpeg' });
    }
    if (Array.isArray(raw) && raw.length >= 64) {
      return new Blob([Uint8Array.from(raw)], { type: mime || 'audio/mpeg' });
    }
    if (raw && typeof raw === 'object' && typeof (raw as { length?: number }).length === 'number') {
      const len = Number((raw as { length: number }).length);
      if (len < 64) return null;
      const copy = Uint8Array.from(raw as ArrayLike<number>);
      if (copy.byteLength < 64) return null;
      return new Blob([copy], { type: mime || 'audio/mpeg' });
    }
  } catch {
    return null;
  }
  return null;
}

/** Copy IDB Blobs into a standalone Blob so object URLs survive the transaction closing. */
export async function cloneStandaloneBlob(blob: Blob, path = 'synth:clip'): Promise<Blob | null> {
  if (!(blob instanceof Blob) || blob.size < 64) return null;
  try {
    const buf = await blob.arrayBuffer();
    if (buf.byteLength < 64) return null;
    return withAssetMime(path, new Blob([buf], { type: blob.type || 'audio/mpeg' }));
  } catch {
    return null;
  }
}

export function narrationRecordToBlob(rec: NarrationRecord | null | undefined): Blob | null {
  if (!rec?.data || rec.data.byteLength < 64) return null;
  try {
    const copy = copyBytes(new Uint8Array(rec.data));
    if (!copy || copy.byteLength < 64) return null;
    return new Blob([copy], { type: rec.mime || 'audio/mpeg' });
  } catch {
    return null;
  }
}

const playableUrlsByDraft = new Map<string, string[]>();

export function revokeDraftPlayableUrls(draftId: string) {
  const urls = playableUrlsByDraft.get(draftId);
  if (!urls?.length) return;
  for (const u of urls) {
    try { URL.revokeObjectURL(u); } catch { /* ok */ }
  }
  playableUrlsByDraft.delete(draftId);
}

/** Turn stored blobs into session-playable object URLs (no base64 round-trip). */
export function blobsToPlayableUrls(draftId: string, blobs: Record<string, Blob>): Record<string, string> {
  revokeDraftPlayableUrls(draftId);
  return addPlayableUrls(draftId, blobs);
}

/** Convert a data: (or blob:) URL to a Blob for IndexedDB / storage. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const raw = String(dataUrl || '');
  let headerMime = '';
  if (raw.startsWith('data:')) {
    const comma = raw.indexOf(',');
    if (comma > 5) headerMime = raw.slice(5, comma).split(';')[0] || '';
  }
  if (raw.startsWith('blob:') || raw.startsWith('data:')) {
    try {
      const res = await fetch(raw);
      if (res.ok || raw.startsWith('data:')) {
        const blob = await res.blob();
        // Some browsers return an empty Blob from fetch(data:) — parse the payload instead.
        if (blob.size >= 64 || !raw.startsWith('data:')) {
          const type = blob.type || headerMime || 'application/octet-stream';
          return blob.type === type ? blob : new Blob([blob], { type });
        }
      }
    } catch { /* fall through */ }
  }
  const comma = raw.indexOf(',');
  if (!raw.startsWith('data:') || comma < 0) {
    return new Blob([raw], { type: 'application/octet-stream' });
  }
  const header = raw.slice(5, comma);
  const mime = header.split(';')[0] || 'application/octet-stream';
  const body = raw.slice(comma + 1);
  if (/;base64/i.test(header)) {
    try {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch {
      return new Blob([body], { type: mime });
    }
  }
  try {
    return new Blob([decodeURIComponent(body)], { type: mime });
  } catch {
    return new Blob([body], { type: mime });
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read media blob'));
    reader.readAsDataURL(blob);
  });
}

export function countAudioAssetKeys(assets: Record<string, string | Blob> | null | undefined): number {
  if (!assets) return 0;
  let n = 0;
  for (const k of Object.keys(assets)) {
    if (isAudioAssetPath(k)) n += 1;
  }
  return n;
}

function isPackableAudioUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u.startsWith('blob:') && u.length > 12) return true;
  if (u.startsWith('data:') && u.length >= 1500) return true;
  if (/^https?:\/\//i.test(u) && u.length >= 40) return true;
  return false;
}

export async function audioUrlToRecord(url: string): Promise<NarrationRecord | null> {
  try {
    const blob = await dataUrlToBlob(url);
    if (!blob || blob.size < 64) return null;
    const data = await blob.arrayBuffer();
    if (data.byteLength < 64) return null;
    const mime = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'audio/mpeg';
    return { mime, data: data.slice(0) };
  } catch {
    return null;
  }
}

/** Collect narration by slide/tab/synthetic id — independent of JSON path attach. */
export async function collectNarrationRecords(
  course: any,
  syntheticAudioMap?: Record<string, string> | null,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, NarrationRecord>> {
  const jobs: Array<{ key: string; url: string }> = [];
  for (const m of course?.modules || []) {
    for (const s of m?.slides || []) {
      if (s?.id && isPackableAudioUrl(s.voiceOverUrl)) {
        jobs.push({ key: `slide:${String(s.id)}`, url: s.voiceOverUrl });
      }
      for (const listKey of ['tabs', 'items'] as const) {
        for (const item of s?.data?.[listKey] || []) {
          if (item?.id && isPackableAudioUrl(item.voiceOverUrl)) {
            jobs.push({ key: `tab:${String(s.id)}:${listKey}:${String(item.id)}`, url: item.voiceOverUrl });
          }
        }
      }
    }
  }
  for (const [id, url] of Object.entries(syntheticAudioMap || {})) {
    if (id && isPackableAudioUrl(url)) jobs.push({ key: `synth:${id}`, url });
  }
  const out: Record<string, NarrationRecord> = {};
  for (let i = 0; i < jobs.length; i++) {
    onProgress?.(i + 1, jobs.length);
    if (i === 0 || i % 2 === 0) await new Promise<void>(r => setTimeout(r, 0));
    const rec = await audioUrlToRecord(jobs[i].url);
    if (rec) out[jobs[i].key] = rec;
  }
  return out;
}

export function applyNarrationUrls(
  course: any,
  urls: Record<string, string>,
): { course: any; synthetic: Record<string, string> } {
  const synthetic: Record<string, string> = {};
  const slideUrl = new Map<string, string>();
  const tabUrl = new Map<string, string>();
  const pathUrl = new Map<string, string>();
  for (const [k, v] of Object.entries(urls || {})) {
    if (!v) continue;
    if (k.startsWith('synth:')) {
      synthetic[k.slice(6)] = v;
      continue;
    }
    if (k.startsWith('__synthetic__.')) {
      synthetic[k.slice('__synthetic__.'.length)] = v;
      continue;
    }
    if (k.startsWith('slide:')) {
      slideUrl.set(k.slice(6), v);
      continue;
    }
    const tab = k.match(/^tab:([^:]+):(tabs|items):(.+)$/);
    if (tab) {
      tabUrl.set(`${tab[1]}::${tab[2]}::${tab[3]}`, v);
      continue;
    }
    if (isAudioAssetPath(k) || k.includes('.') || k.includes('[')) {
      pathUrl.set(k, v);
    }
  }
  if (!course?.modules) return { course, synthetic };
  const next = {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        let slide = s;
        const su = s?.id ? slideUrl.get(String(s.id)) : undefined;
        if (su) slide = { ...slide, voiceOverUrl: su };
        if (!slide.data || typeof slide.data !== 'object') return slide;
        let data = slide.data;
        let changed = false;
        for (const listKey of ['tabs', 'items'] as const) {
          if (!Array.isArray(data[listKey])) continue;
          const list = data[listKey].map((item: any) => {
            const tu = item?.id && s?.id ? tabUrl.get(`${String(s.id)}::${listKey}::${String(item.id)}`) : undefined;
            if (!tu) return item;
            changed = true;
            return { ...item, voiceOverUrl: tu };
          });
          if (changed) data = { ...data, [listKey]: list };
        }
        return changed ? { ...slide, data } : slide;
      }),
    })),
  };
  for (const [path, url] of pathUrl) setByPath(next, path, url);
  return { course: next, synthetic };
}

export function addPlayableUrls(draftId: string, blobs: Record<string, Blob>): Record<string, string> {
  const out: Record<string, string> = {};
  const created = playableUrlsByDraft.get(draftId) || [];
  for (const [path, blob] of Object.entries(blobs || {})) {
    const min = isAudioAssetPath(path) ? 64 : 8;
    if (!(blob instanceof Blob) || blob.size < min) continue;
    const url = URL.createObjectURL(withAssetMime(path, blob));
    out[path] = url;
    created.push(url);
  }
  if (created.length) playableUrlsByDraft.set(draftId, created);
  return out;
}

export function narrationRecordsToBlobs(records: Record<string, NarrationRecord>): Record<string, Blob> {
  const out: Record<string, Blob> = {};
  for (const [k, rec] of Object.entries(records || {})) {
    if (!rec?.data || rec.data.byteLength < 64) continue;
    out[k] = new Blob([rec.data], { type: rec.mime || 'audio/mpeg' });
  }
  return out;
}

/**
 * Pull live blob:/data: media off the course as Blobs (no base64 round-trip).
 * Mutates `course` in place (sets those fields to null).
 */
export async function extractHeavyMediaToBlobs(
  course: any,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, Blob>> {
  const jobs: Array<{ obj: any; key: string; path: string; url: string }> = [];
  const walk = (obj: any, path: string) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) walk(obj[i], `${path}[${i}]`);
      return;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const childPath = path ? `${path}.${key}` : key;
      if (typeof val === 'string' && (val.startsWith('blob:') || isHeavy(val))) {
        jobs.push({ obj, key, path: childPath, url: val });
      } else if (val && typeof val === 'object') {
        walk(val, childPath);
      }
    }
  };
  walk(course, '');
  const out: Record<string, Blob> = {};
  for (let i = 0; i < jobs.length; i++) {
    const { obj, key, path, url } = jobs[i];
    onProgress?.(i + 1, jobs.length);
    if (i === 0 || i % 2 === 0) {
      await new Promise<void>(r => setTimeout(r, 0));
    }
    try {
      out[path] = withAssetMime(path, await dataUrlToBlob(url));
      obj[key] = null;
    } catch {
      /* leave in place for later detach / strip */
    }
  }
  return out;
}

/** Count durable narration clips currently on the course (slide + tab voiceOverUrl). */
export function countCourseAudioClips(course: any): number {
  let n = 0;
  for (const m of course?.modules || []) {
    for (const s of m?.slides || []) {
      if (hasLiveNarrationUrl(s?.voiceOverUrl)) n += 1;
      for (const key of ['tabs', 'items'] as const) {
        for (const item of s?.data?.[key] || []) {
          if (hasLiveNarrationUrl(item?.voiceOverUrl)) n += 1;
        }
      }
    }
  }
  return n;
}
export function approxCourseBytes(course: any): number {
  try {
    return JSON.stringify(course).length;
  } catch {
    return -1;
  }
}

/**
 * Deep-clone a course that has already had heavy data: URLs nulled.
 * Safe to JSON-serialize; produces a React-friendly plain object.
 */
export function cloneLeanCourse(course: any): any {
  try {
    return JSON.parse(JSON.stringify(course));
  } catch {
    return course;
  }
}

/** In-memory stash for legacy media between load and post-open attach (not on the course object). */
const pendingLegacyMedia = new Map<string, Record<string, string>>();

export function stashLegacyMedia(draftId: string, media: Record<string, string>) {
  if (media && Object.keys(media).length) pendingLegacyMedia.set(draftId, media);
  else pendingLegacyMedia.delete(draftId);
}

export function takeLegacyMedia(draftId: string): Record<string, string> {
  const m = pendingLegacyMedia.get(draftId) || {};
  pendingLegacyMedia.delete(draftId);
  return m;
}

/**
 * Tiny course so the preview can paint immediately (title slide).
 * Full modules are swapped in after the overlay is gone.
 */
export function buildInstantStubCourse(course: any): any {
  return {
    title: course?.title || 'Untitled Course',
    description: course?.description || '',
    visualTheme: course?.visualTheme,
    navigationMode: course?.navigationMode || 'free',
    examConfig: course?.examConfig,
    coverImage: null,
    modules: [
      {
        id: course?.modules?.[0]?.id || 'stub-module',
        title: course?.modules?.[0]?.title || 'Module 1',
        slides: [
          {
            id: '__draft_opening_stub__',
            type: 'content',
            title: course?.title || 'Opening draft…',
            content: 'Restoring slides…',
          },
        ],
      },
    ],
  };
}

/** Copy one module's slides into a growing partial course (no deep clone of the whole tree). */
export function withModulesUpTo(full: any, moduleCount: number): any {
  const mods = full?.modules || [];
  return {
    ...full,
    coverImage: full?.coverImage ?? null,
    modules: mods.slice(0, Math.max(1, moduleCount)).map((m: any) => ({
      id: m.id,
      title: m.title,
      slides: (m.slides || []).map((s: any) => ({ ...s })),
    })),
  };
}
