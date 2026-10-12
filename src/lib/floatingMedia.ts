import type { FloatingImage } from '../types/course';

export function isFloatingVideo(img: { kind?: string; url?: string } | null | undefined): boolean {
  if (!img) return false;
  if (img.kind === 'video') return true;
  if (img.kind === 'image') return false;
  const u = String(img.url || '');
  return /^data:video\//i.test(u) || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(u);
}

export type VideoClipRange = {
  start: number;
  end: number;
  duration: number;
  /** True when the author trimmed so the seekbar must show the clip, not the file. */
  clipped: boolean;
};

/** Playback window for a floating video. Native `duration` stays the file length. */
export function videoClipRange(
  img: { clipStart?: number; clipEnd?: number } | null | undefined,
  fileDuration = 0,
): VideoClipRange {
  const start = Number.isFinite(img?.clipStart) ? Math.max(0, Number(img?.clipStart)) : 0;
  const rawEnd = Number.isFinite(img?.clipEnd) ? Number(img?.clipEnd) : null;
  const fileEnd = Number.isFinite(fileDuration) && fileDuration > 0 ? fileDuration : null;
  const end = rawEnd != null && rawEnd > start
    ? (fileEnd != null ? Math.min(rawEnd, fileEnd) : rawEnd)
    : (fileEnd != null ? fileEnd : start);
  const duration = Math.max(0.1, end - start);
  const clipped = start > 0.05 || (rawEnd != null && (fileEnd == null || rawEnd < fileEnd - 0.15));
  return { start, end, duration, clipped };
}

/** Seconds into the clip (0…duration), never the raw file timestamp. */
export function clipDisplayTime(currentTime: number, start: number, duration: number): number {
  if (!Number.isFinite(currentTime)) return 0;
  return Math.min(duration, Math.max(0, currentTime - start));
}

export function formatVideoClock(seconds: number): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function floatingFromFile(file: File, index = 0, tabId: string | null = null): FloatingImage {
  const video = String(file.type || '').startsWith('video/');
  return {
    id: `fi-${Date.now()}-${index}`,
    url: URL.createObjectURL(file),
    x: 40 + index * 20,
    y: 40 + index * 20,
    width: video ? 480 : 320,
    height: video ? 270 : 240,
    tabId,
    kind: video ? 'video' : 'image',
  };
}
