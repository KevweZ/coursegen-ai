/**
 * ttsService.ts
 * Calls the TTS API securely via the server-side proxy (/api/tts).
 * Sends the Supabase JWT so the server can enforce credits / trial TTS caps.
 */

const TTS_PROXY_URL = '/api/tts';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSOptions {
  voice?: TTSVoice;
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 – 4.0
}

export class TTSRequestError extends Error {
  status: number;
  code: string;
  retryAfterMs: number;

  constructor(message: string, opts: { status: number; code?: string; retryAfterMs?: number }) {
    super(message);
    this.name = 'TTSRequestError';
    this.status = opts.status;
    this.code = opts.code || 'TTS_ERROR';
    this.retryAfterMs = opts.retryAfterMs ?? 0;
  }
}

/** Hard-stop codes — do not keep retrying the rest of a course. */
export const TTS_FATAL_CODES = new Set([
  'TTS_NO_CREDITS',
  'TTS_QUOTA',
  'TTS_AUTH',
  'TTS_AUTH_REQUIRED',
  'TTS_NOT_CONFIGURED',
  'TRIAL_EXPIRED',
  'TRIAL_TTS_LIMIT',
]);

function getSupabaseAccessToken(): string | null {
  try {
    const key = Object.keys(localStorage).find(k =>
      (k.startsWith('sb-') && k.includes('auth-token')) ||
      (k.includes('supabase') && k.includes('auth'))
    );
    let token = key ? JSON.parse(localStorage.getItem(key) ?? '')?.access_token : null;
    if (!token) {
      for (const k of Object.keys(localStorage)) {
        try {
          const v = JSON.parse(localStorage.getItem(k) ?? '');
          if (v?.access_token) { token = v.access_token; break; }
        } catch { /* ignore */ }
      }
    }
    return token || null;
  } catch {
    return null;
  }
}

function parseProxyError(status: number, raw: string): TTSRequestError {
  try {
    const data = JSON.parse(raw);
    const message = String(data?.error || raw).slice(0, 320);
    const code = String(
      data?.code ||
      (status === 401 ? 'TTS_AUTH_REQUIRED' : status === 402 ? 'TTS_NO_CREDITS' : status === 429 ? 'TTS_RATE_LIMIT' : 'TTS_ERROR')
    );
    const retryAfterMs = Number(data?.retryAfterMs) || (status === 429 ? 20000 : 0);
    return new TTSRequestError(message, { status, code, retryAfterMs });
  } catch {
    return new TTSRequestError(`TTS proxy error ${status}: ${String(raw).slice(0, 180)}`, {
      status,
      code: status === 429 ? 'TTS_RATE_LIMIT' : 'TTS_ERROR',
      retryAfterMs: status === 429 ? 20000 : 0,
    });
  }
}

