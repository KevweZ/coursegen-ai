import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { applySlideBackdrop, readImageFileAsDataUrl, type BackdropScope } from '../../lib/slideBackdrop';

interface Props {
  course: any;
  slideId?: string;
  disabled?: boolean;
  onApply: (nextCourse: any) => void;
  /** Render as a dropdown row instead of a toolbar chip. */
  asMenuItem?: boolean;
}

export function SlideBackdropMenu({ course, slideId, disabled, onApply, asMenuItem }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [dim, setDim] = useState(true);
  const [lastScope, setLastScope] = useState<BackdropScope>('slide');
  const [busy, setBusy] = useState(false);
  const current = (course?.modules || [])
    .flatMap((m: any) => m.slides || [])
    .find((s: any) => String(s.id) === String(slideId || ''));
  const hasBg = !!current?.backgroundImage;

  const apply = (scope: BackdropScope, url: string | null) => {
    if (!slideId || !course) return;
    onApply(applySlideBackdrop(course, {
      slideId,
      backgroundImage: url,
      backgroundDim: dim,
      scope,
    }));
    setLastScope(scope);
    setOpen(false);
    setPendingUrl(null);
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await readImageFileAsDataUrl(file);
      setPendingUrl(url);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || !slideId}
        title="Slide background"
        onClick={() => {
          if (hasBg) {
            setPendingUrl(null);
            setDim(current?.backgroundDim !== false);
            setOpen(v => !v);
            return;
          }
          inputRef.current?.click();
        }}
        className={asMenuItem
          ? 'w-full text-left px-3 py-2 hover:bg-slate-800 text-fuchsia-200 flex items-start gap-2 disabled:opacity-40'
          : 'flex items-center gap-1 px-2 py-1 rounded-md border border-fuchsia-700/50 hover:bg-fuchsia-800/20 text-fuchsia-300 text-[11px] font-semibold disabled:opacity-40'}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin mt-0.5 shrink-0" /> : <ImageIcon className="w-3 h-3 mt-0.5 shrink-0" />}
        {asMenuItem ? (
          <span>
            <span className="font-semibold block">Background</span>
            <span className="text-slate-500 text-[10px]">Slide, module, or whole-course backdrop</span>
          </span>
        ) : (
          <span className="hidden lg:inline">Background</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {open && (
        <div className="absolute right-0 top-full mt-1 z-[80] w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-3 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Slide background</p>
          <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={dim}
              onChange={e => {
                setDim(e.target.checked);
                if (hasBg && !pendingUrl && slideId && course) {
                  onApply(applySlideBackdrop(course, {
                    slideId,
                    backgroundDim: e.target.checked,
                    scope: lastScope,
                  }));
                }
              }}
            />
            Dark sheen (dims the photo so content stands out)
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {(['slide', 'module', 'course'] as BackdropScope[]).map(scope => (
              <button
                key={scope}
                type="button"
                onClick={() => apply(scope, pendingUrl ?? current?.backgroundImage ?? null)}
                disabled={!pendingUrl && !hasBg}
                className={cn(
                  'text-left px-3 py-2 rounded-lg text-sm font-semibold border transition-colors',
                  'border-slate-700 bg-slate-950 text-slate-200 hover:border-fuchsia-500/50 hover:text-white disabled:opacity-40'
                )}
              >
                {scope === 'slide' ? 'Apply to this slide' : scope === 'module' ? 'Apply to this module' : 'Apply to the whole course'}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              className="text-xs font-bold text-slate-400 hover:text-white"
              onClick={() => inputRef.current?.click()}
            >
              {hasBg || pendingUrl ? 'Replace image…' : 'Choose image…'}
            </button>
            {hasBg && (
              <button
                type="button"
                className="text-xs font-bold text-rose-300 hover:text-rose-200"
                onClick={() => apply('slide', null)}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
