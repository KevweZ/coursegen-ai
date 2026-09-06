import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { markdownToHtml, markdownToInlineHtml } from '../../lib/markdownInline';
import { formatTabIntroOst, formatTabOstBody } from '../../lib/formatTabIntroOst';
import { tabAccentHex, TAB_INTRO_DEFAULT_HEX, BLOCKS_WELL_DEFAULT, resolveHexColor } from '../../lib/tabAccents';
import { contrastTextOn } from '../../lib/colorContrast';
import { Check, ChevronRight } from 'lucide-react';
import { EnlargeableImage, type InFlowPromoteInfo } from '../player/EnlargeableImage';

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

/** Presentation only. `'default'` is the current rounded tabs; `'blocks'` is the Blind Spot-style stack. */
export type VerticalTabSkin = 'default' | 'blocks';

type TVTheme = 'light' | 'dark' | 'unified';

interface Props {
  tabs: VerticalTab[];
  title?: string;
  theme?: TVTheme;
  /** Opt-in visual skin. Omit or `'default'` keeps the current look. */
  skin?: VerticalTabSkin | string;
  /** Tab ids the learner has opened (checkmarks on the blocks skin). */
  visitedTabIds?: string[];
  onTabView?: (tabId: string) => void;
  /** Fired only on user click (not mount) — use for per-tab audio cutover. Pass "__intro__" for intro. */
  onTabAudio?: (tabId: string) => void;
  introContent?: string;
  /** Color of the Introduction tab + intro heading */
  introColor?: string;
  introLabelColor?: string;
  /** Slide-level narration — used to enrich thin intro OST into short bullets */
  introVoiceOver?: string;
  /** Optional source/AI image under intro panel text (opening narration) */
  introImageUrl?: string;
  /** Notify parent of active tab (null = intro) for tab-scoped floating images */
  onActiveTabChange?: (tabId: string | null) => void;
  /** While dragging a floating image over a tab zone, highlight it */
  highlightTabId?: string | null;
  onRemoveIntroImage?: () => void;
  onRemoveTabImage?: (tabId: string) => void;
  onCropIntroImage?: (dataUrl: string) => void;
  onCropTabImage?: (tabId: string, dataUrl: string) => void;
  onPromoteIntroImage?: (info: InFlowPromoteInfo) => void;
  onPromoteTabImage?: (tabId: string, info: InFlowPromoteInfo) => void;
  /** Blocks skin content-well fill. Defaults to navy. */
  wellColor?: string;
}

/** Match horizontal tabs: fill stage height; leave a little room so CC is not cramped. */
const PANEL_H = 520;

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function isBlocksSkin(skin?: string | null): boolean {
  return String(skin || '').trim().toLowerCase() === 'blocks';
}

export default function TabbedContentVertical({
  tabs = [],
  title,
  theme = 'light',
  skin = 'default',
  visitedTabIds,
  onTabView,
  onTabAudio,
  introContent,
  introColor,
  introLabelColor,
  introVoiceOver,
  introImageUrl,
  onActiveTabChange,
  highlightTabId = null,
  onRemoveIntroImage,
  onRemoveTabImage,
  onCropIntroImage,
  onCropTabImage,
  onPromoteIntroImage,
  onPromoteTabImage,
  wellColor,
}: Props) {
  const normalized = useMemo(
    () => (tabs || []).map((t, i) => ({ ...t, id: (t?.id != null && String(t.id).trim()) ? String(t.id) : `tab-${i}` })),
    [tabs]
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [localVisited, setLocalVisited] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(-1);
    setLocalVisited([]);
  }, [normalized.map(t => t.id).join('|')]);

  const isLight = theme === 'light';
  const introHex = (introColor && String(introColor).trim()) || TAB_INTRO_DEFAULT_HEX;
  const introTitleColor = (introLabelColor && String(introLabelColor).trim()) || contrastTextOn(introHex);
  const inIntro = activeIndex < 0 || !normalized.length;
  const activeTab = inIntro ? null : normalized[Math.min(activeIndex, normalized.length - 1)];
  const dropZoneId = inIntro ? '__intro__' : (activeTab?.id || '');
  const panelHighlighted = !!(highlightTabId && dropZoneId && highlightTabId === dropZoneId);
  const panelKey = inIntro ? '__intro__' : (activeTab?.id ?? '__empty__');
  const visited = useMemo(() => {
    const s = new Set<string>(visitedTabIds || []);
    localVisited.forEach(id => s.add(id));
    return s;
  }, [visitedTabIds, localVisited]);

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
      setLocalVisited(prev => (prev.includes(id) ? prev : [...prev, id]));
      onTabView?.(id);
      onTabAudio?.(id);
    }
  };

  if (isBlocksSkin(skin)) {
    return (
      <VerticalTabsBlocksSkin
        title={title}
        normalized={normalized}
        inIntro={inIntro}
        activeIndex={activeIndex}
        activeTab={activeTab}
        introHex={introHex}
        introTitleColor={introTitleColor}
        introOst={introOst}
        introImageUrl={introImageUrl}
        panelKey={panelKey}
        dropZoneId={dropZoneId}
        panelHighlighted={panelHighlighted}
        highlightTabId={highlightTabId}
        visited={visited}
        scrollRef={scrollRef}
        resetScrollTop={resetScrollTop}
        selectIntro={selectIntro}
        selectTab={selectTab}
        onRemoveIntroImage={onRemoveIntroImage}
        onRemoveTabImage={onRemoveTabImage}
        onCropIntroImage={onCropIntroImage}
        onCropTabImage={onCropTabImage}
        onPromoteIntroImage={onPromoteIntroImage}
        onPromoteTabImage={onPromoteTabImage}
        wellColor={wellColor}
      />
    );
  }

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
                key={tab.id || `vtab-${i}`}
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
                  {introImageUrl && (
                    <div className="mt-6 pt-4 border-t border-slate-200/80 w-full">
                      <EnlargeableImage
                        src={introImageUrl}
                        wrapperClassName="max-w-2xl mx-auto"
                        className="max-h-[28rem] bg-transparent"
                        onLoad={resetScrollTop}
                        onRemove={onRemoveIntroImage}
                        onCrop={onCropIntroImage}
                        onPromoteToFloat={onPromoteIntroImage}
                      />
                    </div>
                  )}
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
                      <EnlargeableImage
                        src={activeTab!.imageUrl}
                        wrapperClassName="max-w-2xl mx-auto"
                        className="max-h-[28rem] bg-transparent"
                        onLoad={resetScrollTop}
                        onRemove={onRemoveTabImage && activeTab?.id ? () => onRemoveTabImage(activeTab.id) : undefined}
                        onCrop={onCropTabImage && activeTab?.id ? (url) => onCropTabImage(activeTab.id, url) : undefined}
                        onPromoteToFloat={onPromoteTabImage && activeTab?.id ? (info) => onPromoteTabImage(activeTab.id, info) : undefined}
                      />
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

