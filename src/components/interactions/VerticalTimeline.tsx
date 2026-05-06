/**
 * VerticalTimeline — replaces ChevronTimeline, restoring the vertical spine design
 * that matches the original InteractiveTimeline from @zomako/elearning-components.
 *
 * Enhancements over the original:
 * - Animated spine line draws in on mount
 * - Step nodes pop in sequentially with spring physics
 * - Clicking a step: content panel expands with slide + fade, circle pulses with glow ring
 * - Active step header highlights with accent color
 * - Progress indicator fills as learner explores steps
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

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
  accentColor?: string;
}

// Hex → RGB helper for color interpolation
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerp(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `#${[Math.round(ar+(br-ar)*t), Math.round(ag+(bg-ag)*t), Math.round(ab+(bb-ab)*t)].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}

export const VerticalTimeline: React.FC<Props> = ({
  events = [],
  theme = 'dark',
  accentColor = '#4f46e5',
}) => {
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [visited,  setVisited]    = useState<Set<string>>(new Set());
  const [lineH,    setLineH]      = useState(0);
  const spineRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const colorB  = '#06b6d4'; // end color for gradient

  const stepColors = events.map((_, i) => {
    const t = events.length > 1 ? i / (events.length - 1) : 0;
    return lerp(accentColor, colorB, t);
  });

  // Animate spine height on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setLineH(100));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggle = (id: string) => {
    const next = activeId === id ? null : id;
    setActiveId(next);
    if (next) setVisited(v => new Set([...v, next]));
  };

  const progress = events.length > 0 ? (visited.size / events.length) * 100 : 0;

  // Theme tokens
  const textMain   = isLight ? '#0f172a' : '#f1f5f9';
  const textSub    = isLight ? '#475569' : '#94a3b8';
  const cardBg     = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.7)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.08)';
  const spineColor = isLight ? 'rgba(0,0,0,0.1)'         : 'rgba(255,255,255,0.1)';

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm italic">
        No timeline events provided.
      </div>
    );
  }

  return (
    <div className="w-full select-none" style={{ color: textMain }}>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: spineColor }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(to right, ${accentColor}, ${colorB})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>
          {visited.size}/{events.length} explored
        </span>
      </div>

      {/* Spine + events */}
      <div className="relative" ref={spineRef}>

        {/* Vertical spine */}
        <div
          className="absolute left-[22px] top-4 bottom-4 w-0.5 rounded-full"
          style={{ background: spineColor, overflow: 'hidden' }}
        >
          <motion.div
            className="w-full rounded-full origin-top"
            style={{
              height: '100%',
              background: `linear-gradient(to bottom, ${accentColor}, ${colorB})`,
              opacity: 0.5,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* Events */}
        <div className="flex flex-col gap-1">
          {events.map((ev, i) => {
            const isActive  = activeId === ev.id;
            const wasVisited = visited.has(ev.id);
            const color = stepColors[i];

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.09 + 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Row: circle + header */}
                <button
                  onClick={() => toggle(ev.id)}
                  className="w-full flex items-center gap-4 text-left rounded-xl px-2 py-2 group transition-colors"
                  style={{
                    background: isActive ? `${color}12` : 'transparent',
                  }}
                >
                  {/* Node circle */}
                  <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
                    {/* Glow ring — only when active */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1.35 }}
                          exit={{ opacity: 0, scale: 1 }}
                          transition={{ duration: 0.35 }}
                          style={{ background: color, filter: 'blur(10px)', opacity: 0.45 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Main circle */}
                    <motion.div
                      className="absolute inset-0 rounded-full flex items-center justify-center font-black text-white"
                      style={{
                        fontSize: '0.8rem',
                        background: wasVisited ? color : isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
                        border: `2.5px solid ${wasVisited ? color : isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                        color: wasVisited ? 'white' : textSub,
                        zIndex: 2,
                      }}
                      animate={{ scale: isActive ? 1.12 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    >
                      {i + 1}
                    </motion.div>
                  </div>

                  {/* Year + title */}
                  <div className="flex-1 min-w-0">
                    {ev.year && (
                      <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                        style={{ color: wasVisited ? color : textSub }}>
                        {ev.year}
                      </p>
                    )}
                    <p className="text-sm font-bold leading-snug truncate"
                      style={{ color: isActive ? color : textMain }}>
                      {ev.title}
                    </p>
                  </div>

                  {/* Expand icon */}
                  <motion.div
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ color: isActive ? color : textSub }}
                  >
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  </motion.div>
                </button>

                {/* Expandable content panel */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden', paddingLeft: '60px' }}
                    >
                      <motion.div
                        initial={{ y: -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -4, opacity: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="rounded-xl px-4 py-3.5 mb-2 mt-1"
                        style={{
                          background: cardBg,
                          border: `1px solid ${cardBorder}`,
                          borderLeft: `3px solid ${color}`,
                          backdropFilter: 'blur(8px)',
                          boxShadow: `0 4px 24px ${color}18`,
                        }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: textSub }}>
                          {ev.content}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Completion nudge */}
      <AnimatePresence>
        {visited.size === events.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mt-4 rounded-xl px-4 py-2.5"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44` }}
          >
            <span style={{ color: accentColor }} className="text-xs font-bold">
              ✓ All steps explored
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerticalTimeline;
