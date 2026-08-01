/**
 * Split heavy data-URL media out of a course so React can mount quickly,
 * then re-attach images after the preview is visible.
 */

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

/** Approx payload size helper for logging */
export function approxCourseBytes(course: any): number {
  try {
    return JSON.stringify(course).length;
  } catch {
    return -1;
  }
}
