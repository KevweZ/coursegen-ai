/**
 * SlideEditorBar — Bottom toolbar strip shown in the course preview player.
 * Provides: Edit Text & Audio, Change Background, Reset Layout,
 *           Upload Image, Source Image
 */
import React, { useRef } from 'react';
import { Edit3, ImagePlus, RotateCcw, Upload, Library, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  onEditSlide: () => void;
  onChangeBg: (file: File) => void;
  onResetLayout: () => void;
  onUploadImage: (files: FileList) => void;
  onOpenSourceImages: () => void;
  onOpenPlayerProperties: () => void;
  theme: 'dark' | 'light' | 'unified';
}

export function SlideEditorBar({
  onEditSlide,
  onChangeBg,
  onResetLayout,
  onUploadImage,
  onOpenSourceImages,
  onOpenPlayerProperties,
  theme,
}: Props) {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const base = cn(
    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
    theme === 'light'
      ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-700'
      : theme === 'unified'
      ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 hover:border-indigo-400'
      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-indigo-500 hover:text-white'
  );

  const barBg = theme === 'light'
    ? 'bg-white/90 border-slate-200'
    : theme === 'unified'
    ? 'bg-indigo-950/80 border-indigo-500/20'
    : 'bg-slate-900/95 border-slate-700';

  return (
    <div className={cn('w-full border-t px-4 py-3 flex items-center gap-2 flex-wrap backdrop-blur-md shrink-0 z-[60]', barBg)}>
      {/* Label */}
      <span className={cn('text-[10px] font-black uppercase tracking-widest mr-1 shrink-0', theme === 'light' ? 'text-slate-500' : 'text-slate-500')}>
        EDITOR
      </span>

      {/* Edit Text & Audio */}
      <button className={base} onClick={onEditSlide} id="editor-btn-edit-slide">
        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
        Edit Text &amp; Audio
      </button>

      {/* Change Background */}
      <label className={base} htmlFor="editor-bg-upload" id="editor-btn-change-bg">
        <ImagePlus className="w-3.5 h-3.5 text-pink-400" />
        Change Background
        <input
          ref={bgInputRef}
          id="editor-bg-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { onChangeBg(f); e.target.value = ''; }
          }}
        />
      </label>

      {/* Reset Layout */}
      <button className={base} onClick={onResetLayout} id="editor-btn-reset-layout">
        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
        Reset Layout
      </button>

      {/* Upload Image */}
      <label className={base} htmlFor="editor-img-upload" id="editor-btn-upload-image">
        <Upload className="w-3.5 h-3.5 text-emerald-400" />
        Upload Image
        <input
          ref={imgInputRef}
          id="editor-img-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) { onUploadImage(e.target.files); e.target.value = ''; }
          }}
        />
      </label>

      {/* Source Image */}
      <button className={base} onClick={onOpenSourceImages} id="editor-btn-source-image">
        <Library className="w-3.5 h-3.5 text-teal-400" />
        Source Image
      </button>

      {/* Divider */}
      <div className="flex-1" />

      {/* Player Properties */}
      <button className={cn(base, 'border-orange-500/40 text-orange-300 hover:border-orange-400')} onClick={onOpenPlayerProperties} id="editor-btn-player-props">
        <Settings2 className="w-3.5 h-3.5 text-orange-400" />
        Player Properties
      </button>
    </div>
  );
}
