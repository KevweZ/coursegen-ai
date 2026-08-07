/**
 * ttsService.ts
 * Calls the TTS API securely via the server-side proxy (/api/tts).
 * The OpenAI API key is NEVER exposed to the browser bundle — it lives in server.js only.
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

function parseProxyError(status: number, raw: string): TTSRequestError {
  try {
    const data = JSON.parse(raw);
    const message = String(data?.error || raw).slice(0, 280);
    const code = String(data?.code || (status === 429 ? 'TTS_RATE_LIMIT' : 'TTS_ERROR'));
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

  const response = await fetch(TTS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
