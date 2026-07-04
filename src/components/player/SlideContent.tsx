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

/**
 * autoFormatAsBullets — pre-render content transformer.
 *
 * Rule: if the content has 2+ standalone plain-text paragraphs
 * (i.e. not headers, blockquotes, lists, code, or HRs), convert
 * each plain paragraph into a markdown bullet (`- ...`).
 *
 * Exceptions intentionally preserved as-is:
 *   - Blockquotes (>) — direct quotes / passages
 *   - Already-bulleted / numbered lists
 *   - Headers (#)
 *   - Horizontal rules / code fences
 *   - Content with only 1 plain-text paragraph
 */
function autoFormatAsBullets(raw: string): string {
  // If content already has markdown structure (headings or lists), leave it as-is.
  // Auto-bulleting is only for truly plain paragraphs with no existing structure.
  if (/^#{1,6}\s/m.test(raw) || /^[-*+]\s/m.test(raw) || /^\d+\.\s/m.test(raw)) {
    return raw;
  }

  // Split into paragraph blocks on one or more blank lines
  const blocks = raw.split(/\n{2,}/);

  const isPlain = (b: string) => {
    const t = b.trim();
    if (!t) return false;
    if (/^#{1,6}\s/.test(t)) return false;        // heading
    if (/^[-*+]\s|^\d+\.\s/.test(t)) return false; // already a list
    if (/^>/.test(t)) return false;                 // blockquote / quote
    if (/^```/.test(t)) return false;               // code fence
    if (/^---/.test(t)) return false;               // HR
    return true;
  };

  const plainCount = blocks.filter(isPlain).length;

  // Only reformat when there are 2+ plain paragraphs
  if (plainCount < 2) return raw;

  return blocks
    .map(b => {
      if (isPlain(b)) return `- ${b.trim()}`;
      return b;
    })
    .join('\n\n');
}

/**
 * addBulletGroupDividers — visually separates "concept bullets" from "action bullets".
 *
 * Concept bullet: starts with `- **word**` (bold-led key term)
 * Action bullet:  starts with `- plain text`
 *
 * When the list transitions from one type to the other, a `---` HR divider is inserted
 * so the two groups have clear visual separation in the rendered slide.
 */
function addBulletGroupDividers(raw: string): string {
  const lines = raw.split('\n');
  const result: string[] = [];
  let prevBulletType: 'bold' | 'plain' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const isBullet = /^[-*+]\s/.test(trimmed);

    if (isBullet) {
      // Detect if this bullet starts with bold text: "- **word** ..."
      const isBoldBullet = /^[-*+]\s+\*\*/.test(trimmed);
      const bulletType = isBoldBullet ? 'bold' : 'plain';

      if (prevBulletType !== null && prevBulletType !== bulletType) {
        // Transition between concept and action groups — insert divider
        result.push('');
        result.push('---');
        result.push('');
      }
      prevBulletType = bulletType;
    } else if (trimmed !== '') {
      // Non-bullet, non-empty line resets group tracking
      prevBulletType = null;
    }

    result.push(line);
  }

  return result.join('\n');
}

export function SlideContent({ content, theme, compact = false }: SlideContentProps) {
  const isLight = theme === 'light';
  // Apply global bullet-formatting rule then add group dividers
  const processedContent = addBulletGroupDividers(autoFormatAsBullets(content));



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

    // LIST ITEM — intro lines (ending ':') rendered as plain bold label; rest get diamond bullet
    li: ({ children }: any) => {
      // Extract raw text to detect intro/parent lines
      const extractText = (node: any): string => {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(extractText).join('');
        if (node?.props?.children) return extractText(node.props.children);
        return '';
      };
      const textContent = extractText(children).trim();
      const isIntroLine = textContent.endsWith(':');

      if (isIntroLine) {
        // Render as a non-bulleted section-intro line
        return (
          <li className={cn(
            'font-semibold text-[15px] leading-snug mt-2 mb-0.5 list-none',
            isLight ? 'text-slate-600' : 'text-slate-400'
          )}>
            {children}
          </li>
        );
      }

      return (
        <li className={cn(
          'flex items-start gap-3',
          compact ? 'py-1.5' : 'py-2'
        )}>
          <span className={cn(
            'shrink-0 mt-[3px] font-black text-sm leading-none select-none',
            isLight ? 'text-indigo-500' : 'text-indigo-400'
          )}>◆</span>
          <span className={cn('flex-1 leading-snug', compact ? 'text-sm' : 'text-[15px]',
            isLight ? 'text-slate-800' : 'text-slate-200'
          )}>{children}</span>
        </li>
      );
    },

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
      <ReactMarkdown components={mdComponents}>{processedContent}</ReactMarkdown>
    </div>
  );

}
