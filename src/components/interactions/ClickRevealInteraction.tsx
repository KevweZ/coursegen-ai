import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { markdownToHtml } from '../../lib/markdownInline';
import { sanitizeOstText } from '../../lib/formatTabIntroOst';
import type { OstSectionGroup } from '../../lib/ostSectionGroups';
import { EnlargeableImage } from '../player/EnlargeableImage';
import InteractionIntroColumn from './InteractionIntroColumn';

export interface RevealItem {
  id: string;
  term: string;
  definition: string;
  /** Optional AI/source image shown under the revealed definition */
  imageUrl?: string;
}

interface ClickRevealProps {
  items?: RevealItem[];
  title?: string;
  /** Left-column introduction (slide content). Instruction-only lines are omitted. */
  introContent?: string;
  theme?: 'light' | 'dark' | 'unified';
  /** split = intro left + rows right (default). rows = fields only (grouped columns). */
  variant?: 'split' | 'rows';
  /** Hide term titles; the row itself is "Click to reveal". */
  hideTerms?: boolean;
  /** Authoring: remove a revealed item's image */
  onRemoveItemImage?: (itemId: string) => void;
  onCropItemImage?: (itemId: string, dataUrl: string) => void;
  onPromoteItemImage?: (itemId: string, info: import('../player/EnlargeableImage').InFlowPromoteInfo) => void;
  onItemReveal?: (id: string) => void;
}

const CARD_COLORS = [
  // Light-theme open cards use solid pastel fills (not translucent overlays) so
  // dark body text stays readable. White text is reserved for the small
  // accent-colored status chip only.
  { border: '#6366f1', bg: '#eef2ff', glow: 'rgba(99,102,241,0.18)' },
  { border: '#8b5cf6', bg: '#f5f3ff', glow: 'rgba(139,92,246,0.18)' },
  { border: '#06b6d4', bg: '#ecfeff', glow: 'rgba(6,182,212,0.18)' },
  { border: '#10b981', bg: '#ecfdf5', glow: 'rgba(16,185,129,0.18)' },
  { border: '#f59e0b', bg: '#fffbeb', glow: 'rgba(245,158,11,0.18)' },
  { border: '#ec4899', bg: '#fdf2f8', glow: 'rgba(236,72,153,0.18)' },
];

const CARD_COLORS_DARK = [
  { border: '#6366f1', bg: 'rgba(99,102,241,0.12)', glow: 'rgba(99,102,241,0.3)' },
  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.3)' },
  { border: '#06b6d4', bg: 'rgba(6,182,212,0.12)', glow: 'rgba(6,182,212,0.3)' },
  { border: '#10b981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.3)' },
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.3)' },
  { border: '#ec4899', bg: 'rgba(236,72,153,0.12)', glow: 'rgba(236,72,153,0.3)' },
];

const DEFAULT_PROMPT = 'Select each term to continue →';

