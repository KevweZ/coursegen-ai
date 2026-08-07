/**
 * DiagramAlignFrame — Full natural-height Mermaid diagram with simple
 * left / center / right alignment and delete. No freeform drag/resize
 * (that cropped content and fought the scrollbar).
 */
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import React from 'react';
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
  const justify =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  return (
    <div className="w-full space-y-2">
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
                onClick={() => onAlignChange?.(id)}
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
              onClick={() => {
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
        <div
          className={cn(
            'w-full max-w-full overflow-x-auto',
            theme === 'light' ? 'bg-transparent' : 'bg-slate-800/40 border border-slate-700/40 rounded-xl p-4'
          )}
        >
          {/* Natural height — no fixed box / crop / inner scrollbar that fights controls */}
          <MermaidDiagram code={code} theme={theme} className="mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default DiagramAlignFrame;
