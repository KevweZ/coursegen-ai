/**
 * Process interaction — numbered stepper (replaces classic horizontal tabs).
 * Same data model (intro + tabs) as tabbed-horizontal; presentation is the process rail.
 */
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { markdownToHtml } from '../../lib/markdownInline';
import { formatTabIntroOst, formatTabOstBody } from '../../lib/formatTabIntroOst';
import { TAB_INTRO_DEFAULT_HEX, tabAccentHex, BLOCKS_WELL_DEFAULT, resolveHexColor } from '../../lib/tabAccents';
import { contrastTextOn } from '../../lib/colorContrast';
import { EnlargeableImage, type InFlowPromoteInfo } from '../player/EnlargeableImage';

export interface HorizontalTab {
  id: string;
  label: string;
  color?: string;
  /** Selected step title text (defaults to auto-contrast on the fill). */
  labelColor?: string;
  content: string;
  expandedContent?: string;
  imageUrl?: string;
  voiceOverText?: string;
  voiceOverUrl?: string;
}

type THTheme = 'light' | 'dark' | 'unified';

interface Props {
  tabs: HorizontalTab[];
  title?: string;
  theme?: THTheme;
  onTabView?: (tabId: string) => void;
  onTabAudio?: (tabId: string) => void;
  introContent?: string;
  introColor?: string;
  introLabelColor?: string;
  introVoiceOver?: string;
  introImageUrl?: string;
  onActiveTabChange?: (tabId: string | null) => void;
  highlightTabId?: string | null;
  onRemoveIntroImage?: () => void;
  onRemoveTabImage?: (tabId: string) => void;
  onCropIntroImage?: (dataUrl: string) => void;
  onCropTabImage?: (tabId: string, dataUrl: string) => void;
  onPromoteIntroImage?: (info: InFlowPromoteInfo) => void;
  onPromoteTabImage?: (tabId: string, info: InFlowPromoteInfo) => void;
  /** `'blocks'` uses the dark/colored reading area (same idea as vertical-tab Blocks). */
  skin?: string;
  /** Blocks skin content-well fill. */
  wellColor?: string;
  /** When false, hide STEP 01 / STEP 02 labels (circles stay numbered). Default true. */
  showStepLabels?: boolean;
}

const INTRO_COLOR = TAB_INTRO_DEFAULT_HEX;
const PANEL_H = 520;
const RAIL_TEAL = '#0d9488';
/** Tall enough for 36px circles + active scale + border without a scrollbar. */
const RAIL_H = 96;

function isBlocksSkin(skin?: string | null): boolean {
  return String(skin || '').trim().toLowerCase() === 'blocks';
}

function normalizeTabs(tabs: HorizontalTab[]): HorizontalTab[] {
  return (tabs || []).map((t, i) => ({
    ...t,
    id: (t?.id != null && String(t.id).trim()) ? String(t.id) : `tab-${i}`,
  }));
}

function stepLabel(n: number): string {
  return `STEP ${String(n).padStart(2, '0')}`;
}

