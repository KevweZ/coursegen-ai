const fs = require('fs');

// PATCH FOLDER EXPLORER
const folderReplacement = `import React, { useState } from 'react';
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
              style={{ width: \`\${Math.min(38, 88 / visibleItems.length)}%\`, zIndex: i + 1 }}
              animate={{ y: isOpen ? -14 : yOffset, scale: isOpen ? 1.04 : 1 - depth * 0.02 }}
              whileHover={{ y: isOpen ? -14 : yOffset - 8, scale: isOpen ? 1.04 : (1 - depth * 0.02) * 1.02 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <div
                className="self-start ml-2 px-2 py-[3px] rounded-t-md text-white/90 font-extrabold text-[9px] leading-snug truncate shadow-md"
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
                    width: \`\${80 - pi * 5}%\`,
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
                      layoutId={\`paper-\${item.id}\`}
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
                  background: \`linear-gradient(155deg, \${colors.front} 10%, \${colors.back} 100%)\`,
                  minHeight: 140,
                  boxShadow: \`0 10px 28px -6px \${colors.back}99, inset 0 1px 0 rgba(255,255,255,0.18)\`,
                }}
                onClick={() => setOpenItemId(isOpen ? null : item.id)}
              >
                <div className="absolute top-0 left-0 right-0 h-8 rounded-t-xl opacity-20 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.7),transparent)' }} />
                <FileText className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-white/75 text-[9px] font-bold text-center px-2 leading-snug line-clamp-2">
                  {item.title}
                </span>
                {isOpen && (
                  <div className="absolute inset-0 rounded-b-xl rounded-tr-xl pointer-events-none" style={{ outline: \`2px solid \${colors.tab}\`, outlineOffset: '-2px' }} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {openItem && openColors && (
          <div className="relative px-4 w-full mt-3 z-30" key="paper-container">
            <motion.div
              layoutId={\`paper-\${openItem.id}\`}
              className="w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] border origin-top"
              style={{ background: openColors.paper, borderColor: openColors.paperLine }}
              initial={{ opacity: 0, y: -40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.8, transition: { duration: 0.2 } }}
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

      {!openItem && (
        <p className="text-slate-500 text-xs text-center mt-3 font-bold animate-pulse">
          Click any folder or tab to view its fully extracted document
        </p>
      )}
    </div>
  );
}
`;
fs.writeFileSync('src/components/interactions/FolderExplorer.tsx', folderReplacement);
console.log('FolderExplorer patched.');

// PATCH CAROUSEL PANEL
const carouselReplacement = `import React, { useState } from 'react';
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
    <div className="w-full flex flex-col items-center gap-6 select-none bg-slate-900 overflow-hidden py-6 rounded-2xl border border-slate-800 shadow-xl">
      {title && (
        <div className="w-full px-8 text-left">
          <p className="text-white text-lg font-bold bg-slate-800 inline-block px-4 py-2 border border-slate-700 rounded-md">
            {title}
          </p>
        </div>
      )}

      {/* Main card stage */}
      <div className="relative w-full h-[320px] flex items-center justify-center pt-8">
        <AnimatePresence>
          {cards.map((card, i) => {
            const pos = getPosition(i);
            const isCenter = pos === 0;
            const cardColor = card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const darkColor = DARK_COLORS[i % DARK_COLORS.length];
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
                className={\`absolute w-[400px] rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col \${isCenter ? 'cursor-default' : 'cursor-pointer'}\`}
                style={{ background: cardColor, minHeight: isCenter && expanded ? 280 : 180 }}
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
                         className="flex-1 mt-2 border-t border-white/30 pt-4"
                       >
                         <p className="text-white font-bold mb-2">Expanded Information:</p>
                         <p className="text-white/80 text-sm whitespace-pre-wrap">{card.expandedContent}</p>
                         <button onClick={() => setExpanded(false)} className="mt-4 text-white text-xs underline font-bold opacity-80 hover:opacity-100">Collapse</button>
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

        {/* Outer navigation arrows mapping to array bounds */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-40">
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

      {/* Navigation Circles underneath */}
      <div className="flex items-center gap-6 mt-8 z-50">
        {cards.map((card, i) => {
          const isActive = i === activeIndex;
          const bg = card.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setExpanded(false); }}
              className={\`w-10 h-10 rounded-full border-[3px] \${isActive ? 'border-white scale-125' : 'border-transparent'} shadow-xl transition-all hover:scale-110\`}
              style={{ background: isActive ? bg : '#1e293b' }}
            />
          );
        })}
      </div>
      
    </div>
  );
}
`;
fs.writeFileSync('src/components/interactions/CarouselPanel.tsx', carouselReplacement);
console.log('CarouselPanel patched.');
