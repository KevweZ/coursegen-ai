import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, GripVertical, CheckCircle2 } from 'lucide-react';

interface SortItem { id: string; content: string; }

interface CustomSortingActivityProps {
  items?: SortItem[];
  /** correct order as array of item ids */
  correctOrder?: string[];
  prompt?: string;
}

export const CustomSortingActivity: React.FC<CustomSortingActivityProps> = ({
  items = [],
  correctOrder = [],
  prompt,
}) => {
  const [order, setOrder] = useState<SortItem[]>([...items]);
  const [checked, setChecked] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  const handleCheck = () => setChecked(true);
  const handleReset = () => { setOrder([...items]); setChecked(false); };

  const isItemCorrect = (idx: number) => {
    if (!checked || correctOrder.length === 0) return null;
    return correctOrder[idx] === order[idx].id;
  };

  const allCorrect = checked && correctOrder.length > 0
    && order.every((item, idx) => correctOrder[idx] === item.id);

  return (
    <div className="w-full space-y-3">
      {prompt && <p className="text-sm text-slate-400 mb-1">{prompt}</p>}

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
                backgroundColor: isDragging ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
                borderColor: isOver
                  ? '#6366f1'
                  : status === true
                  ? '#22c55e'
                  : status === false
                  ? '#ef4444'
                  : 'rgba(255,255,255,0.15)',
                cursor: 'grab',
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />

              {/* Item text */}
              <span className="flex-1 text-sm font-semibold text-white">{item.content}</span>

              {/* Status icon */}
              {status === true  && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
              {status === false && <span className="text-red-400 text-sm font-bold shrink-0">✕</span>}

              {/* Up / Down arrow buttons */}
              {!checked && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveItem(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, idx + 1)}
                    disabled={idx === order.length - 1}
                    className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Hint text */}
      {!checked && (
        <p className="text-xs text-slate-500 italic">
          Drag items or use ↑ ↓ arrows to reorder
        </p>
      )}

      {/* Success message */}
      {allCorrect && (
        <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
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
          className="px-5 py-2 rounded-lg bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CustomSortingActivity;
