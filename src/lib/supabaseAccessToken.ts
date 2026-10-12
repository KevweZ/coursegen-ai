/** Read the current Supabase access token from localStorage (browser only). */
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
