import React, { useState, useEffect, useMemo } from 'react';
import { markdownToHtml } from '../../lib/markdownInline';
import { formatTabIntroOst } from '../../lib/formatTabIntroOst';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface VerticalTab {
  id: string;
  label: string;
  icon?: string;
  content: string;
  /** Optional AI/source image shown below tab text (does not cover copy) */
  imageUrl?: string;
  voiceOverText?: string;
  voiceOverUrl?: string;
}

type TVTheme = 'light' | 'dark' | 'unified';

interface Props {
  tabs: VerticalTab[];
  title?: string;
  theme?: TVTheme;
  onTabView?: (tabId: string) => void;
  /** Fired only on user click (not mount) — use for per-tab audio cutover. Pass "__intro__" for intro. */
  onTabAudio?: (tabId: string) => void;
  introContent?: string;
  /** Slide-level narration — used to enrich thin intro OST into short bullets */
  introVoiceOver?: string;
  /** Notify parent of active tab (null = intro) for tab-scoped floating images */
  onActiveTabChange?: (tabId: string | null) => void;
  /** While dragging a floating image over a tab zone, highlight it */
  highlightTabId?: string | null;
}

const ACCENT_COLORS = [
  { bg: 'bg-indigo-600', ring: 'ring-indigo-500/50', text: 'text-indigo-300', textLight: 'text-indigo-600', dot: '#6366f1' },
  { bg: 'bg-pink-600', ring: 'ring-pink-500/50', text: 'text-pink-300', textLight: 'text-pink-600', dot: '#ec4899' },
  { bg: 'bg-amber-600', ring: 'ring-amber-500/50', text: 'text-amber-300', textLight: 'text-amber-600', dot: '#f59e0b' },
  { bg: 'bg-emerald-600', ring: 'ring-emerald-500/50', text: 'text-emerald-300', textLight: 'text-emerald-600', dot: '#10b981' },
  { bg: 'bg-blue-600', ring: 'ring-blue-500/50', text: 'text-blue-300', textLight: 'text-blue-600', dot: '#3b82f6' },
  { bg: 'bg-rose-600', ring: 'ring-rose-500/50', text: 'text-rose-300', textLight: 'text-rose-600', dot: '#f43f5e' },
];

const INTRO_ACCENT = ACCENT_COLORS[0];

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function TabbedContentVertical({
  tabs = [],
  title,
  theme = 'light',
  onTabView,
  onTabAudio,
  introContent,
  introVoiceOver,
  onActiveTabChange,
  highlightTabId = null,
}: Props) {
  const normalized = useMemo(
    () => (tabs || []).map((t, i) => ({ ...t, id: (t?.id != null && String(t.id).trim()) ? String(t.id) : `tab-${i}` })),
    [tabs]
  );
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalized.map(t => t.id).join('|')]);

  const isLight = theme === 'light';
  const inIntro = activeIndex < 0 || !normalized.length;
  const activeTab = inIntro ? null : normalized[Math.min(activeIndex, normalized.length - 1)];
  const accent = inIntro ? INTRO_ACCENT : ACCENT_COLORS[Math.max(0, activeIndex) % ACCENT_COLORS.length];
  const dropZoneId = activeTab?.id || '';
  const panelHighlighted = !!(highlightTabId && dropZoneId && highlightTabId === dropZoneId);

  const introOst = useMemo(
    () => formatTabIntroOst({ introContent, voiceOverText: introVoiceOver, title }),
    [introContent, introVoiceOver, title]
  );

  useEffect(() => {
    onActiveTabChange?.(activeTab?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when tab id changes
  }, [activeTab?.id]);

  if (!normalized.length) return null;

  const selectIntro = () => {
    setActiveIndex(-1);
    onTabView?.('__intro__');
    onTabAudio?.('__intro__');
  };

  const selectTab = (i: number) => {
    setActiveIndex(i);
    const id = normalized[i]?.id;
    if (id) {
      onTabView?.(id);
      onTabAudio?.(id);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {title && (
        <p className={cn('text-sm font-bold text-center uppercase tracking-widest mb-1', isLight ? 'text-slate-500' : 'text-slate-400')}>{title}</p>
      )}

      <div className="flex gap-3 w-full" style={{ minHeight: 'min(55vh, 460px)' }}>
        <div className="flex flex-col gap-2 w-[150px] sm:w-[170px] shrink-0 overflow-y-auto custom-scrollbar">
          <button
            type="button"
            onClick={selectIntro}
            className={cn(
              'flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all border',
              inIntro
                ? `${INTRO_ACCENT.bg} text-white border-transparent shadow-lg ring-2 ${INTRO_ACCENT.ring}`
                : isLight
                ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
            )}
            title="Return to opening introduction"
          >
            <span className="flex-1 leading-snug" style={{ color: inIntro ? '#ffffff' : undefined }}>
              Introduction
            </span>
            {inIntro && <ChevronRight className="w-4 h-4 shrink-0" />}
          </button>
          {normalized.map((tab, i) => {
            const isActive = i === activeIndex;
            const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
            const isDropTarget = highlightTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-tab-drop-zone={tab.id}
                onClick={() => selectTab(i)}
                className={cn(
                  'flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all border',
                  isActive
                    ? `${color.bg} text-white border-transparent shadow-lg ring-2 ${color.ring}`
                    : isLight
                    ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200',
                  isDropTarget && 'ring-2 ring-indigo-400 ring-offset-1'
                )}
              >
                {tab.icon && <span className="text-base shrink-0">{tab.icon}</span>}
                <span className="flex-1 leading-snug" style={{ color: isActive ? '#ffffff' : undefined }} dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.label) }} />
                {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div
          data-tab-drop-zone={dropZoneId || undefined}
          className={cn(
            'flex-1 min-w-0 relative overflow-hidden rounded-2xl border transition-all',
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/60 border-slate-700',
            panelHighlighted && 'ring-4 ring-indigo-400/80 ring-inset bg-indigo-50/40'
          )}
        >
          {panelHighlighted && (
            <div className="absolute inset-x-0 top-0 z-10 px-3 py-1.5 text-center text-[11px] font-bold text-white bg-indigo-600/90 pointer-events-none">
              Drop here to attach image to this tab
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={inIntro ? '__intro__' : activeTab!.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar"
            >
              {inIntro ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-1 h-8 rounded-full ${accent.bg}`} />
                    <h3 className={cn('font-extrabold text-lg', isLight ? accent.textLight : accent.text)}>
                      Introduction
                    </h3>
                  </div>
                  <div
                    className={cn('text-sm leading-relaxed', isLight ? 'text-slate-700' : 'text-slate-200')}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(introOst) }}
                  />
                  <p className={cn('mt-6 text-xs font-semibold', isLight ? 'text-indigo-600' : 'text-indigo-300')}>
                    Select a topic tab to continue →
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-1 h-8 rounded-full ${accent.bg}`} />
                    <h3 className={cn('font-extrabold text-lg', isLight ? accent.textLight : accent.text)} dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab!.label) }} />
                  </div>
                  <div className={cn('text-sm leading-relaxed', isLight ? 'text-slate-700' : 'text-slate-200')} dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab!.content) }} />
                  {activeTab!.imageUrl && (
                    <div className="mt-5 rounded-xl overflow-hidden border border-slate-200/80 shadow-sm max-w-md">
                      <img
                        src={activeTab!.imageUrl}
                        alt=""
                        className="w-full h-auto max-h-48 object-cover"
                      />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
