import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EnlargeableImageProps {
  src: string;
  alt?: string;
  /** Classes on the visible <img> inside the slide */
  className?: string;
  /** Wrapper around the image (sizing / layout) */
  wrapperClassName?: string;
  onLoad?: () => void;
}

/**
 * Course content image with Storyline-like click-to-enlarge.
 * Corner expand hint; click image or control → lightbox; Esc / backdrop / X to close.
 */
export const EnlargeableImage: React.FC<EnlargeableImageProps> = ({
  src,
  alt = '',
  className,
  wrapperClassName,
  onLoad,
}) => {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      <div className={cn('relative group/enlarge w-full', wrapperClassName)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full text-left cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 rounded-sm"
          aria-label="Enlarge image"
        >
          <img
            src={src}
            alt={alt}
            className={cn('w-full h-auto object-contain', className)}
            onLoad={onLoad}
            draggable={false}
          />
        </button>
        <button
          type="button"
          title="Enlarge"
          aria-label="Enlarge image"
          onClick={() => setOpen(true)}
          className={cn(
            'absolute bottom-2 right-2 z-[1] flex items-center justify-center',
            'w-7 h-7 rounded-md bg-slate-900/55 text-white/90',
            'opacity-70 group-hover/enlarge:opacity-100 transition-opacity',
            'hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60'
          )}
        >
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.25} />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]"
              aria-label="Close enlarged image"
              onClick={() => setOpen(false)}
            />
            <div className="relative z-[1] max-w-[min(96vw,1200px)] max-h-[90vh] flex flex-col items-center gap-3">
              <span id={titleId} className="sr-only">
                Enlarged image
              </span>
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[min(85vh,900px)] object-contain rounded-sm shadow-none"
                onClick={() => setOpen(false)}
                draggable={false}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute -top-1 -right-1 sm:top-0 sm:right-0 flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 border border-white/10"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-white/60">Click image or press Esc to close</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default EnlargeableImage;
