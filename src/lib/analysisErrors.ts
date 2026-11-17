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

export const SERVER_WARMING_MESSAGE =
  'Server is warming up — nothing is wrong with your file or account. Wait a moment and try again.';

/** Empty / unparseable /api/ai JSON after a live brief — not “paste more source”. */
export const ADD_CONTENT_EMPTY_MESSAGE =
  'The generator did not return slides. Wait a moment, then click Generate Course again — you do not need to start over or re-upload.';

/** Outline JSON missing or unreadable — not a bad PPT. */
export const OUTLINE_PARSE_MESSAGE =
  'Could not build the course structure. This is usually a busy server. Wait a moment and try again.';

/** Regen failed — leave the slide the author already has. */
export const REGEN_KEEP_SLIDE_MESSAGE =
  'Regenerate failed. The slide was left as-is. Wait a moment and try again.';

/** Dropped draft fetch / HTML error page — not a corrupt file. */
export const DRAFT_OPEN_RETRY_MESSAGE =
  'Could not open this draft. Wait a moment and try again from View drafts.';

function errBlob(err: unknown): string {
  const rec = err && typeof err === 'object'
    ? (err as { status?: number; message?: string; code?: string; error?: unknown })
    : null;
  const nested = rec && rec.error && typeof rec.error === 'object'
    ? String((rec.error as { message?: string }).message || rec.error)
    : typeof rec?.error === 'string' ? rec.error : '';
  const msg = String(
    rec?.message || nested || rec?.code || (typeof err === 'string' ? err : ''),
  );
  return `${rec?.code || ''} ${msg} ${rec?.status || ''}`;
}

export function isNoCreditsError(raw: string): boolean {
  return /AI_NO_CREDITS|no AI generation credits remaining|proxy error 402/i.test(raw);
}

export function isAiAuthOrCreditFailure(err: unknown): boolean {
  const blob = errBlob(err);
  if (/timed out|failed to fetch|warming up|COLD_START/i.test(blob) && !/AI_NO_CREDITS|TRIAL_/i.test(blob)) {
    return false;
  }
  return /AI_NO_CREDITS|AI_AUTH_REQUIRED|Sign in required|TRIAL_EXPIRED|TRIAL_LIMIT|\b401\b|\b402\b|\b403\b/i.test(blob);
}

/** 503 / 524 / Failed to fetch after a first attempt — wait and retry, do not stub slides. */
export function shouldRetryAiProxy(err: unknown): boolean {
  if (isAiAuthOrCreditFailure(err)) return false;
  return isAnalysisTransient(err);
}

/** Paid/trial 429-shaped messages must not pause-and-retry as a rate limit. */
export function shouldRetryAiRateLimit(err: unknown): boolean {
  if (isAiAuthOrCreditFailure(err)) return false;
  const blob = errBlob(err);
  return /\b429\b|rate_limit|quota/i.test(blob);
}

/** Hydrate must throw these instead of writing “This slide covers key content…” stubs. */
export function isAiInfraFailure(err: unknown): boolean {
  return isAiAuthOrCreditFailure(err) || isAnalysisTransient(err) || isEmptyOrUnparseableAiPayload(err);
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

export function isEmptyOrUnparseableAiPayload(err: unknown): boolean {
  const blob = errBlob(err);
  return /No JSON structure found|All JSON parse attempts failed|did not return any(?: new teaching)? slides|did not return slides|Paste more of the source|Missing or empty ['"]slides['"] array|Critical Data Failure|empty content or voiceOverText|Single slide response missing/i.test(blob);
}

function isDraftFetchNoise(err: unknown): boolean {
  if (isAnalysisTransient(err)) return true;
  const blob = errBlob(err);
  return /unexpected token|not valid JSON|SyntaxError|JSON\.parse|<!DOCTYPE|cloudflare|Could not load draft|may be corrupted|Failed to open draft/i.test(blob);
}

export function formatAddContentFailure(err: unknown): string {
  const blob = errBlob(err);
  if (isNoCreditsError(blob)) return ANALYSIS_NO_CREDITS_MESSAGE;
  if (isAiAuthOrCreditFailure(err) && /sign in|AI_AUTH_REQUIRED|\b401\b|\b403\b/i.test(blob)) {
    return 'Sign in required to generate.';
  }
  if (isAnalysisTransient(err)) return SERVER_WARMING_MESSAGE;
  if (/Critical Data Failure|Could not build the course structure/i.test(blob)) {
    return OUTLINE_PARSE_MESSAGE;
  }
  if (isEmptyOrUnparseableAiPayload(err)) return ADD_CONTENT_EMPTY_MESSAGE;
  const msg = String(
    (err && typeof err === 'object' && 'message' in err && (err as { message?: string }).message)
      || (typeof err === 'string' ? err : ''),
  ).trim();
  return msg || ADD_CONTENT_EMPTY_MESSAGE;
}

export function formatDraftOpenFailure(err: unknown): string {
  const blob = errBlob(err);
  if (isAiAuthOrCreditFailure(err) && /sign in|AI_AUTH_REQUIRED|\b401\b/i.test(blob)) {
    return 'Sign in to open this draft.';
  }
  if (isAnalysisTransient(err)) return SERVER_WARMING_MESSAGE;
  if (isDraftFetchNoise(err)) return DRAFT_OPEN_RETRY_MESSAGE;
  const msg = String(
    (err && typeof err === 'object' && 'message' in err && (err as { message?: string }).message)
      || (typeof err === 'string' ? err : ''),
  ).trim();
  if (/corrupt/i.test(msg) || !msg) return DRAFT_OPEN_RETRY_MESSAGE;
  return msg;
}