/** User-facing label for toast / draft messages. */
export function formatTtsErrorForUser(err: unknown): string {
  if (err instanceof TTSRequestError) {
    switch (err.code) {
      case 'TTS_NO_CREDITS':
        return err.message || 'No narration credits remaining. Upgrade or buy credits, then retry.';
      case 'TRIAL_TTS_LIMIT':
        return err.message || 'Trial narration weekly limit reached. Upgrade or wait for reset.';
      case 'TRIAL_EXPIRED':
        return err.message || 'Your trial has expired.';
      case 'TTS_QUOTA':
        return 'Server OpenAI TTS quota exceeded. This is a platform billing issue — retry later or contact support.';
      case 'TTS_RATE_LIMIT':
        return 'Narration is rate-limited right now. The app will wait and retry automatically when possible.';
      case 'TTS_CONCURRENCY':
        return 'Narration is already running in another tab. Finish or close that run, then retry.';
      case 'TTS_AUTH_REQUIRED':
        return 'Sign in required to generate narration.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Narration failed';
}

export type TtsJobItem = {
  id: string;
  text: string;
  title?: string;
  target?: 'slide' | 'tab' | 'synthetic';
  slideId?: string;
  tabId?: string;
  listKey?: 'tabs' | 'items' | null;
};

export type TtsJobResultItem = {
  id: string;
  target?: 'slide' | 'tab' | 'synthetic';
  slideId?: string | null;
  tabId?: string | null;
  listKey?: string | null;
  audioContentType?: string;
  audioBase64: string;
};

export type TtsJobSnapshot = {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | string;
  current: number;
  total: number;
  successCount: number;
  failCount: number;
  currentTitle?: string;
  error?: string | null;
  code?: string | null;
  results?: TtsJobResultItem[];
};

function authHeaders(): Record<string, string> {
  const token = getSupabaseAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Start a server-side narration job (fire-and-forget worker; poll for clips). */
export async function createTtsJob(opts: {
  voice?: string;
  model?: string;
  speed?: number;
  items: TtsJobItem[];
}): Promise<TtsJobSnapshot> {
  const response = await fetch(`${TTS_PROXY_URL}/jobs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      voice: opts.voice || 'alloy',
      model: opts.model || 'tts-1',
      speed: opts.speed ?? 1.0,
      items: opts.items,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw parseProxyError(response.status, errText);
  }
  return response.json();
}

/** Poll job status and consume any newly finished audio clips. */
export async function pollTtsJob(jobId: string): Promise<TtsJobSnapshot> {
  const response = await fetch(`${TTS_PROXY_URL}/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw parseProxyError(response.status, errText);
  }
  return response.json();
}

/** Request cancellation of a running/queued narration job. */
export async function cancelTtsJob(jobId: string): Promise<void> {
  const response = await fetch(`${TTS_PROXY_URL}/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok && response.status !== 404) {
    const errText = await response.text().catch(() => response.statusText);
    throw parseProxyError(response.status, errText);
  }
}

/**
 * Generate TTS audio for a given text string.
 * Returns a Blob URL pointing to the MP3 audio.
 * Throws TTSRequestError on API or proxy error.
 */
export async function generateSlideTTS(
  text: string,
  { voice = 'alloy', model = 'tts-1', speed = 1.0 }: TTSOptions = {}
): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate TTS for empty text.');
  }

  const token = getSupabaseAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(TTS_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: text.trim().slice(0, 4096),
      voice,
      model,
      speed,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    const err = parseProxyError(response.status, errText);
    const headerRetry = Number(response.headers.get('retry-after'));
    if (Number.isFinite(headerRetry) && headerRetry > 0) {
      err.retryAfterMs = Math.max(err.retryAfterMs, headerRetry * 1000);
    }
    throw err;
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}

/**
 * Revoke a previously created blob URL to free memory.
 * Call this when the course is discarded or the user navigates away.
 */
export function revokeTTSUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/** Convert a blob: (or http) URL to a durable data: URL for draft persistence. */
export async function urlToDataUrl(url: string): Promise<string> {
  if (!url) return url;
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Walk course slides (and nested tabs) converting blob:/http voiceOverUrl → data: URLs
 * so drafts can persist narration the same way they persist images.
 */
export async function persistCourseAudioUrls(course: any): Promise<any> {
  if (!course?.modules) return course;
  const modules = [];
  for (const m of course.modules) {
    const slides = [];
    for (const s of m.slides || []) {
      let slide = { ...s };
      if (typeof slide.voiceOverUrl === 'string' && !slide.voiceOverUrl.startsWith('data:')) {
        try {
          slide.voiceOverUrl = await urlToDataUrl(slide.voiceOverUrl);
        } catch (e) {
          console.warn('[TTS] Could not persist slide audio', slide.id, e);
          delete slide.voiceOverUrl;
        }
      }
      if (slide.data && typeof slide.data === 'object') {
        const data = { ...slide.data };
        for (const key of ['tabs', 'items'] as const) {
          if (!Array.isArray(data[key])) continue;
          data[key] = await Promise.all(
            data[key].map(async (item: any) => {
              if (!item || typeof item.voiceOverUrl !== 'string' || item.voiceOverUrl.startsWith('data:')) {
                return item;
              }
              try {
                return { ...item, voiceOverUrl: await urlToDataUrl(item.voiceOverUrl) };
              } catch {
                const { voiceOverUrl: _drop, ...rest } = item;
                return rest;
              }
            })
          );
        }
        slide = { ...slide, data };
      }
      slides.push(slide);
    }
    modules.push({ ...m, slides });
  }
  return { ...course, modules };
}

/** Persist synthetic cover/objectives/module audio map for draft save. */
export async function persistSyntheticAudioMap(
  map: Record<string, string>
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [id, url] of Object.entries(map || {})) {
    if (!url) continue;
    try {
      out[id] = url.startsWith('data:') ? url : await urlToDataUrl(url);
    } catch (e) {
      console.warn('[TTS] Could not persist synthetic audio', id, e);
    }
  }
  return out;
}
