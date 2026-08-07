/**
 * DiagramAlignFrame — Full natural-height Mermaid diagram with simple
 * left / center / right alignment and delete.
 * Align/delete chrome only appears while the diagram is selected.
 */
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import MermaidDiagram from './MermaidDiagram';

export type DiagramAlign = 'left' | 'center' | 'right';

interface Props {
  code: string;
  theme?: 'dark' | 'light' | 'unified';
  align?: DiagramAlign;
  isAuthoring?: boolean;
  onAlignChange?: (align: DiagramAlign) => void;
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
  onAlignChange,
  onDelete,
}: Props) {
  const [selected, setSelected] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
      {isAuthoring && selected && (
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
          Previous w-full child made left/center/right look identical.
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
            'max-w-full w-fit overflow-x-auto rounded-xl transition-[box-shadow,outline] outline-none',
            theme === 'light' ? 'bg-transparent' : 'bg-slate-800/40 p-4',
            isAuthoring && 'cursor-pointer',
            isAuthoring && selected && 'ring-2 ring-indigo-500 ring-offset-2 shadow-md',
            !isAuthoring && theme !== 'light' && 'border border-slate-700/40'
          )}
        >
          <MermaidDiagram
            code={code}
            theme={theme}
            className="!w-auto max-w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default DiagramAlignFrame;
