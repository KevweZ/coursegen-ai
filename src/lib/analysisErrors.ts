import { isApiColdStart, isImageTimeout } from './apiWarmup';

export type AnalysisErrorAction = 'retry' | 'account';

/** Render free instances can take ~50–90s to wake; the overlay counts this down. */
export const COLD_START_COUNTDOWN_SEC = 50;
export const ANALYSIS_WARM_TIMEOUT_MS = 120_000;

export type AnalysisFailure = {
  body: string;
  action: AnalysisErrorAction;
};

export const ANALYSIS_NO_CREDITS_MESSAGE =
  'You have no AI credits. Purchase credits or choose a membership plan to continue.';

export function isNoCreditsError(raw: string): boolean {
  return /AI_NO_CREDITS|no AI generation credits remaining|proxy error 402/i.test(raw);
}

/** Sleeping Render, Cloudflare 524, or a dropped fetch — retry after warmup, do not blame the file. */
export function isAnalysisTransient(err: unknown): boolean {
  if (isApiColdStart(err) || isImageTimeout(err)) return true;
  const rec = err && typeof err === 'object'
    ? (err as { status?: number; message?: string; code?: string; error?: unknown })
    : null;
  const nested = rec && rec.error && typeof rec.error === 'object'
    ? String((rec.error as { message?: string }).message || rec.error)
    : typeof rec?.error === 'string' ? rec.error : '';
  const msg = String(
    rec?.message || nested || rec?.code || (typeof err === 'string' ? err : ''),
  );
  const blob = `${rec?.code || ''} ${msg} ${rec?.status || ''}`;
  if (/AI_NO_CREDITS|TRIAL_EXPIRED|TRIAL_LIMIT|402/i.test(blob) && !/timed out|failed to fetch/i.test(blob)) {
    return false;
  }
  return /failed to fetch|server unreachable|timed out|UPSTREAM_TIMEOUT|networkerror|load failed|aborterror|COLD_START|warming up|\b524\b|\b504\b|\b503\b/i.test(blob);
}

export function formatAnalysisFailure(raw: string | null | undefined): AnalysisFailure {
  const msg = String(raw || '');
  if (/TRIAL_EXPIRED|trial has expired/i.test(msg)) {
    return {
      body: 'Your trial access period has ended. Contact support@nexcourse.ai to continue.',
      action: 'retry',
    };
  }
  if (/TRIAL_LIMIT_EXCEEDED|weekly AI generation limit|trial limit/i.test(msg)) {
    return {
      body: 'Weekly AI generation limit reached (this is not your trial end date). Wait for the weekly reset, open a saved draft from Save, or contact support@nexcourse.ai.',
      action: 'retry',
    };
  }
  if (isNoCreditsError(msg)) {
    return { body: ANALYSIS_NO_CREDITS_MESSAGE, action: 'account' };
  }
  return {
    body: 'Something went wrong while reading your file. Please try again.',
    action: 'retry',
  };
}
