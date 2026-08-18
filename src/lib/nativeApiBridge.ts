/**
 * Native (Capacitor) bridge helpers.
 * Relative `/api/*` calls work on nexcourse.ai (same-origin Worker proxy), but in a
 * native WebView the origin is capacitor://localhost — so we rewrite those calls
 * to the live site. Supabase already uses absolute VITE_SUPABASE_* URLs.
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

/** Origin for same-origin API proxy when running inside the Capacitor shell. */
export function getNativeApiOrigin(): string {
  const fromEnv = String((import.meta as any).env?.VITE_API_BASE ?? '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return NATIVE_WEB_ORIGIN;
}

/** Install once at startup — no-op on web. */
export function installNativeFetchBridge(): void {
  if (!isNativeApp()) return;
  if ((window as any).__nexcourseNativeFetchBridge) return;
  (window as any).__nexcourseNativeFetchBridge = true;

  const origin = getNativeApiOrigin();
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      if (typeof input === 'string' && input.startsWith('/')) {
        return originalFetch(origin + input, init);
      }
      if (input instanceof URL && input.origin === window.location.origin) {
        return originalFetch(origin + input.pathname + input.search, init);
      }
      if (input instanceof Request) {
        const url = new URL(input.url);
        if (url.origin === window.location.origin && url.pathname.startsWith('/api')) {
          return originalFetch(origin + url.pathname + url.search, init);
        }
      }
    } catch {
      /* fall through to original */
    }
    return originalFetch(input as any, init);
  };
}
