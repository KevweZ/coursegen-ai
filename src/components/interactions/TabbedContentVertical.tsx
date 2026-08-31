import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { markdownToHtml, markdownToInlineHtml } from '../../lib/markdownInline';
import { formatTabIntroOst, formatTabOstBody } from '../../lib/formatTabIntroOst';
import { tabAccentHex, TAB_INTRO_DEFAULT_HEX } from '../../lib/tabAccents';
import { contrastTextOn } from '../../lib/colorContrast';
import { ChevronRight } from 'lucide-react';

export interface VerticalTab {
  id: string;
  label: string;
  /** Selected tab box + matching panel header color */
  color?: string;
  /** Selected tab title text (defaults to auto-contrast on the fill). */
  labelColor?: string;
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
  /** Color of the Introduction tab + intro heading */
  introColor?: string;
  introLabelColor?: string;
  /** Slide-level narration — used to enrich thin intro OST into short bullets */
  introVoiceOver?: string;
  /** Notify parent of active tab (null = intro) for tab-scoped floating images */
  onActiveTabChange?: (tabId: string | null) => void;
  /** While dragging a floating image over a tab zone, highlight it */
  highlightTabId?: string | null;
}

/** Match horizontal tabs: fill stage height; leave a little room so CC is not cramped. */
const PANEL_H = 520;

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
  introColor,
  introLabelColor,
  introVoiceOver,
  onActiveTabChange,
  highlightTabId = null,
}: Props) {
  const normalized = useMemo(
    () => (tabs || []).map((t, i) => ({ ...t, id: (t?.id != null && String(t.id).trim()) ? String(t.id) : `tab-${i}` })),
    [tabs]
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalized.map(t => t.id).join('|')]);

  const isLight = theme === 'light';
  const introHex = (introColor && String(introColor).trim()) || TAB_INTRO_DEFAULT_HEX;
  const introTitleColor = (introLabelColor && String(introLabelColor).trim()) || contrastTextOn(introHex);
  const inIntro = activeIndex < 0 || !normalized.length;
  const activeTab = inIntro ? null : normalized[Math.min(activeIndex, normalized.length - 1)];
  const dropZoneId = activeTab?.id || '';
  const panelHighlighted = !!(highlightTabId && dropZoneId && highlightTabId === dropZoneId);
  const panelKey = inIntro ? '__intro__' : (activeTab?.id ?? '__empty__');

  const introOst = useMemo(
    () => formatTabIntroOst({ introContent, voiceOverText: introVoiceOver, title }),
    [introContent, introVoiceOver, title]
  );

  const resetScrollTop = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  };

  useLayoutEffect(() => {
    resetScrollTop();
  }, [panelKey]);

  useEffect(() => {
    onActiveTabChange?.(activeTab?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when tab id changes
  }, [activeTab?.id]);

  if (!normalized.length) return null;

  const selectIntro = () => {
    resetScrollTop();
    setActiveIndex(-1);
    onTabView?.('__intro__');
    onTabAudio?.('__intro__');
  };

  const selectTab = (i: number) => {
    resetScrollTop();
    setActiveIndex(i);
    const id = normalized[i]?.id;
    if (id) {
      onTabView?.(id);
      onTabAudio?.(id);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 select-none min-h-0 flex-1">
      {title && (
        <p className={cn('text-sm font-bold text-center uppercase tracking-widest mb-1 shrink-0', isLight ? 'text-slate-500' : 'text-slate-400')}>{title}</p>
      )}

      <div
        className="flex gap-3 w-full min-h-0"
        style={{ height: PANEL_H, minHeight: PANEL_H }}
      >
        <div
          className="flex flex-col gap-2 w-[150px] sm:w-[170px] shrink-0 overflow-y-auto custom-scrollbar min-h-0"
          style={{ maxHeight: PANEL_H }}
        >
          <button
            type="button"
            onClick={selectIntro}
            className={cn(
              'flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all border',
              inIntro
                ? 'border-transparent shadow-lg'
                : isLight
                ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
            )}
            style={inIntro ? { background: introHex, boxShadow: `0 0 0 2px ${introHex}55`, color: introTitleColor } : undefined}
            title="Return to opening introduction"
          >
            <span className="flex-1 leading-snug" style={{ color: inIntro ? introTitleColor : undefined }}>
              Introduction
            </span>
            {inIntro && <ChevronRight className="w-4 h-4 shrink-0" />}
          </button>
          {normalized.map((tab, i) => {
            const isActive = i === activeIndex;
            const hex = tabAccentHex(tab, i);
            const titleColor = (tab.labelColor && String(tab.labelColor).trim()) || contrastTextOn(hex);
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
                    ? 'border-transparent shadow-lg'
                    : isLight
                    ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200',
                  isDropTarget && 'ring-2 ring-indigo-400 ring-offset-1'
                )}
                style={isActive ? { background: hex, boxShadow: `0 0 0 2px ${hex}55`, color: titleColor } : undefined}
              >
                {tab.icon && <span className="text-base shrink-0">{tab.icon}</span>}
                <span className="flex-1 leading-snug" style={{ color: isActive ? titleColor : undefined }} dangerouslySetInnerHTML={{ __html: markdownToInlineHtml(tab.label) }} />
                {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div
          data-tab-drop-zone={dropZoneId || undefined}
          className={cn(
            'flex-1 min-w-0 relative rounded-2xl border transition-colors overflow-hidden',
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800/60 border-slate-700',
            panelHighlighted && 'ring-4 ring-indigo-400/80 ring-inset bg-indigo-50/40'
          )}
          style={{ height: PANEL_H, minHeight: PANEL_H }}
        >
          {panelHighlighted && (
            <div className="absolute inset-x-0 top-0 z-10 px-3 py-1.5 text-center text-[11px] font-bold text-white bg-indigo-600/90 pointer-events-none">
              Drop here to attach image to this tab
            </div>
          )}
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar"
            style={{ overflowAnchor: 'none' }}
          >
            <div key={panelKey} className="box-border w-full p-6 sm:p-8 text-left align-top">
              {inIntro ? (
                <>
                  <div className="flex items-center gap-2 mb-4 w-full">
                    <div className="w-1 h-8 rounded-full" style={{ background: introHex }} />
                    <h3 className="font-extrabold text-lg" style={{ color: introHex }}>
                      Introduction
                    </h3>
                  </div>
                  <div
                    className={cn('text-sm leading-relaxed w-full', isLight ? 'text-slate-700' : 'text-slate-200')}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(introOst) }}
                  />
                  <p className="mt-6 text-xs font-semibold" style={{ color: introHex }}>
                    Select a topic tab to continue →
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4 w-full">
                    <div className="w-1 h-8 rounded-full" style={{ background: tabAccentHex(activeTab, Math.max(0, activeIndex)) }} />
                    <h3
                      className="font-extrabold text-lg"
                      style={{ color: tabAccentHex(activeTab, Math.max(0, activeIndex)) }}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(activeTab!.label) }}
                    />
                  </div>
                  <div className={cn('text-sm leading-relaxed tab-ost-body w-full', isLight ? 'text-slate-700' : 'text-slate-200')} dangerouslySetInnerHTML={{ __html: markdownToHtml(formatTabOstBody(activeTab!.content) || formatTabOstBody(activeTab!.voiceOverText || '')) }} />
                  {activeTab!.imageUrl && (
                    <div className="mt-6 pt-4 border-t border-slate-200/80 w-full">
                      <div className="rounded-xl overflow-hidden border border-slate-200/80 shadow-sm max-w-md mx-auto">
                        <img
                          src={activeTab!.imageUrl}
                          alt=""
                          className="w-full h-auto max-h-72 object-contain bg-slate-50"
                          onLoad={resetScrollTop}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
