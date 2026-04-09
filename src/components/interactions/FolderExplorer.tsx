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
      <p className="text-slate-400 text-sm text-center mb-6 font-bold animate-pulse">
        Click any folder or tab to view its fully extracted document
      </p>
      <div className="relative flex items-end justify-center gap-3 px-4" style={{ minHeight: 220 }}>
        {visibleItems.map((item, i) => {
          const colors = FOLDER_COLORS[i % FOLDER_COLORS.length];
          const isOpen = item.id === openItemId;
          const depth = visibleItems.length - 1 - i;
          const yOffset = depth * 10;

          return (
            <motion.div
              key={item.id}
              className="relative flex flex-col cursor-pointer group"
              style={{ width: `${Math.min(38, 88 / visibleItems.length)}%`, zIndex: i + 1 }}
              animate={{ y: isOpen ? -14 : yOffset, scale: isOpen ? 1.04 : 1 - depth * 0.02 }}
              whileHover={{ y: isOpen ? -14 : yOffset - 8, scale: isOpen ? 1.04 : (1 - depth * 0.02) * 1.02 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <div
                className="self-start ml-2 px-2 py-[3px] rounded-t-md text-white/90 font-extrabold text-xs leading-snug truncate shadow-md"
                style={{ background: colors.tab, maxWidth: '65%', minWidth: 32 }}
              >
                {item.title.split(' ').slice(0, 3).join(' ')}
              </div>

              {/* Back generic papers */}
              {[1, 2].map(pi => (
                <div
                  key={pi}
                  className="absolute left-1/2 -translate-x-1/2 rounded-t-sm"
                  style={{
                    width: `${80 - pi * 5}%`,
                    height: 9,
                    background: colors.paperLine,
                    top: 7 + pi * 3,
                    zIndex: 3 - pi,
                  }}
                />
              ))}

              {/* Main floating paper connecting layoutId */}
              <div className="absolute inset-x-0 bottom-full h-8 flex justify-center -mb-7 z-[2] pointer-events-none">
                <AnimatePresence>
                  {!isOpen && (
                    <motion.div
                      layoutId={`paper-${item.id}`}
                      className="rounded-t-sm"
                      style={{ width: '80%', background: colors.paper, boxShadow: '0 -1px 4px rgba(0,0,0,0.1)' }}
                      initial={{ height: 9, y: 0 }}
                      animate={{ height: 9, y: 0 }}
                      whileHover={{ height: 25, y: -16 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      onClick={(e) => { e.stopPropagation(); setOpenItemId(item.id); }}
                    />
                  )}
                </AnimatePresence>
              </div>

              <div
                className="relative z-10 rounded-b-xl rounded-tr-xl shadow-2xl flex flex-col items-center justify-end pt-6 pb-4"
                style={{
                  background: `linear-gradient(155deg, ${colors.front} 10%, ${colors.back} 100%)`,
                  minHeight: 140,
                  boxShadow: `0 10px 28px -6px ${colors.back}99, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
                onClick={() => setOpenItemId(isOpen ? null : item.id)}
              >
                <div className="absolute top-0 left-0 right-0 h-8 rounded-t-xl opacity-20 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.7),transparent)' }} />
                <FileText className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-white/75 text-xs font-bold text-center px-2 leading-snug line-clamp-2">
                  {item.title}
                </span>
                {isOpen && (
                  <div className="absolute inset-0 rounded-b-xl rounded-tr-xl pointer-events-none" style={{ outline: `2px solid ${colors.tab}`, outlineOffset: '-2px' }} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {openItem && openColors && (
          <div className="relative px-4 w-full -mt-20 pt-16 pointer-events-none z-30" key="paper-container">
            <motion.div
              layoutId={`paper-${openItem.id}`}
              className="w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] border origin-top"
              style={{ background: openColors.paper, pointerEvents: "auto", borderColor: openColors.paperLine }}
              initial={{ opacity: 0, y: -60, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -60, scale: 0.8, transition: { duration: 0.2 } }}
            >
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: openColors.tab }}>
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
              <div className="px-6 py-5 max-h-60 overflow-y-auto custom-scrollbar relative">
                <div className="absolute left-14 top-0 bottom-0 w-px opacity-20 pointer-events-none" style={{ background: '#e53e3e' }} />
                {openItem.previewText && (
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 ml-12" style={{ color: openColors.tab }}>
                    {openItem.previewText}
                  </p>
                )}
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap ml-12">
                  {openItem.content}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
    </div>
  );
}
