/** Sync localStorage scrape — tests and fallbacks. Prefer getSupabaseAccessTokenAsync. */
export function getSupabaseAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const key = Object.keys(localStorage).find(k =>
      (k.startsWith('sb-') && k.includes('auth-token')) ||
      (k.includes('supabase') && k.includes('auth'))
    );
    if (key) {
      const token = JSON.parse(localStorage.getItem(key) ?? '')?.access_token;
      if (token) return String(token);
    }
    for (const k of Object.keys(localStorage)) {
      try {
        const v = JSON.parse(localStorage.getItem(k) ?? '');
        if (v?.access_token) return String(v.access_token);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return null;
}

/** Prefer the live Supabase session — localStorage fails on chunked/cookie sessions. */
export async function getSupabaseAccessTokenAsync(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session.access_token;
  } catch {
    /* fall through to localStorage */
  }
  return getSupabaseAccessToken();
}

export async function authJsonHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseAccessTokenAsync();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
