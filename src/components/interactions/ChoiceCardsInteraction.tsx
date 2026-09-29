import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ChoiceCard {
  id: string;
  label: string;
  body?: string;
  /** Unique callout shown after click in explore (click-to-reveal) mode. */
  reveal?: string;
  color?: string;
  /** Teaching highlight after Check — not a scored knowledge-check key. */
  isCorrect?: boolean;
  accepted?: boolean;
}

export type ChoiceCardsMode = 'explore' | 'select';

interface Props {
  cards?: ChoiceCard[];
  prompt?: string;
  feedback?: string;
  selectMode?: 'single' | 'multi';
  /** explore = click-to-reveal each card; select = pick then Check. */
  mode?: ChoiceCardsMode;
  theme?: 'light' | 'dark' | 'unified';
  onChecked?: () => void;
  onExplore?: (cardId: string) => void;
}

const PASTELS = [
  { bg: '#e0f2fe', border: '#38bdf8', ink: '#0c4a6e' },
  { bg: '#dcfce7', border: '#4ade80', ink: '#14532d' },
  { bg: '#fef3c7', border: '#fbbf24', ink: '#78350f' },
  { bg: '#fce7f3', border: '#f472b6', ink: '#9d174d' },
  { bg: '#eef2ff', border: '#818cf8', ink: '#312e81' },
];

function isAccepted(card: ChoiceCard): boolean {
  return card?.isCorrect === true || card?.accepted === true;
}

export function inferChoiceCardsMode(data: {
  mode?: string;
  prompt?: string;
  cards?: ChoiceCard[];
  items?: ChoiceCard[];
  selectMode?: string;
} | null | undefined): ChoiceCardsMode {
  if (!data) return 'select';
  if (data.mode === 'explore' || data.mode === 'select') return data.mode;
  const cards = (Array.isArray(data.cards) && data.cards.length ? data.cards : data.items) || [];
  const hasAccepted = cards.some(isAccepted);
  if (hasAccepted) return 'select';
  const hasReveal = cards.some(c => String(c?.reveal || '').trim());
  if (hasReveal) return 'explore';
  const prompt = String(data.prompt || '');
  if (/select each|click each|explore|visit|reveal|callout/i.test(prompt)) return 'explore';
  // No answer key — Check would show the same copy for every click.
  return 'explore';
}

/**
 * Teaching tiles: 3–4 colorful cards.
 * explore = click-to-reveal (unique callout per card, Continue after all visited).
 * select = pick tiles then Check (Trade-offs style).
 */
export default function ChoiceCardsInteraction({
  cards = [],
  prompt,
  feedback,
  selectMode = 'multi',
  mode: modeProp,
  theme = 'light',
  onChecked,
  onExplore,
}: Props) {
  const normalized = (cards || []).map((c, i) => ({
    ...c,
    id: (c?.id != null && String(c.id).trim()) ? String(c.id) : `cc-${i}`,
  }));
  const mode = inferChoiceCardsMode({ mode: modeProp, prompt, cards: normalized, selectMode });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const isLight = theme === 'light';

  if (!normalized.length) return null;

  const toggleSelect = (id: string) => {
    if (submitted) return;
    setSelected(prev => {
      if (selectMode === 'single') return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exploreCard = (id: string) => {
    setActiveId(id);
    setVisited(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    onExplore?.(id);
  };

  const anyAccepted = normalized.some(isAccepted);
  const activeCard = normalized.find(c => c.id === activeId);
  const callout = activeCard
    ? (String(activeCard.reveal || '').trim() || String(activeCard.body || '').trim())
    : '';
  const allVisited = visited.size >= normalized.length;

  return (
    <div className="w-full space-y-5">
      {prompt && (
        <p className={cn('text-base font-semibold leading-snug', isLight ? 'text-slate-800' : 'text-slate-100')}>
          {prompt}
        </p>
      )}
      <div className={cn('grid gap-3', normalized.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
        {normalized.map((card, i) => {
          const tone = PASTELS[i % PASTELS.length];
          const on = mode === 'explore' ? activeId === card.id : selected.has(card.id);
          const accepted = isAccepted(card);
          const seen = visited.has(card.id);
          let ring = on ? tone.border : 'transparent';
          let bg = card.color && /^#[0-9a-fA-F]{6}$/.test(card.color) ? card.color : tone.bg;
          if (mode === 'select' && submitted && anyAccepted) {
            if (accepted) ring = '#10b981';
            else if (on) ring = '#f87171';
          }
          const selectedLook = on && !(mode === 'select' && submitted);
          return (
            <button
              key={card.id}
              type="button"
              disabled={mode === 'select' && submitted}
              onClick={() => (mode === 'explore' ? exploreCard(card.id) : toggleSelect(card.id))}
              className={cn(
                'relative text-left rounded-2xl p-4 min-h-[7.5rem] transition-all disabled:cursor-default',
                selectedLook ? 'border-[4px]' : 'border-2'
              )}
              style={{
                background: bg,
                borderColor: ring,
                color: tone.ink,
                boxShadow: selectedLook ? `0 0 0 2px ${tone.border}` : undefined,
              }}
            >
              {mode === 'select' && submitted && accepted && (
                <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm" aria-label="Correct">
                  <Check className="w-4 h-4" strokeWidth={3} />
                </span>
              )}
              {mode === 'explore' && seen && (
                <span
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center"
                  aria-label="Visited"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
              <p className="text-xs font-black uppercase tracking-[0.16em] mb-1.5 pr-7">{card.label}</p>
              {card.body && <p className="text-sm leading-relaxed opacity-90 pr-6">{card.body}</p>}
            </button>
          );
        })}
      </div>

      {mode === 'explore' && callout && (
        <div className={cn(
          'p-4 rounded-xl text-sm leading-relaxed',
          isLight ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-slate-800/60 border border-slate-600 text-slate-100'
        )}>
          {activeCard?.label && (
            <p className="text-xs font-black uppercase tracking-widest mb-1.5 opacity-70">{activeCard.label}</p>
          )}
          <p>{callout}</p>
        </div>
      )}

      {mode === 'explore' && allVisited && feedback ? (
        <div className={cn(
          'p-4 rounded-xl text-sm leading-relaxed',
          isLight ? 'bg-indigo-50 border border-indigo-200 text-slate-800' : 'bg-indigo-950/40 border border-indigo-500/30 text-slate-100'
        )}>
          {feedback}
        </div>
      ) : null}

      {mode === 'select' && !submitted && (
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => {
            setSubmitted(true);
            onChecked?.();
          }}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all"
        >
          Check
        </button>
      )}
      {mode === 'select' && submitted && feedback ? (
        <div className={cn(
          'p-4 rounded-xl text-sm leading-relaxed',
          isLight ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-slate-800/60 border border-slate-600 text-slate-100'
        )}>
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
