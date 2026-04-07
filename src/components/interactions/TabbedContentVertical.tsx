import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface VerticalTab {
  id: string;
  label: string;
  icon?: string;
  content: string;
}

interface Props {
  tabs: VerticalTab[];
  title?: string;
}

const ACCENT_COLORS = [
  { bg: 'bg-indigo-600', ring: 'ring-indigo-500/50', text: 'text-indigo-300', dot: '#6366f1' },
  { bg: 'bg-pink-600', ring: 'ring-pink-500/50', text: 'text-pink-300', dot: '#ec4899' },
  { bg: 'bg-amber-600', ring: 'ring-amber-500/50', text: 'text-amber-300', dot: '#f59e0b' },
  { bg: 'bg-emerald-600', ring: 'ring-emerald-500/50', text: 'text-emerald-300', dot: '#10b981' },
  { bg: 'bg-blue-600', ring: 'ring-blue-500/50', text: 'text-blue-300', dot: '#3b82f6' },
  { bg: 'bg-rose-600', ring: 'ring-rose-500/50', text: 'text-rose-300', dot: '#f43f5e' },
];

export default function TabbedContentVertical({ tabs = [], title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!tabs.length) return null;

  const activeTab = tabs[activeIndex];
  const accent = ACCENT_COLORS[activeIndex % ACCENT_COLORS.length];

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {title && (
        <p className="text-slate-400 text-sm font-bold text-center uppercase tracking-widest mb-1">{title}</p>
      )}

      <div className="flex gap-4 h-full min-h-[280px]">
        {/* Vertical Tab List */}
        <div className="flex flex-col gap-2 min-w-[160px] max-w-[200px] overflow-y-auto custom-scrollbar">
          {tabs.map((tab, i) => {
            const isActive = i === activeIndex;
            const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                  isActive
                    ? `${color.bg} text-white border-transparent shadow-lg ring-2 ${color.ring}`
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
                }`}
              >
                {tab.icon && <span className="text-base shrink-0">{tab.icon}</span>}
                <span className="flex-1 leading-snug">{tab.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="flex-1 relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-700">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 p-5 overflow-y-auto custom-scrollbar"
            >
              {/* Tab heading */}
              <div className={`flex items-center gap-2 mb-4`}>
                <div className={`w-1 h-8 rounded-full ${accent.bg}`} />
                <h3 className={`font-extrabold text-lg ${accent.text}`}>{activeTab.label}</h3>
              </div>

              {/* Tab body */}
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {activeTab.content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
