import React, { useState } from 'react';
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

const DEFAULT_COLORS = ['#fbbf24', '#f87171', '#38bdf8', '#c084fc', '#4ade80'];

export default function CarouselPanel({ cards = [], title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (!cards.length) return null;
  const activeCard = cards[activeIndex];

  const getPosition = (index: number) => {
    let diff = index - activeIndex;
    if (diff < -1) return -2;
    if (diff > 1) return 2;
    return diff;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none bg-slate-900 py-5 px-2 rounded-2xl border border-slate-800 shadow-xl">
      {title && (
        <div className="w-full px-6 text-left">
          <p className="text-white text-lg font-bold bg-slate-800 inline-block px-4 py-2 border border-slate-700 rounded-md">
            {title}
          </p>
        </div>
      )}

      {/* Stage — expanded card grows over the dots (higher z-index) */}
      <div
        className="relative w-full flex items-start justify-center pt-6 pb-2"
        style={{ minHeight: expanded ? 460 : 280 }}
      >
        {cards.map((card, i) => {
          const pos = getPosition(i);
          const isCenter = pos === 0;
          const cardColor = card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          if (pos < -1 || pos > 1) return null;

          return (
            <motion.div
              key={card.id}
              initial={false}
              animate={{
                opacity: 1,
                x: pos * 260,
                scale: isCenter ? 1 : 0.88,
                zIndex: isCenter ? (expanded ? 50 : 30) : 10,
                filter: isCenter ? 'brightness(1)' : 'brightness(0.65)',
              }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className={`absolute w-[min(440px,70%)] rounded-2xl shadow-2xl border border-white/20 flex flex-col ${
                isCenter ? 'cursor-default' : 'cursor-pointer'
              }`}
              style={{
                background: cardColor,
                minHeight: isCenter && expanded ? 320 : 180,
                boxShadow: isCenter && expanded ? '0 20px 50px rgba(0,0,0,0.45)' : undefined,
              }}
              onClick={() => {
                if (!isCenter) {
                  setActiveIndex(i);
                  setExpanded(false);
                }
              }}
            >
              <div className="p-6 flex-1 flex flex-col relative">
                {isCenter && expanded && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                    title="Close"
                    aria-label="Close expanded card"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="border border-white/50 px-4 py-2 w-max mb-4 inline-block shadow-sm">
                  <h3 className="text-white font-bold text-xl drop-shadow-md pr-6">{card.label}</h3>
                </div>

                {card.description && (
                  <div className="bg-white/10 border border-white/20 p-3 flex-1 mb-4">
                    <p className="text-white/90 text-sm">{card.description}</p>
                  </div>
                )}

                {isCenter && card.expandedContent && !expanded && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                    className="self-center bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs px-6 py-2 shadow-lg transition-colors"
                  >
                    MORE...
                  </button>
                )}

                <AnimatePresence>
                  {isCenter && expanded && card.expandedContent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mt-2 border-t border-white/30 pt-4 overflow-hidden"
                    >
                      <p className="text-white font-bold mb-2">Details:</p>
                      <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed pb-2">
                        {card.expandedContent}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/45 text-white text-xs font-bold transition-colors"
                      >
                        <X className="w-3 h-3" /> Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}

        {!expanded && (
          <div className="absolute inset-x-4 top-[90px] flex items-center justify-between pointer-events-none z-40">
            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={() => { setActiveIndex(activeIndex - 1); setExpanded(false); }}
                className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto hover:bg-black/80 transition-colors shadow-2xl backdrop-blur-md"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : <div />}
            {activeIndex < cards.length - 1 ? (
              <button
                type="button"
                onClick={() => { setActiveIndex(activeIndex + 1); setExpanded(false); }}
                className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto hover:bg-black/80 transition-colors shadow-2xl backdrop-blur-md"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            ) : <div />}
          </div>
        )}
      </div>

      {/* Dots sit below the stage; expanded center card paints above them via z-index */}
      <div
        className="flex items-center gap-5 relative"
        style={{ zIndex: expanded ? 5 : 20, opacity: expanded ? 0.35 : 1, pointerEvents: expanded ? 'none' : 'auto' }}
      >
        {cards.map((card, i) => {
          const isActive = i === activeIndex;
          const bg = card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <button
              key={card.id || i}
              type="button"
              onClick={() => { setActiveIndex(i); setExpanded(false); }}
              className={`w-9 h-9 rounded-full border-[3px] ${isActive ? 'border-white scale-110' : 'border-transparent'} shadow-xl transition-transform hover:scale-105`}
              style={{ background: isActive ? bg : '#1e293b' }}
              aria-label={`Go to ${card.label}`}
            />
          );
        })}
      </div>
    </div>
  );
}
