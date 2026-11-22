/** Timestamp helpers for Course Settings local vs cloud merge. No storage side effects. */

export function settingsUpdatedAt(settings?: { updatedAt?: number } | null): number {
  const n = Number(settings?.updatedAt);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function pickPreferredRecord<T extends { updatedAt?: number }>(
  local: T | null | undefined,
  cloud: T | null | undefined,
  sessionSavedAt = 0,
): T | null {
  const localAt = Math.max(settingsUpdatedAt(local), Number(sessionSavedAt) || 0);
  const cloudAt = settingsUpdatedAt(cloud);
  if (local && localAt >= cloudAt) return local;
  if (cloud) return cloud;
  return local ?? null;
}
