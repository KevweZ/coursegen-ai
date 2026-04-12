/**
 * ttsService.ts
 * Calls the OpenAI TTS API and returns a browser Blob URL for the generated MP3.
 * No cloud storage required — Blob URLs live for the duration of the browser session.
 *
 * Usage:
 *   import { generateSlideTTS } from './ttsService';
 *   const blobUrl = await generateSlideTTS("Welcome to module one...");
 *   // blobUrl is a valid <audio src> that usePlayer can load directly
 */

const OPENAI_API_KEY =
  (import.meta as any).env?.VITE_OPENAI_API_KEY ?? '';

const TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSOptions {
  voice?: TTSVoice;
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 – 4.0
}

/**
 * Generate TTS audio for a given text string.
 * Returns a Blob URL pointing to the MP3 audio.
 * Throws on API error (caller should catch and handle gracefully).
 */
export async function generateSlideTTS(
  text: string,
  { voice = 'alloy', model = 'tts-1', speed = 1.0 }: TTSOptions = {}
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('VITE_OPENAI_API_KEY is not set. Add it to your .env file.');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate TTS for empty text.');
  }

  // OpenAI TTS max input is 4096 characters — truncate gracefully
  const safeText = text.trim().slice(0, 4096);

  const response = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: safeText,
      voice,
      speed,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI TTS API error ${response.status}: ${errText}`);
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
