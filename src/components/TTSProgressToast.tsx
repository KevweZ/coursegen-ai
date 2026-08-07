/**
 * TTSProgressToast.tsx
 * Non-blocking floating toast that shows TTS generation progress.
 * Bottom-center so it does not cover player Next/Prev controls.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';
import { TTSProgress } from '../hooks/useTTSGeneration';

interface Props {
  progress: TTSProgress;
  /** Clears completed toast UI only — must not cancel an in-flight TTS job. */
  onDismiss?: () => void;
}

export const TTSProgressToast: React.FC<Props> = ({ progress, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (progress.isRunning) {
      setVisible(true);
      return;
    }

    if (progress.isDone) {
      setVisible(true);
      // Keep failures on screen until the user dismisses — quick fails were easy to miss.
      if (progress.error) return;
      timerRef.current = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
        timerRef.current = null;
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [progress.isRunning, progress.isDone, progress.error, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    onDismiss?.();
  };

  const pct = progress.totalSlides > 0
    ? Math.round((progress.currentSlide / progress.totalSlides) * 100)
    : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[min(20rem,calc(100vw-2rem))] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="h-[3px] w-full bg-slate-800 relative overflow-hidden">
            <motion.div
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                progress.isDone && !progress.error
                  ? 'bg-emerald-500'
                  : progress.error
                  ? 'bg-red-500'
                  : 'bg-indigo-500'
              }`}
              animate={{ width: `${progress.isDone ? 100 : pct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                progress.isDone && !progress.error
                  ? 'bg-emerald-500/20'
                  : progress.error
                  ? 'bg-red-500/20'
                  : 'bg-indigo-500/20'
              }`}>
                {progress.isDone && !progress.error ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : progress.error && !progress.isRunning ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">
                  {progress.isDone && !progress.isRunning
                    ? (progress.error && progress.currentSlide === 0
                        ? 'Audio generation failed'
                        : progress.error
                          ? 'Audio generation finished with errors'
                          : 'Audio generation complete')
                    : 'Generating narration audio'}
                </p>
                {progress.isRunning && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Slide {progress.currentSlide} of {progress.totalSlides}
                    {progress.currentSlideTitle ? ` — ${progress.currentSlideTitle}` : ''}
                  </p>
                )}
                {progress.isDone && !progress.isRunning && (
                  <p className="text-xs text-emerald-400 mt-0.5">
                    {progress.currentSlide} slide{progress.currentSlide !== 1 ? 's' : ''} ready
                  </p>
                )}
                {progress.error && (
                  <p className="text-xs text-red-400 mt-0.5 line-clamp-2">
                    {progress.error}
                  </p>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="shrink-0 p-1 -mt-0.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {progress.isRunning && (
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Narration</span>
                <span className="text-indigo-400">{pct}%</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
