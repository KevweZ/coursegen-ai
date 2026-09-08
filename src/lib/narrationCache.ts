/**
 * Session cache of narration MP3 bytes, filled when TTS clips arrive.
 * Save writes this store instead of re-fetching huge data: URLs off the course.
 */

import type { NarrationRecord } from './draftMedia';
import { audioUrlToRecord } from './draftMedia';

const cache = new Map<string, NarrationRecord>();

export function clearNarrationCache() {
  cache.clear();
}

export function getNarrationCache(): Record<string, NarrationRecord> {
  const out: Record<string, NarrationRecord> = {};
  for (const [k, v] of cache) {
    if (v?.data && v.data.byteLength >= 64) {
      out[k] = { mime: v.mime || 'audio/mpeg', data: v.data.slice(0) };
    }
  }
  return out;
}

export function stashNarrationRecord(key: string, rec: NarrationRecord | null | undefined) {
  if (!key || !rec?.data || rec.data.byteLength < 64) return;
  cache.set(key, { mime: rec.mime || 'audio/mpeg', data: rec.data.slice(0) });
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

/** Stash job MP3 bytes and return a session object URL for the player. */
export function stashJobResultAudio(r: {
  id?: string;
  target?: string | null;
  slideId?: string | null;
  tabId?: string | null;
  listKey?: string | null;
  audioContentType?: string;
  audioBase64?: string;
}): string | null {
  const raw = String(r.audioBase64 || '').replace(/\s+/g, '');
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
