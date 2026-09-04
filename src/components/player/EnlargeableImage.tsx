import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crop, Maximize2, Move, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageCropModal } from '../FloatingImageCanvas';

export type InFlowPromoteInfo = { src: string; x: number; y: number; width: number; height: number };

function measurePromoteRect(el: HTMLElement): Omit<InFlowPromoteInfo, 'src'> {
  const stage = document.querySelector('[data-float-stage]') as HTMLElement | null;
  const fallback = { x: 40, y: 40, width: Math.max(80, el.offsetWidth), height: Math.max(80, el.offsetHeight) };
  if (!stage) return fallback;
  const wr = el.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  const scale = sr.width / Math.max(1, stage.offsetWidth);
  if (scale < 0.05) return fallback;
  return {
    x: Math.round((wr.left - sr.left) / scale),
    y: Math.round((wr.top - sr.top) / scale),
    width: Math.max(80, Math.round(wr.width / scale)),
    height: Math.max(80, Math.round(wr.height / scale)),
  };
}

interface EnlargeableImageProps {
  src: string;
  alt?: string;
  /** Classes on the visible <img> inside the slide */
  className?: string;
  /** Wrapper around the image (sizing / layout) */
  wrapperClassName?: string;
  onLoad?: () => void;
  /** Authoring: remove this in-flow image (shown on hover). Do not pass in SCORM. */
  onRemove?: () => void;
  /** Authoring: replace src with a cropped data URL. */
  onCrop?: (dataUrl: string) => void;
  /** Authoring: lift into the floating canvas so it can be dragged and resized. */
  onPromoteToFloat?: (info: InFlowPromoteInfo) => void;
}

/**
 * Course content image. Enlarge is the corner control only — the photo itself
 * is not a button, so authoring hover actions (crop / move / remove) still work.
 */
export const EnlargeableImage: React.FC<EnlargeableImageProps> = ({
  src,
  alt = '',
  className,
  wrapperClassName,
  onLoad,
  onRemove,
  onCrop,
  onPromoteToFloat,
}) => {
  const [open, setOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const authoring = !!(onRemove || onCrop || onPromoteToFloat);

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
      <div ref={wrapRef} className={cn('relative group/enlarge w-full', wrapperClassName)}>
        <img
          src={src}
          alt={alt}
          className={cn('w-full h-auto object-contain', className)}
          onLoad={onLoad}
          draggable={false}
        />
        {authoring && (
          <div
            className={cn(
              'absolute top-2 right-2 z-[2] flex items-center gap-1',
              'opacity-0 group-hover/enlarge:opacity-100 transition-opacity',
              'focus-within:opacity-100'
            )}
          >
            {onCrop && (
              <button
                type="button"
                title="Crop image"
                aria-label="Crop image"
                onClick={(e) => {
                  e.stopPropagation();
                  setCropOpen(true);
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
            )}
            {onPromoteToFloat && (
              <button
                type="button"
                title="Move and resize"
                aria-label="Move and resize"
                onClick={(e) => {
                  e.stopPropagation();
                  const el = wrapRef.current;
                  if (!el) return;
                  onPromoteToFloat({ src, ...measurePromoteRect(el) });
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Move className="w-3.5 h-3.5" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                title="Remove image"
                aria-label="Remove image"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 hover:bg-red-400 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          title="Enlarge"
          aria-label="Enlarge"
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

      {cropOpen && onCrop && (
        <ImageCropModal
          imageUrl={src}
          onClose={() => setCropOpen(false)}
          onSave={(dataUrl) => {
            onCrop(dataUrl);
            setCropOpen(false);
          }}
        />
      )}

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
