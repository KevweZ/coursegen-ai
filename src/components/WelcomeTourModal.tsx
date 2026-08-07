import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Upload, Settings2, Eye } from 'lucide-react';

export const WELCOME_TOUR_KEY = 'nexcourse_welcome_tour_dismissed';
const WELCOME_TOUR_SESSION_KEY = 'nexcourse_welcome_tour_session';

const STEPS = [
  {
    icon: Upload,
    title: 'Upload your content',
    body: 'Click Upload and choose the file you want NexCourse to turn into an eLearning course.',
  },
  {
    icon: Settings2,
    title: 'Customize your course',
    body: 'Open Course Settings from your profile menu to choose how NexCourse designs quizzes, narration, and layout.',
  },
  {
    icon: Eye,
    title: 'Preview or publish',
    body: 'After conversion, preview and edit your course — or publish it as a SCORM zip for your LMS.',
  },
] as const;

interface WelcomeTourModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeTourModal({ open, onClose }: WelcomeTourModalProps) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    try {
      if (dontShowAgain) localStorage.setItem(WELCOME_TOUR_KEY, '1');
      sessionStorage.setItem(WELCOME_TOUR_SESSION_KEY, '1');
    } catch { /* ignore */ }
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={finish} />
          <motion.div
            role="dialog"
            aria-labelledby="welcome-tour-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg rounded-2xl border-2 border-sky-400/50 bg-slate-800 shadow-2xl shadow-sky-900/40 overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />
            <button
              type="button"
              onClick={finish}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-8 pt-10 pb-7">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-300 mb-4">
                Welcome to NexCourse
              </p>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-sky-400/20 border border-sky-400/40 flex items-center justify-center shrink-0">
                  <Icon className="w-7 h-7 text-sky-300" />
                </div>
                <div>
                  <h2 id="welcome-tour-title" className="text-2xl font-extrabold text-white tracking-tight">
                    {current.title}
                  </h2>
                  <p className="text-base text-slate-200 mt-2 leading-relaxed">
                    {current.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === step ? 'w-8 bg-sky-400' : 'w-2 bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none mb-6">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-sky-500 focus:ring-sky-400/40 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-300">Don&apos;t show this again</span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={finish}
                  className="px-3 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-500 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  {isLast ? (
                    <button
                      type="button"
                      onClick={finish}
                      className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-bold text-slate-950 transition-all"
                    >
                      Get started
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                      className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-bold text-slate-950 transition-all"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function shouldShowWelcomeTour(): boolean {
  try {
    if (localStorage.getItem(WELCOME_TOUR_KEY) === '1') return false;
    if (sessionStorage.getItem(WELCOME_TOUR_SESSION_KEY) === '1') return false;
    return true;
  } catch {
    return true;
  }
}

/** Suppress welcome tour for this browser tab/session (any close). */
export function dismissWelcomeTourForSession(): void {
  try {
    sessionStorage.setItem(WELCOME_TOUR_SESSION_KEY, '1');
  } catch { /* ignore */ }
}
