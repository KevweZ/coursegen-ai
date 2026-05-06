import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Volume2, VolumeX, PanelLeft, Palette,
  BookOpen, Gamepad2, Play,
  ChevronLeft, ChevronRight, BarChart2,
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
    desc: 'Prev and Next buttons sit together at the bottom-right. Move between slides at your own pace.',
    color: '#4f46e5',
  },
  {
    id: 'sidebar',
    icon: PanelLeft,
    title: 'Table of Contents',
    desc: 'The left sidebar lists every module and slide. Click any entry to jump directly to it.',
    color: '#0891b2',
  },
  {
    id: 'volume',
    icon: Volume2,
    title: 'Narration & Volume',
    desc: 'Use the play button to start narration and the volume button to mute or unmute at any time.',
    color: '#16a34a',
  },
  {
    id: 'toolbar',
    icon: Palette,
    title: 'Theme & Tools',
    desc: 'Switch between Dark, Light, and Unified themes. The toolbar also holds editing and export tools.',
    color: '#d97706',
  },
  {
    id: 'seekbar',
    icon: BarChart2,
    title: 'Progress Bar',
    desc: 'The seekbar tracks your slide progress. Click anywhere on it to jump directly to that point.',
    color: '#9333ea',
  },
  {
    id: 'canvas',
    icon: Gamepad2,
    title: 'Interactive Slides',
    desc: 'Some slides require you to click, drag items, or engage with game-mode challenges — read each slide\'s instructions.',
    color: '#e11d48',
  },
];

// ── Theme tokens ─────────────────────────────────────────────────────────────
const BG: Record<Theme, string>      = { dark: '#0f172a',  light: '#f1f5f9',  unified: '#1e1b4b' };
const CARD_BG: Record<Theme, string> = { dark: '#1e293b',  light: '#ffffff',  unified: '#2e1065' };
const TEXT: Record<Theme, string>    = { dark: '#e2e8f0',  light: '#1e293b',  unified: '#e0e7ff' };
const SUB: Record<Theme, string>     = { dark: '#94a3b8',  light: '#475569',  unified: '#a5b4fc' };

// ── Glow helper ─────────────────────────────────────────────────────────────
function glowStyle(active: boolean, color: string): React.CSSProperties {
  return {
    boxShadow: active ? `0 0 0 2px ${color}, 0 0 14px ${color}55` : 'none',
    transition: 'box-shadow 0.18s ease',
    outline: active ? `2px solid ${color}` : '2px solid transparent',
    outlineOffset: '1px',
  };
}

