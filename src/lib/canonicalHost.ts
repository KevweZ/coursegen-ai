/** Public site host. www, HTTP, and workers.dev aliases redirect here. */
export const CANONICAL_HOST = 'nexcourse.ai';

export function isLocalDevHost(host: string): boolean {
  const h = String(host || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost');
}

/**
 * Absolute https://nexcourse.ai… URL when the request is on the wrong host or http.
 * Preserves path and query. Returns null when already canonical (or local dev).
 */
export function canonicalLocation(requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (isLocalDevHost(host)) return null;
  const needsHost = host !== CANONICAL_HOST;
  const needsHttps = url.protocol !== 'https:';
  if (!needsHost && !needsHttps) return null;
  return `https://${CANONICAL_HOST}${url.pathname}${url.search}`;
}

export function canonicalRedirectStatus(method: string): 301 | 308 {
  const m = String(method || 'GET').toUpperCase();
  return m === 'GET' || m === 'HEAD' ? 301 : 308;
}