interface BlocksSkinProps {
  title?: string;
  normalized: VerticalTab[];
  inIntro: boolean;
  activeIndex: number;
  activeTab: VerticalTab | null;
  introHex: string;
  introTitleColor: string;
  introOst: string;
  introImageUrl?: string;
  panelKey: string;
  dropZoneId: string;
  panelHighlighted: boolean;
  highlightTabId: string | null;
  visited: Set<string>;
  scrollRef: React.RefObject<HTMLDivElement>;
  resetScrollTop: () => void;
  selectIntro: () => void;
  selectTab: (i: number) => void;
  onRemoveIntroImage?: () => void;
  onRemoveTabImage?: (tabId: string) => void;
  onCropIntroImage?: (dataUrl: string) => void;
  onCropTabImage?: (tabId: string, dataUrl: string) => void;
  onPromoteIntroImage?: (info: InFlowPromoteInfo) => void;
  onPromoteTabImage?: (tabId: string, info: InFlowPromoteInfo) => void;
  wellColor?: string;
}

function blockFillStyle(hex: string, isActive: boolean, ink: string, well: string, wellInk: string): React.CSSProperties {
  if (isActive) {
    return {
      background: well,
      color: wellInk,
      ['--tab-ink' as string]: wellInk,
      boxShadow: `inset 4px 0 0 0 ${hex}`,
    };
  }
  return {
    background: hex,
    color: ink,
    ['--tab-ink' as string]: ink,
  };
}

