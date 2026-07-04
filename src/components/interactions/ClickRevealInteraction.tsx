import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { markdownToHtml } from '../../lib/markdownInline';

export interface RevealItem {
  id: string;
  term: string;
  definition: string;
}

interface ClickRevealProps {
  items?: RevealItem[];
  title?: string;
}

const CARD_COLORS = [
  { border: '#6366f1', bg: 'rgba(99,102,241,0.12)', glow: 'rgba(99,102,241,0.3)' },
  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.3)' },
  { border: '#06b6d4', bg: 'rgba(6,182,212,0.12)', glow: 'rgba(6,182,212,0.3)' },
  { border: '#10b981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.3)' },
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.3)' },
  { border: '#ec4899', bg: 'rgba(236,72,153,0.12)', glow: 'rgba(236,72,153,0.3)' },
];

const ClickRevealInteraction: React.FC<ClickRevealProps> = ({ items = [] }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  if (!items.length) return null;

  const handleToggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) setRevealedIds(prev => new Set([...prev, id]));
  };

  return (
    <div className="w-full space-y-2.5">
      {items.map((item, idx) => {
        const color = CARD_COLORS[idx % CARD_COLORS.length];
        const isOpen = openId === item.id;
        const hasBeenRevealed = revealedIds.has(item.id);

        return (
          <motion.div
            key={item.id}
            layout
            initial={false}
            className="rounded-xl overflow-hidden"
            style={{
              border: `1.5px solid ${isOpen ? color.border : 'rgba(255,255,255,0.12)'}`,
              background: isOpen ? color.bg : 'rgba(255,255,255,0.03)',
              boxShadow: isOpen ? `0 0 20px ${color.glow}` : 'none',
              transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
            }}
          >
            {/* Term row — always visible, clickable */}
            <button
              onClick={() => handleToggle(item.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              {/* Color dot */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-200"
                style={{
                  backgroundColor: isOpen ? color.border : 'rgba(255,255,255,0.25)',
                  boxShadow: isOpen ? `0 0 8px ${color.border}` : 'none',
                }}
              />

              {/* Term text */}
              <span
                className="flex-1 font-bold text-base leading-snug"
                style={{ color: isOpen ? '#fff' : 'rgba(255,255,255,0.8)' }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(item.term) }}
              />

              {/* Status chip */}
              <span
                className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-200"
                style={{
                  background: hasBeenRevealed
                    ? isOpen ? color.border : 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.06)',
                  color: hasBeenRevealed
                    ? isOpen ? '#fff' : 'rgba(255,255,255,0.5)'
                    : 'rgba(255,255,255,0.35)',
                }}
              >
                {isOpen ? 'Hide' : hasBeenRevealed ? 'Revealed ✓' : 'Click to reveal'}
              </span>

              {/* Chevron */}
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 text-slate-400 text-sm"
              >
                ▾
              </motion.span>
            </button>

            {/* Definition — revealed on click */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="def"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="px-5 pb-5 pt-1 text-sm leading-relaxed"
                    style={{
                      color: 'rgba(226,232,240,0.95)',
                      borderTop: `1px solid ${color.border}44`,
                    }}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(item.definition) }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Progress indicator */}
      {items.length > 1 && (
        <p className="text-xs text-slate-500 text-right pt-1">
          {revealedIds.size}/{items.length} revealed
        </p>
      )}
    </div>
  );
};

export default ClickRevealInteraction;