// ── Mini Player Mockup ───────────────────────────────────────────────────────
const MiniPlayer: React.FC<{ hovered: string | null; theme: Theme }> = ({ hovered, theme }) => {
  const isDark = theme !== 'light';

  const mockBg   = isDark ? '#0d1526' : '#e2e8f0';
  const mockBar  = isDark ? '#1a2640' : '#cbd5e1';
  const mockSide = isDark ? '#172035' : '#dde4ee';
  const accent   = '#4f46e5';
  const txtFaint = isDark ? '#2d4166' : '#a8b8cc';
  const txtMid   = isDark ? '#3d5580' : '#8fa5bc';

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col text-[0px]"
      style={{ backgroundColor: mockBg, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'}` }}
    >
      {/* ── Top toolbar ──────────────────────────────────────────── */}
      <div
        className="shrink-0 h-7 flex items-center justify-between px-2.5 rounded-t-xl"
        style={{ ...glowStyle(hovered === 'toolbar', '#d97706'), backgroundColor: mockBar, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}` }}
      >
        {/* Left: logo placeholder */}
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: accent, opacity: 0.8 }} />
          <div className="h-2 w-12 rounded" style={{ backgroundColor: txtFaint }} />
        </div>
        {/* Right: tool buttons */}
        <div className="flex gap-1">
          {['#7c3aed', '#0891b2', '#d97706', '#16a34a'].map((c, i) => (
            <div key={i} className="h-3 w-8 rounded-sm" style={{ backgroundColor: c, opacity: 0.6 }} />
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + canvas ───────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div
          className="shrink-0 w-[30%] flex flex-col py-1.5 px-1.5 gap-1 border-r"
          style={{
            ...glowStyle(hovered === 'sidebar', '#0891b2'),
            backgroundColor: mockSide,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)',
          }}
        >
          {/* Module headers + slides mock */}
          {[
            { label: 'MOD 1', indent: false, active: false },
            { label: 'Overview', indent: true, active: true },
            { label: 'Content', indent: true, active: false },
            { label: 'MOD 2', indent: false, active: false },
            { label: 'Overview', indent: true, active: false },
            { label: 'Quiz', indent: true, active: false },
          ].map((row, i) => (
            <div key={i} className={`h-[9px] rounded-sm ${row.indent ? 'ml-2' : ''}`}
              style={{ backgroundColor: row.active ? accent : txtFaint, opacity: row.indent ? 0.7 : 1, width: row.indent ? '80%' : '100%' }}
            />
          ))}
        </div>

        {/* Slide canvas */}
        <div
          className="flex-1 flex flex-col items-start justify-start p-3 gap-2"
          style={{ ...glowStyle(hovered === 'canvas', '#e11d48') }}
        >
          {/* Slide title mock */}
          <div className="h-3 w-4/5 rounded" style={{ backgroundColor: accent, opacity: 0.5 }} />
          <div className="h-[2px] w-full rounded" style={{ background: `linear-gradient(to right, ${accent}80, transparent)` }} />
          {/* Content lines */}
          {[90, 75, 85, 65].map((w, i) => (
            <div key={i} className="h-[7px] rounded" style={{ width: `${w}%`, backgroundColor: txtFaint }} />
          ))}
          {/* Interactive element placeholder */}
          <div className="w-full mt-1 rounded-lg border border-dashed h-10 flex items-center justify-center"
            style={{ borderColor: txtMid, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }}
          >
            <div className="h-[7px] w-1/2 rounded" style={{ backgroundColor: txtMid }} />
          </div>
        </div>
      </div>

      {/* ── Bottom player bar ────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col border-t"
        style={{ backgroundColor: mockBar, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}
      >
        {/* Seekbar */}
        <div
          className="mx-2 mt-1.5 h-1.5 rounded-full overflow-hidden"
          style={{ ...glowStyle(hovered === 'seekbar', '#9333ea'), backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)' }}
        >
          <div className="h-full w-2/5 rounded-full" style={{ backgroundColor: '#4f46e5' }} />
        </div>

        {/* Controls row: Play + Volume left | slide info center | Prev+Next right */}
        <div className="flex items-center justify-between px-2 py-1.5">
          {/* Left: Play + Volume */}
          <div className="flex items-center gap-1">
            {/* Play button */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ ...glowStyle(hovered === 'volume', '#16a34a'), backgroundColor: '#4f46e5' }}
            >
              <Play className="w-2 h-2 text-white" />
            </div>
            {/* Volume button */}
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ ...glowStyle(hovered === 'volume', '#16a34a'), backgroundColor: isDark ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.4)' }}
            >
              <Volume2 className="w-[7px] h-[7px]" style={{ color: '#16a34a' }} />
            </div>
          </div>

          {/* Center: slide counter */}
          <div className="h-[7px] w-10 rounded" style={{ backgroundColor: txtFaint }} />

          {/* Right: Prev + Next — both together */}
          <div
            className="flex items-center gap-1"
            style={glowStyle(hovered === 'prev-next', '#4f46e5')}
          >
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
              <ChevronLeft className="w-2.5 h-2.5" style={{ color: txtMid }} />
              <span className="text-[7px] font-bold" style={{ color: txtMid }}>Prev</span>
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#4f46e5' }}>
              <span className="text-[7px] font-bold text-white">Next</span>
              <ChevronRight className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const PlayerTourSlide: React.FC<Props> = ({ theme, onSkip }) => {
  const [showModal, setShowModal] = useState(true);
  const [hovered, setHovered]     = useState<string | null>(null);

  const bg      = BG[theme]     || BG.dark;
  const cardBg  = CARD_BG[theme]|| CARD_BG.dark;
  const textClr = TEXT[theme]   || TEXT.dark;
  const subClr  = SUB[theme]    || SUB.dark;

  return (
    <div className="w-full h-full relative flex overflow-hidden" style={{ backgroundColor: bg }}>

      {/* ── Left: mini player mockup (42%) ───────────────────────────────── */}
      <div className="w-[42%] shrink-0 flex flex-col p-6 gap-3">
        <div className="shrink-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: '#818cf8' }}>
            Interactive Preview
          </p>
          <p className="text-[11px]" style={{ color: subClr }}>
            Hover a card on the right to illuminate its control →
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <MiniPlayer hovered={hovered} theme={theme} />
        </div>
      </div>

      {/* ── Right: tour cards (58%) ───────────────────────────────────────── */}
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
                  className="rounded-xl p-4 flex flex-col gap-2 cursor-default"
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

            {/* Continue button — full width */}
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: showModal ? 0 : CARDS.length * 0.07 }}
              onClick={onSkip}
              className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 col-span-2"
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
