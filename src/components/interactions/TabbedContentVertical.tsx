import React, { useState } from 'react';
import { markdownToHtml } from '../../lib/markdownInline';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface VerticalTab {
  id: string;
  label: string;
  icon?: string;
  content: string;
}

type TVTheme = 'light' | 'dark' | 'unified';

interface Props {
  tabs: VerticalTab[];
  title?: string;
  theme?: TVTheme;
}

const ACCENT_COLORS = [
  { bg: 'bg-indigo-600', ring: 'ring-indigo-500/50', text: 'text-indigo-300', textLight: 'text-indigo-600', dot: '#6366f1' },
  { bg: 'bg-pink-600', ring: 'ring-pink-500/50', text: 'text-pink-300', textLight: 'text-pink-600', dot: '#ec4899' },
  { bg: 'bg-amber-600', ring: 'ring-amber-500/50', text: 'text-amber-300', textLight: 'text-amber-600', dot: '#f59e0b' },
  { bg: 'bg-emerald-600', ring: 'ring-emerald-500/50', text: 'text-emerald-300', textLight: 'text-emerald-600', dot: '#10b981' },
  { bg: 'bg-blue-600', ring: 'ring-blue-500/50', text: 'text-blue-300', textLight: 'text-blue-600', dot: '#3b82f6' },
  { bg: 'bg-rose-600', ring: 'ring-rose-500/50', text: 'text-rose-300', textLight: 'text-rose-600', dot: '#f43f5e' },
];

export default function TabbedContentVertical({ tabs = [], title, theme = 'light' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!tabs.length) return null;

  const isLight = theme === 'light';
  const activeTab = tabs[activeIndex];
  const accent = ACCENT_COLORS[activeIndex % ACCENT_COLORS.length];

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {title && (
        <p className={cn('text-sm font-bold text-center uppercase tracking-widest mb-1', isLight ? 'text-slate-500' : 'text-slate-400')}>{title}</p>
      )}

      {/* Wider/taller content panel so learners rarely need to scroll.
          Left tabs stay compact; the right panel takes the remaining width
          and grows to ~55vh so short bullet lists fit without a scrollbar. */}
      <div className="flex gap-3 w-full" style={{ minHeight: 'min(55vh, 460px)' }}>
        {/* Vertical Tab List — compact so content panel gets the width */}
        <div className="flex flex-col gap-2 w-[150px] sm:w-[170px] shrink-0 overflow-y-auto custom-scrollbar">
          {tabs.map((tab, i) => {
            const isActive = i === activeIndex;
            const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all border',
                  isActive
                    ? `${color.bg} text-white border-transparent shadow-lg ring-2 ${color.ring}`
                    : isLight
                    ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
                )}
              >
                {tab.icon && <span className="text-base shrink-0">{tab.icon}</span>}
                <span className="flex-1 leading-snug" style={{ color: isActive ? '#ffffff' : undefined }} dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.label) }} />
                {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Content Panel — flex-1 fills remaining width; taller min height reduces scroll */}
        <div className={cn('flex-1 min-w-0 relative overflow-hidden rounded-2xl border', isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/60 border-slate-700')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar"
            >
              {/* Tab heading */}
              <div className={`flex items-center gap-2 mb-4`}>
                <div className={`w-1 h-8 rounded-full ${accent.bg}`} />
                <h3 className={cn('font-extrabold text-lg', isLight ? accent.textLight : accent.text)} dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab.label) }} />
              </div>

              {/* Tab body */}
              <div className={cn('text-sm leading-relaxed', isLight ? 'text-slate-700' : 'text-slate-200')} dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab.content) }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
