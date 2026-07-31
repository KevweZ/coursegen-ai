import React, { useState, useEffect, useMemo } from 'react';
import { markdownToHtml } from '../../lib/markdownInline';
import { motion, AnimatePresence } from 'framer-motion';

export interface HorizontalTab {
  id: string;
  label: string;
  color?: string;
  content: string;
  expandedContent?: string;
  /** Optional AI/source image shown below tab text (does not cover copy) */
  imageUrl?: string;
}

type THTheme = 'light' | 'dark' | 'unified';

interface Props {
  tabs: HorizontalTab[];
  title?: string;
  theme?: THTheme;
  onTabView?: (tabId: string) => void;
}

const ACCENT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e',
];

function normalizeTabs(tabs: HorizontalTab[]): HorizontalTab[] {
  return (tabs || []).map((t, i) => ({
    ...t,
    id: (t?.id != null && String(t.id).trim()) ? String(t.id) : `tab-${i}`,
  }));
}

export default function TabbedContentHorizontal({ tabs = [], title, theme = 'light', onTabView }: Props) {
  const normalized = useMemo(() => normalizeTabs(tabs), [tabs]);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLight = theme === 'light';

  useEffect(() => {
    if (normalized[0]?.id) onTabView?.(normalized[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized.map(t => t.id).join('|')]);

  if (!normalized.length) return null;

  const selectTab = (i: number) => {
    setActiveIndex(i);
    const id = normalized[i]?.id;
    if (id) onTabView?.(id);
  };

  const activeTab = normalized[Math.min(activeIndex, normalized.length - 1)];
  const activeColor = activeTab.color || ACCENT_COLORS[activeIndex % ACCENT_COLORS.length];

  return (
    <div className="w-full flex flex-col gap-0 select-none">
      {title && (
        <p className={`text-sm font-bold text-center uppercase tracking-widest mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {title}
        </p>
      )}

      <div
        className={`relative overflow-hidden rounded-t-2xl border border-b-0 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/60 border-slate-700'
        }`}
        style={{ minHeight: 'min(55vh, 460px)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 p-6 sm:p-8 overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: activeColor }} />
              <h3
                className="font-extrabold text-lg"
                style={{ color: activeColor }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab.label) }}
              />
            </div>
            <div
              className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-200'}`}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab.content) }}
            />
            {activeTab.expandedContent && (
              <div
                className={`mt-4 pt-4 border-t text-sm leading-relaxed ${
                  isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700 text-slate-300'
                }`}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab.expandedContent) }}
              />
            )}
            {activeTab.imageUrl && (
              <div className="mt-5 rounded-xl overflow-hidden border border-slate-200/80 shadow-sm max-w-md">
                <img
                  src={activeTab.imageUrl}
                  alt=""
                  className="w-full h-auto max-h-48 object-cover"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className={`flex border border-t-0 rounded-b-2xl overflow-hidden ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-900/80'
        }`}
      >
        {normalized.map((tab, i) => {
          const isActive = i === activeIndex;
          const color = tab.color || ACCENT_COLORS[i % ACCENT_COLORS.length];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(i)}
              className={`flex-1 relative px-3 py-3.5 text-xs font-bold transition-all text-center border-r last:border-r-0 ${
                isLight ? 'border-slate-200' : 'border-slate-700/60'
              } ${
                isActive
                  ? 'text-white'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              style={isActive ? { background: color } : {}}
            >
              <span className="relative z-10" dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.label) }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
