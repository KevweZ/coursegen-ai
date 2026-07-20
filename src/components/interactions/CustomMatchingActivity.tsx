import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { markdownToHtml } from '../../lib/markdownInline';

interface MatchItem   { id: string; content: string; }
interface MatchTarget { id: string; content: string; }

type MatchTheme = 'light' | 'dark' | 'unified';

interface CustomMatchingActivityProps {
  items: MatchItem[];
  targets: MatchTarget[];
  correctAnswers?: Record<string, string>;
  theme?: MatchTheme;
}

// Unplaced item text, drop-zone borders, and placeholder copy all need enough
// contrast to read clearly against a white slide background.
const T: Record<MatchTheme, {
  itemText: string; targetText: string; placeholderIdle: string; placeholderHover: string;
  targetBorderIdle: string; targetBorderHover: string; targetBgIdle: string; targetBgHover: string;
  unmatchIdle: string; unmatchHover: string;
  resetBorder: string; resetText: string; resetHoverBorder: string; resetHoverText: string;
}> = {
  light: {
    itemText: '#0f172a', targetText: '#1e293b',
    placeholderIdle: '#64748b', placeholderHover: '#4f46e5',
    targetBorderIdle: '#cbd5e1', targetBorderHover: '#818cf8',
    targetBgIdle: '#f8fafc', targetBgHover: 'rgba(79,70,229,0.06)',
    unmatchIdle: '#94a3b8', unmatchHover: '#dc2626',
    resetBorder: '#cbd5e1', resetText: '#334155', resetHoverBorder: '#94a3b8', resetHoverText: '#0f172a',
  },
  dark: {
    itemText: '#ffffff', targetText: '#e2e8f0',
    placeholderIdle: '#94a3b8', placeholderHover: '#c7d2fe',
    targetBorderIdle: 'rgba(255,255,255,0.30)', targetBorderHover: 'rgba(255,255,255,0.65)',
    targetBgIdle: 'rgba(255,255,255,0.035)', targetBgHover: 'rgba(255,255,255,0.10)',
    unmatchIdle: '#94a3b8', unmatchHover: '#ffffff',
    resetBorder: '#475569', resetText: '#cbd5e1', resetHoverBorder: '#64748b', resetHoverText: '#ffffff',
  },
  unified: {
    itemText: '#e0e7ff', targetText: '#e0e7ff',
    placeholderIdle: '#a5b4fc', placeholderHover: '#e0e7ff',
    targetBorderIdle: 'rgba(167,139,250,0.35)', targetBorderHover: 'rgba(167,139,250,0.7)',
    targetBgIdle: 'rgba(167,139,250,0.05)', targetBgHover: 'rgba(167,139,250,0.12)',
    unmatchIdle: '#a5b4fc', unmatchHover: '#ffffff',
    resetBorder: '#6d28d9', resetText: '#c4b5fd', resetHoverBorder: '#7c3aed', resetHoverText: '#ffffff',
  },
};

/** Distinct accent palette — each item gets its own color */
const ITEM_COLORS = [
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#16a34a', // green
  '#d97706', // amber
  '#9333ea', // purple
  '#e11d48', // rose
  '#0d9488', // teal
  '#ea580c', // orange
];

