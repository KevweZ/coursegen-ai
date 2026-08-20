/**
 * Native (Capacitor) bridge helpers.
 * Relative `/api/*` calls work on nexcourse.ai (same-origin Worker proxy), but in a
 * native WebView the origin is capacitor://localhost / https://localhost — so we
 * rewrite those calls to the live site. Supabase already uses absolute VITE_SUPABASE_* URLs.
 */
import { Capacitor } from '@capacitor/core';

const NATIVE_WEB_ORIGIN = 'https://nexcourse.ai';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function isLoopbackApiBase(base: string): boolean {
  try {
    const u = new URL(base);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(base);
  }
}

/**
 * API origin for Worker/Express proxy calls.
 * - Web + empty VITE_API_BASE → '' (same-origin relative `/api/...`)
 * - Native → never use loopback; prefer env if remote, else production
 */
export function resolveApiBase(): string {
  const fromEnv = String((import.meta as any).env?.VITE_API_BASE ?? '').replace(/\/$/, '');
  if (isNativeApp()) {
    if (fromEnv && !isLoopbackApiBase(fromEnv)) return fromEnv;
    return NATIVE_WEB_ORIGIN;
  }
  return fromEnv;
}

/** @deprecated Prefer resolveApiBase(); kept for callers that already import this name. */
export function getNativeApiOrigin(): string {
  if (isNativeApp()) return resolveApiBase() || NATIVE_WEB_ORIGIN;
  const fromEnv = String((import.meta as any).env?.VITE_API_BASE ?? '').replace(/\/$/, '');
  return fromEnv || NATIVE_WEB_ORIGIN;
}

/** Install once at startup — no-op on web. */
export function installNativeFetchBridge(): void {
  if (!isNativeApp()) return;
  if ((window as any).__nexcourseNativeFetchBridge) return;
  (window as any).__nexcourseNativeFetchBridge = true;

  const origin = resolveApiBase() || NATIVE_WEB_ORIGIN;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      if (typeof input === 'string' && input.startsWith('/')) {
        return originalFetch(origin + input, init);
      }
      // Dev .env often bakes VITE_API_BASE=http://localhost:3001 into the Capacitor
      // bundle — rewrite those to production so emulator drafts/preferences work.
      if (typeof input === 'string' && isLoopbackApiBase(input)) {
        const u = new URL(input);
        return originalFetch(origin + u.pathname + u.search, init);
      }
      if (input instanceof URL && input.origin === window.location.origin) {
        return originalFetch(origin + input.pathname + input.search, init);
      }
      if (input instanceof Request) {
        const url = new URL(input.url);
        if (url.origin === window.location.origin && url.pathname.startsWith('/api')) {
          return originalFetch(origin + url.pathname + url.search, init);
        }
        if (isLoopbackApiBase(url.origin) && url.pathname.startsWith('/api')) {
          return originalFetch(origin + url.pathname + url.search, {
            method: input.method,
            headers: input.headers,
            body: input.body,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            integrity: input.integrity,
          });
        }
      }
    } catch {
      /* fall through to original */
    }
    return originalFetch(input as any, init);
  };
}
