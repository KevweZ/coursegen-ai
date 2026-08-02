import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, FileText } from 'lucide-react';
import { markdownToHtml } from '../../lib/markdownInline';

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
      <p className="text-slate-600 text-sm text-center mb-6 font-bold">
        {folderLabel || 'Click any folder to view its document'}
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
              style={{ width: `${Math.min(38, 88 / visibleItems.length)}%`, zIndex: isOpen ? 20 : i + 1 }}
              animate={{
                y: isOpen ? -10 : yOffset,
                scale: isOpen ? 1.03 : 1 - depth * 0.02,
                opacity: openItemId && !isOpen ? 0.55 : 1,
              }}
              whileHover={!openItemId ? { y: yOffset - 6, scale: (1 - depth * 0.02) * 1.02 } : undefined}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={() => {
                if (openItemId && openItemId !== item.id) return;
                setOpenItemId(isOpen ? null : item.id);
              }}
            >
              <div
                className="self-start ml-2 px-2 py-[3px] rounded-t-md font-extrabold text-xs leading-snug truncate shadow-md"
                style={{ background: colors.tab, maxWidth: '65%', minWidth: 32, color: '#ffffff' }}
              >
                {item.title.split(' ').slice(0, 3).join(' ')}
              </div>

              {!isOpen && [1, 2].map(pi => (
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

              {!isOpen && (
                <div className="absolute inset-x-0 top-2 flex justify-center z-[2] pointer-events-none">
                  <div
                    className="rounded-t-sm"
                    style={{ width: '80%', height: 24, background: colors.paper, boxShadow: '0 -1px 4px rgba(0,0,0,0.1)' }}
                  />
                </div>
              )}

              <div
                className="relative z-10 rounded-b-xl rounded-tr-xl shadow-2xl flex flex-col items-center justify-end pt-6 pb-4"
                style={{
                  background: `linear-gradient(155deg, ${colors.front} 10%, ${colors.back} 100%)`,
                  minHeight: 140,
                  boxShadow: `0 10px 28px -6px ${colors.back}99, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-8 rounded-t-xl opacity-20 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.7),transparent)' }} />
                <FileText className="w-5 h-5 mb-1" style={{ color: 'rgba(255,255,255,0.55)' }} />
                <span
                  className="text-xs font-bold text-center px-2 leading-snug line-clamp-2 [&_*]:!text-white"
                  style={{ color: '#ffffff' }}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(item.title) }}
                />
                {isOpen && (
                  <div className="absolute inset-0 rounded-b-xl rounded-tr-xl pointer-events-none" style={{ outline: `2px solid ${colors.tab}`, outlineOffset: '-2px' }} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {openItem && openColors && (
          <motion.div
            key={`doc-${openItem.id}`}
            className="relative px-4 w-full -mt-16 pt-12 z-30"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div
              className="w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] border"
              style={{ background: openColors.paper, borderColor: openColors.paperLine }}
            >
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: openColors.tab }}>
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: '#ffffff' }} />
                  <h3
                    className="font-extrabold text-sm leading-snug truncate [&_*]:!text-white"
                    style={{ color: '#ffffff' }}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(openItem.title) }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOpenItemId(null)}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/35 font-bold text-xs px-3 py-1 rounded-lg transition-colors shrink-0"
                  style={{ color: '#ffffff' }}
                >
                  <CornerDownLeft className="w-3.5 h-3.5" /> Return
                </button>
              </div>
              <div className="px-6 py-5 max-h-72 overflow-y-auto custom-scrollbar relative">
                <div className="absolute left-14 top-0 bottom-0 w-px opacity-20 pointer-events-none" style={{ background: '#e53e3e' }} />
                {openItem.previewText && (
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 ml-12" style={{ color: openColors.tab }}>
                    {openItem.previewText}
                  </p>
                )}
                <p className="text-slate-800 text-sm leading-relaxed ml-12" dangerouslySetInnerHTML={{ __html: markdownToHtml(openItem.content) }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
