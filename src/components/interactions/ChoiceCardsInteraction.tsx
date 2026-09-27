import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface ChoiceCard {
  id: string;
  label: string;
  body?: string;
  color?: string;
  /** Teaching highlight after Check — not a scored knowledge-check key. */
  isCorrect?: boolean;
  accepted?: boolean;
}

interface Props {
  cards?: ChoiceCard[];
  prompt?: string;
  feedback?: string;
  selectMode?: 'single' | 'multi';
  theme?: 'light' | 'dark' | 'unified';
  onChecked?: () => void;
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

/**
 * Teaching select-tiles: 3–5 tappable cards. Not a knowledge check —
 * narration still plays, no KC chrome, explanatory feedback only.
 */
export default function ChoiceCardsInteraction({
  cards = [],
  prompt,
  feedback,
  selectMode = 'multi',
  theme = 'light',
  onChecked,
}: Props) {
  const normalized = (cards || []).map((c, i) => ({
    ...c,
    id: (c?.id != null && String(c.id).trim()) ? String(c.id) : `cc-${i}`,
  }));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const isLight = theme === 'light';

  if (!normalized.length) return null;

  const toggle = (id: string) => {
    if (submitted) return;
    setSelected(prev => {
      if (selectMode === 'single') return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const anyAccepted = normalized.some(isAccepted);

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
          const on = selected.has(card.id);
          const accepted = isAccepted(card);
          let ring = on ? tone.border : 'transparent';
          let bg = card.color && /^#[0-9a-fA-F]{6}$/.test(card.color) ? card.color : tone.bg;
          if (submitted && anyAccepted) {
            if (accepted && on) ring = '#10b981';
            else if (accepted && !on) ring = '#86efac';
            else if (!accepted && on) ring = '#f87171';
          }
          return (
            <button
              key={card.id}
              type="button"
              disabled={submitted}
              onClick={() => toggle(card.id)}
              className="text-left rounded-2xl border-2 p-4 min-h-[7.5rem] transition-all disabled:cursor-default"
              style={{ background: bg, borderColor: ring, color: tone.ink }}
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] mb-1.5">{card.label}</p>
              {card.body && <p className="text-sm leading-relaxed opacity-90">{card.body}</p>}
            </button>
          );
        })}
      </div>
      {!submitted ? (
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
      ) : feedback ? (
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
