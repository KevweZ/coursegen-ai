/**
 * ttsService.ts
 * Calls the TTS API securely via the server-side proxy (/api/tts).
 * The OpenAI API key is NEVER exposed to the browser bundle — it lives in server.js only.
 *
 * Usage:
 *   import { generateSlideTTS } from './ttsService';
 *   const blobUrl = await generateSlideTTS("Welcome to module one...");
 *   // blobUrl is a valid <audio src> that usePlayer can load directly
 */

const TTS_PROXY_URL = '/api/tts';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSOptions {
  voice?: TTSVoice;
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 – 4.0
}

/**
 * Generate TTS audio for a given text string.
 * Returns a Blob URL pointing to the MP3 audio.
 * Throws on API or proxy error (caller should catch and handle gracefully).
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
    throw new Error(`TTS proxy error ${response.status}: ${errText}`);
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
