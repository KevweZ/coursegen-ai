/**
 * useTTSGeneration.ts
 * Starts a server-side narration job and polls for progress/results.
 * Audio generation continues on the server even if the browser is busy;
 * the client applies completed clips as they arrive.
 */

import { useState, useCallback, useRef } from 'react';
import {
  createTtsJob,
  pollTtsJob,
  cancelTtsJob,
  formatTtsErrorForUser,
  isTransientTtsNetworkError,
  TTSRequestError,
  TTS_FATAL_CODES,
  type TtsJobItem,
  type TtsJobResultItem,
} from '../services/ttsService';

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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function audioResultToDataUrl(result: TtsJobResultItem): string {
  return `data:${result.audioContentType || 'audio/mpeg'};base64,${result.audioBase64}`;
}

function applyJobResults(
  results: TtsJobResultItem[],
  setCourse: SetCourse,
  setSyntheticAudioMap?: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
) {
  if (!results?.length) return;

  const slidePatches: TtsJobResultItem[] = [];
  const tabPatches: TtsJobResultItem[] = [];
  const syntheticPatches: TtsJobResultItem[] = [];

  for (const r of results) {
    if (r.target === 'synthetic' || (r.id.startsWith('__') && r.id.endsWith('__'))) {
      syntheticPatches.push(r);
    } else if (r.target === 'tab' || r.tabId) {
      tabPatches.push(r);
    } else {
      slidePatches.push(r);
    }
  }

  if (syntheticPatches.length && setSyntheticAudioMap) {
    setSyntheticAudioMap(prev => {
      const next = { ...prev };
      for (const r of syntheticPatches) {
        next[r.id] = audioResultToDataUrl(r);
      }
      return next;
    });
  }

  if (slidePatches.length || tabPatches.length) {
    setCourse((prev: any) => {
      if (!prev?.modules) return prev;
      return {
        ...prev,
        modules: prev.modules.map((m: any) => ({
          ...m,
          slides: (m.slides || []).map((s: any) => {
            let slide = s;
            for (const r of slidePatches) {
              if (r.id === s.id || r.slideId === s.id) {
                slide = { ...slide, voiceOverUrl: audioResultToDataUrl(r) };
              }
            }
            for (const r of tabPatches) {
              const slideId = r.slideId || r.id.split('::tab::')[0];
              if (slide.id !== slideId) continue;
              const data = { ...(slide.data || {}) };
              const listKey =
                r.listKey === 'items' || r.listKey === 'tabs'
                  ? r.listKey
                  : Array.isArray(data.tabs)
                    ? 'tabs'
                    : Array.isArray(data.items)
                      ? 'items'
                      : 'tabs';
              const list = Array.isArray(data[listKey]) ? [...data[listKey]] : [];
              const tabId = r.tabId || r.id.split('::tab::')[1];
              const idx = list.findIndex((t: any) => t.id === tabId);
              if (idx < 0) continue;
              list[idx] = { ...list[idx], voiceOverUrl: audioResultToDataUrl(r) };
              slide = { ...slide, data: { ...data, [listKey]: list } };
            }
            return slide;
          }),
        })),
      };
    });
  }
}

/** Build narration job items from a hydrated course (+ optional synthetic clips). */
export function buildCourseNarrationItems(
  course: any,
  opts?: {
    onlyMissing?: boolean;
    synthetic?: Array<{ id: string; text: string; title?: string }>;
  },
): { items: TtsJobItem[]; skipped: number } {
  const items: TtsJobItem[] = [];
  let skipped = 0;
  if (!course?.modules) {
    return { items, skipped };
  }

  for (const mod of course.modules) {
    for (const slide of (mod.slides ?? [])) {
      const text = String(slide.voiceOverText || slide.narration || '').trim().slice(0, 4096);
      const hasMain = !!text;
      const skipMain = !!(opts?.onlyMissing && slide.voiceOverUrl);

      if (hasMain && !skipMain) {
        items.push({
          id: String(slide.id),
          text,
          title: slide.title || String(slide.id),
          target: 'slide',
          slideId: String(slide.id),
        });
      } else if (!hasMain) {
        skipped += 1;
      }

      const isTabbed = slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical';
      const listKey = Array.isArray(slide.data?.tabs) ? 'tabs' : Array.isArray(slide.data?.items) ? 'items' : null;
      const tabs: any[] = listKey ? (slide.data?.[listKey] || []) : [];
      if (isTabbed && tabs.length) {
        for (const tab of tabs) {
          const tabText = String(tab?.voiceOverText || '').trim().slice(0, 4096);
          if (!tabText) continue;
          if (opts?.onlyMissing && tab.voiceOverUrl) continue;
          items.push({
            id: `${slide.id}::tab::${tab.id}`,
            text: tabText,
            title: `${slide.title || slide.id} / ${tab.label || tab.title || tab.id}`,
            target: 'tab',
            slideId: String(slide.id),
            tabId: String(tab.id),
            listKey,
          });
        }
      }
    }
  }

  for (const s of opts?.synthetic || []) {
    const text = String(s.text || '').trim();
    if (!text) continue;
    items.push({
      id: s.id,
      text,
      title: s.title || s.id,
      target: 'synthetic',
    });
  }

  return { items, skipped };
}

