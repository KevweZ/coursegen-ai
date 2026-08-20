/**
 * Account preference sync helpers (Course Settings + Player Properties).
 * Local storage is a cache; server user_metadata is the cross-device source of truth.
 */
import { supabase } from './supabaseClient';
import { resolveApiBase } from './nativeApiBridge';

function apiBase(): string {
  return resolveApiBase();
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchAccountPreferences(): Promise<{
  courseSettings: any | null;
  playerProperties: any | null;
} | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await fetch(`${apiBase()}/api/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      courseSettings: data.courseSettings ?? null,
      playerProperties: data.playerProperties ?? null,
    };
  } catch (e) {
    console.warn('[preferences] fetch failed', e);
    return null;
  }
}

export async function pushAccountPreferences(patch: {
  courseSettings?: any;
  playerProperties?: any;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, error: 'Not signed in' };
    const res = await fetch(`${apiBase()}/api/preferences`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to sync preferences' };
  }
}
