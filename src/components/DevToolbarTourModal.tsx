import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Monitor, Settings2, Edit3, Upload,
  Undo2, RotateCcw, Shield, Save, Rocket, Music2,
} from 'lucide-react';

export const DEV_TOUR_KEY = 'nexcourse_dev_tour_dismissed';
const DEV_TOUR_SESSION_KEY = 'nexcourse_dev_tour_session';

const STEPS = [
  {
    icon: Monitor,
    title: 'Desktop / Mobile',
    body: 'Toggle between desktop and mobile landscape preview so you can check how the course looks on both layouts.',
  },
  {
    icon: Settings2,
    title: 'Player Props',
    body: 'Open player chrome settings — colors, logo, captions defaults, and other SCORM player appearance options.',
  },
  {
    icon: Edit3,
    title: 'Edit Slide',
    body: 'Edit on-screen text, narration, and regenerate this slide’s interaction without rebuilding the whole course.',
  },
  {
    icon: Upload,
    title: 'Upload Image',
    body: 'Add your own images onto the current slide as floating media you can move and crop.',
  },
  {
    icon: Music2,
    title: 'Media',
    body: 'Regenerate all narration (needed for older drafts that didn’t store audio), generate AI images for empty slides, or clear slide images across the course.',
  },
  {
    icon: Undo2,
    title: 'Undo & Reset',
    body: 'Undo recent edits, or Reset to restore the course to the original generated state.',
  },
  {
    icon: Shield,
    title: 'Quality',
    body: 'Run a quality scan for empty interactions, narration gaps, spelling, and formatting — then review and apply fixes.',
  },
  {
    icon: Save,
    title: 'Save',
    body: 'Save a Development draft to your cloud slots so you can reopen and keep editing later.',
  },
  {
    icon: Rocket,
    title: 'Publish Course',
    body: 'Export a SCORM package for your LMS when you’re ready (trial accounts use a limited publish path).',
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function shouldShowDevTour(): boolean {
  try {
    if (localStorage.getItem(DEV_TOUR_KEY) === '1') return false;
    if (sessionStorage.getItem(DEV_TOUR_SESSION_KEY) === '1') return false;
  } catch { /* ignore */ }
  return true;
}

export function DevToolbarTourModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    try {
      if (dontShowAgain) localStorage.setItem(DEV_TOUR_KEY, '1');
      sessionStorage.setItem(DEV_TOUR_SESSION_KEY, '1');
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
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={finish} />
          <motion.div
            role="dialog"
            aria-labelledby="dev-tour-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
            <button
              type="button"
              onClick={finish}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-8 pb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-300/90 mb-3">
                Course Development tour
              </p>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <h2 id="dev-tour-title" className="text-xl font-extrabold text-white tracking-tight">
                    {current.title}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                    {current.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? 'w-6 bg-sky-400' : 'w-1.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none mb-5">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/40 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400">Don&apos;t show this again</span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={finish}
                  className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => setStep(s => Math.max(0, s - 1))}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold disabled:opacity-30 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => (isLast ? finish() : setStep(s => s + 1))}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                  >
                    {isLast ? 'Got it' : 'Next'} {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
