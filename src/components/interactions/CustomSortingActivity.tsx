import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, GripVertical, CheckCircle2 } from 'lucide-react';
import { markdownToHtml } from '../../lib/markdownInline';

function cn(...c: (string | false | undefined | null)[]) { return c.filter(Boolean).join(' '); }

interface SortItem { id: string; content: string; }

type SortTheme = 'light' | 'dark' | 'unified';

interface CustomSortingActivityProps {
  items?: SortItem[];
  /** correct order as array of item ids */
  correctOrder?: string[];
  prompt?: string;
  theme?: SortTheme;
  /** Fires when the learner clicks Check Answer */
  onChecked?: () => void;
}

function shuffleItems(items: SortItem[], correctOrder: string[]): SortItem[] {
  const list = [...items];
  if (list.length < 2) return list;
  // Prefer a shuffle that is not already in correct order
  for (let attempt = 0; attempt < 8; attempt++) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (!correctOrder.length) return list;
    const ids = list.map(x => x.id);
    const alreadyCorrect = correctOrder.every((id, idx) => ids[idx] === id);
    if (!alreadyCorrect) return list;
  }
  // Last resort: reverse if still correct
  if (correctOrder.length && correctOrder.every((id, idx) => list[idx]?.id === id)) {
    return list.reverse();
  }
  return list;
}

// Each draggable item always needs a clearly visible border — without one,
// nothing signals that the row is interactive, especially on a white slide.
const T: Record<SortTheme, {
  itemBg: string; itemBorder: string; text: string; handle: string; chevron: string;
  resetBg: string; resetHover: string; resetText: string;
}> = {
  light: {
    itemBg: '#ffffff', itemBorder: '#cbd5e1', text: '#0f172a',
    handle: '#94a3b8', chevron: '#475569',
    resetBg: '#e2e8f0', resetHover: '#cbd5e1', resetText: '#1e293b',
  },
  dark: {
    itemBg: 'rgba(255,255,255,0.06)', itemBorder: 'rgba(255,255,255,0.18)', text: '#ffffff',
    handle: '#94a3b8', chevron: '#cbd5e1',
    resetBg: '#334155', resetHover: '#475569', resetText: '#ffffff',
  },
  unified: {
    itemBg: 'rgba(167,139,250,0.08)', itemBorder: 'rgba(167,139,250,0.35)', text: '#e0e7ff',
    handle: '#a5b4fc', chevron: '#c4b5fd',
    resetBg: '#4c1d95', resetHover: '#5b21b6', resetText: '#ffffff',
  },
};

export const CustomSortingActivity: React.FC<CustomSortingActivityProps> = ({
  items = [],
  correctOrder = [],
  prompt,
  theme = 'light',
  onChecked,
}) => {
  const t = T[theme] ?? T.light;
  const initialOrder = useMemo(() => shuffleItems(items, correctOrder), [items, correctOrder]);
  const [order, setOrder] = useState<SortItem[]>(initialOrder);
  const [checked, setChecked] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    setOrder(shuffleItems(items, correctOrder));
    setChecked(false);
  }, [items, correctOrder]);

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setChecked(false);
  };

  // DnD handlers
  const handleDragStart = (idx: number, e: React.DragEvent) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    if (fromIdx !== toIdx) moveItem(fromIdx, toIdx);
    setDraggingIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDraggingIdx(null); setDragOverIdx(null); };

  const handleCheck = () => {
    setChecked(true);
    onChecked?.();
  };
  const handleReset = () => { setOrder(shuffleItems(items, correctOrder)); setChecked(false); };

  const isItemCorrect = (idx: number) => {
    if (!checked || correctOrder.length === 0) return null;
    return correctOrder[idx] === order[idx].id;
  };

  const allCorrect = checked && correctOrder.length > 0
    && order.every((item, idx) => correctOrder[idx] === item.id);

  return (
    <div className="w-full space-y-3">

      <div className="space-y-2">
        {order.map((item, idx) => {
          const status = isItemCorrect(idx);
          const isDragging = draggingIdx === idx;
          const isOver = dragOverIdx === idx && draggingIdx !== idx;

          return (
            <motion.div
              key={item.id}
              layout
              draggable
              onDragStart={(e) => handleDragStart(idx, e as any)}
              onDragOver={(e) => handleDragOver(idx, e as any)}
              onDrop={(e) => handleDrop(idx, e as any)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors select-none"
              style={{
                backgroundColor: t.itemBg,
                borderColor: isOver
                  ? '#6366f1'
                  : status === true
                  ? '#22c55e'
                  : status === false
                  ? '#ef4444'
                  : t.itemBorder,
                boxShadow: isOver ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'grab',
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              {/* Drag handle */}
              <GripVertical className="w-5 h-5 shrink-0" style={{ color: t.handle }} />

              {/* Item text */}
              <span className="flex-1 text-base font-bold leading-snug" style={{ color: t.text }} dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }} />

              {/* Status icon */}
              {status === true  && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
              {status === false && <span className="text-red-500 text-sm font-bold shrink-0">✕</span>}

              {/* Up / Down arrow buttons */}
              {!checked && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveItem(idx, idx - 1)}
                    disabled={idx === 0}
                    className={cn('p-0.5 rounded disabled:opacity-20 transition-colors', theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10')}
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" style={{ color: t.chevron }} />
                  </button>
                  <button
                    onClick={() => moveItem(idx, idx + 1)}
                    disabled={idx === order.length - 1}
                    className={cn('p-0.5 rounded disabled:opacity-20 transition-colors', theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10')}
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: t.chevron }} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>



      {/* Success message */}
      {allCorrect && (
        <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
          <CheckCircle2 className="w-5 h-5" /> Correct order!
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        {correctOrder.length > 0 && !checked && (
          <button
            onClick={handleCheck}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
          >
            Check Answer
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
          style={{ backgroundColor: t.resetBg, color: t.resetText }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = t.resetHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = t.resetBg; }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CustomSortingActivity;
