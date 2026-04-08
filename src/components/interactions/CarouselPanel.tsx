import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface CarouselCard {
  id: string;
  label: string;
  description?: string;
  color?: string;
  expandedContent?: string;
}

interface Props {
  cards: CarouselCard[];
  title?: string;
}

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e'];

export default function CarouselPanel({ cards = [], title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dir, setDir] = useState(0); // -1 left, 1 right

  if (!cards.length) return null;

  const total = cards.length;
  const goTo = (idx: number, d: number) => {
    setDir(d);
    setActiveIndex((idx + total) % total);
    setExpanded(false);
  };
  const prev = () => goTo(activeIndex - 1, -1);
  const next = () => goTo(activeIndex + 1, 1);

  const activeCard = cards[activeIndex];
  const cardColor = activeCard.color || DEFAULT_COLORS[activeIndex % DEFAULT_COLORS.length];

  // Slide variants — smooth x-slide with no overflow
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0, scale: 0.95 }),
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 select-none">
      {title && (
        <p className="text-slate-400 text-sm font-bold text-center uppercase tracking-widest">{title}</p>
      )}

      {/* ── Carousel Track — overflow-hidden keeps side cards invisible ── */}
      <div className="relative w-full flex justify-center" style={{ height: 220 }}>
        <div className="absolute inset-0 max-w-[500px] w-full mx-auto overflow-hidden rounded-2xl shadow-xl">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={activeCard.id}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
              className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl cursor-pointer"
              style={{ background: cardColor }}
              onClick={() => activeCard.expandedContent && setExpanded(!expanded)}
            >
              <div className="w-full h-full flex flex-col p-5">
                {/* Card header */}
                <div className="border border-white/30 rounded-xl px-3 py-1.5 mb-2 self-start">
                  <h3 className="text-white font-extrabold text-base">{activeCard.label}</h3>
                </div>
                {activeCard.description && (
                  <div className="border border-white/20 rounded-xl px-3 py-2 mb-3 flex-1 overflow-hidden">
                    <p className="text-white/80 text-xs leading-relaxed line-clamp-4">{activeCard.description}</p>
                  </div>
                )}
                {activeCard.expandedContent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                    className="self-center bg-white/20 hover:bg-white/30 border border-white/40 text-white font-bold text-xs px-4 py-1 rounded-lg transition-all"
                  >
                    MORE...
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Side arrow overlays */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white shadow-lg transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white shadow-lg transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Dot indicators ── */}
      <div className="flex items-center gap-2">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
            className="transition-all rounded-full flex-shrink-0 cursor-pointer hover:opacity-80"
            style={{
               width: i === activeIndex ? 36 : 14,
               height: 14,
              background: i === activeIndex
                ? (card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length])
                : '#475569',
            }}
          />
        ))}
      </div>

      {/* ── Expanded Content Panel ── */}
      <AnimatePresence>
        {expanded && activeCard.expandedContent && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.9, originY: 0 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
            transition={{ duration: 0.22 }}
            className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ background: cardColor }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/20">
              <div className="border border-white/30 rounded-xl px-3 py-1 inline-block">
                <h3 className="text-white font-extrabold text-sm">{activeCard.label}</h3>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-48 overflow-y-auto custom-scrollbar">
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{activeCard.expandedContent}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
