/** Draft save copy and quota detection — kept off the Supabase client so tests can import it. */

export const MEDIA_UPLOAD_ATTEMPTS = 2;

export const MEDIA_SYNC_RETRY_MESSAGE =
  'Pictures or narration did not finish uploading. Wait a moment and Update Draft again.';

export const BROWSER_CACHE_FULL_MESSAGE =
  'Saved to your account. This browser is full — pictures will download from the cloud the next time you open the draft.';

export function isBrowserStorageFull(err: unknown): boolean {
  const rec = err && typeof err === 'object' ? err as { name?: string; message?: string; code?: number } : null;
  const blob = `${rec?.name || ''} ${rec?.message || ''} ${rec?.code || ''} ${typeof err === 'string' ? err : ''}`;
  return /quota|full|QuotaExceeded/i.test(blob);
}
