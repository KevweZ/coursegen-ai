/**
 * DiagramAlignFrame — Full natural-height Mermaid diagram with simple
 * left / center / right alignment and delete.
 * Align/delete chrome only appears while the diagram is selected.
 */
import { AlignLeft, AlignCenter, AlignRight, RefreshCw, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import MermaidDiagram from './MermaidDiagram';

export type DiagramAlign = 'left' | 'center' | 'right';

interface Props {
  code: string;
  theme?: 'dark' | 'light' | 'unified';
  align?: DiagramAlign;
  isAuthoring?: boolean;
  cachedSvg?: string;
  regenerating?: boolean;
  onRendered?: (svg: string, source?: string) => void;
  onAlignChange?: (align: DiagramAlign) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function DiagramAlignFrame({
  code,
  theme = 'light',
  align = 'center',
  isAuthoring = false,
  cachedSvg,
  regenerating = false,
  onRendered,
  onAlignChange,
  onRegenerate,
  onDelete,
}: Props) {
  const [selected, setSelected] = useState(false);
  const [regenNonce, setRegenNonce] = useState(0);
  const [localBusy, setLocalBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const busy = regenerating || localBusy;

  useEffect(() => {
    if (!isAuthoring || !selected) return;
    const onDocPointer = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      setSelected(false);
    };
    // capture so we clear selection even when other handlers stopPropagation
    document.addEventListener('mousedown', onDocPointer, true);
    return () => document.removeEventListener('mousedown', onDocPointer, true);
  }, [isAuthoring, selected]);

  // Reset selection when navigating to another slide / code change
  useEffect(() => {
    setSelected(false);
  }, [code]);

  const justify =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  return (
    <div ref={rootRef} className="w-full space-y-2">
      {isAuthoring && (
        <div className="flex items-center justify-end gap-1">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            {(
              [
                { id: 'left' as const, Icon: AlignLeft, title: 'Align left' },
                { id: 'center' as const, Icon: AlignCenter, title: 'Align center' },
                { id: 'right' as const, Icon: AlignRight, title: 'Align right' },
              ] as const
            ).map(({ id, Icon, title }) => (
              <button
                key={id}
                type="button"
                title={title}
                onClick={(e) => {
                  e.stopPropagation();
                  onAlignChange?.(id);
                }}
                className={cn(
                  'p-1.5 transition-colors',
                  align === id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            title="Regenerate diagram"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(true);
              setLocalBusy(true);
              setRegenNonce((n) => n + 1);
              onRegenerate?.();
            }}
            className="p-1.5 rounded-lg border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', busy && 'animate-spin')} />
          </button>
          {onDelete && (
            <button
              type="button"
              title="Remove diagram"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Remove this diagram from the slide?')) onDelete();
              }}
              className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className={cn('w-full flex', justify)}>
        {/*
          Shrink-wrap the diagram so flex justify-* can actually move it.
          overflow-x-hidden (not auto) so a scrollbar appearing cannot jitter L/R.
        */}
        <div
          role={isAuthoring ? 'button' : undefined}
          tabIndex={isAuthoring ? 0 : undefined}
          onClick={() => {
            if (isAuthoring) setSelected(true);
          }}
          onKeyDown={(e) => {
            if (!isAuthoring) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelected(true);
            }
          }}
          className={cn(
            'max-w-full w-fit overflow-x-hidden rounded-xl transition-[box-shadow,outline] outline-none',
            theme === 'light' ? 'bg-transparent' : 'bg-slate-800/40 p-4',
            isAuthoring && 'cursor-pointer',
            isAuthoring && selected && 'ring-2 ring-indigo-500 ring-offset-2 shadow-md',
            !isAuthoring && theme !== 'light' && 'border border-slate-700/40'
          )}
        >
          <MermaidDiagram
            key={`diagram-${regenNonce}`}
            code={code}
            theme={theme}
            cachedSvg={cachedSvg}
            regenNonce={regenNonce}
            onRendered={(svg, source) => {
              setLocalBusy(false);
              onRendered?.(svg, source);
            }}
            onRenderSettled={(ok) => {
              if (!ok) setLocalBusy(false);
            }}
            className="!w-auto max-w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default DiagramAlignFrame;
