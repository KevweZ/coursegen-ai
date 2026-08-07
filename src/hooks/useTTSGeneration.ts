/**
 * useTTSGeneration.ts
 * React hook that drives the background TTS generation job.
 *
 * - Sequential slides with durable data: URLs
 * - Respects OpenAI 429 / quota errors with long backoff (does not stampede retries)
 * - Run ids so cancelled jobs cannot clobber newer progress
 */

import { useState, useCallback, useRef } from 'react';
import { generateSlideTTS, urlToDataUrl, TTSRequestError } from '../services/ttsService';

export interface TTSProgress {
  isRunning: boolean;
  isDone: boolean;
  currentSlide: number;
  totalSlides: number;
  currentSlideTitle: string;
  error: string | null;
  skipped: number;
}

const DEFAULT_PROGRESS: TTSProgress = {
  isRunning: false,
  isDone: false,
  currentSlide: 0,
  totalSlides: 0,
  currentSlideTitle: '',
  error: null,
  skipped: 0,
};

type SetCourse = (updater: any) => void;

/** Shared cooldown so overlapping regenerate + finalize cannot hammer OpenAI. */
let globalTtsCooldownUntil = 0;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForCooldown() {
  const wait = globalTtsCooldownUntil - Date.now();
  if (wait > 0) await sleep(wait);
}

function armCooldown(ms: number) {
  globalTtsCooldownUntil = Math.max(globalTtsCooldownUntil, Date.now() + ms);
}

async function generateDurableSlideTTS(
  text: string,
  voice: string,
  onWaiting?: (message: string) => void,
): Promise<string> {
  let lastErr: any;

  for (let attempt = 0; attempt < 5; attempt++) {
    await waitForCooldown();
    try {
      const blobUrl = await generateSlideTTS(text, { voice: voice as any });
      try {
        return await urlToDataUrl(blobUrl);
      } catch {
        return blobUrl;
      }
    } catch (err: any) {
      lastErr = err;
      const isTtsErr = err instanceof TTSRequestError;
      const code = isTtsErr ? err.code : '';
      const msg = String(err?.message || '');

      if (code === 'TTS_QUOTA' || code === 'TTS_AUTH') {
        throw err;
      }

      const retryable =
        code === 'TTS_RATE_LIMIT' ||
        code === 'TTS_NETWORK' ||
        /429|503|502|COLD_START|rate limit|warming up/i.test(msg);

      if (!retryable || attempt === 4) throw err;

      const waitMs = Math.min(
        90000,
        Math.max(
          isTtsErr && err.retryAfterMs ? err.retryAfterMs : 0,
          8000 * (attempt + 1),
        ),
      );
      armCooldown(waitMs);
      onWaiting?.(`Rate limited — waiting ${Math.ceil(waitMs / 1000)}s then retrying…`);
      await sleep(waitMs);
    }
  }

  throw lastErr || new Error('TTS failed');
}

