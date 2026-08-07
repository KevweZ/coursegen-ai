/**
 * useTTSGeneration.ts
 * React hook that drives the background TTS generation job.
 *
 * - Loops through all slides sequentially after course hydration
 * - Patches each slide's voiceOverUrl via functional setCourse (does not wipe cover/source images)
 * - Exposes fine-grained progress state for the UI toast
 * - Skips slides with no narration text gracefully
 * - Uses a run id so a cancelled/stale job cannot clobber a newer run's progress
 */

import { useState, useCallback, useRef } from 'react';
import { generateSlideTTS } from '../services/ttsService';

export interface TTSProgress {
  isRunning: boolean;
  isDone: boolean;
  currentSlide: number;    // 1-based index of slide currently being processed
  totalSlides: number;     // total slides that have narration text
  currentSlideTitle: string;
  error: string | null;
  skipped: number;         // slides with no narration (skipped silently)
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

/**
 * Returns { progress, generateTTS, cancelTTS, resetTTS, clearTTSProgress }
 *
 * Call generateTTS(course, setCourse) AFTER the final setCourse(working) that
 * opens preview — a later setCourse(staleWorking) will wipe patched voiceOverUrls.
 */
export function useTTSGeneration() {
  const [progress, setProgress] = useState<TTSProgress>(DEFAULT_PROGRESS);
  /** Bumped to invalidate any in-flight generateTTS loop. */
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
        // Still include if any tab is missing audio
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

    for (let i = 0; i < narratableSlides.length; i++) {
      if (!isActive(runId)) break;

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
          const blobUrl = await generateSlideTTS(narrationText, { voice: voice as any });
          if (!isActive(runId)) break;
          successCount++;

          // Merge into latest course — never replace with a pre-imagery clone
          setCourse((prev: any) => {
            if (!prev?.modules) return prev;
            return {
              ...prev,
              modules: prev.modules.map((m: any) => ({
                ...m,
                slides: (m.slides || []).map((s: any) =>
                  s.id === slideId ? { ...s, voiceOverUrl: blobUrl } : s
                ),
              })),
            };
          });
        } else {
          successCount++;
        }

        // Per-tab narration (tabbed-horizontal / tabbed-vertical)
        const isTabbed = slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical';
        const tabs: any[] = slide.data?.tabs || slide.data?.items || [];
        if (isTabbed && Array.isArray(tabs) && tabs.length) {
          for (let ti = 0; ti < tabs.length; ti++) {
            if (!isActive(runId)) break;
            const tab = tabs[ti];
            const tabText = (tab?.voiceOverText || '').trim();
            if (!tabText) continue;
            if (opts?.onlyMissing && tab.voiceOverUrl) continue;
            try {
              const tabUrl = await generateSlideTTS(tabText, { voice: voice as any });
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
              await new Promise(r => setTimeout(r, 250));
            } catch (tabErr: any) {
              console.warn(`[TTS] Tab audio failed on "${slide.title}" tab ${ti}:`, tabErr?.message);
            }
          }
        }
      } catch (err: any) {
        if (!isActive(runId)) break;
        console.warn(`[TTS] Failed for slide "${slide.title}":`, err.message);
        setProgress(prev => ({
          ...prev,
          error: `Slide "${slide.title}": ${err.message}`,
        }));
        await new Promise(r => setTimeout(r, 1500));
      }

      if (i < narratableSlides.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    if (isActive(runId)) {
      setProgress(prev => ({
        ...prev,
        isRunning: false,
        isDone: true,
        currentSlide: successCount,
      }));
    }
  }, []);

  const cancelTTS = useCallback(() => {
    runIdRef.current += 1;
    setProgress(prev => ({ ...prev, isRunning: false }));
  }, []);

  /** Cancel any in-flight job and clear progress (e.g. starting a new course). */
  const resetTTS = useCallback(() => {
    runIdRef.current += 1;
    setProgress(DEFAULT_PROGRESS);
  }, []);

  /** Clear completed toast state without cancelling a running job. */
  const clearTTSProgress = useCallback(() => {
    setProgress(prev => {
      if (prev.isRunning) return prev;
      return DEFAULT_PROGRESS;
    });
  }, []);

  return { progress, generateTTS, cancelTTS, resetTTS, clearTTSProgress };
}
