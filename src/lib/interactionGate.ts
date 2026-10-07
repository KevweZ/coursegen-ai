import type { NavigationMode } from '../types/course';

/** Modes that still gate Next until the current slide’s interactions are done. */
export function navigationGatesInteractions(mode?: string | null): boolean {
  return mode === 'linear' || mode === 'restricted' || mode === 'hub';
}

/**
 * Next lock for interactions.
 * Free roam never gates. A slide the learner already left via Next stays open
 * on return (revisits are unrestricted). Intro/overview chrome is not required.
 */
export function isSlideInteractionGateOpen(opts: {
  requireInteractionsComplete: boolean;
  navigationMode?: string | null;
  expectedIds: string[];
  exploredIds: string[];
  slideCompleted: boolean;
}): boolean {
  if (!opts.requireInteractionsComplete) return true;
  if (!navigationGatesInteractions(opts.navigationMode)) return true;
  if (opts.slideCompleted) return true;
  const expected = opts.expectedIds || [];
  if (!expected.length) return true;
  const explored = new Set(opts.exploredIds || []);
  return expected.every((id) => explored.has(id));
}

export function isHubNavigation(mode?: string | null): boolean {
  return String(mode || '') === 'hub';
}

export const HUB_SLIDE_ID = '__hub-menu__';
export const HUB_SLIDE_TYPE = 'hub-menu';

export function isHubMenuSlide(slide: { id?: string; type?: string } | null | undefined): boolean {
  if (!slide) return false;
  return slide.id === HUB_SLIDE_ID || slide.type === HUB_SLIDE_TYPE;
}
