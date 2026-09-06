/**
 * Split heavy data-URL media out of a course so React can mount quickly,
 * then re-attach images after the preview is visible.
 */

import { hasPlayableNarrationUrl } from './narrationAudio';

const HEAVY_RE = /^data:/i;
const HEAVY_MIN = 1500; // chars — skip tiny placeholders

export type MediaMap = Map<string, string>;

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

/** Convert a data: (or blob:) URL to a Blob for IndexedDB / storage. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const raw = String(dataUrl || '');
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

export function countAudioAssetKeys(assets: Record<string, string> | null | undefined): number {
  if (!assets) return 0;
  let n = 0;
  for (const k of Object.keys(assets)) {
    if (/voiceOverUrl$/i.test(k) || k.startsWith('__synthetic__.')) n += 1;
  }
  return n;
}

/** Count durable narration clips currently on the course (slide + tab voiceOverUrl). */
export function countCourseAudioClips(course: any): number {
  let n = 0;
  for (const m of course?.modules || []) {
    for (const s of m?.slides || []) {
      if (hasPlayableNarrationUrl(s?.voiceOverUrl)) n += 1;
      for (const key of ['tabs', 'items'] as const) {
        for (const item of s?.data?.[key] || []) {
          if (hasPlayableNarrationUrl(item?.voiceOverUrl)) n += 1;
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
