/**
 * ClosedCaptionOverlay
 *
 * Displays the current narration sentence at the bottom of the slide canvas,
 * synchronized to audio playback position.
 *
 * Since the OpenAI TTS API doesn't return word-level timestamps, we approximate
 * sentence timing by partitioning the total audio duration proportionally to
 * word count — giving longer sentences more time and shorter ones less.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClosedCaptionOverlayProps {
  /** Full narration text for the current slide */
  narrationText: string | null;
  /** Current audio playback position in seconds */
  currentTime: number;
  /** Total audio duration in seconds */
  duration: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /**
   * absolute-bottom — overlaid on the slide canvas (desktop / in-frame bar).
   * docked — strip above an outside-docked PlayerBar (phone scale-to-fit).
   */
  placement?: 'absolute-bottom' | 'docked';
}

/** Split text into an array of cleaned sentences */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Count words in a string */
function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export const ClosedCaptionOverlay: React.FC<ClosedCaptionOverlayProps> = ({
  narrationText,
  currentTime,
  duration,
  isPlaying,
  placement = 'absolute-bottom',
}) => {
  // Build sentence timing map (start/end fractions 0–1 based on word-count weight)
  const sentences = useMemo(() => {
    if (!narrationText?.trim()) return [];
    const parts = splitSentences(narrationText);
    if (parts.length === 0) return [];

    const totalWords = parts.reduce((sum, s) => sum + wordCount(s), 0);
    if (totalWords === 0) return [];

    let cumulative = 0;
    return parts.map(text => {
      const weight = wordCount(text) / totalWords;
      const start = cumulative;
      cumulative += weight;
      return { text, start, end: cumulative };
    });
  }, [narrationText]);

  // Find which sentence to display based on current progress fraction
  const currentSentence = useMemo(() => {
    if (sentences.length === 0 || duration <= 0) {
      return sentences[0]?.text ?? null;
    }
    const fraction = Math.min(currentTime / duration, 0.9999);
    const found = sentences.find(s => fraction >= s.start && fraction < s.end);
    return found?.text ?? sentences[sentences.length - 1]?.text ?? null;
  }, [sentences, currentTime, duration]);

  // Don't render if no text or not enough info
  if (!narrationText || sentences.length === 0) return null;

  const docked = placement === 'docked';

  return (
    <div
      className={
        docked
          ? 'relative w-full shrink-0 z-[110] pointer-events-none px-2 py-1.5'
          : 'absolute bottom-0 left-0 right-0 z-40 pointer-events-none'
      }
      style={docked ? undefined : { paddingBottom: '3px' }}
    >
      <AnimatePresence mode="wait">
        {currentSentence && (
          <motion.div
            key={currentSentence}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto w-fit max-w-[min(92%,42rem)] px-4 py-2 rounded-lg text-center"
            style={{
              backgroundColor: 'rgba(0,0,0,0.78)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <p
              className="text-white font-medium leading-snug"
              style={{ fontSize: docked ? 'clamp(0.7rem, 1.4vw, 0.9rem)' : 'clamp(0.75rem, 1.6vw, 1rem)' }}
            >
              {currentSentence}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClosedCaptionOverlay;
