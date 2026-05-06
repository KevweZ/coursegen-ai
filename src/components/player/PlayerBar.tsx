/**
 * PlayerBar — Full learner player control bar WITH Slide Editor tab row.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │  [slide progress bar — full width at top]                       │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │  ▶/⏸  [audio seekbar  elapsed / total]  ◀ Prev  N/M  Next ▶   │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │  EDITOR | Edit Text ✏  Audio 🎤  Background 🖼  Layout ⊞  Upload ⬆  Image 📷 │
 *   └─────────────────────────────────────────────────────────────────┘
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Volume1,
  Volume2,
  VolumeX,
  Loader2,
  PenLine,
  Mic,
  ImageIcon,
  Upload,
  RefreshCw,
  Layout,
} from 'lucide-react';
import { Seekbar } from './Seekbar';
import { Player, formatTime } from '../../lib/usePlayer';

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface SlideEditorActions {
  onEditText: () => void;
  onEditAudio: () => void;
  onChangeBackground: () => void;
  onResetLayout: () => void;
  onUploadImage: () => void;
  onSourceImage: () => void;
  hasSourceImages: boolean;
  hasOriginalCourse: boolean;
}

interface PlayerBarProps {
  player: Player;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlideTitle: string;
  onPrev: () => void;
  onNext: () => void;
  theme?: 'light' | 'dark' | 'unified';
  editorActions?: SlideEditorActions;
  /** Force-disable the Prev button (e.g. on exam slides) */
  disablePrev?: boolean;
  /** Force-disable the Next button (e.g. on exam-intro / quiz slides) */
  disableNext?: boolean;
  /** Current volume 0–1 */
  volume?: number;
  /** Callback when user adjusts the volume slider */
  onVolumeChange?: (v: number) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  player,
  currentSlideIndex,
  totalSlides,
  currentSlideTitle,
  onPrev,
  onNext,
  theme = 'dark',
  editorActions,
  disablePrev = false,
  disableNext = false,
  volume = 1,
  onVolumeChange,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  const isDark = theme !== 'light';
  const isLight = theme === 'light';
  const isLast = currentSlideIndex === totalSlides - 1;
  const slideProgress = totalSlides > 0 ? (currentSlideIndex + 1) / totalSlides : 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        player.isPlaying ? player.pause() : player.play();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (player.hasAudio) player.seek(player.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (player.hasAudio) player.seek(player.currentTime - 5);
      }
    },
    [player]
  );

  const barBg = isLight
    ? 'bg-white/95 border-gray-200/80'
    : theme === 'unified'
    ? 'bg-indigo-950/90 border-indigo-500/20'
    : 'bg-slate-950/95 border-white/10';

  const editorBg = isLight
    ? 'bg-gray-50 border-t border-gray-200'
    : theme === 'unified'
    ? 'bg-indigo-950 border-t border-indigo-800/50'
    : 'bg-slate-900 border-t border-slate-800';

  const textMuted = isLight ? 'text-gray-500' : 'text-gray-400';
  const textStrong = isLight ? 'text-gray-800' : 'text-gray-100';
  const divider = isLight ? 'bg-gray-300' : 'bg-gray-700';

  const btnBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border focus:outline-none focus:ring-2 focus:ring-indigo-500/50';
  const btnSecondary = cn(
    btnBase,
    isLight
      ? 'border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-30'
      : 'border-gray-700 hover:bg-gray-800 text-gray-300 disabled:opacity-30'
  );
  const btnPrimary = cn(
    btnBase,
    'border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30'
  );

  // Editor tab button style
  const edBtn = (color: string) => cn(
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all border',
    color
  );

  return (
    <div
      ref={barRef}
      className={cn('sticky bottom-0 z-[100] border-t flex-shrink-0 flex flex-col shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)]', barBg)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Learner player controls"
    >
      {/* ── Slide progress track (thin, top of bar) ── */}
      <div className="h-[3px] w-full bg-gray-400/20 relative overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full bg-indigo-500"
          initial={false}
          animate={{ width: `${slideProgress * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* ── Audio seekbar row (shown only when hasAudio) ── */}
      {player.hasAudio && (
        <div className={cn('flex items-center gap-3 px-4 pt-2.5', textMuted)}>
          <span className="text-[11px] font-mono tabular-nums w-10 shrink-0">
            {formatTime(player.currentTime)}
          </span>
          <div className="flex-1">
            <Seekbar
              currentTime={player.currentTime}
              duration={player.duration}
              isSeeking={player.isSeeking}
              onSeekStart={player.beginSeek}
              onSeek={player.endSeek}
              disabled={player.isLoading || player.duration === 0}
              accentClass="bg-indigo-500"
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums w-10 shrink-0 text-right">
            {player.isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin inline" />
            ) : (
              formatTime(player.duration)
            )}
          </span>
        </div>
      )}

      {/* ── Main controls row ── */}
      <div className="px-4 py-2 flex items-center gap-3">
        {/* Play / Pause */}
        {player.hasAudio ? (
          <button
            onClick={player.isPlaying ? player.pause : player.play}
            disabled={player.isLoading || player.duration === 0}
            aria-label={player.isPlaying ? 'Pause narration' : 'Play narration'}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md'
            )}
          >
            {player.isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : player.isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
            )}
          </button>
        ) : (
          <div className={cn(
            'flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
            isLight
              ? 'border-gray-200 text-gray-400 bg-gray-50'
              : 'border-gray-700 text-gray-500 bg-gray-800/60'
          )}>
            <VolumeX className="w-3 h-3" />
            No narration
          </div>
        )}

        {/* Volume slider — only shown when audio exists & callback is provided */}
        {onVolumeChange && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
              title={volume === 0 ? 'Unmute' : 'Mute'}
              aria-label={volume === 0 ? 'Unmute narration' : 'Mute narration'}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center transition-all focus:outline-none',
                isLight ? 'text-gray-500 hover:text-gray-800' : 'text-gray-400 hover:text-white'
              )}
            >
              {volume === 0
                ? <VolumeX  className="w-3.5 h-3.5" />
                : volume < 0.5
                ? <Volume1  className="w-3.5 h-3.5" />
                : <Volume2  className="w-3.5 h-3.5" />
              }
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => onVolumeChange(parseFloat(e.target.value))}
              className="vol-slider w-16"
              style={{ '--vol': Math.round(volume * 100) } as React.CSSProperties}
              title={`Volume: ${Math.round(volume * 100)}%`}
              aria-label="Volume"
            />
          </div>
        )}

        <div className={cn('h-4 w-px shrink-0', divider)} />

        {/* Slide info */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={cn('text-[11px] font-bold tabular-nums shrink-0', textStrong)}>
            {currentSlideIndex + 1} / {totalSlides}
          </span>
          <div className={cn('h-3 w-px shrink-0', divider)} />
          <span className={cn('text-[11px] font-medium truncate', textMuted)}>
            {currentSlideTitle}
          </span>
        </div>

        {isLast && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full shrink-0"
          >
            <CheckCircle2 className="w-3 h-3" />
            Complete
          </motion.span>
        )}

        <span className={cn('text-[10px] font-bold tabular-nums shrink-0', textMuted)}>
          {Math.round(slideProgress * 100)}%
        </span>

        <div className={cn('h-4 w-px shrink-0', divider)} />

        <button
          disabled={currentSlideIndex === 0 || disablePrev}
          onClick={onPrev}
          aria-label="Previous slide"
          className={btnSecondary}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        <button
          disabled={isLast || disableNext}
          onClick={onNext}
          aria-label="Next slide"
          className={btnPrimary}
          title={disableNext ? 'Complete the interaction to continue' : undefined}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── SLIDE EDITOR TAB ROW ── */}
      {editorActions && (
        <div className={cn('px-4 py-2 flex items-center gap-1.5 flex-wrap', editorBg)}>
          {/* EDITOR label */}
          <span className={cn(
            'text-[10px] font-extrabold uppercase tracking-widest shrink-0 pr-2 border-r',
            isLight ? 'text-gray-500 border-gray-300' : 'text-slate-500 border-slate-700'
          )}>
            EDITOR
          </span>

          {/* Edit Text & Audio */}
          <button
            onClick={editorActions.onEditText}
            className={edBtn(isLight
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              : 'border-indigo-500/30 bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/30')}
          >
            <PenLine className="w-3 h-3" />
            Edit Text
          </button>

          <button
            onClick={editorActions.onEditAudio}
            className={edBtn(isLight
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-emerald-500/30 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/30')}
          >
            <Mic className="w-3 h-3" />
            Audio
          </button>

          <button
            onClick={editorActions.onChangeBackground}
            className={edBtn(isLight
              ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
              : 'border-violet-500/30 bg-violet-600/15 text-violet-300 hover:bg-violet-600/30')}
          >
            <Layout className="w-3 h-3" />
            Background
          </button>

          {editorActions.hasOriginalCourse && (
            <button
              onClick={editorActions.onResetLayout}
              className={edBtn(isLight
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-amber-500/30 bg-amber-600/15 text-amber-300 hover:bg-amber-600/30')}
            >
              <RefreshCw className="w-3 h-3" />
              Reset Layout
            </button>
          )}

          <button
            onClick={editorActions.onUploadImage}
            className={edBtn(isLight
              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'border-rose-500/30 bg-rose-600/15 text-rose-300 hover:bg-rose-600/30')}
          >
            <Upload className="w-3 h-3" />
            Upload
          </button>

          {editorActions.hasSourceImages && (
            <button
              onClick={editorActions.onSourceImage}
              className={edBtn(isLight
                ? 'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100'
                : 'border-pink-500/30 bg-pink-600/15 text-pink-300 hover:bg-pink-600/30')}
            >
              <ImageIcon className="w-3 h-3" />
              Source Image
            </button>
          )}
        </div>
      )}
    </div>
  );
};
