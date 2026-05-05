import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Volume2, PanelLeft, Palette,
  BookOpen, Gamepad2, Play, ChevronLeft, ChevronRight,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'unified';

interface Props {
  theme: Theme;
  onSkip: () => void;
}

// ── Tour card definitions ───────────────────────────────────────────────────
const CARDS = [
  {
    id: 'prev-next',
    icon: ArrowRight,
    title: 'Previous & Next',
    desc: 'Use the Prev and Next buttons at the bottom of the player to move between slides.',
    color: '#4f46e5',
  },
  {
    id: 'sidebar',
    icon: PanelLeft,
    title: 'Course Outline',
    desc: 'The sidebar lists all modules and slides. Click any entry to jump directly to it.',
    color: '#0891b2',
  },
  {
    id: 'play-btn',
    icon: Volume2,
    title: 'Narration',
    desc: 'Click the play button in the bottom bar to hear the audio narration for each slide.',
    color: '#16a34a',
  },
  {
    id: 'toolbar',
    icon: Palette,
    title: 'Theme & Tools',
    desc: 'Switch between Dark, Light, and Unified themes using the toolbar at the top.',
    color: '#d97706',
  },
  {
    id: 'seekbar',
    icon: ArrowLeft,
    title: 'Progress Bar',
    desc: 'The seekbar at the bottom tracks your progress. Click anywhere to jump to that slide.',
    color: '#9333ea',
  },
  {
    id: 'canvas',
    icon: Gamepad2,
    title: 'Interactive Slides',
    desc: 'Some slides require you to click, drag items, or engage with game-mode challenges. Read each slide\'s instructions carefully.',
    color: '#e11d48',
  },
];

// ── Theme tokens ────────────────────────────────────────────────────────────
const BG: Record<Theme, string>      = { dark: '#0f172a',  light: '#f8fafc',  unified: '#1e1b4b' };
const CARD_BG: Record<Theme, string> = { dark: '#1e293b',  light: '#ffffff',  unified: '#2e1065' };
const TEXT: Record<Theme, string>    = { dark: '#e2e8f0',  light: '#1e293b',  unified: '#e0e7ff' };
const SUB: Record<Theme, string>     = { dark: '#94a3b8',  light: '#475569',  unified: '#a5b4fc' };
const MOCK_BG: Record<Theme, string> = { dark: '#0d1526',  light: '#e2e8f0',  unified: '#130d2e' };
const MOCK_BAR: Record<Theme, string>= { dark: '#1a2640',  light: '#cbd5e1',  unified: '#1e1052' };
const MOCK_TXT: Record<Theme, string>= { dark: '#475569',  light: '#94a3b8',  unified: '#4338ca' };

// ── Glow helper ─────────────────────────────────────────────────────────────
function glowStyle(active: boolean, color: string) {
  return active
    ? { boxShadow: `0 0 0 2px ${color}, 0 0 18px ${color}60`, transition: 'all 0.22s ease' }
    : { boxShadow: 'none', transition: 'all 0.22s ease' };
}

