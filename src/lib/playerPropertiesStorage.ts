/**
 * Persist account-level Player Properties defaults (admin menu / /PlayerProperties page).
 * Session overrides in Course Development are separate — this is the template for new courses.
 * Local storage is a cache; account preferences API is the cross-device source of truth.
 */
import type { PlayerConfig } from '../components/builder/PlayerPropertiesModal';
import { defaultPlayerConfig } from '../components/builder/PlayerPropertiesModal';
import { pushAccountPreferences } from './accountPreferences';

const STORAGE_KEY = 'nexcourse.playerProperties.v1';

function storageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function loadPlayerProperties(userId?: string | null): PlayerConfig | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw && userId) {
      const fallback = localStorage.getItem(STORAGE_KEY);
      if (!fallback) return null;
      return { ...defaultPlayerConfig, ...JSON.parse(fallback) } as PlayerConfig;
    }
    if (!raw) return null;
    return { ...defaultPlayerConfig, ...JSON.parse(raw) } as PlayerConfig;
  } catch {
    return null;
  }
}

export function savePlayerProperties(config: PlayerConfig, userId?: string | null): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(config));
  } catch (e) {
    console.warn('[playerPropertiesStorage] Failed to save', e);
  }
  if (userId) {
    void pushAccountPreferences({ playerProperties: config }).then(r => {
      if (!r.ok) console.warn('[playerPropertiesStorage] Cloud sync failed:', r.error);
    });
  }
}

/** Apply player properties from the account cloud without re-pushing. */
export function cachePlayerProperties(config: PlayerConfig, userId?: string | null): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(config));
  } catch (e) {
    console.warn('[playerPropertiesStorage] Failed to cache', e);
  }
}
