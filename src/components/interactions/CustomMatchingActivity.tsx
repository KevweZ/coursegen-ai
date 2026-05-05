import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

interface MatchItem { id: string; content: string; }
interface MatchTarget { id: string; content: string; }

interface CustomMatchingActivityProps {
  items: MatchItem[];
  targets: MatchTarget[];
  /** Mapping of item.id → target.id for correct answers */
  correctAnswers?: Record<string, string>;
}

/**
 * Custom Matching drag-and-drop. Uses HTML5 native DnD with explicit
 * preventDefault on dragover so drops register correctly.
 */
export const CustomMatchingActivity: React.FC<CustomMatchingActivityProps> = ({
  items = [],
  targets = [],
  correctAnswers = {},
}) => {
  // userMatches: targetId → itemId
  const [userMatches, setUserMatches] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);

  // Items already placed (matched to a target)
  const placedItemIds = new Set(Object.values(userMatches));

  const handleDragStart = (itemId: string, e: React.DragEvent) => {
    dragItemRef.current = itemId;
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();                     // REQUIRED for drop to fire
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || dragItemRef.current;
    if (!itemId) return;

    setUserMatches(prev => {
      const next = { ...prev };
      // Remove item from any previous target
      for (const tid of Object.keys(next)) {
        if (next[tid] === itemId) delete next[tid];
      }
      next[targetId] = itemId;
      return next;
    });
    setDraggingId(null);
  };

  const handleUnmatch = (targetId: string) => {
    setUserMatches(prev => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setChecked(false);
  };

  const handleCheck = () => setChecked(true);
  const handleReset = () => { setUserMatches({}); setChecked(false); };

  const allMatched = targets.length > 0 && Object.keys(userMatches).length === targets.length;
  const hasCorrectAnswers = Object.keys(correctAnswers).length > 0;

  const isCorrect = (targetId: string) => {
    if (!hasCorrectAnswers) return null;
    const placed = userMatches[targetId];
    return placed ? correctAnswers[placed] === targetId : null;
  };

  const getItemContent = (itemId: string) => items.find(i => i.id === itemId)?.content ?? itemId;

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4">
        {/* ── Draggable items column ──────────────────────── */}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-bold uppercase tracking-widest opacity-60 mb-3">ITEMS</p>
          {items.map(item => {
            const placed = placedItemIds.has(item.id);
            const isDragging = draggingId === item.id;
            return (
              <motion.div
                key={item.id}
                draggable={!placed && !checked}
                onDragStart={(e) => handleDragStart(item.id, e as any)}
                onDragEnd={handleDragEnd}
                className="px-5 py-4 rounded-lg font-semibold text-base cursor-grab select-none transition-all"
                style={{
                  backgroundColor: placed ? 'transparent' : '#3b4a6b',
                  border: placed ? '2px dashed rgba(255,255,255,0.2)' : '2px solid transparent',
                  color: placed ? 'rgba(255,255,255,0.3)' : 'white',
                  opacity: isDragging ? 0.5 : 1,
                  cursor: placed ? 'default' : 'grab',
                }}
                whileHover={!placed && !checked ? { scale: 1.02 } : {}}
              >
                {placed ? '(placed)' : item.content}
              </motion.div>
            );
          })}
        </div>

        {/* ── Drop targets column ──────────────────────────── */}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-bold uppercase tracking-widest opacity-60 mb-3">MATCHES</p>
          {targets.map(target => {
            const matchedItemId = userMatches[target.id];
            const status = checked ? isCorrect(target.id) : null;

            return (
              <div
                key={target.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(target.id, e)}
                className="rounded-lg border-2 transition-colors min-h-[72px]"
                style={{
                  borderColor: matchedItemId
                    ? (status === true ? '#22c55e' : status === false ? '#ef4444' : 'rgba(255,255,255,0.35)')
                    : 'rgba(255,255,255,0.2)',
                  backgroundColor: matchedItemId ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  {/* Target label */}
                  <div className="flex-1 text-sm text-slate-200 leading-snug">{target.content}</div>

                  {/* Matched item pill */}
                  {matchedItemId && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-white bg-indigo-600 px-3 py-1.5 rounded">
                        {getItemContent(matchedItemId)}
                      </span>
                      {!checked && (
                        <button
                          onClick={() => handleUnmatch(target.id)}
                          className="text-slate-400 hover:text-white transition-colors text-xs"
                        >
                          ✕
                        </button>
                      )}
                      {status === true  && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                      {status === false && <XCircle    className="w-4 h-4 text-red-400 shrink-0"   />}
                    </div>
                  )}

                  {/* Drop hint */}
                  {!matchedItemId && (
                    <span className="text-sm text-slate-400 italic">Drop here</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Score summary ─────────────────────────────────── */}
      {checked && hasCorrectAnswers && (() => {
        const total   = targets.length;
        const correct = targets.filter(t => isCorrect(t.id) === true).length;
        const allOk   = correct === total;
        return (
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold ${allOk ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {allOk ? '🎉' : '📝'} {correct} / {total} correct
            {!allOk && <span className="font-normal opacity-70">— review the incorrect items and try again</span>}
          </div>
        );
      })()}

      {/* ── Action buttons ───────────────────────────────── */}
      <div className="flex gap-3">
        {allMatched && !checked && (
          <button
            onClick={handleCheck}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
          >
            Submit Answers
          </button>
        )}
        {checked && (
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-lg bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors"
          >
            Try Again
          </button>
        )}
        {!checked && (
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-lg bg-slate-700/50 text-slate-400 font-semibold text-sm hover:bg-slate-600 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
      </div>

    </div>
  );
};

export default CustomMatchingActivity;