export function useTTSGeneration() {
  const [progress, setProgress] = useState<TTSProgress>(DEFAULT_PROGRESS);
  const runIdRef = useRef(0);

  const isActive = (runId: number) => runId === runIdRef.current;

  const generateTTS = useCallback(async (
    course: any,
    setCourse: SetCourse,
    voice: string = 'alloy',
    onSlideProgress?: (current: number, total: number, title: string) => void,
    opts?: { onlyMissing?: boolean },
  ) => {
    if (!course?.modules) return;

    const allSlides: Array<{ slide: any; moduleTitle: string }> = [];
    for (const mod of course.modules) {
      for (const slide of (mod.slides ?? [])) {
        allSlides.push({ slide, moduleTitle: mod.title });
      }
    }

    const narratableSlides = allSlides.filter(({ slide }) => {
      if (!(slide.voiceOverText || slide.narration || slide.content)) return false;
      if (opts?.onlyMissing && slide.voiceOverUrl) {
        const isTabbed = slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical';
        const tabs: any[] = slide.data?.tabs || slide.data?.items || [];
        if (isTabbed && tabs.some((t: any) => (t?.voiceOverText || '').trim() && !t.voiceOverUrl)) {
          return true;
        }
        return false;
      }
      return true;
    });

    const runId = ++runIdRef.current;

    if (narratableSlides.length === 0) {
      if (isActive(runId)) {
        setProgress({
          isRunning: false,
          isDone: true,
          currentSlide: 0,
          totalSlides: 0,
          currentSlideTitle: '',
          error: 'No narratable slide text found',
          skipped: allSlides.length,
        });
      }
      return;
    }

    setProgress({
      isRunning: true,
      isDone: false,
      currentSlide: 0,
      totalSlides: narratableSlides.length,
      currentSlideTitle: '',
      error: null,
      skipped: allSlides.length - narratableSlides.length,
    });

    let successCount = 0;
    let failCount = 0;
    let lastError: string | null = null;
    let hardStop = false;

    for (let i = 0; i < narratableSlides.length; i++) {
      if (!isActive(runId) || hardStop) break;

      const { slide } = narratableSlides[i];
      const narrationText = slide.voiceOverText || slide.narration || slide.content || '';
      const slideId = slide.id;
      const title = slide.title ?? `Slide ${i + 1}`;

      if (isActive(runId)) {
        setProgress(prev => ({
          ...prev,
          currentSlide: i + 1,
          currentSlideTitle: title,
          error: null,
        }));
      }
      onSlideProgress?.(i + 1, narratableSlides.length, title);

      try {
        const skipMain = !!(opts?.onlyMissing && slide.voiceOverUrl);
        if (!skipMain) {
          const durableUrl = await generateDurableSlideTTS(
            narrationText,
            voice,
            (waitMsg) => {
              if (isActive(runId)) {
                setProgress(prev => ({ ...prev, error: waitMsg }));
              }
            },
          );
          if (!isActive(runId)) break;
          successCount++;

          setCourse((prev: any) => {
            if (!prev?.modules) return prev;
            return {
              ...prev,
              modules: prev.modules.map((m: any) => ({
                ...m,
                slides: (m.slides || []).map((s: any) =>
                  s.id === slideId ? { ...s, voiceOverUrl: durableUrl } : s
                ),
              })),
            };
          });
        } else {
          successCount++;
        }

        const isTabbed = slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical';
        const tabs: any[] = slide.data?.tabs || slide.data?.items || [];
        if (isTabbed && Array.isArray(tabs) && tabs.length) {
          for (let ti = 0; ti < tabs.length; ti++) {
            if (!isActive(runId) || hardStop) break;
            const tab = tabs[ti];
            const tabText = (tab?.voiceOverText || '').trim();
            if (!tabText) continue;
            if (opts?.onlyMissing && tab.voiceOverUrl) continue;
            try {
              const tabUrl = await generateDurableSlideTTS(tabText, voice);
              if (!isActive(runId)) break;
              setCourse((prev: any) => {
                if (!prev?.modules) return prev;
                return {
                  ...prev,
                  modules: prev.modules.map((m: any) => ({
                    ...m,
                    slides: (m.slides || []).map((s: any) => {
                      if (s.id !== slideId) return s;
                      const data = { ...(s.data || {}) };
                      const listKey = Array.isArray(data.tabs) ? 'tabs' : Array.isArray(data.items) ? 'items' : 'tabs';
                      const list = Array.isArray(data[listKey]) ? [...data[listKey]] : [...tabs];
                      const idx = list.findIndex((t: any) => t.id === tab.id);
                      const at = idx >= 0 ? idx : ti;
                      if (at < 0 || at >= list.length) return s;
                      list[at] = { ...list[at], voiceOverUrl: tabUrl };
                      return { ...s, data: { ...data, [listKey]: list } };
                    }),
                  })),
                };
              });
              await sleep(400);
            } catch (tabErr: any) {
              failCount++;
              lastError = tabErr?.message || 'Tab audio failed';
              if (tabErr instanceof TTSRequestError && (tabErr.code === 'TTS_QUOTA' || tabErr.code === 'TTS_AUTH')) {
                hardStop = true;
              }
              console.warn(`[TTS] Tab audio failed on "${slide.title}" tab ${ti}:`, tabErr?.message);
            }
          }
        }
      } catch (err: any) {
        if (!isActive(runId)) break;
        failCount++;
        lastError = err?.message || 'TTS failed';
        console.warn(`[TTS] Failed for slide "${slide.title}":`, err.message);
        setProgress(prev => ({
          ...prev,
          error: `Slide "${slide.title}": ${err.message}`,
        }));

        if (err instanceof TTSRequestError && (err.code === 'TTS_QUOTA' || err.code === 'TTS_AUTH')) {
          hardStop = true;
          break;
        }

        // After a hard rate-limit failure that exhausted retries, cool down before next slide
        if (err instanceof TTSRequestError && err.code === 'TTS_RATE_LIMIT') {
          const cool = Math.max(err.retryAfterMs || 20000, 20000);
          armCooldown(cool);
          await sleep(cool);
        } else {
          await sleep(1000);
        }
      }

      // Pace requests — OpenAI TTS RPM is easy to blow through on a full course
      if (i < narratableSlides.length - 1 && !hardStop) {
        await sleep(900);
      }
    }

    if (isActive(runId)) {
      const allFailed = successCount === 0 && narratableSlides.length > 0;
      setProgress(prev => ({
        ...prev,
        isRunning: false,
        isDone: true,
        currentSlide: successCount,
        error: allFailed
          ? (lastError || 'Narration failed for every slide. If this mentions quota/rate limit, wait a few minutes or check OpenAI billing, then use Edit → Regenerate all narration.')
          : failCount > 0
            ? `${successCount} ready, ${failCount} failed${lastError ? ` (last: ${lastError})` : ''}`
            : null,
      }));
    }
  }, []);

  const cancelTTS = useCallback(() => {
    runIdRef.current += 1;
    setProgress(prev => ({ ...prev, isRunning: false }));
  }, []);

  const resetTTS = useCallback(() => {
    runIdRef.current += 1;
    setProgress(DEFAULT_PROGRESS);
  }, []);

  const clearTTSProgress = useCallback(() => {
    setProgress(prev => {
      if (prev.isRunning) return prev;
      return DEFAULT_PROGRESS;
    });
  }, []);

  return { progress, generateTTS, cancelTTS, resetTTS, clearTTSProgress };
}