const ClickRevealInteraction: React.FC<ClickRevealProps> = ({
  items = [],
  introContent,
  theme = 'light',
  variant = 'split',
  hideTerms = false,
  onItemReveal,
  onRemoveItemImage,
  onCropItemImage,
  onPromoteItemImage,
}) => {
  const normalized = React.useMemo(
    () => (items || []).map((it, i) => ({
      ...it,
      id: (it?.id != null && String(it.id).trim()) ? String(it.id) : `cr-${i}`,
    })),
    [items]
  );
  const introHtml = React.useMemo(() => {
    const ost = sanitizeOstText(introContent);
    return ost ? markdownToHtml(ost) : '';
  }, [introContent]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Colors are driven directly by this `theme` prop (not the global CSS class
  // overrides) because several elements below set text color via inline
  // `style`, which always wins over stylesheet rules without !important --
  // that mismatch was the root cause of invisible white-on-white text in
  // light theme. Simple rule: dark/near-black text on this component's light
  // background at all times; white text is reserved for the small accent-
  // colored chip only, never for body/term text on a light backdrop.
  const isLight = theme === 'light';
  const T = {
    idleBorder: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
    idleBg: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)',
    dot: isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)',
    termText: isLight ? '#0f172a' : 'rgba(255,255,255,0.8)',
    termTextOpen: isLight ? '#0f172a' : '#ffffff',
    chipIdleBg: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
    chipIdleText: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.35)',
    chipRevealedBg: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
    chipRevealedText: isLight ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.5)',
    chevron: isLight ? '#94a3b8' : '#94a3b8',
    definitionText: isLight ? '#334155' : 'rgba(226,232,240,0.95)',
    progressText: isLight ? '#64748b' : '#64748b',
  };

  if (!normalized.length) return null;

  const handleToggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) {
      setRevealedIds(prev => new Set([...prev, id]));
      onItemReveal?.(id);
    }
  };

  return (
    <div className={variant === 'rows'
      ? 'w-full flex flex-col space-y-2.5'
      : 'w-full flex gap-5 min-h-[28rem] flex-1 items-stretch'}
    >
      {variant === 'split' ? (
        <InteractionIntroColumn html={introHtml} cta={DEFAULT_PROMPT} theme={theme} />
      ) : null}

      <div className="flex-1 min-w-0 flex flex-col space-y-2.5">
        {normalized.map((item, idx) => {
          const palette = isLight ? CARD_COLORS : CARD_COLORS_DARK;
          const color = palette[idx % palette.length];
          const isOpen = openId === item.id;
          const hasBeenRevealed = revealedIds.has(item.id);

          return (
            <motion.div
              key={item.id || `reveal-${idx}`}
              layout
              initial={false}
              className="rounded-xl overflow-hidden"
              style={{
                border: `1.5px solid ${isOpen ? color.border : T.idleBorder}`,
                background: isOpen ? color.bg : T.idleBg,
                boxShadow: isOpen ? `0 0 20px ${color.glow}` : 'none',
                transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Term row — always visible, clickable */}
              <button
                onClick={() => handleToggle(item.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isOpen ? color.border : T.dot,
                    boxShadow: isOpen ? `0 0 8px ${color.border}` : 'none',
                  }}
                />

                {/* Term text — always dark/near-black in light theme so it never
                    disappears against the light card background, open or closed. */}
                <span
                  className="flex-1 font-bold text-base leading-snug"
                  style={{ color: isOpen ? T.termTextOpen : T.termText }}
                >
                  {hideTerms
                    ? (isOpen ? 'Hide' : hasBeenRevealed ? 'Revealed' : 'Click to reveal')
                    : <span dangerouslySetInnerHTML={{ __html: markdownToHtml(item.term) }} />}
                </span>

                {hideTerms ? null : (
                <span
                  className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-200"
                  style={{
                    background: hasBeenRevealed
                      ? isOpen ? color.border : T.chipRevealedBg
                      : T.chipIdleBg,
                    color: hasBeenRevealed
                      ? isOpen ? '#fff' : T.chipRevealedText
                      : T.chipIdleText,
                  }}
                >
                  {isOpen ? 'Hide' : hasBeenRevealed ? 'Revealed ✓' : 'Click to reveal'}
                </span>
                )}

                {/* Chevron */}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 text-sm"
                  style={{ color: T.chevron }}
                >
                  ▾
                </motion.span>
              </button>

              {/* Definition — revealed on click */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="def"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      className="px-5 pb-5 pt-1 text-sm leading-relaxed"
                      style={{
                        color: T.definitionText,
                        borderTop: `1px solid ${color.border}44`,
                      }}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(item.definition) }}
                    />
                    {item.imageUrl && (
                      <div className="px-5 pb-5">
                        <EnlargeableImage
                          src={item.imageUrl}
                          wrapperClassName="w-full max-w-md"
                          className="max-h-56 bg-transparent"
                          onRemove={onRemoveItemImage ? () => onRemoveItemImage(item.id) : undefined}
                          onCrop={onCropItemImage ? (url) => onCropItemImage(item.id, url) : undefined}
                          onPromoteToFloat={onPromoteItemImage ? (info) => onPromoteItemImage(item.id, info) : undefined}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Progress indicator */}
        {normalized.length > 1 && (
          <p className="text-xs text-right pt-1" style={{ color: T.progressText }}>
            {revealedIds.size}/{normalized.length} revealed
          </p>
        )}
      </div>
    </div>
  );
};

export function GroupedClickReveal({
  groups,
  theme = 'light',
  onItemReveal,
}: {
  groups: OstSectionGroup[];
  theme?: 'light' | 'dark' | 'unified';
  onItemReveal?: (id: string) => void;
}) {
  const isLight = theme === 'light';
  if (!groups.length) return null;
  return (
    <div className={`w-full grid gap-x-8 gap-y-6 ${groups.length >= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {groups.map((group, gi) => (
        <div key={`${group.heading}-${gi}`} className="min-w-0">
          <h3
            className={`text-sm font-extrabold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}
          >
            {group.heading}
          </h3>
          <ClickRevealInteraction
            variant="rows"
            hideTerms
            theme={theme}
            items={group.bullets.map((b, bi) => ({
              id: `g${gi}-b${bi}`,
              term: '',
              definition: b.startsWith('- ') ? b : `- ${b}`,
            }))}
            onItemReveal={onItemReveal}
          />
        </div>
      ))}
    </div>
  );
}

export default ClickRevealInteraction;
