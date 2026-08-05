/**
 * DropTargetsActivity — categorize items into labeled bins (knowledge check).
 * Schema: { items: [{ id, content, category }], categories: string[] }
 * Also accepts { items: [{ id, text, category }], targets: [{ id, label }] }.
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { markdownToHtml } from '../../lib/markdownInline';

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

export interface DropTargetItem {
  id: string;
  content: string;
  /** Correct category label */
  category?: string;
}

type Theme = 'light' | 'dark' | 'unified';

interface Props {
  items?: DropTargetItem[];
  categories?: string[];
  theme?: Theme;
  onChecked?: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DropTargetsActivity({
  items = [],
  categories: categoriesProp,
  theme = 'light',
  onChecked,
}: Props) {
  const isLight = theme === 'light';

  const normalized = useMemo(() => {
    return (items || []).map((it, i) => ({
      id: it.id || `dt-${i}`,
      content: (it as any).content || (it as any).text || (it as any).label || '',
      category: String(it.category || (it as any).correctCategory || '').trim(),
    })).filter(it => it.content);
  }, [items]);

  const categories = useMemo(() => {
    if (Array.isArray(categoriesProp) && categoriesProp.length) {
      return categoriesProp.map(String);
    }
    const fromItems = [...new Set(normalized.map(i => i.category).filter(Boolean))];
    return fromItems.length ? fromItems : ['Category A', 'Category B'];
  }, [categoriesProp, normalized]);

  const correctMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const it of normalized) {
      if (it.category) m[it.id] = it.category;
    }
    return m;
  }, [normalized]);

  const [bankOrder] = useState(() => shuffle(normalized.map(i => i.id)));
  const [placed, setPlaced] = useState<Record<string, string>>({}); // itemId -> category
  const [checked, setChecked] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const bank = bankOrder
    .map(id => normalized.find(i => i.id === id)!)
    .filter(it => it && !placed[it.id]);

  const placeItem = (itemId: string, zone: string) => {
    const correct = correctMap[itemId];
    // Soft-correct mode: flash wrong, only accept correct (same as preview UX)
    // But for learning, allow place-then-check. Prefer check-at-end for KC.
    setPlaced(prev => ({ ...prev, [itemId]: zone }));
    setChecked(false);
    if (correct && correct !== zone) {
      setWrongFlash(zone);
      setTimeout(() => setWrongFlash(null), 450);
    }
  };

  const handleDrop = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || dragId;
    if (!itemId) return;
    placeItem(itemId, zone);
    setDragId(null);
  };

  const handleCheck = () => {
    setChecked(true);
    onChecked?.();
  };

  const handleReset = () => {
    setPlaced({});
    setChecked(false);
  };

  const allPlaced = normalized.length > 0 && normalized.every(i => placed[i.id]);
  const allCorrect = allPlaced && normalized.every(i => !correctMap[i.id] || placed[i.id] === correctMap[i.id]);

  if (!normalized.length) {
    return (
      <div className={cn(
        'p-6 rounded-xl border text-sm',
        isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-900/20 border-amber-600/30 text-amber-300'
      )}>
        <AlertCircle className="w-5 h-5 mb-2" />
        <p className="font-bold">This categorization activity has no items.</p>
        <p className="mt-1 opacity-80">Use Edit Slide → Regenerate to rebuild this knowledge check.</p>
      </div>
    );
  }

  return (
    <div className="w-full select-none space-y-4">
      <div className={cn(
        'flex flex-wrap gap-2 p-4 rounded-xl border min-h-[72px]',
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700'
      )}>
        {bank.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              setDragId(item.id);
              e.dataTransfer.setData('text/plain', item.id);
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold shadow-sm cursor-grab active:cursor-grabbing',
              isLight ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-500 text-white hover:bg-indigo-400'
            )}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(item.content) }}
          />
        ))}
        {bank.length === 0 && (
          <p className={cn('m-auto text-sm font-bold', isLight ? 'text-slate-500' : 'text-slate-400')}>
            All items placed — check your answers
          </p>
        )}
      </div>

      <div className={cn('grid gap-3', categories.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
        {categories.map((zone) => {
          const inZone = normalized.filter(i => placed[i.id] === zone);
          return (
            <div
              key={zone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, zone)}
              className={cn(
                'p-4 rounded-xl border-2 border-dashed min-h-[140px] flex flex-col gap-2 transition-all',
                wrongFlash === zone
                  ? 'border-red-500 bg-red-50'
                  : isLight
                    ? 'border-slate-300 bg-white hover:border-indigo-400'
                    : 'border-slate-600 bg-slate-800/40 hover:border-indigo-400'
              )}
            >
              <span className={cn('text-xs font-bold uppercase tracking-wider', isLight ? 'text-slate-500' : 'text-slate-400')}>
                {zone}
              </span>
              <div className="w-full mt-1 space-y-1.5 flex-1">
                {inZone.map(i => {
                  const ok = !checked || !correctMap[i.id] || placed[i.id] === correctMap[i.id];
                  return (
                    <button
                      type="button"
                      key={i.id}
                      onClick={() => {
                        setPlaced(prev => {
                          const next = { ...prev };
                          delete next[i.id];
                          return next;
                        });
                        setChecked(false);
                      }}
                      className={cn(
                        'w-full text-left text-xs font-bold p-2 rounded-lg',
                        checked
                          ? ok
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-red-100 text-red-900 border border-red-300'
                          : isLight
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                            : 'bg-indigo-900/40 text-indigo-100 border border-indigo-500/40'
                      )}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(i.content) }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!allPlaced}
          onClick={handleCheck}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm"
        >
          Check Answers
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={cn(
            'px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 border',
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-600 text-slate-200'
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        {checked && (
          <span className={cn('flex items-center gap-1.5 text-sm font-bold', allCorrect ? 'text-emerald-600' : 'text-amber-600')}>
            {allCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {allCorrect ? 'Correct!' : 'Some items are in the wrong category.'}
          </span>
        )}
      </div>
    </div>
  );
}
