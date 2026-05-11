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

  const mockBg   = isDark ? '#0d1526' : '#e8edf5';
  const mockBar  = isDark ? '#111827' : '#d1d9e6';
  const mockSide = isDark ? '#0f172a' : '#dce3ed';
  const accent   = '#4f46e5';
  const txtFaint = isDark ? '#1e2d47' : '#b0bed0';
  const txtMid   = isDark ? '#3d5580' : '#7a96b3';
  const txtLight = isDark ? '#64748b' : '#94a3b8';
  const txtBody  = isDark ? '#e2e8f0' : '#1e293b';

  /* Sidebar TOC entries */
  const TOC = [
    { label: 'Course Introduction', indent: 0, active: false, module: true },
    { label: 'Player Tour',         indent: 1, active: false, module: false, sub: 'Skip' },
    { label: 'Course Objectives',   indent: 1, active: true,  module: false },
    { label: 'MODULE 1 — CORE PLAYER', indent: 0, active: false, module: true },
    { label: '1.1  Module 1 — Overview', indent: 1, active: false, module: false },
    { label: '1.2  Player Layout',       indent: 1, active: false, module: false },
    { label: '1.3  Key Takeaways',       indent: 1, active: false, module: false },
    { label: '1.4  Player Components',   indent: 1, active: false, module: false },
    { label: 'MODULE 2 — EXPLORATORY',  indent: 0, active: false, module: true },
    { label: '2.1  Module 2 — Overview', indent: 1, active: false, module: false },
  ];

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: mockBg, borderRadius: '10px', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'}` }}
    >
      {/* ── Top toolbar ─────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-2"
        style={{
          ...glowStyle(hovered === 'toolbar', '#d97706'),
          height: '22px',
          backgroundColor: mockBar,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        {/* Left: course name + preview badge */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: accent, opacity: 0.9 }} />
          <span style={{ color: txtBody, fontSize: '5.5px', fontWeight: 800, letterSpacing: '0.04em' }}>Demo Course</span>
          <div className="rounded px-1" style={{ backgroundColor: isDark ? '#1e293b' : '#cbd5e1', border: `1px solid ${isDark ? '#334155' : '#94a3b8'}` }}>
            <span style={{ color: txtLight, fontSize: '4.5px', fontWeight: 700, letterSpacing: '0.08em' }}>PREVIEW</span>
          </div>
        </div>
        {/* Right: action buttons */}
        <div className="flex gap-1">
          {[
            { label: 'QC Check', bg: '#16a34a' },
            { label: 'Save',     bg: isDark ? '#1e293b' : '#c5cedb' },
            { label: '↑ Export', bg: accent },
          ].map((btn, i) => (
            <div key={i} className="rounded px-1 flex items-center" style={{ backgroundColor: btn.bg, border: `1px solid rgba(255,255,255,0.1)`, height: '11px' }}>
              <span style={{ color: i === 1 ? txtLight : '#fff', fontSize: '4.5px', fontWeight: 700 }}>{btn.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: sidebar + canvas ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Sidebar */}
        <div
          className="shrink-0 flex flex-col"
          style={{
            ...glowStyle(hovered === 'sidebar', '#0891b2'),
            width: '32%',
            backgroundColor: mockSide,
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          {/* TOC header */}
          <div className="flex items-center justify-between px-1.5 py-1" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'}` }}>
            <span style={{ color: txtBody, fontSize: '5px', fontWeight: 800, letterSpacing: '0.12em' }}>TABLE OF CONTENTS</span>
            <div className="rounded px-1" style={{ backgroundColor: isDark ? '#1e293b' : '#c0cbd9' }}>
              <span style={{ color: txtLight, fontSize: '4.5px' }}>28</span>
            </div>
          </div>
          {/* TOC items */}
          <div className="flex flex-col gap-px px-1 py-1 overflow-hidden">
            {TOC.map((row, i) => (
              <div
                key={i}
                className="rounded flex items-center justify-between"
                style={{
                  paddingLeft: row.indent ? '8px' : '2px',
                  paddingTop: '1.5px',
                  paddingBottom: '1.5px',
                  paddingRight: '2px',
                  backgroundColor: row.active ? `${accent}22` : 'transparent',
                  border: row.active ? `1px solid ${accent}44` : '1px solid transparent',
                  marginTop: row.module && i > 0 ? '2px' : 0,
                }}
              >
                <span style={{
                  color: row.active ? '#818cf8' : row.module ? txtBody : txtLight,
                  fontSize: row.module ? '4.5px' : '4px',
                  fontWeight: row.module || row.active ? 800 : 500,
                  letterSpacing: row.module ? '0.08em' : 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '90%',
                }}>
                  {row.label}
                </span>
                {row.sub && (
                  <span style={{ color: accent, fontSize: '3.5px', fontWeight: 700 }}>{row.sub}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main canvas — mimics Course Objectives split-panel layout */}
        <div
          className="flex-1 flex min-w-0"
          style={glowStyle(hovered === 'canvas', '#e11d48')}
        >
          {/* Left accent panel */}
          <div
            className="shrink-0 flex flex-col items-center justify-between py-1.5"
            style={{ width: '22%', backgroundColor: isDark ? '#1e1b4b' : '#1e3a8a', borderRight: `2px solid ${accent}` }}
          >
            {/* Target icon */}
            <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ border: `1px solid ${accent}88` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ border: `1px solid ${accent}` }} />
            </div>
            {/* Vertical label */}
            <span
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '5px',
                fontWeight: 800,
                letterSpacing: '0.2em',
              }}
            >
              OBJECTIVES
            </span>
            <div style={{ height: '8px' }} />
          </div>

          {/* Slide content area */}
          <div className="flex-1 flex flex-col p-2 gap-1.5" style={{ backgroundColor: mockBg }}>
            {/* Slide title */}
            <div>
              <span style={{ color: '#818cf8', fontSize: '4.5px', fontWeight: 800, letterSpacing: '0.1em' }}>COURSE OBJECTIVES</span>
              <div className="h-px mt-0.5 rounded" style={{ background: `linear-gradient(to right, ${accent}60, transparent)` }} />
            </div>
            {/* Objective rows */}
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-1">
                <div className="shrink-0 w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}66` }}>
                  <span style={{ color: accent, fontSize: '4px', fontWeight: 800 }}>{n}</span>
                </div>
                <div className="rounded" style={{ height: '4px', flex: 1, backgroundColor: txtFaint }} />
              </div>
            ))}
            {/* Wider row for variation */}
            <div className="flex items-center gap-1">
              <div className="shrink-0 w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}66` }}>
                <span style={{ color: accent, fontSize: '4px', fontWeight: 800 }}>4</span>
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="rounded" style={{ height: '4px', width: '100%', backgroundColor: txtFaint }} />
                <div className="rounded" style={{ height: '4px', width: '60%', backgroundColor: txtFaint, opacity: 0.6 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom player bar ──────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col"
        style={{ backgroundColor: mockBar, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'}` }}
      >
        {/* Seekbar */}
        <div
          className="mx-2 mt-1 rounded-full overflow-hidden"
          style={{
            ...glowStyle(hovered === 'seekbar', '#9333ea'),
            height: '3px',
            backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.13)',
          }}
        >
          <div className="h-full rounded-full" style={{ width: '25%', backgroundColor: accent }} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-2 py-1">
          {/* Left: play + volume + slider */}
          <div className="flex items-center gap-1" style={glowStyle(hovered === 'volume', '#16a34a')}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
              <Play className="w-1.5 h-1.5 text-white" />
            </div>
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(22,163,74,0.18)', border: '1px solid rgba(22,163,74,0.45)' }}>
              <Volume2 className="w-1.5 h-1.5" style={{ color: '#16a34a' }} />
            </div>
            {/* Volume slider */}
            <div className="rounded-full overflow-hidden" style={{ width: '20px', height: '2.5px', backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: '55%', backgroundColor: '#16a34a' }} />
            </div>
          </div>

          {/* Center: slide info */}
          <span style={{ color: txtLight, fontSize: '4.5px', whiteSpace: 'nowrap' }}>3 / 12 · Course Objectives</span>

          {/* Right: Prev + Next */}
          <div className="flex items-center gap-1" style={glowStyle(hovered === 'prev-next', accent)}>
            <div className="flex items-center gap-px rounded px-1 py-0.5" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <ChevronLeft className="w-2 h-2" style={{ color: txtMid }} />
              <span style={{ color: txtMid, fontSize: '4.5px', fontWeight: 700 }}>Prev</span>
            </div>
            <div className="flex items-center gap-px rounded px-1.5 py-0.5" style={{ backgroundColor: accent }}>
              <span style={{ color: '#fff', fontSize: '4.5px', fontWeight: 700 }}>Next</span>
              <ChevronRight className="w-2 h-2 text-white" />
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
