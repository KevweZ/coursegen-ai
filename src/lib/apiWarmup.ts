/** Render cold-start / deploy HTML is mapped by the worker to 503 COLD_START. */

function errorParts(err: unknown): { status: number; msg: string; code: string } {
  const rec = err && typeof err === 'object' ? (err as { status?: number; message?: string; code?: string }) : null;
  return {
    status: Number(rec?.status) || 0,
    code: String(rec?.code || ''),
    msg: String(
      rec?.message || rec?.code || (typeof err === 'string' ? err : ''),
    ),
  };
}

export function isImageRateLimit(err: unknown): boolean {
  const { status, msg, code } = errorParts(err);
  if (status === 429) return true;
  return /UPSTREAM_RATE_LIMIT|IMAGE_RATE_LIMIT|API error \(429\)|rate.?limit|too many (image|requests)/i.test(
    `${code} ${msg}`,
  );
}

export function formatImageApiError(err: unknown): string | null {
  const { msg } = errorParts(err);
  if (isImageRateLimit(err) || /If you were saving a draft/i.test(msg)) {
    return 'The image API is rate-limited right now. Wait a minute, then click AI again. You do not need to Sync or save a draft.';
  }
  if (/UPSTREAM_HTML|API error \(\d+\)/i.test(msg)) {
    return 'The image server sent an error page instead of a picture. Try AI again in a moment.';
  }
  return null;
}

export function isApiColdStart(err: unknown): boolean {
  if (isImageRateLimit(err)) return false;
  const { status, msg, code } = errorParts(err);
  if (status === 503) return true;
  return /COLD_START|warming up|UPSTREAM_HTML|API proxy error/i.test(`${code} ${msg}`);
}

/** Browser dropped the /api/generate-image request (timeout, proxy, Render 524). */
export function isImageNetworkFailure(err: unknown): boolean {
  if (isApiColdStart(err)) return true;
  const rec = err && typeof err === 'object' ? (err as { message?: string; name?: string }) : null;
  const msg = String(rec?.message || rec?.name || (typeof err === 'string' ? err : ''));
  return /failed to fetch|networkerror|load failed|aborterror|timed out|Image generation timed out/i.test(msg);
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
