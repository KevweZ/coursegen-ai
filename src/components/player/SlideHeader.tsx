import React from 'react';
import { cn } from '../../lib/utils';

type Theme = 'light' | 'dark' | 'unified';

interface SlideHeaderProps {
  title: string;
  theme: Theme;
  className?: string;
}

/**
 * SlideHeader — globally consistent slide title component.
 * Design spec: left-aligned, ExtraBold, accent indigo color per theme,
 * larger than body text, no decoration. Used by ALL slide types.
 */
export const SlideHeader: React.FC<SlideHeaderProps> = ({ title, theme, className }) => {
  const colorClass =
    theme === 'light'
      ? 'text-indigo-700'          // deep indigo on white — spec: ~#4338ca
      : theme === 'unified'
      ? 'text-indigo-300'          // soft indigo on purple bg
      : 'text-indigo-400';         // lighter indigo on dark slate

  return (
    <h2
      className={cn(
        'font-extrabold text-3xl leading-tight tracking-tight mb-6',
        colorClass,
        className
      )}
    >
      {title}
    </h2>
  );
};

export default SlideHeader;
