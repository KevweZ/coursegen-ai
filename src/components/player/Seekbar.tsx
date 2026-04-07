/**
 * Seekbar — Audio progress seekbar with drag-to-scrub and click-to-seek.
 *
 * Props:
 *  currentTime  — current playback position (seconds)
 *  duration     — total audio length (seconds). 0 when not loaded.
 *  isSeeking    — true while user is dragging (freezes currentTime updates from hook)
 *  onSeekStart  — called when drag begins
 *  onSeek       — called with the committed time when drag ends or track is clicked
 *  disabled     — when true (no audio), renders a neutral disabled bar
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';

interface SeekbarProps {
  currentTime: number;
  duration: number;
  isSeeking: boolean;
  onSeekStart: () => void;
  onSeek: (time: number) => void;
  disabled?: boolean;
  /** Color class for the fill / thumb (defaults to indigo) */
  accentClass?: string;
}

export const Seekbar: React.FC<SeekbarProps> = ({
  currentTime,
  duration,
  isSeeking,
  onSeekStart,
  onSeek,
  disabled = false,
  accentClass = 'bg-indigo-500',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  // Visual-only drag position (0–1), committed on mouse-up
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const isDragging = useRef(false);

  // Fraction of progress for rendering
  const fraction =
    dragFraction !== null
      ? dragFraction
      : duration > 0
      ? Math.min(currentTime / duration, 1)
      : 0;

  const pct = `${(fraction * 100).toFixed(2)}%`;

  // ---------------------------------------------------------------------------
  // Compute fraction from a pointer event
  // ---------------------------------------------------------------------------
  const fractionFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const clientX =
        'touches' in e ? (e as TouchEvent).touches[0]?.clientX ?? rect.left : (e as MouseEvent).clientX;
      return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Click-to-seek on the track
  // ---------------------------------------------------------------------------
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || duration === 0) return;
      const f = fractionFromEvent(e);
      onSeekStart();
      onSeek(f * duration);
    },
    [disabled, duration, fractionFromEvent, onSeekStart, onSeek]
  );

  // ---------------------------------------------------------------------------
  // Drag-to-scrub — thumb
  // ---------------------------------------------------------------------------
  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || duration === 0) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      onSeekStart();
      setDragFraction(fractionFromEvent(e));
    },
    [disabled, duration, fractionFromEvent, onSeekStart]
  );

  // Mouse-move and mouse-up must be on window to handle fast movement outside element
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const f = fractionFromEvent(e);
      setDragFraction(f);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const f = fractionFromEvent(e);
      setDragFraction(null);
      onSeek(f * duration);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [duration, fractionFromEvent, onSeek]);

  // ---------------------------------------------------------------------------
  // Touch support
  // ---------------------------------------------------------------------------
  const handleThumbTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || duration === 0) return;
      e.stopPropagation();
      isDragging.current = true;
      onSeekStart();
      setDragFraction(fractionFromEvent(e));
    },
    [disabled, duration, fractionFromEvent, onSeekStart]
  );

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const f = fractionFromEvent(e);
      setDragFraction(f);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const f = fractionFromEvent(e);
      setDragFraction(null);
      onSeek(f * duration);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [duration, fractionFromEvent, onSeek]);

  // ---------------------------------------------------------------------------
  // Keyboard — arrow keys ±5s (when thumb is focused)
  // ---------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || duration === 0) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min(currentTime + 5, duration));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max(currentTime - 5, 0));
      }
    },
    [disabled, duration, currentTime, onSeek]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const trackBase = disabled
    ? 'bg-gray-600/40'
    : 'bg-gray-500/30 hover:bg-gray-500/50 cursor-pointer';

  return (
    <div
      ref={trackRef}
      className={`relative h-1.5 rounded-full transition-colors select-none ${trackBase} group`}
      style={{ width: '100%' }}
      onClick={handleTrackClick}
    >
      {/* Filled portion */}
      <div
        className={`absolute left-0 top-0 h-full rounded-full pointer-events-none transition-none ${
          disabled ? 'bg-gray-600/60' : accentClass
        }`}
        style={{ width: pct }}
      />

      {/* Draggable thumb */}
      {!disabled && (
        <div
          role="slider"
          aria-label="Seek audio"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full shadow-md cursor-grab active:cursor-grabbing transition-transform
            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
            opacity-0 group-hover:opacity-100 ${isDragging.current ? 'opacity-100 scale-110' : ''}
            ${accentClass} border-2 border-white/80`}
          style={{ left: pct }}
          onMouseDown={handleThumbMouseDown}
          onTouchStart={handleThumbTouchStart}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
};
