/**
 * HorizontalTimeline — left-to-right timeline interaction for 'timeline' slides.
 *
 * Design:
 *   ○──────○──────○──────○   ← gradient spine with animated draw-in
 *   1      2      3      4   ← numbered nodes (spring pop-in, staggered)
 *  Title  Title  Title Title ← labels below each node
 *
 * Clicking a node expands an animated detail panel below the whole track.
 * Active node gets a glow ring + scale-up. Visited nodes fill with accent color.
 * Progress bar tracks exploration.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';

export interface HorizontalTimelineEvent {
  id: string;
  year?: string;
  title: string;
  content: string;
  icon?: string;
}

interface Props {
  events?: HorizontalTimelineEvent[];
  theme?: 'light' | 'dark' | 'unified';
  accentColor?: string;
}

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

export const HorizontalTimeline: React.FC<Props> = ({
  events = [],
  theme = 'dark',
  accentColor = '#4f46e5',
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visited, setVisited]   = useState<Set<string>>(new Set());
  const [spineW, setSpineW]     = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const colorB   = '#06b6d4';

  const isLight   = theme === 'light';
  const textMain  = isLight ? '#0f172a' : '#f1f5f9';
  const textSub   = isLight ? '#475569' : '#94a3b8';
  const cardBg    = isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,23,42,0.75)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const spineBg   = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  const stepColors = events.map((_, i) => {
    const t = events.length > 1 ? i / (events.length - 1) : 0;
    return lerp(accentColor, colorB, t);
  });

  // Animate spine width on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setSpineW(100));
    return () => cancelAnimationFrame(id);
  }, []);

  const select = (id: string) => {
    const next = activeId === id ? null : id;
    setActiveId(next);
    if (next) setVisited(v => new Set([...v, next]));
  };

  const activeEvent = events.find(e => e.id === activeId);
  const activeIdx   = events.findIndex(e => e.id === activeId);
  const progress    = events.length > 0 ? (visited.size / events.length) * 100 : 0;

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm italic">
        No timeline events provided.
      </div>
    );
  }

  return (
    <div className="w-full select-none space-y-4" style={{ color: textMain }}>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: spineBg }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(to right, ${accentColor}, ${colorB})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: accentColor }}>
          {visited.size}/{events.length} explored
        </span>
      </div>

      {/* ── Track ── */}
      <div className="relative overflow-x-auto pb-2">
        <div
          ref={trackRef}
          className="relative flex items-start pt-2"
          style={{ minWidth: `${events.length * 120}px` }}
        >
          {/* Horizontal spine — sits at the node center-line (top-[30px] accounting for pt-2) */}
          <div
            className="absolute left-0 right-0 h-0.5 rounded-full overflow-hidden"
            style={{ top: '30px', background: spineBg }}
          >
            <motion.div
              className="h-full rounded-full origin-left"
              style={{ background: `linear-gradient(to right, ${accentColor}, ${colorB})`, opacity: 0.55 }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {/* Nodes */}
          {events.map((ev, i) => {
            const isActive   = activeId === ev.id;
            const wasVisited = visited.has(ev.id);
            const color      = stepColors[i];

            return (
              <motion.div
                key={ev.id}
                className="flex flex-col items-center flex-1 cursor-pointer group"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 + 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => select(ev.id)}
              >
                {/* Node circle */}
                <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
                  {/* Glow ring */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1.4 }}
                        exit={{ opacity: 0, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{ background: color, filter: 'blur(10px)', opacity: 0.45 }}
                      />
                    )}
                  </AnimatePresence>
                  <motion.div
                    className="absolute inset-0 rounded-full flex items-center justify-center font-black text-white z-10"
                    style={{
                      fontSize: '0.75rem',
                      background: wasVisited ? color : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
                      border: `2.5px solid ${wasVisited ? color : isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)'}`,
                      color: wasVisited ? 'white' : textSub,
                    }}
                    animate={{ scale: isActive ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    {wasVisited && !isActive
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : i + 1
                    }
                  </motion.div>
                </div>

                {/* Year label (if present) */}
                {ev.year && (
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mt-1 truncate max-w-[90px] text-center"
                    style={{ color: wasVisited ? color : textSub }}
                  >
                    {ev.year}
                  </p>
                )}

                {/* Title */}
                <p
                  className="text-[11px] font-semibold leading-tight mt-1 text-center px-1 line-clamp-2"
                  style={{ color: isActive ? color : textMain, maxWidth: '100px' }}
                >
                  {ev.title}
                </p>

                {/* Active indicator dot at bottom */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full mt-1"
                      style={{ background: color }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Detail panel ── expands below the track when a node is active */}
      <AnimatePresence mode="wait">
        {activeEvent && (
          <motion.div
            key={activeEvent.id}
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="rounded-2xl p-5 relative"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderTop: `3px solid ${stepColors[activeIdx]}`,
                backdropFilter: 'blur(12px)',
                boxShadow: `0 8px 32px ${stepColors[activeIdx]}20`,
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setActiveId(null)}
                className="absolute top-3 right-3 p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                style={{ color: textSub }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="mb-3 pr-8">
                {activeEvent.year && (
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: stepColors[activeIdx] }}>
                    {activeEvent.year}
                  </p>
                )}
                <h3 className="text-base font-extrabold leading-snug" style={{ color: textMain }}>
                  {activeEvent.title}
                </h3>
              </div>

              {/* Content */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: textSub }}
                dangerouslySetInnerHTML={{ __html: activeEvent.content }}
              />

              {/* Step counter */}
              <p className="text-[10px] font-bold mt-3 tabular-nums" style={{ color: stepColors[activeIdx] }}>
                Step {activeIdx + 1} of {events.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion badge */}
      <AnimatePresence>
        {visited.size === events.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44` }}
          >
            <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-xs font-bold" style={{ color: accentColor }}>
              All milestones explored
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HorizontalTimeline;