function VerticalTabsBlocksSkin({
  title,
  normalized,
  inIntro,
  activeIndex,
  activeTab,
  introHex,
  introTitleColor: _introTitleColor,
  introOst,
  introImageUrl,
  panelKey,
  dropZoneId,
  panelHighlighted,
  highlightTabId,
  visited,
  scrollRef,
  resetScrollTop,
  selectIntro,
  selectTab,
  onRemoveIntroImage,
  onRemoveTabImage,
  onCropIntroImage,
  onCropTabImage,
  onPromoteIntroImage,
  onPromoteTabImage,
  wellColor,
}: BlocksSkinProps) {
  const well = resolveHexColor(wellColor, BLOCKS_WELL_DEFAULT);
  const wellInk = contrastTextOn(well);
  const imageUrl = inIntro ? introImageUrl : activeTab?.imageUrl;
  const bodyHtml = inIntro
    ? markdownToHtml(introOst)
    : markdownToHtml(formatTabOstBody(activeTab?.content || '') || formatTabOstBody(activeTab?.voiceOverText || ''));
  const headingHtml = inIntro ? null : markdownToHtml(activeTab?.label || '');
  const onRemoveImage = inIntro
    ? onRemoveIntroImage
    : (onRemoveTabImage && activeTab?.id ? () => onRemoveTabImage(activeTab.id) : undefined);
  const onCropImage = inIntro
    ? onCropIntroImage
    : (onCropTabImage && activeTab?.id ? (url: string) => onCropTabImage(activeTab.id, url) : undefined);
  const onPromoteImage = inIntro
    ? onPromoteIntroImage
    : (onPromoteTabImage && activeTab?.id ? (info: InFlowPromoteInfo) => onPromoteTabImage(activeTab.id, info) : undefined);

  return (
    <div className="tab-skin-blocks w-full flex flex-col gap-2 select-none min-h-0 flex-1" style={{ color: wellInk }}>
      {title && (
        <p className="text-sm font-bold text-center uppercase tracking-widest mb-1 shrink-0" style={{ color: '#64748b' }}>{title}</p>
      )}

      <div className="flex w-full min-h-0 overflow-hidden" style={{ height: PANEL_H, minHeight: PANEL_H }}>
        <div
          className="flex flex-col w-[168px] sm:w-[196px] shrink-0 min-h-0 overflow-y-auto custom-scrollbar"
          style={{ maxHeight: PANEL_H, gap: 2, background: '#ffffff' }}
        >
          <button
            type="button"
            onClick={selectIntro}
            className="relative flex items-center justify-center w-full flex-1 min-h-[64px] px-3 py-2 text-center font-extrabold text-[11px] sm:text-xs leading-tight uppercase tracking-wide border-0"
            style={blockFillStyle(introHex, inIntro, contrastTextOn(introHex), well, wellInk)}
            title="Return to opening introduction"
          >
            <span className="block w-full" style={{ color: inIntro ? wellInk : contrastTextOn(introHex) }}>
              Introduction
            </span>
          </button>
          {normalized.map((tab, i) => {
            const isActive = i === activeIndex;
            const hex = tabAccentHex(tab, i);
            const idleInk = (tab.labelColor && String(tab.labelColor).trim()) || contrastTextOn(hex);
            const titleColor = isActive ? wellInk : idleInk;
            const isDropTarget = highlightTabId === tab.id;
            const seen = visited.has(tab.id);
            return (
              <button
                key={tab.id || `vtab-${i}`}
                type="button"
                data-tab-drop-zone={tab.id}
                onClick={() => selectTab(i)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'relative flex items-center justify-center w-full flex-1 min-h-[64px] px-3 py-2 text-center font-extrabold text-[11px] sm:text-xs leading-tight uppercase tracking-wide border-0',
                  isDropTarget && 'ring-2 ring-indigo-400 ring-inset'
                )}
                style={blockFillStyle(hex, isActive, idleInk, well, wellInk)}
              >
                {seen && (
                  <Check
                    className="absolute top-1.5 left-1.5 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: titleColor }}
                    strokeWidth={3}
                    aria-hidden
                  />
                )}
                {tab.icon && <span className="absolute top-1.5 right-1.5 text-sm leading-none">{tab.icon}</span>}
                <span
                  className="block w-full px-2"
                  style={{ color: titleColor }}
                  dangerouslySetInnerHTML={{ __html: markdownToInlineHtml(tab.label) }}
                />
              </button>
            );
          })}
        </div>

        <div
          data-tab-drop-zone={dropZoneId || undefined}
          className={cn('flex-1 min-w-0 relative overflow-hidden', panelHighlighted && 'ring-4 ring-indigo-400/80 ring-inset')}
          style={{ height: PANEL_H, minHeight: PANEL_H, background: well, color: wellInk }}
        >
          {panelHighlighted && (
            <div className="absolute inset-x-0 top-0 z-10 px-3 py-1.5 text-center text-[11px] font-bold pointer-events-none" style={{ color: '#fff', background: 'rgba(79,70,229,0.92)' }}>
              Drop here to attach image to this tab
            </div>
          )}
          <div key={panelKey} className="flex h-full min-h-0 w-full items-start" style={{ color: wellInk }}>
            <div
              ref={scrollRef}
              className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar"
              style={{ overflowAnchor: 'none' }}
            >
              <div className="box-border w-full p-6 sm:p-7 text-left" style={{ color: wellInk }}>
                {inIntro ? (
                  <h3 className="font-extrabold text-lg uppercase tracking-wide mb-4" style={{ color: wellInk }}>
                    Introduction
                  </h3>
                ) : (
                  <h3
                    className="font-extrabold text-lg uppercase tracking-wide mb-4"
                    style={{ color: wellInk }}
                    dangerouslySetInnerHTML={{ __html: headingHtml || '' }}
                  />
                )}
                <div
                  className="text-sm leading-relaxed tab-ost-body w-full"
                  style={{ color: wellInk }}
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
                {inIntro && (
                  <p className="mt-6 text-xs font-semibold" style={{ color: introHex }}>
                    Select a topic tab to continue →
                  </p>
                )}
              </div>
            </div>
            {imageUrl && (
              <div className="relative shrink-0 self-center w-[46%] max-w-[480px] pt-6 sm:pt-7 pr-6 pb-6 overflow-hidden">
                <EnlargeableImage
                  src={imageUrl}
                  wrapperClassName="w-full"
                  className="w-full h-auto max-h-[28rem] object-contain object-top bg-transparent"
                  onLoad={resetScrollTop}
                  onRemove={onRemoveImage}
                  onCrop={onCropImage}
                  onPromoteToFloat={onPromoteImage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
