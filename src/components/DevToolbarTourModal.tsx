import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Monitor, Settings2, Edit3, Upload,
  Undo2, Shield, Save, Rocket,
} from 'lucide-react';

export const DEV_TOUR_KEY = 'nexcourse_dev_tour_dismissed_v2';
const DEV_TOUR_SESSION_KEY = 'nexcourse_dev_tour_session_v2';

/** Clear legacy dismiss keys from the v1 tour gate so the tour can appear again. */
export function migrateDevTourStorage(): void {
  try {
    localStorage.removeItem('nexcourse_dev_tour_dismissed');
    sessionStorage.removeItem('nexcourse_dev_tour_session');
  } catch { /* ignore */ }
}

/** Accent colors aligned with the Course Development toolbar buttons */
const STEPS = [
  {
    icon: Monitor,
    title: 'Desktop / Mobile',
    body: 'Toggle between desktop and mobile landscape preview so you can check how the course looks on both layouts.',
    accent: '#22d3ee', // cyan — matches Desktop/Mobile toggle
  },
  {
    icon: Settings2,
    title: 'Player Props',
    body: 'Open player chrome settings — colors, logo, captions defaults, and other SCORM player appearance options.',
    accent: '#fb923c', // orange — matches Player Props
  },
  {
    icon: Edit3,
    title: 'Edit',
    body: 'Edit the current slide, regenerate a single slide that failed to generate, rebuild all narration, generate AI images, or clear slide images.',
    accent: '#818cf8', // indigo — matches Edit
  },
  {
    icon: Upload,
    title: 'Upload Image',
    body: 'Add your own images onto the current slide as floating media you can move and crop.',
    accent: '#a78bfa', // violet — matches Upload Image
  },
  {
    icon: Undo2,
    title: 'Undo & Reset',
    body: 'Undo recent edits, or Reset to restore the course to the original generated state.',
    accent: '#fbbf24', // amber — matches Reset (Undo is slate)
  },
  {
    icon: Shield,
    title: 'Quality',
    body: 'Run a quality scan for empty interactions, narration gaps, spelling, and formatting — then review and apply fixes.',
    accent: '#34d399', // emerald — matches Quality
  },
  {
    icon: Save,
    title: 'Save',
    body: 'Save a Development draft to your cloud slots so you can reopen and keep editing later.',
    accent: '#94a3b8', // slate — matches Save
  },
  {
    icon: Rocket,
    title: 'Publish Course',
    body: 'Export a SCORM package for your LMS when you’re ready. Choose SCORM 1.2 or 2004, then download the zip to upload to your LMS.',
    accent: '#a78bfa', // violet — matches Publish
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
  const accent = current.accent;
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
          className="fixed inset-0 z-[800] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Soft overlay — keeps toolbar readable so the tour points at real buttons */}
          <div
            className="absolute inset-0 bg-slate-950/25 pointer-events-auto"
            onClick={finish}
          />

          <motion.div
            role="dialog"
            aria-labelledby="dev-tour-title"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute top-16 right-3 sm:top-[4.5rem] sm:right-5 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border bg-slate-900 shadow-2xl shadow-black/50 overflow-visible"
            style={{ borderColor: `${accent}55` }}
          >
            {/* Caret pointing up toward the toolbar */}
            <div
              className="absolute -top-2 right-10 w-4 h-4 rotate-45 border-l border-t bg-slate-900"
              style={{ borderColor: `${accent}55` }}
              aria-hidden
            />

            <div
              className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
            />
            <button
              type="button"
              onClick={finish}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-5 pt-7 pb-4">
              <p
                className="text-[11px] font-bold uppercase tracking-widest mb-3"
                style={{ color: accent }}
              >
                Course Development tour
              </p>
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    background: `${accent}22`,
                    borderColor: `${accent}44`,
                    color: accent,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="dev-tour-title" className="text-lg font-extrabold text-white tracking-tight">
                    {current.title}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                    {current.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-4">
                {STEPS.map((s, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === step ? 24 : 6,
                      background: i === step ? s.accent : '#334155',
                    }}
                  />
                ))}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none mb-4">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 focus:ring-offset-0"
                  style={{ accentColor: accent }}
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
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors"
                    style={{ background: accent, color: '#0f172a' }}
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
