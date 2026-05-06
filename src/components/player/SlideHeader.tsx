import React from 'react';
import { cn } from '../../lib/utils';
import { stripSlideTypePrefix } from '../../lib/stripSlideTypePrefix';

type Theme = 'light' | 'dark' | 'unified';

interface SlideHeaderProps {
  title: string;
  theme: Theme;
  className?: string;
  /** Module accent color — renders a gradient underline below the title when provided. */
  accentColor?: string;
}

/**
 * SlideHeader — globally consistent slide title component.
 *
 * Renders:
 *   [Title]  ← ExtraBold, accent indigo
 *   [──────]  ← gradient underline (only when accentColor is supplied)
 *
 * The underline always sits directly below the title so the visual hierarchy
 * is identical across ALL slide types: type label → title → underline → content.
 */
export const SlideHeader: React.FC<SlideHeaderProps> = ({ title, theme, className, accentColor }) => {
  const colorClass =
    theme === 'light'
      ? 'text-indigo-700'
      : theme === 'unified'
      ? 'text-indigo-300'
      : 'text-indigo-400';

  return (
    <div className={cn('mb-6', className)}>
      <h2
        className={cn(
          'font-extrabold text-3xl leading-tight tracking-tight mb-1.5',
          colorClass
        )}
      >
        {stripSlideTypePrefix(title)}
      </h2>
      {accentColor && (
        <div
          className="h-[2px] w-full rounded-full"
          style={{
            background: `linear-gradient(to right, ${accentColor}, ${accentColor}44, transparent)`,
          }}
        />
      )}
    </div>
  );
};

export default SlideHeader;