export default function TabbedContentHorizontal({
  tabs = [],
  title,
  theme = 'light',
  onTabView,
  onTabAudio,
  introContent,
  introColor,
  introLabelColor: _introLabelColor,
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
  skin,
  wellColor,
  showStepLabels = true,
}: Props) {
  const normalized = useMemo(() => normalizeTabs(tabs), [tabs]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isLight = theme === 'light';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalized.map(t => t.id).join('|')]);

  const inIntro = activeIndex < 0;
  const activeTab = inIntro || !normalized.length
    ? null
    : normalized[Math.min(activeIndex, normalized.length - 1)];
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

  const introHex = (introColor && String(introColor).trim()) || INTRO_COLOR;
  const activeColor = inIntro
    ? introHex
    : tabAccentHex(activeTab || undefined, Math.max(0, activeIndex));
  const dropZoneId = inIntro ? '__intro__' : (activeTab?.id || '');
  const panelHighlighted = !!(highlightTabId && dropZoneId && highlightTabId === dropZoneId);
  const imageUrl = inIntro ? introImageUrl : activeTab?.imageUrl;
  const headingHtml = inIntro ? null : markdownToHtml(activeTab!.label);
  const bodyHtml = inIntro
    ? markdownToHtml(introOst)
    : markdownToHtml(formatTabOstBody(activeTab!.content) || formatTabOstBody(activeTab!.voiceOverText || ''));
  const onRemoveImage = inIntro
    ? onRemoveIntroImage
    : (onRemoveTabImage && activeTab?.id ? () => onRemoveTabImage(activeTab.id) : undefined);
  const onCropImage = inIntro
    ? onCropIntroImage
    : (onCropTabImage && activeTab?.id ? (url: string) => onCropTabImage(activeTab.id, url) : undefined);
  const onPromoteImage = inIntro
    ? onPromoteIntroImage
    : (onPromoteTabImage && activeTab?.id ? (info: InFlowPromoteInfo) => onPromoteTabImage(activeTab.id, info) : undefined);

  const blocks = isBlocksSkin(skin);
  const well = resolveHexColor(wellColor, BLOCKS_WELL_DEFAULT);
  const panelBg = blocks ? well : (isLight ? '#ffffff' : '#0f172a');
  const ink = blocks ? contrastTextOn(well) : (isLight ? '#0f172a' : '#f8fafc');
  const muted = blocks
    ? (ink === '#ffffff' ? 'rgba(248,250,252,0.82)' : 'rgba(15,23,42,0.72)')
    : (isLight ? '#475569' : '#cbd5e1');
  const rail = RAIL_TEAL;

  return (
    <div className={`w-full flex flex-col gap-2 select-none min-h-0 flex-1 ${blocks ? 'tab-skin-blocks' : ''}`}>
      {title && (
        <p className={`text-sm font-bold text-center uppercase tracking-widest mb-1 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {title}
        </p>
      )}

      <div
        data-tab-drop-zone={dropZoneId || undefined}
        className={`relative overflow-hidden flex flex-col ${panelHighlighted ? 'ring-4 ring-indigo-400/80 ring-inset' : ''}`}
        style={{ height: PANEL_H, minHeight: PANEL_H, background: panelBg }}
      >
        {panelHighlighted && (
          <div className="absolute inset-x-0 top-0 z-10 px-3 py-1.5 text-center text-[11px] font-bold text-white bg-indigo-600/90 pointer-events-none">
            Drop here to attach image to this step
          </div>
        )}

        <div key={panelKey} className="flex flex-1 min-h-0 w-full items-start overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar"
            style={{ overflowAnchor: 'none' }}
          >
            <div className="box-border w-full p-6 sm:p-7 text-left">
              {(inIntro || showStepLabels) && (
                <p
                  className="text-sm font-bold uppercase tracking-[0.18em] mb-2"
                  style={{ color: activeColor }}
                >
                  {inIntro ? 'Overview' : stepLabel(activeIndex + 1)}
                </p>
              )}
              {inIntro ? (
                <h3 className="font-extrabold text-lg mb-4" style={{ color: ink }}>
                  Introduction
                </h3>
              ) : (
                <h3
                  className="font-extrabold text-lg mb-4"
                  style={{ color: ink }}
                  dangerouslySetInnerHTML={{ __html: headingHtml || '' }}
                />
              )}
              <div
                className="text-sm leading-relaxed tab-ost-body w-full"
                style={{ color: muted }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              {!inIntro && activeTab!.expandedContent && (
                <div
                  className="mt-4 pt-4 border-t text-sm leading-relaxed tab-ost-body w-full"
                  style={{ borderColor: blocks ? (ink === '#ffffff' ? 'rgba(248,250,252,0.18)' : 'rgba(15,23,42,0.16)') : (isLight ? '#e2e8f0' : '#334155'), color: muted }}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(formatTabOstBody(activeTab!.expandedContent)) }}
                />
              )}
              {inIntro && (
                <p className="mt-6 text-xs font-semibold" style={{ color: activeColor }}>
                  {showStepLabels ? 'Select a step below to continue →' : 'Select below to continue →'}
                </p>
              )}
            </div>
          </div>
          {imageUrl && (
            <div
              className="relative shrink-0 self-start w-[38%] max-w-[300px] pt-6 sm:pt-7 pr-6 pb-6 overflow-hidden"
            >
              <div style={{ border: `2px solid ${activeColor}` }}>
                <EnlargeableImage
                  src={imageUrl}
                  wrapperClassName="w-full"
                  className="w-full h-auto max-h-[22rem] object-contain object-top bg-transparent"
                  onLoad={resetScrollTop}
                  onRemove={onRemoveImage}
                  onCrop={onCropImage}
                  onPromoteToFloat={onPromoteImage}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="relative shrink-0 flex items-center"
          style={{ minHeight: RAIL_H, height: RAIL_H, background: rail }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: activeColor }} />
          <div className="relative z-[1] flex items-center justify-center gap-3 sm:gap-4 w-full px-5 py-4">
            <button
              type="button"
              onClick={selectIntro}
              title="Overview"
              aria-current={inIntro ? 'true' : undefined}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black border-2"
              style={
                inIntro
                  ? { background: '#ffffff', color: rail, borderColor: '#ffffff' }
                  : { background: 'rgba(15,23,42,0.35)', color: '#ffffff', borderColor: 'transparent' }
              }
            >
              i
            </button>
            {normalized.map((tab, i) => {
              const isActive = i === activeIndex;
              const isDone = !inIntro && i < activeIndex;
              const isDropTarget = highlightTabId === tab.id;
              return (
                <button
                  key={tab.id || `tab-${i}`}
                  type="button"
                  data-tab-drop-zone={tab.id}
                  onClick={() => selectTab(i)}
                  title={tab.label}
                  aria-label={`Step ${i + 1}: ${tab.label.replace(/<[^>]+>/g, '')}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black border-2 ${
                    isDropTarget ? 'ring-2 ring-white ring-offset-2 ring-offset-teal-700' : ''
                  }`}
                  style={
                    isActive
                      ? { background: '#ffffff', color: rail, borderColor: '#ffffff' }
                      : isDone
                      ? { background: 'rgba(15,23,42,0.45)', color: '#ffffff', borderColor: 'transparent' }
                      : { background: 'rgba(255,255,255,0.28)', color: '#ffffff', borderColor: 'transparent' }
                  }
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
