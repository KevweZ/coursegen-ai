import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Enlarged landscape phone bezel for admin mobile demos.
 * Inner screen stays 16:9 so content proportions match a published mobile course.
 * The chrome is sized to fill most of the desktop viewport for easy review.
 */
export function LandscapePhoneFrame({
  children,
  className,
  screenClassName,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  screenClassName?: string;
  label?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 w-full h-full min-h-0 px-3 py-3', className)}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80 shrink-0">
          {label}
        </p>
      )}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          // Fill most of the available viewport while locking 16:9 (published mobile aspect)
          'w-[min(96vw,calc((100vh-7rem)*16/9))]',
          'h-[min(calc(100vh-7rem),calc(96vw*9/16))]',
          'max-w-[1280px] max-h-[720px]',
          'rounded-[2rem] border-[10px] border-gray-800',
          'shadow-[0_25px_80px_-20px_rgba(0,0,0,0.75),inset_0_0_0_1px_rgba(255,255,255,0.06)]',
          'bg-slate-950'
        )}
        style={{ aspectRatio: '16 / 9' }}
      >
        {/* Side speaker / camera notch accents */}
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[6px] w-1.5 h-16 rounded-full bg-gray-700/80" />
        <div className="pointer-events-none absolute right-0 top-[38%] -translate-y-1/2 translate-x-[6px] w-1 h-10 rounded-full bg-gray-700/70" />
        <div
          className={cn(
            'absolute inset-0 overflow-hidden rounded-[1.35rem]',
            screenClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
