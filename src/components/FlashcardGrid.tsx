import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardGridProps {
  cards: Flashcard[];
  theme?: string;
}

const FlashcardItem: React.FC<{ card: Flashcard; index: number; theme?: string }> = ({ card, index, theme }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const isDark = theme !== 'light';

  return (
    <motion.div
      key={index}
      className="relative w-full h-64 cursor-pointer [perspective:1000px] group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500 ease-in-out"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Front */}
        <div
          className={[
            'absolute w-full h-full rounded-2xl flex items-center justify-center p-6 text-center font-medium [backface-visibility:hidden] transition-all',
            isDark
              ? 'bg-slate-800 border border-slate-700 text-slate-100 group-hover:border-indigo-500/50 group-hover:shadow-lg group-hover:shadow-indigo-900/20'
              : 'bg-white border border-indigo-100 text-indigo-900 group-hover:border-indigo-300 group-hover:shadow-md',
          ].join(' ')}
        >
          {card.front}
        </div>

        {/* Back */}
        <div
          className={[
            'absolute w-full h-full rounded-2xl flex items-center justify-center p-6 text-center text-sm [backface-visibility:hidden] [transform:rotateY(180deg)]',
            isDark
              ? 'bg-indigo-900/50 border border-indigo-500/40 text-indigo-200'
              : 'bg-indigo-50 border border-indigo-200 text-indigo-800',
          ].join(' ')}
        >
          {card.back}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const FlashcardGrid: React.FC<FlashcardGridProps> = ({ cards, theme }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
      {cards.map((card, idx) => (
        <FlashcardItem key={idx} card={card} index={idx} theme={theme} />
      ))}
    </div>
  );
};
