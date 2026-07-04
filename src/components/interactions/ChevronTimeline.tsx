/**
 * ChevronTimeline — Diagonal ascending chevron-path timeline.
 *
 * Inspired by "5-Step Project Timeline" design:
 * - Overlapping parallelogram arrows form a diagonal road (bottom-left → top-right)
 * - Each step has a pin circle on the arrow, a vertical connector line, and a content card
 * - Steps glow on hover; clicking a step locks its detail card open
 * - Colors interpolate from deep indigo → cyan across steps
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { markdownToHtml } from '../../lib/markdownInline';
import {
  Flag, CheckCircle2, Star, Zap, Clock, Target,
  ArrowRight, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  year?: string;
  title: string;
  content: string;
  icon?: string;
}

interface Props {
  events?: TimelineEvent[];
  theme?: 'light' | 'dark' | 'unified';
  accentColor?: string; // module accent (optional, falls back to indigo)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Hex → [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Interpolate between two hex colors at ratio t (0–1) */
function lerp(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bv].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

const STEP_ICONS = [Flag, Star, Zap, Target, CheckCircle2, Clock, ArrowRight];

// ── Component ─────────────────────────────────────────────────────────────────
export const ChevronTimeline: React.FC<Props> = ({
  events = [],
  theme = 'dark',
  accentColor = '#4f46e5',
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isLight    = theme === 'light';
  const isUnified  = theme === 'unified';
  const isDark     = !isLight;

  // Color stop palette: accent → teal
  const colorTo = '#06b6d4'; // cyan-500
  const steps = useMemo(() => events.map((ev, i) => {
    const t = events.length > 1 ? i / (events.length - 1) : 0;
    const color = lerp(accentColor, colorTo, t);
    return { ...ev, color, idx: i };
  }), [events, accentColor]);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm italic">
        No timeline events provided.
      </div>
    );
  }

  // ── Layout constants ────────────────────────────────────────────────────────
  const n          = steps.length;
  const CHEV_H     = 52;                   // chevron height px
  const STEP_DX    = 100 / Math.max(n, 2); // horizontal spacing % per step
  const STEP_DY    = n > 1 ? Math.min(44, 180 / (n - 1)) : 0; // vertical rise px per step
  const CHEV_W     = `${STEP_DX + 4}%`;   // chevron width (overlaps next by ~4%)
  const TOTAL_H    = 340;                  // container height px
  const FIRST_TOP  = TOTAL_H - CHEV_H - 30; // bottom-most position
  const CONTENT_H  = 110;                  // max content card height

  const textBase   = isLight ? 'text-slate-800' : 'text-white';
  const subText    = isLight ? 'text-slate-500' : 'text-slate-400';
  const cardBg     = isLight ? 'bg-white/90 border border-slate-200 shadow-md'
                             : isUnified ? 'bg-indigo-900/70 border border-indigo-500/30 shadow-xl'
                             : 'bg-slate-800/90 border border-slate-600/30 shadow-xl';

  return (
    <div
      className="w-full select-none overflow-hidden"
      style={{ position: 'relative', height: TOTAL_H + 'px' }}
    >
      {steps.map((step, i) => {
        const isActive  = activeIdx === i;
        const isHovered = hoveredIdx === i;
        const highlight = isActive || isHovered;

        // Position of the chevron
        const leftPct  = i * (100 / n) + '%';
        const topPx    = FIRST_TOP - i * STEP_DY;
        const contentTopPx = topPx - CONTENT_H - 24; // content card above pin

        const StepIcon = STEP_ICONS[i % STEP_ICONS.length];

        return (
          <React.Fragment key={step.id}>
            {/* ── Content card (above the chevron pin) ───────────────────── */}
            <div
              className="absolute flex flex-col items-start"
              style={{
                left: leftPct,
                top: Math.max(0, contentTopPx) + 'px',
                width: CHEV_W,
                zIndex: isActive ? 30 : 20,
              }}
            >
              {/* Icon badge */}
              <motion.div
                className="flex items-center gap-2 mb-1.5"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 + 0.1, duration: 0.35 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                  style={{ backgroundColor: step.color }}
                >
                  <StepIcon className="w-3.5 h-3.5 text-white" />
                </div>
                {step.year && (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: step.color }}
                  >
                    {step.year}
                  </span>
                )}
              </motion.div>

              {/* Title */}
              <motion.p
                className={`font-bold text-sm leading-tight mb-1 ${textBase}`}
                style={{ color: highlight ? step.color : undefined }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.3 }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(step.title) }}
              />

              {/* Description — always visible but capped */}
              <motion.p
                className={`text-[11px] leading-relaxed ${subText} line-clamp-3`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 + 0.3, duration: 0.3 }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(step.content) }}
              />
            </div>

            {/* ── Vertical connector line ─────────────────────────────────── */}
            <div
              className="absolute"
              style={{
                left: `calc(${leftPct} + 10%)`,
                top: (topPx - 24) + 'px',
                width: '2px',
                height: '24px',
                backgroundColor: step.color,
                opacity: 0.7,
                zIndex: 15,
              }}
            />

            {/* ── Pin circle on chevron ───────────────────────────────────── */}
            <motion.div
              className="absolute rounded-full border-2 bg-white"
              style={{
                left: `calc(${leftPct} + 9%)`,
                top: topPx + CHEV_H / 2 - 8 + 'px',
                width: '16px',
                height: '16px',
                borderColor: step.color,
                zIndex: 25,
                boxShadow: highlight ? `0 0 0 4px ${step.color}40` : 'none',
              }}
              animate={{ scale: highlight ? 1.3 : 1 }}
              transition={{ duration: 0.2 }}
            />

            {/* ── Chevron / parallelogram arrow ───────────────────────────── */}
            <motion.div
              className="absolute cursor-pointer transition-all"
              style={{
                left: leftPct,
                top: topPx + 'px',
                width: CHEV_W,
                height: CHEV_H + 'px',
                /*
                 * Chevron shape: left edge is notched (the "tail"),
                 * right edge is pointed (the "head").
                 * polygon(left-notch % 0, right-tip % 0, 100% 50%, right-tip % 100%, left-notch % 100%, 0 50%)
                 * For leftmost step (i=0): no notch on left (flat start)
                 */
                clipPath: i === 0
                  ? 'polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)'
                  : 'polygon(18px 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)',
                backgroundColor: step.color,
                opacity: highlight ? 1 : 0.82,
                zIndex: 10 + i,
                filter: highlight ? `brightness(1.15) drop-shadow(0 4px 12px ${step.color}60)` : 'brightness(1)',
              }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setActiveIdx(isActive ? null : i)}
              onHoverStart={() => setHoveredIdx(i)}
              onHoverEnd={() => setHoveredIdx(null)}
              whileHover={{ filter: `brightness(1.18) drop-shadow(0 4px 16px ${step.color}70)` }}
            >
              {/* Step number watermark inside chevron */}
              <div
                className="absolute inset-0 flex items-center px-4"
                style={{ pointerEvents: 'none' }}
              >
                <span
                  className="font-black text-white/20 select-none"
                  style={{ fontSize: '2.2rem', lineHeight: 1 }}
                >
                  {i + 1}
                </span>
              </div>
            </motion.div>
          </React.Fragment>
        );
      })}

      {/* ── Mobile fallback: small legend at bottom ─────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 pointer-events-none"
        style={{ paddingBottom: '4px' }}
      >
        {steps.map((s, i) => (
          <div
            key={s.id}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: s.color, opacity: 0.6 }}
          />
        ))}
      </div>
    </div>
  );
};

export default ChevronTimeline;
