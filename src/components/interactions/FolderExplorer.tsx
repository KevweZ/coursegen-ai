import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, FileText } from 'lucide-react';

export interface FolderItem {
  id: string;
  title: string;
  previewText?: string;
  content: string;
}

interface Props {
  folderLabel?: string;
  items: FolderItem[];
}

// Folder color palettes − front, back(shadow), tab, paper body, paper edge
const FOLDER_COLORS = [
  { front: '#f59e0b', back: '#d97706', tab: '#b45309', paper: '#fffbf0', paperLine: '#e5dfc8' },
  { front: '#fb923c', back: '#ea580c', tab: '#c2410c', paper: '#fff8f3', paperLine: '#f0ddd0' },
  { front: '#facc15', back: '#ca8a04', tab: '#a16207', paper: '#fefce8', paperLine: '#e9e2c0' },
  { front: '#a78bfa', back: '#7c3aed', tab: '#5b21b6', paper: '#f5f3ff', paperLine: '#ddd6fe' },
  { front: '#34d399', back: '#059669', tab: '#065f46', paper: '#f0fdf4', paperLine: '#bbf7d0' },
];

export default function FolderExplorer({ folderLabel, items = [] }: Props) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  if (!items.length) return null;
  const visibleItems = items.slice(0, 4);
  const openIdx = visibleItems.findIndex(i => i.id === openItemId);
  const openItem = openIdx >= 0 ? visibleItems[openIdx] : null;
  const openColors = openItem ? FOLDER_COLORS[openIdx % FOLDER_COLORS.length] : null;

  return (
    <div className="w-full select-none">

      {/* ── Folder Row ── */}
      <div className="relative flex items-end justify-center gap-3 px-4" style={{ minHeight: 220 }}>
        {visibleItems.map((item, i) => {
          const colors = FOLDER_COLORS[i % FOLDER_COLORS.length];
          const isOpen = item.id === openItemId;
          // Back folders are visually higher (feel of depth)
          const depth = visibleItems.length - 1 - i;
          const yOffset = depth * 10;

          return (
            <motion.div
              key={item.id}
              className="relative flex flex-col cursor-pointer"
              style={{
                width: `${Math.min(38, 88 / visibleItems.length)}%`,
                zIndex: i + 1,
              }}
              animate={{ y: isOpen ? -14 : yOffset, scale: isOpen ? 1.04 : 1 - depth * 0.02 }}
              whileHover={{ y: isOpen ? -14 : yOffset - 8, scale: isOpen ? 1.04 : (1 - depth * 0.02) * 1.02 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={() => setOpenItemId(isOpen ? null : item.id)}
            >
              {/* ── Folder Tab (top notch) ── */}
              <div
                className="self-start ml-2 px-2 py-[3px] rounded-t-md text-white/90 font-extrabold text-[9px] leading-snug truncate"
                style={{ background: colors.tab, maxWidth: '65%', minWidth: 32 }}
              >
                {item.title.split(' ').slice(0, 3).join(' ')}
              </div>

              {/* ── Papers peeking from top of folder body (behind tab, above front face) ── */}
              {[0, 1, 2].map(pi => (
                <div
                  key={pi}
                  className="absolute left-1/2 -translate-x-1/2 rounded-t-sm"
                  style={{
                    width: `${80 - pi * 5}%`,
                    height: 9,
                    background: pi === 0 ? colors.paper : colors.paperLine,
                    /* top offset: tab notch ≈16px, paper height=9px
                       so bottom of paper = tab bottom = folder body top.
                       Stagger each layer 3px lower so they look stacked. */
                    top: 7 + pi * 3,
                    zIndex: 3 - pi,   // z=3,2,1 — behind tab (z=6) & folder body (z=10)
                    boxShadow: pi === 0 ? '0 -1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                />
              ))}

              {/* ── Folder Body (front face) ── */}
              <div
                className="relative z-10 rounded-b-xl rounded-tr-xl shadow-2xl flex flex-col items-center justify-end pt-6 pb-4"
                style={{
                  background: `linear-gradient(155deg, ${colors.front} 10%, ${colors.back} 100%)`,
                  minHeight: 140,
                  boxShadow: `0 10px 28px -6px ${colors.back}99, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
              >
                {/* Shine strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-8 rounded-t-xl opacity-20 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.7),transparent)' }}
                />
                {/* Bottom content */}
                <FileText className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-white/75 text-[9px] font-bold text-center px-2 leading-snug line-clamp-2">
                  {item.title}
                </span>
                {/* Highlight ring if open */}
                {isOpen && (
                  <div
                    className="absolute inset-0 rounded-b-xl rounded-tr-xl pointer-events-none"
                    style={{ outline: `2px solid ${colors.tab}`, outlineOffset: '-2px' }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Expanded Paper Panel ── */}
      <AnimatePresence>
        {openItem && openColors && (
          <motion.div
            key={openItem.id + '-paper'}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full mt-3 rounded-2xl overflow-hidden shadow-2xl border"
            style={{ background: openColors.paper, borderColor: openColors.paperLine }}
          >
            {/* Paper header strip */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ background: openColors.tab }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white/90 shrink-0" />
                <h3 className="text-white font-extrabold text-sm leading-snug">{openItem.title}</h3>
              </div>
              <button
                onClick={() => setOpenItemId(null)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/35 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors shrink-0"
              >
                <CornerDownLeft className="w-3.5 h-3.5" /> Return
              </button>
            </div>

            {/* Ruled lines decoration */}
            <div className="px-6 py-5 max-h-60 overflow-y-auto custom-scrollbar">
              {/* Paper ruled-line feel */}
              <div
                className="absolute left-14 top-0 bottom-0 w-px opacity-20 pointer-events-none"
                style={{ background: '#e53e3e' }}
              />
              {openItem.previewText && (
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-3"
                  style={{ color: openColors.tab }}
                >
                  {openItem.previewText}
                </p>
              )}
              <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                {openItem.content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!openItem && (
        <p className="text-slate-500 text-xs text-center mt-3 font-bold">
          Click any folder to open its document
        </p>
      )}
    </div>
  );
}