export const CustomMatchingActivity: React.FC<CustomMatchingActivityProps> = ({
  items = [],
  targets = [],
  correctAnswers = {},
  theme = 'light',
}) => {
  const t = T[theme] ?? T.light;
  const [userMatches, setUserMatches] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);

  const placedItemIds = new Set(Object.values(userMatches));

  /** Color assigned to each item by its index — used in pills + borders */
  const colorOf = (itemId: string) => {
    const idx = items.findIndex(i => i.id === itemId);
    return ITEM_COLORS[idx % ITEM_COLORS.length];
  };

  const handleDragStart = (itemId: string, e: React.DragEvent) => {
    dragItemRef.current = itemId;
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };
  const handleDragEnd = () => { setDraggingId(null); setDragOverTarget(null); };

  const handleDragOver = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetId);
  };
  const handleDragLeave = () => setDragOverTarget(null);

  const handleDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || dragItemRef.current;
    if (!itemId) return;
    setUserMatches(prev => {
      const next = { ...prev };
      for (const tid of Object.keys(next)) { if (next[tid] === itemId) delete next[tid]; }
      next[targetId] = itemId;
      return next;
    });
    setDraggingId(null);
    setDragOverTarget(null);
  };

  const handleUnmatch = (targetId: string) => {
    setUserMatches(prev => { const n = { ...prev }; delete n[targetId]; return n; });
    setChecked(false);
  };

  const handleCheck = () => setChecked(true);
  const handleReset = () => { setUserMatches({}); setChecked(false); };

  const allMatched      = targets.length > 0 && Object.keys(userMatches).length === targets.length;
  const anyMatched      = Object.keys(userMatches).length > 0;
  const hasCorrectAns   = Object.keys(correctAnswers).length > 0;
  const isCorrect       = (targetId: string) => {
    if (!hasCorrectAns) return null;
    const placed = userMatches[targetId];
    return placed ? correctAnswers[placed] === targetId : null;
  };
  const getItemContent  = (itemId: string) => items.find(i => i.id === itemId)?.content ?? itemId;

  return (
    <div className="w-full space-y-5">

      {/* ── Two-column layout — no outer box ──────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: Draggable item blocks ──────────────────────────────────── */}
        <div className="flex-1 space-y-2.5">
          <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: t.targetText, opacity: 0.6 }}>Items</p>
          {items.map((item, idx) => {
            const color     = ITEM_COLORS[idx % ITEM_COLORS.length];
            const placed    = placedItemIds.has(item.id);
            const isDragging = draggingId === item.id;
            return (
              <motion.div
                key={item.id}
                draggable={!placed && !checked}
                onDragStart={(e) => handleDragStart(item.id, e as any)}
                onDragEnd={handleDragEnd}
                className="px-4 py-3.5 rounded-lg font-semibold text-base select-none transition-all"
                style={{
                  /* Colorful left border + tinted background — dimmed when placed */
                  borderLeft: placed ? `4px solid ${color}60` : `4px solid ${color}`,
                  backgroundColor: placed ? `${color}12` : 'transparent',
                  color:  placed ? `${color}` : t.itemText,
                  cursor: placed || checked ? 'default' : 'grab',
                  opacity: isDragging ? 0.45 : 1,
                  boxShadow: (!placed && !checked) ? `0 2px 8px ${color}33` : 'none',
                }}
                whileHover={!placed && !checked ? { scale: 1.02, x: 3 } : {}}
                transition={{ duration: 0.14 }}
              >
                {placed ? (
                  <span className="italic text-sm flex items-center gap-2">
                    <span style={{ color: `${color}aa` }}>✓</span>
                    <span style={{ color: `${color}80` }} dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }} />
                  </span>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* ── Right: Drop targets ───────────────────────────────────────────── */}
        <div className="flex-1 space-y-2.5">
          <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: t.targetText, opacity: 0.6 }}>Matches</p>
          {targets.map(target => {
            const matchedItemId = userMatches[target.id];
            const matchColor    = matchedItemId ? colorOf(matchedItemId) : null;
            const status        = checked ? isCorrect(target.id) : null;
            const isHovering    = dragOverTarget === target.id;

            return (
              <div
                key={target.id}
                onDragOver={(e) => handleDragOver(target.id, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(target.id, e)}
                className="rounded-xl transition-all min-h-[72px]"
                style={{
                  borderWidth: matchedItemId ? '2px' : '2.5px',
                  borderStyle: matchedItemId ? 'solid' : 'dashed',
                  borderColor: status === true
                    ? '#22c55e'
                    : status === false
                    ? '#ef4444'
                    : matchedItemId
                    ? (matchColor ?? '#4f46e5') + 'cc'
                    : isHovering
                    ? t.targetBorderHover
                    : t.targetBorderIdle,
                  backgroundColor: status === true
                    ? 'rgba(34,197,94,0.08)'
                    : status === false
                    ? 'rgba(239,68,68,0.08)'
                    : matchedItemId
                    ? `${matchColor}18`
                    : isHovering
                    ? t.targetBgHover
                    : t.targetBgIdle,
                  boxShadow: isHovering && !matchedItemId
                    ? `0 0 0 3px ${t.targetBorderHover}22 inset`
                    : matchedItemId
                    ? `0 0 0 1px ${matchColor ?? '#4f46e5'}40 inset`
                    : 'none',
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3 h-full min-h-[72px]">
                  {/* Target description */}
                  <div className="flex-1 text-sm font-medium leading-snug" style={{ color: t.targetText }} dangerouslySetInnerHTML={{ __html: markdownToHtml(target.content) }} />

                  {/* Matched item pill */}
                  {matchedItemId ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-sm font-bold text-white px-3 py-1.5 rounded-md"
                        style={{ backgroundColor: matchColor ?? '#4f46e5' }}
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(getItemContent(matchedItemId)) }}
                      />
                      {!checked && (
                        <button
                          onClick={() => handleUnmatch(target.id)}
                          className="transition-colors text-base leading-none"
                          style={{ color: t.unmatchIdle }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = t.unmatchHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = t.unmatchIdle; }}
                          title="Remove match"
                        >
                          ✕
                        </button>
                      )}
                      {status === true  && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                      {status === false && <XCircle    className="w-4 h-4 text-red-500  shrink-0" />}
                    </div>
                  ) : (
                    <span className="text-xs italic shrink-0 font-semibold transition-colors" style={{ color: isHovering ? t.placeholderHover : t.placeholderIdle }}>
                      {isHovering ? '↓ Drop here' : 'Drop here'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Score summary ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {checked && hasCorrectAns && (() => {
          const total   = targets.length;
          const correct = targets.filter(t => isCorrect(t.id) === true).length;
          const allOk   = correct === total;
          return (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold ${allOk ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}
            >
              {allOk ? '🎉' : '📝'} {correct} / {total} correct
              {!allOk && <span className="font-normal opacity-70">— review the incorrect items and try again</span>}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 items-center">
        {anyMatched && !checked && (
          <motion.button
            onClick={handleCheck}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-900/40"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Check Answers
          </motion.button>
        )}
        {checked && (
          <motion.button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-md"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </motion.button>
        )}
        {!checked && (
          <motion.button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-all"
            style={{ borderColor: t.resetBorder, color: t.resetText }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.resetHoverBorder; e.currentTarget.style.color = t.resetHoverText; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.resetBorder; e.currentTarget.style.color = t.resetText; }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default CustomMatchingActivity;
