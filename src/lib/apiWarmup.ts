/** Render cold-start / deploy HTML is mapped by the worker to 503 COLD_START. */

function nestedErrorText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const rec = value as { message?: unknown; error?: unknown };
    if (typeof rec.message === 'string') return rec.message;
    if (typeof rec.error === 'string') return rec.error;
  }
  return '';
}

function errorParts(err: unknown): { status: number; msg: string; code: string } {
  const rec = err && typeof err === 'object'
    ? (err as { status?: number; message?: string; code?: string; error?: unknown })
    : null;
  const nested = rec ? nestedErrorText(rec.error) : '';
  return {
    status: Number(rec?.status) || 0,
    code: String(rec?.code || ''),
    msg: String(
      rec?.message || nested || rec?.code || (typeof err === 'string' ? err : ''),
    ),
  };
}

function isUselessImageErrorText(msg: string): boolean {
  const t = String(msg || '').trim();
  return !t || /^(error|failed|\[object object\]|http \d+|internal server error)$/i.test(t);
}

export function isImageRateLimit(err: unknown): boolean {
  const { status, msg, code } = errorParts(err);
  if (status === 429) return true;
  return /UPSTREAM_RATE_LIMIT|IMAGE_RATE_LIMIT|API error \(429\)|rate.?limit|too many (image|requests)/i.test(
    `${code} ${msg}`,
  );
}

export function isImageTimeout(err: unknown): boolean {
  const { status, msg, code } = errorParts(err);
  if (status === 524 || status === 504) return true;
  return /UPSTREAM_TIMEOUT/i.test(`${code} ${msg}`);
}

export function isImageAuthOrCreditStop(err: unknown): boolean {
  const { status, msg, code } = errorParts(err);
  if (status === 401 || status === 402 || status === 403) return true;
  return /AI_NO_CREDITS|AI_AUTH_REQUIRED|TRIAL_EXPIRED|Sign in required to generate|no AI generation credits/i.test(
    `${code} ${msg}`,
  );
}

export function formatImageApiError(err: unknown): string | null {
  const { status, msg, code } = errorParts(err);
  const blob = `${code} ${msg} ${status}`;
  if (isImageRateLimit(err) || /If you were saving a draft/i.test(msg)) {
    return 'The image API is rate-limited right now. Wait a minute, then click AI again. You do not need to Sync or save a draft.';
  }
  if (isImageTimeout(err) || /UPSTREAM_TIMEOUT| 524\b/i.test(blob)) {
    return 'The image request timed out. Wait a minute, then try Generate AI images again.';
  }
  if (/UPSTREAM_HTML|API error \(\d+\)/i.test(blob)) {
    return 'The image server sent an error page instead of a picture. Try AI again in a moment.';
  }
  if (status === 401 || /AI_AUTH_REQUIRED|Sign in required to generate/i.test(blob)) {
    return 'Sign in again, then try Generate AI images.';
  }
  if (status === 402 || /AI_NO_CREDITS|no AI generation credits/i.test(blob)) {
    return 'No AI image credits left. Open My Account to add credits, then try again.';
  }
  if (isUselessImageErrorText(msg) && status >= 400) {
    return 'The image server could not generate a picture. Wait a minute, then try Generate AI images again.';
  }
  if (isUselessImageErrorText(msg)) {
    return 'The image server could not generate a picture. Wait a minute, then try Generate AI images again.';
  }
  return null;
}

/** Always a sentence the author can act on — never a bare "Error" in the toast. */
export function publicImageError(err: unknown): string {
  return (
    formatImageApiError(err)
    || (() => {
      const { msg } = errorParts(err);
      return isUselessImageErrorText(msg) ? '' : msg.trim();
    })()
    || 'The image server could not generate a picture. Wait a minute, then try Generate AI images again.'
  );
}

export function isApiColdStart(err: unknown): boolean {
  if (isImageRateLimit(err)) return false;
  const { status, msg, code } = errorParts(err);
  if (status === 503) return true;
  return /COLD_START|warming up|UPSTREAM_HTML|API proxy error/i.test(`${code} ${msg}`);
}

/** Browser dropped the /api/generate-image request (proxy HTML, Render sleep). Do not retry 524/504. */
export function isImageNetworkFailure(err: unknown): boolean {
  if (isApiColdStart(err)) return true;
  const { status, msg, code } = errorParts(err);
  if (isImageTimeout(err)) return false;
  const rec = err && typeof err === 'object' ? (err as { name?: string }) : null;
  const blob = `${msg} ${rec?.name || ''}`;
  return /failed to fetch|networkerror|load failed|aborterror/i.test(blob);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll /api/health until Render answers JSON ok. Use on the Build progress
 * screen so preview never opens against a sleeping API.
 */
export async function waitForApiWarm(opts?: {
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 40000;
  const intervalMs = opts?.intervalMs ?? 2000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.status === 'ok') return true;
      }
    } catch {
      /* still booting */
    }
    await sleep(intervalMs);
  }
  return false;
}

/** Ping health while Course Development is open so Render stays up between clicks. */
export const PREVIEW_API_KEEPWARM_MS = 2 * 60 * 1000;

export function startPreviewApiKeepWarm(): () => void {
  void waitForApiWarm({ timeoutMs: 20000 });
  const id = setInterval(() => {
    void waitForApiWarm({ timeoutMs: 12000 });
  }, PREVIEW_API_KEEPWARM_MS);
  return () => clearInterval(id);
}
