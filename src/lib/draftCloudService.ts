/**
 * Cloud draft persistence via Supabase (Postgres + Storage).
 * Source of truth for signed-in users; IndexedDB remains a local cache.
 */
import { supabase } from './supabaseClient';

/** Loose shapes to avoid circular imports with useDraftCourses */
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
/** Keep each storage object comfortably under typical API limits */
const CHUNK_CHARS = 3_500_000;

let cloudReady: boolean | null = null;

export async function isCloudDraftsAvailable(): Promise<boolean> {
  if (cloudReady != null) return cloudReady;
  try {
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

/** Reset probe after migration so the next call re-checks */
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

  // Team: list the shared workspace pool. Creator: personal drafts only.
  let query = supabase
    .from('course_drafts')
    .select('id, phase, course_title, slide_count, module_count, theme, updated_at')
    .order('updated_at', { ascending: false });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[DraftCloud] list failed:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    savedAt: row.updated_at || new Date().toISOString(),
    courseTitle: row.course_title || 'Untitled Course',
    slideCount: row.slide_count ?? 0,
    moduleCount: row.module_count ?? 0,
    theme: row.theme || 'light',
    phase: (row.phase === 'design' ? 'design' : 'preview') as 'design' | 'preview',
  }));
}

async function uploadAssets(
  userId: string,
  draftId: string,
  assets?: Record<string, string>
): Promise<void> {
  const prefix = assetPrefix(userId, draftId);

  // Clear previous chunks
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

  // Chunk large asset maps
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

export async function upsertCloudDraft(
  userId: string,
  meta: CloudDraftMeta,
  snapshot: CloudDraftSnapshot,
  assets?: Record<string, string>,
  workspaceId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCloudDraftsAvailable())) {
    return { ok: false, error: 'Cloud drafts table not set up. Run supabase_drafts_migration.sql in Supabase.' };
  }

  try {
    const row: Record<string, unknown> = {
      id: meta.id,
      user_id: userId,
      phase: meta.phase,
      course_title: meta.courseTitle,
      slide_count: meta.slideCount,
      module_count: meta.moduleCount,
      theme: meta.theme || 'light',
      player_config: snapshot.phase === 'preview' ? snapshot.playerConfig ?? null : null,
      snapshot,
      updated_at: meta.savedAt || new Date().toISOString(),
    };
    if (workspaceId) row.workspace_id = workspaceId;

    const { error } = await supabase.from('course_drafts').upsert(row, { onConflict: 'id' });
    if (error) throw error;

    await uploadAssets(userId, meta.id, assets);
    return { ok: true };
  } catch (e: any) {
    console.error('[DraftCloud] upsert failed:', e);
    return { ok: false, error: e?.message || 'Cloud save failed' };
  }
}

/** Fetch lean snapshot only — never downloads media (that blocked the open overlay). */
export async function fetchCloudDraft(
  userId: string,
  draftId: string
): Promise<{ snapshot: CloudDraftSnapshot; assets: Record<string, string> } | null> {
  if (!(await isCloudDraftsAvailable())) return null;

  // Do not filter by user_id — Team members may open shared workspace drafts (RLS).
  const { data, error } = await supabase
    .from('course_drafts')
    .select('snapshot, player_config, phase, theme, user_id')
    .eq('id', draftId)
    .maybeSingle();

  if (error || !data?.snapshot) {
    if (error) console.warn('[DraftCloud] fetch failed:', error.message);
    return null;
  }

  let snapshot = data.snapshot as CloudDraftSnapshot;
  // Ensure preview snapshots carry playerConfig/theme from columns if needed
  if (snapshot && typeof snapshot === 'object' && snapshot.phase === 'preview') {
    snapshot = {
      ...snapshot,
      playerConfig: snapshot.playerConfig ?? data.player_config,
      theme: snapshot.theme ?? data.theme ?? 'light',
    };
  }

  void userId; // viewer id — assets still live under the saver's prefix when loaded later
  return { snapshot, assets: {} };
}

export async function deleteCloudDraft(
  userId: string,
  draftId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isCloudDraftsAvailable())) {
    // No cloud table — treat as success so local delete can proceed
    return { ok: true };
  }

  // Prefer owner delete; Team RLS also allows workspace members to delete shared rows.
  const { data: row } = await supabase
    .from('course_drafts')
    .select('user_id')
    .eq('id', draftId)
    .maybeSingle();

  const { error } = await supabase
    .from('course_drafts')
    .delete()
    .eq('id', draftId);

  if (error) {
    console.warn('[DraftCloud] delete row failed:', error.message);
    return { ok: false, error: error.message };
  }

  try {
    const ownerId = row?.user_id || userId;
    const prefix = assetPrefix(ownerId, draftId);
    const { data: files } = await supabase.storage.from(BUCKET).list(prefix);
    if (files?.length) {
      const { error: rmErr } = await supabase.storage
        .from(BUCKET)
        .remove(files.map(f => `${prefix}/${f.name}`));
      if (rmErr) console.warn('[DraftCloud] delete assets failed:', rmErr.message);
    }
  } catch (e) {
    console.warn('[DraftCloud] delete assets failed:', e);
  }

  return { ok: true };
}
