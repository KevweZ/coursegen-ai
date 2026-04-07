/**
 * SlideContent — Rich, formatted content renderer using custom React components for ReactMarkdown.
 * Replaces bare <ReactMarkdown> with styled bullets, headers, callouts, and proper spacing.
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface SlideContentProps {
  content: string;
  theme: 'light' | 'dark' | 'unified';
  compact?: boolean;
}

export function SlideContent({ content, theme, compact = false }: SlideContentProps) {
  const isLight = theme === 'light';

  const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    // HEADING styles
    h1: ({ children }) => (
      <h1 className={cn(
        'font-black leading-tight mb-3',
        compact ? 'text-xl' : 'text-2xl md:text-3xl',
        isLight ? 'text-slate-900' : 'text-white'
      )}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={cn(
        'font-extrabold leading-snug mb-2 mt-4',
        compact ? 'text-lg' : 'text-xl md:text-2xl',
        isLight ? 'text-slate-800' : 'text-slate-100'
      )}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={cn(
        'font-bold mb-1.5 mt-3',
        compact ? 'text-base' : 'text-lg',
        isLight ? 'text-indigo-700' : 'text-indigo-300'
      )}>{children}</h3>
    ),

    // PARAGRAPH — compact with sensible spacing
    p: ({ children }) => (
      <p className={cn(
        'leading-relaxed mb-3 last:mb-0',
        compact ? 'text-sm' : 'text-base',
        isLight ? 'text-slate-700' : 'text-slate-200'
      )}>{children}</p>
    ),

    // UNORDERED LIST — remove list-style and add styled bullets
    ul: ({ children }) => (
      <ul className="space-y-2 mb-3 pl-0 list-none">{children}</ul>
    ),

    // ORDERED LIST
    ol: ({ children }) => (
      <ol className="space-y-2 mb-3 pl-0 list-none counter-reset-list">{children}</ol>
    ),

    // LIST ITEM — styled with a colored diamond bullet
    li: ({ children, ordered }: any) => (
      <li className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-2.5',
        isLight
          ? 'bg-indigo-50/80 text-slate-800'
          : theme === 'unified'
          ? 'bg-indigo-900/30 text-slate-100'
          : 'bg-slate-800/60 text-slate-200'
      )}>
        <span className={cn(
          'shrink-0 mt-0.5 font-black text-base leading-none select-none',
          isLight ? 'text-indigo-500' : 'text-indigo-400'
        )}>◆</span>
        <span className={cn('flex-1 leading-snug', compact ? 'text-sm' : 'text-[15px]')}>{children}</span>
      </li>
    ),

    // STRONG / BOLD
    strong: ({ children }) => (
      <strong className={cn('font-extrabold', isLight ? 'text-slate-900' : 'text-white')}>{children}</strong>
    ),

    // EMPHASIS
    em: ({ children }) => (
      <em className={cn('italic', isLight ? 'text-slate-600' : 'text-slate-300')}>{children}</em>
    ),

    // BLOCKQUOTE — callout box
    blockquote: ({ children }) => (
      <blockquote className={cn(
        'border-l-4 pl-4 py-2 my-3 rounded-r-lg',
        isLight
          ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
          : 'border-indigo-400 bg-indigo-900/20 text-indigo-200'
      )}>
        {children}
      </blockquote>
    ),

    // CODE — inline
    code: ({ inline, children }: any) => inline
      ? <code className={cn(
          'px-1.5 py-0.5 rounded text-sm font-mono',
          isLight ? 'bg-slate-100 text-indigo-700' : 'bg-slate-800 text-indigo-300'
        )}>{children}</code>
      : <pre className={cn(
          'p-4 rounded-xl my-3 overflow-x-auto text-sm font-mono leading-relaxed',
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-300'
        )}><code>{children}</code></pre>,

    // HORIZONTAL RULE
    hr: () => (
      <hr className={cn('my-4 border-0 h-px', isLight ? 'bg-slate-200' : 'bg-slate-700')} />
    ),

    // TABLE
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className={cn('w-full text-sm border-collapse', isLight ? 'text-slate-800' : 'text-slate-200')}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className={cn('px-3 py-2 text-left font-bold border-b', isLight ? 'border-slate-300 text-indigo-700' : 'border-slate-700 text-indigo-300')}>{children}</th>
    ),
    td: ({ children }) => (
      <td className={cn('px-3 py-2 border-b', isLight ? 'border-slate-100' : 'border-slate-800')}>{children}</td>
    ),
  };

  return (
    <div className="w-full space-y-0">
      <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
    </div>
  );
}
