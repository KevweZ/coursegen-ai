/**
 * useTTSGeneration.ts
 * React hook that drives the background TTS generation job.
 *
 * - Loops through all slides sequentially after course hydration
 * - Updates each slide's voiceOverUrl in-place on the course object
 * - Exposes fine-grained progress state for the UI toast
 * - Skips slides with no narration text gracefully
 * - Does NOT block the UI thread — all work is async/await in an effect
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

/**
 * Returns { progress, generateTTS }
 *
 * Call generateTTS(course, setCourse) after hydrateCourse() resolves.
 * The hook mutates slide.voiceOverUrl on each slide as audio is generated,
 * then calls setCourse with the updated course so React re-renders pick it up.
 */
export function useTTSGeneration() {
  const [progress, setProgress] = useState<TTSProgress>(DEFAULT_PROGRESS);
  const cancelRef = useRef(false);

  const generateTTS = useCallback(async (
    course: any,
    setCourse: (c: any) => void,
  ) => {
    if (!course?.modules) return;

    // Flatten all slides into a list, keeping reference to module for logging
    const allSlides: Array<{ slide: any; moduleTitle: string }> = [];
    for (const mod of course.modules) {
      for (const slide of (mod.slides ?? [])) {
        allSlides.push({ slide, moduleTitle: mod.title });
      }
    }

    // Only process slides that have actual narration text
    const narratableSlides = allSlides.filter(({ slide }) =>
      !!(slide.voiceOverText || slide.narration || slide.content)
    );

    if (narratableSlides.length === 0) {
      setProgress(prev => ({ ...prev, isDone: true }));
      return;
    }

    cancelRef.current = false;
    setProgress({
      isRunning: true,
      isDone: false,
      currentSlide: 0,
      totalSlides: narratableSlides.length,
      currentSlideTitle: '',
      error: null,
      skipped: allSlides.length - narratableSlides.length,
    });

    // Deep-clone the course so we can safely mutate without thrashing React state
    const updatedCourse = JSON.parse(JSON.stringify(course));
    // Build a quick lookup: slideId → module index + slide index
    const slideMap: Record<string, { mi: number; si: number }> = {};
    updatedCourse.modules.forEach((mod: any, mi: number) => {
      (mod.slides ?? []).forEach((slide: any, si: number) => {
        slideMap[slide.id] = { mi, si };
      });
    });

    let successCount = 0;

    for (let i = 0; i < narratableSlides.length; i++) {
      if (cancelRef.current) break;

      const { slide } = narratableSlides[i];
      const narrationText = slide.voiceOverText || slide.narration || slide.content || '';

      setProgress(prev => ({
        ...prev,
        currentSlide: i + 1,
        currentSlideTitle: slide.title ?? `Slide ${i + 1}`,
        error: null,
      }));

      try {
        const blobUrl = await generateSlideTTS(narrationText);
        const loc = slideMap[slide.id];
        if (loc) {
          updatedCourse.modules[loc.mi].slides[loc.si].voiceOverUrl = blobUrl;
        }
        successCount++;

        // Push incremental update so the player can use audio as soon as it's ready
        setCourse(JSON.parse(JSON.stringify(updatedCourse)));

      } catch (err: any) {
        console.warn(`[TTS] Failed for slide "${slide.title}":`, err.message);
        // Non-fatal: log and continue to next slide
        setProgress(prev => ({
          ...prev,
          error: `Slide "${slide.title}": ${err.message}`,
        }));
        // Small back-off before continuing after an error
        await new Promise(r => setTimeout(r, 1500));
      }

      // Small delay between requests to stay within OpenAI rate limits
      if (i < narratableSlides.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setProgress(prev => ({
      ...prev,
      isRunning: false,
      isDone: true,
      currentSlide: successCount,
    }));
  }, []);

  const cancelTTS = useCallback(() => {
    cancelRef.current = true;
    setProgress(prev => ({ ...prev, isRunning: false }));
  }, []);

  const resetTTS = useCallback(() => {
    cancelRef.current = true;
    setProgress(DEFAULT_PROGRESS);
  }, []);

  return { progress, generateTTS, cancelTTS, resetTTS };
}
