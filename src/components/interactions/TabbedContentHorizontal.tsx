import React, { useState, useEffect, useMemo } from 'react';
import { markdownToHtml } from '../../lib/markdownInline';
import { formatTabIntroOst, formatTabOstBody } from '../../lib/formatTabIntroOst';
import { motion, AnimatePresence } from 'framer-motion';

export interface HorizontalTab {
  id: string;
  label: string;
  color?: string;
  content: string;
  expandedContent?: string;
  /** Optional AI/source image shown below tab text (does not cover copy) */
  imageUrl?: string;
  /** Per-tab narration script */
  voiceOverText?: string;
  /** Generated TTS URL for this tab */
  voiceOverUrl?: string;
}

type THTheme = 'light' | 'dark' | 'unified';

interface Props {
  tabs: HorizontalTab[];
  title?: string;
  theme?: THTheme;
  onTabView?: (tabId: string) => void;
  /** Fired only on user click (not mount) — use for per-tab audio cutover. Pass "__intro__" for intro. */
  onTabAudio?: (tabId: string) => void;
  /** Intro panel copy while no tab is selected (opening narration OST) */
  introContent?: string;
  /** Slide-level narration — used to enrich thin intro OST into short bullets */
  introVoiceOver?: string;
  /** Notify parent of active tab (null = intro) for tab-scoped floating images */
  onActiveTabChange?: (tabId: string | null) => void;
  /** While dragging a floating image over a tab zone, highlight it */
  highlightTabId?: string | null;
}

const ACCENT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e',
];
const INTRO_COLOR = '#6366f1';

function normalizeTabs(tabs: HorizontalTab[]): HorizontalTab[] {
  return (tabs || []).map((t, i) => ({
    ...t,
    id: (t?.id != null && String(t.id).trim()) ? String(t.id) : `tab-${i}`,
  }));
}

export default function TabbedContentHorizontal({
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
  const normalized = useMemo(() => normalizeTabs(tabs), [tabs]);
  /** -1 = intro state (slide opening lines); no content tab selected yet */
  const [activeIndex, setActiveIndex] = useState(-1);
  const isLight = theme === 'light';

  // Do not auto-select first tab on mount — intro narration plays first
  useEffect(() => {
    setActiveIndex(-1);
  }, [normalized.map(t => t.id).join('|')]);

  const inIntro = activeIndex < 0;
  const activeTab = inIntro || !normalized.length
    ? null
    : normalized[Math.min(activeIndex, normalized.length - 1)];

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

  const activeColor = inIntro
    ? INTRO_COLOR
    : (activeTab?.color || ACCENT_COLORS[Math.max(0, activeIndex) % ACCENT_COLORS.length]);
  const dropZoneId = activeTab?.id || '';
  const panelHighlighted = !!(highlightTabId && dropZoneId && highlightTabId === dropZoneId);
  // Always use a fixed content-panel height so the tab bar stays docked at the
  // bottom (image-tab layout). Growing/shrinking with content caused a player snap
  // when switching image tabs ↔ text-only tabs.
  const PANEL_H = 520;

  return (
    <div className="w-full flex flex-col gap-0 select-none min-h-0 flex-1">
      {title && (
        <p className={`text-sm font-bold text-center uppercase tracking-widest mb-3 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {title}
        </p>
      )}

      <div
        data-tab-drop-zone={dropZoneId || undefined}
        className={`relative rounded-t-2xl border border-b-0 transition-colors flex flex-col overflow-hidden ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/60 border-slate-700'
        } ${panelHighlighted ? 'ring-4 ring-indigo-400/80 ring-inset bg-indigo-50/40' : ''}`}
        style={{ height: PANEL_H, minHeight: PANEL_H }}
      >
        {panelHighlighted && (
          <div className="absolute inset-x-0 top-0 z-10 px-3 py-1.5 text-center text-[11px] font-bold text-white bg-indigo-600/90 pointer-events-none">
            Drop here to attach image to this tab
          </div>
        )}
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={inIntro ? '__intro__' : activeTab!.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="relative p-6 sm:p-8 flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar"
          >
            {inIntro ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ background: INTRO_COLOR }} />
                  <h3 className="font-extrabold text-lg" style={{ color: INTRO_COLOR }}>
                    Introduction
                  </h3>
                </div>
                <div
                  className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-200'}`}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(introOst) }}
                />
                <p className={`mt-6 text-xs font-semibold ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                  Select a topic tab below to continue →
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ background: activeColor }} />
                  <h3
                    className="font-extrabold text-lg"
                    style={{ color: activeColor }}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab!.label) }}
                  />
                </div>
                <div
                  className={`text-sm leading-relaxed tab-ost-body ${isLight ? 'text-slate-700' : 'text-slate-200'}`}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(formatTabOstBody(activeTab!.content)) }}
                />
                {activeTab!.expandedContent && (
                  <div
                    className={`mt-4 pt-4 border-t text-sm leading-relaxed tab-ost-body ${
                      isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700 text-slate-300'
                    }`}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(formatTabOstBody(activeTab!.expandedContent)) }}
                  />
                )}
                {activeTab!.imageUrl && (
                  <div className="mt-6 pt-4 border-t border-slate-200/80">
                    <div className="rounded-xl overflow-hidden border border-slate-200/80 shadow-sm max-w-md mx-auto">
                      <img
                        src={activeTab!.imageUrl}
                        alt=""
                        className="w-full h-auto max-h-72 object-contain bg-slate-50"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className={`flex border border-t-0 rounded-b-2xl overflow-x-auto custom-scrollbar shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-900/80'
        }`}
      >
        <button
          type="button"
          onClick={selectIntro}
          className={`shrink-0 px-3 py-3.5 text-xs font-bold transition-all text-center border-r ${
            isLight ? 'border-slate-200' : 'border-slate-700/60'
          } ${
            inIntro
              ? 'text-white'
              : isLight
              ? 'text-slate-500 hover:text-slate-800 hover:bg-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          style={inIntro ? { background: INTRO_COLOR } : {}}
          title="Return to opening introduction"
        >
          Intro
        </button>
        {normalized.map((tab, i) => {
          const isActive = i === activeIndex;
          const color = tab.color || ACCENT_COLORS[i % ACCENT_COLORS.length];
          const isDropTarget = highlightTabId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-tab-drop-zone={tab.id}
              onClick={() => selectTab(i)}
              className={`shrink-0 min-w-[5.5rem] flex-1 relative px-3 py-3.5 text-xs font-bold transition-all text-center border-r last:border-r-0 ${
                isLight ? 'border-slate-200' : 'border-slate-700/60'
              } ${
                isActive
                  ? 'text-white'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              } ${isDropTarget ? 'ring-2 ring-indigo-400 ring-inset z-10' : ''}`}
              style={isActive ? { background: color } : isDropTarget ? { background: 'rgba(99,102,241,0.15)' } : {}}
            >
              <span className="relative z-10" dangerouslySetInnerHTML={{ __html: markdownToHtml(tab.label) }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
