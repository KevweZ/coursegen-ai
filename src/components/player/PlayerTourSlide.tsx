import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Volume2, PanelLeft, Palette, X, BookOpen } from 'lucide-react';

type Theme = 'light' | 'dark' | 'unified';

interface Props {
  theme: Theme;
  onSkip: () => void;   // advance to next slide
}

const TOUR_CARDS = [
  {
    icon: ArrowLeft,
    title: 'Previous & Next',
    desc: 'Use the Prev and Next buttons at the bottom of the screen to move between slides.',
    color: '#4f46e5',
  },
  {
    icon: BookOpen,
    title: 'Course Outline',
    desc: 'The sidebar on the left lists all modules and slides. Click any entry to jump directly to it.',
    color: '#0891b2',
  },
  {
    icon: Volume2,
    title: 'Narration',
    desc: 'Click the play button in the bottom bar to hear the audio narration for the current slide.',
    color: '#16a34a',
  },
  {
    icon: Palette,
    title: 'Theme',
    desc: 'Switch between Dark, Light, and Unified display themes using the Theme button in the top toolbar.',
    color: '#d97706',
  },
  {
    icon: PanelLeft,
    title: 'Seekbar & Progress',
    desc: 'The progress bar at the bottom shows how far through the course you are. Click to scrub.',
    color: '#9333ea',
  },
];

const BG: Record<Theme, string> = {
  dark: '#0f172a', light: '#f8fafc', unified: '#1e1b4b',
};
const CARD_BG: Record<Theme, string> = {
  dark: '#1e293b', light: '#ffffff', unified: '#2e1065',
};
const TEXT: Record<Theme, string> = {
  dark: '#e2e8f0', light: '#1e293b', unified: '#e0e7ff',
};
const SUB: Record<Theme, string> = {
  dark: '#94a3b8', light: '#475569', unified: '#a5b4fc',
};

export const PlayerTourSlide: React.FC<Props> = ({ theme, onSkip }) => {
  const [showModal, setShowModal] = useState(true);

  const bg       = BG[theme]    || BG.dark;
  const cardBg   = CARD_BG[theme] || CARD_BG.dark;
  const textColor = TEXT[theme]  || TEXT.dark;
  const subColor  = SUB[theme]   || SUB.dark;

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden" style={{ backgroundColor: bg }}>

      {/* ── Tour title ──────────────────────────────────────────────────────── */}
      <div className="px-10 pt-8 pb-4 shrink-0">
        <h2 className="font-extrabold text-2xl" style={{ color: textColor }}>Player Navigation Guide</h2>
        <p className="text-sm mt-1" style={{ color: subColor }}>
          A quick overview of the key controls available throughout this course.
        </p>
      </div>

      {/* ── Tour cards grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-10 pb-8">
        <div className="grid grid-cols-2 gap-4 auto-rows-fr" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {TOUR_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: showModal ? 0 : i * 0.08 }}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{
                  backgroundColor: cardBg,
                  border: `1.5px solid ${card.color}30`,
                  boxShadow: `0 2px 16px ${card.color}18`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}22` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <h3 className="font-bold text-sm" style={{ color: textColor }}>{card.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: subColor }}>{card.desc}</p>
              </motion.div>
            );
          })}

          {/* Skip / done card */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: showModal ? 0 : TOUR_CARDS.length * 0.08 }}
            onClick={onSkip}
            className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              backgroundColor: '#4f46e522',
              border: '1.5px dashed #4f46e5',
            }}
            whileHover={{ backgroundColor: '#4f46e530', scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowRight className="w-7 h-7 text-indigo-400" />
            <span className="font-bold text-sm text-indigo-400">Continue to Course</span>
          </motion.button>
        </div>
      </div>

      {/* ── Blocking modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              className="rounded-2xl p-8 mx-6 max-w-sm w-full text-center shadow-2xl"
              style={{ backgroundColor: cardBg, border: '1.5px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              transition={{ duration: 0.22 }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                   style={{ backgroundColor: '#4f46e522' }}>
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="font-extrabold text-lg mb-2" style={{ color: textColor }}>
                Player Tutorial
              </h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: subColor }}>
                Would you like a quick overview of the player controls before we begin?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onSkip}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: subColor }}
                >
                  Skip
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
                >
                  Show Me
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerTourSlide;
