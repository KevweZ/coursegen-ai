import {
  isApiColdStart,
  isImageAuthOrCreditStop,
  isImageNetworkFailure,
  isImageRateLimit,
  isImageTimeout,
} from './apiWarmup';

/** One at a time so parallel OpenRouter 429s cannot zero out the whole 14. */
export const CONTENT_IMAGE_CONCURRENCY = 1;
export const CONTENT_IMAGE_PACE_MS = 2000;
export const CONTENT_IMAGE_TIMEOUT_MS = 90000;
export const CONTENT_IMAGE_RATE_LIMIT_WAIT_MS = 25000;
export const CONTENT_IMAGE_TRANSIENT_WAIT_MS = 2500;

export type ContentImageAttemptAction =
  | { kind: 'stop' }
  | { kind: 'retry'; waitMs: number }
  | { kind: 'skip' };

/**
 * After a failed bulk slot: wait-and-retry 429/timeout/network once,
 * stop only on auth/credits, otherwise skip that picture and keep going.
 */
export function nextContentImageAttempt(err: unknown): ContentImageAttemptAction {
  if (isImageAuthOrCreditStop(err)) return { kind: 'stop' };
  if (isImageRateLimit(err)) {
    const rec = err && typeof err === 'object' ? (err as { retryAfterMs?: number }) : null;
    const waitMs = Math.min(
      60000,
      Number(rec?.retryAfterMs) > 0 ? Number(rec.retryAfterMs) : CONTENT_IMAGE_RATE_LIMIT_WAIT_MS,
    );
    return { kind: 'retry', waitMs };
  }
  if (isImageTimeout(err) || isImageNetworkFailure(err) || isApiColdStart(err)) {
    return { kind: 'retry', waitMs: CONTENT_IMAGE_TRANSIENT_WAIT_MS };
  }
  return { kind: 'skip' };
}