export function useTTSGeneration() {
  const [progress, setProgress] = useState<TTSProgress>(DEFAULT_PROGRESS);
  const runIdRef = useRef(0);
  const activeJobIdRef = useRef<string | null>(null);

  const isActive = (runId: number) => runId === runIdRef.current;

  const generateTTS = useCallback(async (
    course: any,
    setCourse: SetCourse,
    voice: string = 'alloy',
    onSlideProgress?: (current: number, total: number, title: string) => void,
    opts?: {
      onlyMissing?: boolean;
      synthetic?: Array<{ id: string; text: string; title?: string }>;
      setSyntheticAudioMap?: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
      /**
       * Internal: how many auto-resumes already ran after network drops.
       * Cap keeps runaway loops from burning credits on a dead connection.
       */
      _resumeCount?: number;
    },
  ) => {
    // Preserve run id across auto-resumes so cancel still works and we don't reset progress UI.
    const resumeCount = opts?._resumeCount ?? 0;
    const runId = resumeCount > 0 ? runIdRef.current : ++runIdRef.current;
    const { items, skipped } = buildCourseNarrationItems(course, {
      onlyMissing: opts?.onlyMissing,
      synthetic: opts?.synthetic,
    });

    if (items.length === 0) {
      if (isActive(runId)) {
        setProgress(prev => ({
          isRunning: false,
          isDone: true,
          // Keep prior progress when only-missing resume finds nothing left to do.
          currentSlide: opts?.onlyMissing ? prev.currentSlide : 0,
          totalSlides: opts?.onlyMissing ? prev.totalSlides : 0,
          currentSlideTitle: '',
          error: opts?.onlyMissing ? null : 'No narratable slide text found',
          skipped,
        }));
      }
      return;
    }

    setProgress(prev => ({
      isRunning: true,
      isDone: false,
      // On resume, keep prior applied count visible instead of resetting to 0.
      currentSlide: resumeCount > 0 ? Math.max(prev.currentSlide, 0) : 0,
      totalSlides: items.length + (resumeCount > 0 ? Math.max(0, prev.currentSlide) : 0),
      currentSlideTitle: '',
      error: resumeCount > 0 ? 'Connection dropped — resuming remaining slides…' : null,
      skipped,
    }));

    let appliedCount = 0;
    const appliedSyntheticIds = new Set<string>();
    const MAX_AUTO_RESUMES = 3;
    const remainingSynthetics = () =>
      (opts?.synthetic || []).filter(s => s?.id && !appliedSyntheticIds.has(s.id));

    try {
      const created = await createTtsJob({ voice, items });
      if (!isActive(runId)) {
        await cancelTtsJob(created.jobId).catch(() => {});
        return;
      }
      activeJobIdRef.current = created.jobId;

      // Poll until terminal state
      while (isActive(runId)) {
        await sleep(1200);
        if (!isActive(runId)) break;

        const snap = await pollTtsJob(created.jobId);
        if (!isActive(runId)) break;

        const batch = snap.results || [];
        if (batch.length) {
          applyJobResults(batch, setCourse, opts?.setSyntheticAudioMap);
          appliedCount += batch.length;
          for (const r of batch) {
            if (r.target === 'synthetic' || (r.id.startsWith('__') && r.id.endsWith('__'))) {
              appliedSyntheticIds.add(r.id);
            }
          }
        }

        setProgress(prev => ({
          ...prev,
          isRunning: snap.status === 'queued' || snap.status === 'running',
          currentSlide: Math.max(snap.successCount || 0, snap.current || 0, appliedCount, prev.currentSlide),
          totalSlides: Math.max(snap.total || 0, prev.totalSlides, items.length),
          currentSlideTitle: snap.currentTitle || prev.currentSlideTitle,
          error: snap.error || null,
        }));
        onSlideProgress?.(snap.current || 0, snap.total || items.length, snap.currentTitle || '');

        if (snap.status === 'completed' || snap.status === 'failed' || snap.status === 'cancelled') {
          const success = snap.successCount ?? appliedCount;
          const failed = snap.failCount ?? 0;
          const errorMsg =
            snap.status === 'cancelled'
              ? 'Narration cancelled'
              : success === 0
                ? (snap.error || 'Narration failed for every clip. Check credits, trial limits, or OpenAI quota.')
                : failed > 0
                  ? `${success} ready, ${failed} failed${snap.error ? ` (last: ${snap.error})` : ''}`
                  : null;
          setProgress(prev => ({
            ...prev,
            isRunning: false,
            isDone: true,
            currentSlide: Math.max(success, prev.currentSlide, appliedCount),
            totalSlides: Math.max(snap.total || 0, prev.totalSlides),
            error: errorMsg,
          }));
          if (snap.status === 'cancelled' || success === 0) {
            // Not a proxy/network blip — don't use 502 or auto-resume will treat this as transient.
            throw new TTSRequestError(errorMsg || 'Narration failed', {
              status: snap.status === 'cancelled' ? 499 : 500,
              code: snap.code || (snap.status === 'cancelled' ? 'TTS_CANCELLED' : 'TTS_ERROR'),
            });
          }
          // Partial job failure (some clips failed server-side): auto-resume missing only.
          if (
            failed > 0 &&
            success > 0 &&
            resumeCount < MAX_AUTO_RESUMES &&
            isActive(runId)
          ) {
            setProgress(prev => ({
              ...prev,
              isRunning: true,
              isDone: false,
              error: `Retrying ${failed} failed clip${failed === 1 ? '' : 's'}…`,
            }));
            activeJobIdRef.current = null;
            let latestCourse: any = course;
            setCourse((prev: any) => {
              latestCourse = prev;
              return prev;
            });
            await sleep(1500);
            if (!isActive(runId)) return;
            const synthLeft = remainingSynthetics();
            return generateTTS(latestCourse, setCourse, voice, onSlideProgress, {
              onlyMissing: true,
              synthetic: synthLeft.length ? synthLeft : undefined,
              setSyntheticAudioMap: opts?.setSyntheticAudioMap,
              _resumeCount: resumeCount + 1,
            });
          }
          break;
        }
      }
    } catch (err: any) {
      if (!isActive(runId)) return;
      const message = formatTtsErrorForUser(err);
      const fatal = err instanceof TTSRequestError && TTS_FATAL_CODES.has(err.code);
      const transient = isTransientTtsNetworkError(err);

      // Auto-resume up to MAX_AUTO_RESUMES after network drops (including create/poll before any clip).
      // Finished audio is already patched onto `course` via setCourse functional updates.
      if (
        transient &&
        !fatal &&
        resumeCount < MAX_AUTO_RESUMES &&
        isActive(runId)
      ) {
        setProgress(prev => ({
          ...prev,
          isRunning: true,
          isDone: false,
          currentSlide: Math.max(prev.currentSlide, appliedCount),
          error: `Connection dropped — resuming remaining slides (attempt ${resumeCount + 1}/${MAX_AUTO_RESUMES})…`,
        }));
        const staleJobId = activeJobIdRef.current;
        activeJobIdRef.current = null;
        if (staleJobId) await cancelTtsJob(staleJobId).catch(() => {});
        let latestCourse: any = course;
        setCourse((prev: any) => {
          latestCourse = prev;
          return prev;
        });
        // Back off a bit more on later resumes (cold starts / flaky proxy).
        await sleep(2000 + resumeCount * 1500);
        if (!isActive(runId)) return;
        // New job for clips still missing, including unfinished cover/module synthetics.
        const synthLeft = remainingSynthetics();
        return generateTTS(latestCourse, setCourse, voice, onSlideProgress, {
          onlyMissing: true,
          synthetic: synthLeft.length ? synthLeft : undefined,
          setSyntheticAudioMap: opts?.setSyntheticAudioMap,
          _resumeCount: resumeCount + 1,
        });
      }

      setProgress(prev => {
        if (prev.isDone && prev.error && !prev.isRunning) return { ...prev, error: prev.error || message };
        return {
          ...prev,
          isRunning: false,
          isDone: true,
          // Keep how many clips we actually applied — don't wipe to 0 on a mid-run blip.
          currentSlide: Math.max(prev.currentSlide, appliedCount),
          error: message,
        };
      });
      if (err instanceof TTSRequestError) throw err;
      throw new TTSRequestError(message, { status: 500, code: 'TTS_ERROR' });
    } finally {
      if (isActive(runId)) activeJobIdRef.current = null;
    }
  }, []);

  const cancelTTS = useCallback(() => {
    runIdRef.current += 1;
    const jobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    setProgress(prev => ({ ...prev, isRunning: false }));
    if (jobId) cancelTtsJob(jobId).catch(() => {});
  }, []);

  const resetTTS = useCallback(() => {
    runIdRef.current += 1;
    const jobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    setProgress(DEFAULT_PROGRESS);
    if (jobId) cancelTtsJob(jobId).catch(() => {});
  }, []);

  const clearTTSProgress = useCallback(() => {
    setProgress(prev => {
      if (prev.isRunning) return prev;
      return DEFAULT_PROGRESS;
    });
  }, []);

  return { progress, generateTTS, cancelTTS, resetTTS, clearTTSProgress };
}
