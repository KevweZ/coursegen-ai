/**
 * App route helpers — pushState SPA paths (no React Router).
 * Marketing paths stay lowercase; authenticated app sections use PascalCase
 * per product preference (e.g. /CourseSettings).
 */

export const RETURN_TO_KEY = 'nexcourse_return_to';

export const ROUTES = {
  home: '/',
  upload: '/upload',
  login: '/login',
  signup: '/signup',
  methodology: '/methodology',
  pricing: '/pricing',
  examples: '/examples',
  courseSettings: '/CourseSettings',
  courseDevelopment: '/CourseDevelopment',
  playerProperties: '/PlayerProperties',
  myAccount: '/MyAccount',
  design: (draftId: string) => `/design/${encodeURIComponent(draftId)}`,
  preview: (draftId: string) => `/preview/${encodeURIComponent(draftId)}`,
  sandboxSettings: '/sandbox/CourseSettings',
  sandboxDevelopment: '/sandbox/CourseDevelopment',
  sandboxMobile: '/sandbox/Mobile',
  sandboxDesignMobile: '/sandbox/DesignMobile',
} as const;

export type SandboxDemo = 'settings' | 'development' | 'mobile' | 'designMobile';

export type ParsedAppPath =
  | { kind: 'marketing'; view: 'homepage' | 'methodology' | 'pricing' | 'examples' }
  | { kind: 'auth'; mode: 'login' | 'signup' }
  | { kind: 'upload' }
  | { kind: 'courseSettings' }
  | { kind: 'courseDevelopment' }
  | { kind: 'playerProperties' }
  | { kind: 'myAccount' }
  | { kind: 'pricingAuthed' }
  | { kind: 'design'; draftId: string }
  | { kind: 'preview'; draftId: string }
  | { kind: 'sandbox'; demo: SandboxDemo }
  | { kind: 'payment'; outcome: 'success' | 'cancel' }
  | { kind: 'unknown' };

/** Paths that require a signed-in user (deep-link → login if anonymous). */
export function isProtectedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/upload') return true;
  if (
    p === '/CourseSettings' ||
    p === '/CourseDevelopment' ||
    p === '/PlayerProperties' ||
    p === '/MyAccount'
  ) return true;
  if (p.startsWith('/design/') || p.startsWith('/preview/')) return true;
  if (p.startsWith('/sandbox/')) return true;
  return false;
}

export function parseAppPath(pathname: string): ParsedAppPath {
  const p = pathname.replace(/\/+$/, '') || '/';

  if (p === '/') return { kind: 'marketing', view: 'homepage' };
  if (p === '/methodology') return { kind: 'marketing', view: 'methodology' };
  if (p === '/pricing') return { kind: 'marketing', view: 'pricing' };
  if (p === '/examples') return { kind: 'marketing', view: 'examples' };
  if (p === '/login') return { kind: 'auth', mode: 'login' };
  if (p === '/signup') return { kind: 'auth', mode: 'signup' };
  if (p === '/upload') return { kind: 'upload' };
  if (p === '/CourseSettings') return { kind: 'courseSettings' };
  if (p === '/CourseDevelopment') return { kind: 'courseDevelopment' };
  if (p === '/PlayerProperties') return { kind: 'playerProperties' };
  if (p === '/MyAccount') return { kind: 'myAccount' };
  if (p === '/payment-success') return { kind: 'payment', outcome: 'success' };
  if (p === '/payment-cancel') return { kind: 'payment', outcome: 'cancel' };

  if (p === '/sandbox/CourseSettings') return { kind: 'sandbox', demo: 'settings' };
  if (p === '/sandbox/CourseDevelopment') return { kind: 'sandbox', demo: 'development' };
  if (p === '/sandbox/Mobile') return { kind: 'sandbox', demo: 'mobile' };
  if (p === '/sandbox/DesignMobile') return { kind: 'sandbox', demo: 'designMobile' };

  const design = p.match(/^\/design\/([^/]+)$/);
  if (design) return { kind: 'design', draftId: decodeURIComponent(design[1]) };

  const preview = p.match(/^\/preview\/([^/]+)$/);
  if (preview) return { kind: 'preview', draftId: decodeURIComponent(preview[1]) };

  return { kind: 'unknown' };
}

export function navigateTo(path: string, replace = false) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
}

export function stashReturnTo(path: string) {
  try {
    if (isProtectedPath(path)) sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch { /* ignore */ }
}

export function consumeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(RETURN_TO_KEY);
    if (v) sessionStorage.removeItem(RETURN_TO_KEY);
    return v;
  } catch {
    return null;
  }
}
