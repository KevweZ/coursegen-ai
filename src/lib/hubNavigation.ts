import { HUB_SLIDE_ID } from './interactionGate';

export { HUB_SLIDE_ID };

type AnySlide = { id?: string; type?: string; _moduleNumber?: number };

/** 1-based module number for a player slide, or 0 if chrome / unknown. */
export function moduleNumberForSlide(slide: AnySlide | null | undefined): number {
  if (!slide) return 0;
  const tagged = Number(slide._moduleNumber);
  if (Number.isFinite(tagged) && tagged > 0) return tagged;
  const id = String(slide.id || '');
  const m = id.match(/__module-(?:overview|cover)-(\d+)__/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

/** Inclusive [start, end] indexes of a 1-based module in the player list. */
export function moduleIndexRange(
  slides: AnySlide[],
  moduleNumber: number,
): { start: number; end: number } | null {
  if (!moduleNumber || !slides?.length) return null;
  let start = -1;
  let end = -1;
  for (let i = 0; i < slides.length; i++) {
    const n = moduleNumberForSlide(slides[i]);
    if (n === moduleNumber) {
      if (start < 0) start = i;
      end = i;
    }
  }
  if (start < 0) return null;
  return { start, end };
}

export function hubSlideIndex(slides: AnySlide[]): number {
  return (slides || []).findIndex((s) => s?.id === HUB_SLIDE_ID);
}

/** Next from the last slide of a module returns to the hub. */
export function nextIndexAfterSlide(
  slides: AnySlide[],
  currentIndex: number,
  hubMode: boolean,
): number {
  const last = Math.max(0, (slides?.length || 1) - 1);
  const fallback = Math.min(last, currentIndex + 1);
  if (!hubMode) return fallback;
  const hub = hubSlideIndex(slides);
  if (hub < 0) return fallback;
  const n = moduleNumberForSlide(slides[currentIndex]);
  if (!n) return fallback;
  const range = moduleIndexRange(slides, n);
  if (range && currentIndex >= range.end) return hub;
  return fallback;
}

export function allContentModulesComplete(
  moduleCount: number,
  completedModuleNumbers: Iterable<number>,
): boolean {
  if (moduleCount <= 0) return true;
  const set = new Set(completedModuleNumbers);
  for (let i = 1; i <= moduleCount; i++) {
    if (!set.has(i)) return false;
  }
  return true;
}

/** First player index of a module — used so the hub can open any module. */
export function isFirstSlideOfModule(slides: AnySlide[], index: number): boolean {
  const n = moduleNumberForSlide(slides[index]);
  if (!n) return false;
  const range = moduleIndexRange(slides, n);
  return !!range && index === range.start;
}