// ── Mini Player Mockup ───────────────────────────────────────────────────────
const MiniPlayer: React.FC<{ hovered: string | null; theme: Theme }> = ({ hovered, theme }) => {
  const mockBg  = MOCK_BG[theme]  || MOCK_BG.dark;
  const mockBar = MOCK_BAR[theme] || MOCK_BAR.dark;
  const mockTxt = MOCK_TXT[theme] || MOCK_TXT.dark;

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
      style={{ backgroundColor: mockBg, border: '1.5px solid rgba(255,255,255,0.07)' }}
    >
      {/* ── Top toolbar ───────────────────────────────────────────── */}
      <div
        className="shrink-0 h-7 flex items-center justify-between px-3 rounded-t-xl"
        style={{ ...glowStyle(hovered === 'toolbar', '#d97706'), backgroundColor: mockBar }}
      >
        <div className="flex gap-1.5">
          {['#ef4444','#f59e0b','#22c55e'].map(c => (
            <div key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <div className="h-3 w-10 rounded" style={{ backgroundColor: mockTxt }} />
          <div className="h-3 w-8 rounded" style={{ backgroundColor: mockTxt }} />
          <div className="h-3 w-12 rounded" style={{ backgroundColor: mockTxt }} />
        </div>
      </div>

      {/* ── Main body: sidebar + canvas ───────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div
          className="shrink-0 w-[28%] flex flex-col gap-1.5 p-2 border-r"
          style={{
            ...glowStyle(hovered === 'sidebar', '#0891b2'),
            backgroundColor: mockBar,
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <div className="h-2.5 w-full rounded" style={{ backgroundColor: mockTxt, opacity: 0.8 }} />
          {[70, 55, 85, 60, 75, 50, 65].map((w, i) => (
            <div
              key={i}
              className="h-2 rounded ml-2"
              style={{ width: `${w}%`, backgroundColor: i === 0 ? '#4f46e5' : mockTxt, opacity: i === 0 ? 1 : 0.5 }}
            />
          ))}
        </div>

        {/* Slide canvas */}
        <div
          className="flex-1 flex flex-col items-center justify-center gap-2 p-3"
          style={{ ...glowStyle(hovered === 'canvas', '#e11d48') }}
        >
          {/* Fake slide content */}
          <div className="w-full space-y-1.5">
            <div className="h-3 w-3/4 rounded" style={{ backgroundColor: mockTxt, opacity: 0.7 }} />
            <div className="h-2 w-full rounded" style={{ backgroundColor: mockTxt, opacity: 0.4 }} />
            <div className="h-2 w-5/6 rounded" style={{ backgroundColor: mockTxt, opacity: 0.4 }} />
            <div className="h-2 w-4/5 rounded" style={{ backgroundColor: mockTxt, opacity: 0.4 }} />
          </div>
          <div className="w-full h-14 rounded-lg mt-1" style={{ backgroundColor: mockBar, opacity: 0.8 }} />
        </div>
      </div>

      {/* ── Bottom player bar ──────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col gap-1.5 px-3 py-2"
        style={{ backgroundColor: mockBar }}
      >
        {/* Seekbar */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ ...glowStyle(hovered === 'seekbar', '#9333ea'), backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="h-full w-2/5 rounded-full" style={{ backgroundColor: '#4f46e5' }} />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Prev */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ ...glowStyle(hovered === 'prev-next', '#4f46e5'), backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <ChevronLeft className="w-3 h-3" style={{ color: mockTxt }} />
            <span className="text-[9px] font-bold" style={{ color: mockTxt }}>Prev</span>
          </div>

          {/* Play button */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ ...glowStyle(hovered === 'play-btn', '#16a34a'), backgroundColor: '#4f46e5' }}
          >
            <Play className="w-3 h-3 text-white" />
          </div>

          {/* Next */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ ...glowStyle(hovered === 'prev-next', '#4f46e5'), backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <span className="text-[9px] font-bold" style={{ color: mockTxt }}>Next</span>
            <ChevronRight className="w-3 h-3" style={{ color: mockTxt }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const PlayerTourSlide: React.FC<Props> = ({ theme, onSkip }) => {
  const [showModal, setShowModal] = useState(true);
  const [hovered, setHovered]     = useState<string | null>(null);

  const bg      = BG[theme]     || BG.dark;
  const cardBg  = CARD_BG[theme]|| CARD_BG.dark;
  const textClr = TEXT[theme]   || TEXT.dark;
  const subClr  = SUB[theme]    || SUB.dark;

  return (
    <div className="w-full h-full relative flex overflow-hidden" style={{ backgroundColor: bg }}>

      {/* ── Left: mini player mockup (40%) ──────────────────────────────── */}
      <div className="w-[40%] shrink-0 flex flex-col p-6 gap-4">
        <div className="shrink-0">
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#818cf8' }}>
            Interactive Preview
          </p>
          <p className="text-xs" style={{ color: subClr }}>
            Hover a card to highlight its control →
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <MiniPlayer hovered={hovered} theme={theme} />
        </div>
      </div>

      {/* ── Right: tour cards (60%) ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 shrink-0">
          <h2 className="font-extrabold text-2xl" style={{ color: textClr }}>
            Player Navigation Guide
          </h2>
          <p className="text-sm mt-0.5" style={{ color: subClr }}>
            Explore the controls available throughout this course.
          </p>
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {CARDS.map((card, i) => {
              const Icon = card.icon;
              const isHov = hovered === card.id;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: showModal ? 0 : i * 0.07 }}
                  onMouseEnter={() => setHovered(card.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="rounded-xl p-4 flex flex-col gap-2 cursor-default transition-all"
                  style={{
                    backgroundColor: isHov ? `${card.color}18` : cardBg,
                    border: `1.5px solid ${isHov ? card.color : `${card.color}28`}`,
                    boxShadow: isHov ? `0 0 18px ${card.color}30` : 'none',
                    transform: isHov ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}22` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <p className="font-bold text-sm" style={{ color: textClr }}>{card.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: subClr }}>{card.desc}</p>
                </motion.div>
              );
            })}

            {/* Continue card */}
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: showModal ? 0 : CARDS.length * 0.07 }}
              onClick={onSkip}
              className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 col-span-2 transition-all"
              style={{
                backgroundColor: 'rgba(79,70,229,0.12)',
                border: '1.5px dashed #4f46e5',
              }}
              whileHover={{ backgroundColor: 'rgba(79,70,229,0.22)', scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowRight className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-sm text-indigo-400">Continue to Course Objectives</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Blocking modal ────────────────────────────────────────────────── */}
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
              <h3 className="font-extrabold text-lg mb-2" style={{ color: textClr }}>
                Player Tutorial
              </h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: subClr }}>
                Would you like a quick overview of the player controls before we begin?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onSkip}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all hover:opacity-80"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: subClr }}
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
