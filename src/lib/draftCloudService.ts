/**
 * Cloud draft persistence via the NexCourse server (service-role upsert).
 * IndexedDB remains a per-device cache; the server is the cross-device source of truth.
 */
import { supabase } from './supabaseClient';

export interface CloudDraftMeta {
  id: string;
  savedAt: string;
  courseTitle: string;
  slideCount: number;
  moduleCount: number;
  theme: string;
  phase: 'design' | 'preview';
}

export type CloudDraftSnapshot = Record<string, any>;

const BUCKET = 'draft-assets';
const CHUNK_CHARS = 3_500_000;

let cloudReady: boolean | null = null;

function apiBase(): string {
  return String((import.meta as any).env?.VITE_API_BASE ?? '').replace(/\/$/, '');
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in — cloud draft sync requires an active session.');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${apiBase()}${path}`, { ...init, headers });
}

export async function isCloudDraftsAvailable(): Promise<boolean> {
  if (cloudReady != null) return cloudReady;
  try {
    // Prefer server route (works even when browser RLS is misconfigured)
    const token = await getAccessToken();
    if (token) {
      const res = await fetch(`${apiBase()}/api/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        cloudReady = false;
        return false;
      }
      // 200 or empty list = cloud path works; 500 with missing table still false
      if (res.ok) {
        cloudReady = true;
        return true;
      }
    }
    const { error } = await supabase.from('course_drafts').select('id').limit(1);
    if (error) {
      console.warn('[DraftCloud] Table not ready:', error.message);
      cloudReady = false;
      return false;
    }
    cloudReady = true;
    return true;
  } catch (e) {
    console.warn('[DraftCloud] Probe failed:', e);
    cloudReady = false;
    return false;
  }
}

export function resetCloudDraftsProbe() {
  cloudReady = null;
}

function assetPrefix(userId: string, draftId: string) {
  return `${userId}/${draftId}`;
}

export async function listCloudDrafts(
  userId: string,
  workspaceId?: string | null
): Promise<CloudDraftMeta[]> {
  if (!(await isCloudDraftsAvailable())) return [];
  try {
    const q = workspaceId
      ? `/api/drafts?workspaceId=${encodeURIComponent(workspaceId)}`
      : '/api/drafts';
    const res = await authedFetch(q);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[DraftCloud] list failed:', data.error || res.status);
      return [];
    }
    void userId;
    return (data.drafts || []) as CloudDraftMeta[];
  } catch (e: any) {
    console.warn('[DraftCloud] list failed:', e?.message || e);
    return [];
  }
}

async function uploadAssets(
  userId: string,
  draftId: string,
  assets?: Record<string, string>
): Promise<void> {
  const prefix = assetPrefix(userId, draftId);
  try {
    const { data: existing } = await supabase.storage.from(BUCKET).list(prefix);
    if (existing?.length) {
      await supabase.storage.from(BUCKET).remove(existing.map(f => `${prefix}/${f.name}`));
    }
  } catch { /* ok */ }

  if (!assets || !Object.keys(assets).length) return;

  const json = JSON.stringify(assets);
  if (json.length <= CHUNK_CHARS) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${prefix}/media.json`, new Blob([json], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      });
    if (error) throw error;
    return;
  }

  const keys = Object.keys(assets);
  let chunk: Record<string, string> = {};
  let chunkIdx = 0;
  let size = 2;

  const flush = async () => {
    if (!Object.keys(chunk).length) return;
    const body = JSON.stringify(chunk);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${prefix}/media-${chunkIdx}.json`, new Blob([body], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      });
    if (error) throw error;
    chunkIdx += 1;
    chunk = {};
    size = 2;
  };

  for (const k of keys) {
    const v = assets[k];
    const add = k.length + v.length + 8;
    if (size + add > CHUNK_CHARS && Object.keys(chunk).length) {
      await flush();
    }
    chunk[k] = v;
    size += add;
  }
  await flush();
}

export async function downloadCloudAssets(userId: string, draftId: string): Promise<Record<string, string>> {
  const prefix = assetPrefix(userId, draftId);
  const out: Record<string, string> = {};

  const { data: files, error } = await supabase.storage.from(BUCKET).list(prefix);
  if (error || !files?.length) return out;

  const mediaFiles = files
    .map(f => f.name)
    .filter(n => n === 'media.json' || /^media-\d+\.json$/.test(n))
    .sort();

  for (const name of mediaFiles) {
    const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(`${prefix}/${name}`);
    if (dlErr || !data) continue;
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') Object.assign(out, parsed);
    } catch (e) {
      console.warn('[DraftCloud] Bad media chunk', name, e);
    }
  }
  return out;
}

function leanSnapshotForUpload(snapshot: CloudDraftSnapshot): CloudDraftSnapshot {
  const strip = (value: unknown, depth = 0): unknown => {
    if (depth > 14 || value == null) return value;
    if (typeof value === 'string') {
      if (value.startsWith('data:') && value.length > 2000) return '';
      if (value.startsWith('blob:')) return '';
      return value;
    }
    if (Array.isArray(value)) return value.map(v => strip(v, depth + 1));
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        // Skip ephemeral / huge fields that belong in asset storage
        if (/^(voiceOverUrl|audioUrl|coverImage|imageUrl|mediaUrl)$/i.test(k) && typeof v === 'string' && v.length > 500) {
          out[k] = '';
          continue;
        }
        out[k] = strip(v, depth + 1);
      }
      return out;
    }
    return value;
  };
  try {
    return strip(JSON.parse(JSON.stringify(snapshot))) as CloudDraftSnapshot;
  } catch {
    return strip(snapshot) as CloudDraftSnapshot;
  }
}

export async function upsertCloudDraft(
  userId: string,
  meta: CloudDraftMeta,
  snapshot: CloudDraftSnapshot,
  assets?: Record<string, string>,
  workspaceId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCloudDraftsAvailable())) {
    return { ok: false, error: 'Cloud drafts unavailable. Sign in and try again.' };
  }

  try {
    const lean = leanSnapshotForUpload(snapshot);
    let body = JSON.stringify({ meta, snapshot: lean, workspaceId: workspaceId || null });
    // Keep well under Worker/proxy limits
    if (body.length > 12_000_000) {
      const minimal = {
        ...lean,
        course: lean.phase === 'preview' && lean.course
          ? {
              ...lean.course,
              modules: (lean.course.modules || []).map((m: any) => ({
                ...m,
                slides: (m.slides || []).map((s: any) => ({
                  id: s.id,
                  title: s.title,
                  type: s.type,
                  content: typeof s.content === 'string' ? s.content.slice(0, 4000) : s.content,
                  voiceOverText: typeof s.voiceOverText === 'string' ? s.voiceOverText.slice(0, 4000) : s.voiceOverText,
                  data: s.data,
                })),
              })),
            }
          : lean.course,
      };
      body = JSON.stringify({ meta, snapshot: minimal, workspaceId: workspaceId || null });
    }

    const res = await authedFetch('/api/drafts/upsert', {
      method: 'POST',
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || data.message || `Cloud save failed (${res.status})` };
    }

    try {
      await uploadAssets(userId, meta.id, assets);
    } catch (assetErr: any) {
      console.warn('[DraftCloud] Assets upload failed (draft row saved):', assetErr);
      return {
        ok: true,
        error: `Synced draft shell; media upload failed (${assetErr?.message || 'storage error'}). Re-save to retry media.`,
      };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[DraftCloud] upsert failed:', e);
    return { ok: false, error: e?.message || 'Cloud save failed' };
  }
}

export async function fetchCloudDraft(
  userId: string,
  draftId: string
): Promise<{ snapshot: CloudDraftSnapshot; assets: Record<string, string> } | null> {
  if (!(await isCloudDraftsAvailable())) return null;
  try {
    const res = await authedFetch(`/api/drafts/${encodeURIComponent(draftId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.snapshot) {
      if (!res.ok) console.warn('[DraftCloud] fetch failed:', data.error || res.status);
      return null;
    }
    void userId;
    return { snapshot: data.snapshot as CloudDraftSnapshot, assets: {} };
  } catch (e: any) {
    console.warn('[DraftCloud] fetch failed:', e?.message || e);
    return null;
  }
}

export async function deleteCloudDraft(
  userId: string,
  draftId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCloudDraftsAvailable())) {
    return { ok: true };
  }
  try {
    const res = await authedFetch(`/api/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || res.statusText };

    try {
      const prefix = assetPrefix(userId, draftId);
      const { data: files } = await supabase.storage.from(BUCKET).list(prefix);
      if (files?.length) {
        await supabase.storage.from(BUCKET).remove(files.map(f => `${prefix}/${f.name}`));
      }
    } catch (e) {
      console.warn('[DraftCloud] delete assets failed:', e);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Cloud delete failed' };
  }
}
