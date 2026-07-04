import React, { useState } from 'react';
import { markdownToHtml } from '../../lib/markdownInline';

export interface HorizontalTab {
  id: string;
  label: string;
  color?: string;
  content: string;
  expandedContent?: string;
}

interface Props {
  tabs: HorizontalTab[];
  title?: string;
}

const ACCENT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e',
];

export default function TabbedContentHorizontal({ tabs = [], title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!tabs.length) return null;

  return (
    <div className="w-full flex flex-col gap-0 select-none">
      {title && (
        <p className="text-slate-400 text-sm font-bold text-center uppercase tracking-widest mb-3">{title}</p>
      )}

      {/* ── Content Panel (top) — CSS transitions, no AnimatePresence to avoid freeze ── */}
      <div
        className="relative overflow-hidden rounded-t-2xl bg-slate-800/60 border border-b-0 border-slate-700"
        style={{ minHeight: 220 }}
      >
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          const color = tab.color || ACCENT_COLORS[i % ACCENT_COLORS.length];
          return (
            <div
              key={tab.id}
              className="absolute inset-0 p-5 overflow-y-auto custom-scrollbar"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(14px)',
                transition: 'opacity 0.22s ease, transform 0.22s ease',
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 rounded-full shrink-0" style={{ background: color }} />
                <h3 className="font-extrabold text-lg" style={{ color }} dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.label) }} />
              </div>
              <div className="text-slate-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.content) }} />
              {tab.expandedContent && (
                <div className="mt-4 pt-4 border-t border-slate-700 text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.expandedContent) }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Horizontal Tab Bar (bottom) ── */}
      <div className="flex border border-t-0 border-slate-700 rounded-b-2xl overflow-hidden bg-slate-900/80">
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          const color = tab.color || ACCENT_COLORS[i % ACCENT_COLORS.length];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-1 relative px-3 py-3 text-xs font-bold transition-all text-center border-r border-slate-700/60 last:border-r-0 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              style={isActive ? { background: `${color}22` } : {}}
            >
              {/* Indicator — CSS only, no layoutId/Framer motion */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: color, opacity: isActive ? 1 : 0, transition: 'opacity 0.2s' }}
              />
              <span className="relative z-10" dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.label) }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
