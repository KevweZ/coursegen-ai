import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
const DARK_COLORS = ['#b45309', '#991b1b', '#0369a1', '#6b21a8', '#166534'];

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
    <div className="w-full flex flex-col items-center gap-4 select-none bg-slate-900 py-6 rounded-2xl border border-slate-800 shadow-xl">
      {title && (
        <div className="w-full px-8 text-left">
          <p className="text-white text-lg font-bold bg-slate-800 inline-block px-4 py-2 border border-slate-700 rounded-md">
            {title}
          </p>
        </div>
      )}

      {/* Main card stage — height grows when expanded to prevent nav-dot overlap */}
      <div
        className="relative w-full flex items-start justify-center pt-8 transition-all duration-500"
        style={{ minHeight: expanded ? 420 : 300 }}
      >
        <AnimatePresence>
          {cards.map((card, i) => {
            const pos = getPosition(i);
            const isCenter = pos === 0;
            const cardColor = card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            if (pos < -1 || pos > 1) return null;

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, x: pos * 300, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  x: pos * 240, 
                  scale: isCenter ? 1 : 0.85,
                  zIndex: isCenter ? 30 : 10,
                  filter: isCenter ? 'brightness(1)' : 'brightness(0.6)'
                }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`absolute w-[400px] rounded-2xl shadow-2xl border border-white/20 flex flex-col ${isCenter ? 'cursor-default' : 'cursor-pointer'} ${isCenter && expanded ? '' : 'overflow-hidden'}`}
                style={{ background: cardColor, minHeight: 180 }}
                onClick={() => {
                  if (!isCenter) {
                    setActiveIndex(i);
                    setExpanded(false);
                  }
                }}
              >
                <motion.div layout="position" className="p-6 flex-1 flex flex-col">
                  {/* Inner bordered label */}
                  <div className="border border-white/50 px-4 py-2 w-max mb-4 inline-block shadow-sm" style={{ borderColor: 'rgba(255,255,255,0.6)' }}>
                    <h3 className="text-white font-bold text-xl drop-shadow-md">{card.label}</h3>
                  </div>
                  
                  {card.description && (
                     <div className="bg-white/10 border border-white/20 p-3 flex-1 mb-4">
                       <p className="text-white/90 text-sm">{card.description}</p>
                     </div>
                  )}

                  {isCenter && card.expandedContent && !expanded && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                      className="self-center bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs px-6 py-2 shadow-lg transition-colors"
                    >
                      MORE...
                    </motion.button>
                  )}

                  {/* Expanded chunk */}
                  <AnimatePresence>
                     {isCenter && expanded && card.expandedContent && (
                       <motion.div
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         exit={{ opacity: 0, height: 0 }}
                         className="mt-2 border-t border-white/30 pt-4 overflow-hidden"
                       >
                         <p className="text-white font-bold mb-2">Details:</p>
                         <p className="text-white/80 text-sm whitespace-pre-wrap">{card.expandedContent}</p>
                         <button onClick={() => setExpanded(false)} className="mt-4 text-white text-xs underline font-bold opacity-80 hover:opacity-100">Collapse ↑</button>
                       </motion.div>
                     )}
                  </AnimatePresence>

                </motion.div>
                
                {/* Visual generic diagram icon in corner */}
                <div className="absolute -bottom-6 -right-6 opacity-30 text-white transform -rotate-12 pointer-events-none">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Outer navigation arrows */}
        <div className="absolute inset-x-4 top-[90px] flex items-center justify-between pointer-events-none z-40">
           {activeIndex > 0 ? (
             <button onClick={() => { setActiveIndex(activeIndex - 1); setExpanded(false); }} className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto hover:bg-black/80 transition-colors shadow-2xl backdrop-blur-md">
               <ChevronLeft className="w-6 h-6" />
             </button>
           ) : <div/>}
           {activeIndex < cards.length - 1 ? (
             <button onClick={() => { setActiveIndex(activeIndex + 1); setExpanded(false); }} className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center text-white pointer-events-auto hover:bg-black/80 transition-colors shadow-2xl backdrop-blur-md">
               <ChevronRight className="w-6 h-6" />
             </button>
           ) : <div/>}
        </div>

      </div>

      {/* Navigation Circles — always below the stage, never overlapping */}
      <div className="flex items-center gap-6 z-50 relative">
        {cards.map((card, i) => {
          const isActive = i === activeIndex;
          const bg = card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setExpanded(false); }}
              className={`w-10 h-10 rounded-full border-[3px] ${isActive ? 'border-white scale-125' : 'border-transparent'} shadow-xl transition-all hover:scale-110`}
              style={{ background: isActive ? bg : '#1e293b' }}
            />
          );
        })}
      </div>
      
    </div>
  );
}

