/** Render cold-start / deploy HTML is mapped by the worker to 503 COLD_START. */

export function isApiColdStart(err: unknown): boolean {
  const rec = err && typeof err === 'object' ? (err as { status?: number; message?: string; code?: string }) : null;
  const status = Number(rec?.status);
  if (status === 503) return true;
  const msg = String(
    rec?.message || rec?.code || (typeof err === 'string' ? err : ''),
  );
  return /COLD_START|warming up|UPSTREAM_HTML|API proxy error/i.test(msg);
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
export const PREVIEW_API_KEEPWARM_MS = 4 * 60 * 1000;

export function startPreviewApiKeepWarm(): () => void {
  void waitForApiWarm({ timeoutMs: 20000 });
  const id = setInterval(() => {
    void waitForApiWarm({ timeoutMs: 12000 });
  }, PREVIEW_API_KEEPWARM_MS);
  return () => clearInterval(id);
}
