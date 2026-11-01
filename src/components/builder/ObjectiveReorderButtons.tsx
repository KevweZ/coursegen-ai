import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ObjectiveReorderButtons({
  index,
  count,
  onMove,
  label,
  className,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  label: string;
  className?: string;
}) {
  if (count < 2) return null;
  const btn = 'p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-500';
  return (
    <div className={cn('flex flex-col shrink-0', className)}>
      <button
        type="button"
        title={`Move ${label} up`}
        aria-label={`Move ${label} up`}
        disabled={index <= 0}
        onClick={() => onMove(index, index - 1)}
        className={btn}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title={`Move ${label} down`}
        aria-label={`Move ${label} down`}
        disabled={index >= count - 1}
        onClick={() => onMove(index, index + 1)}
        className={btn}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
