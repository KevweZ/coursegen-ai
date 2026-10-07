import type { FloatingImage } from '../types/course';

export function isFloatingVideo(img: { kind?: string; url?: string } | null | undefined): boolean {
  if (!img) return false;
  if (img.kind === 'video') return true;
  if (img.kind === 'image') return false;
  const u = String(img.url || '');
  return /^data:video\//i.test(u) || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(u);
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
