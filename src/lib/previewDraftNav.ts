import type { NavigationMode } from '../types/course';

export type PreviewNavSnapshot = {
  navigationMode?: string | null;
  requireInteractionsComplete?: boolean;
  course?: { navigationMode?: string | null } | null;
  playerConfig?: { navigationMode?: string | null } | null;
};

/**
 * A saved draft keeps the navigation it was last saved with.
 * Account Course Settings / Player Properties are defaults for *new* courses only.
 */
export function resolvePreviewDraftNav(
  snapshot: PreviewNavSnapshot,
  playerConfig?: { navigationMode?: string | null } | null,
): { navigationMode: NavigationMode; requireInteractionsComplete: boolean } {
  const cfg = playerConfig || snapshot.playerConfig || {};
  const raw =
    snapshot.navigationMode
    || cfg.navigationMode
    || snapshot.course?.navigationMode
    || 'free';
  const navigationMode = String(raw) as NavigationMode;
  const requireInteractionsComplete = typeof snapshot.requireInteractionsComplete === 'boolean'
    ? snapshot.requireInteractionsComplete
    : false;
  return { navigationMode, requireInteractionsComplete };
}
