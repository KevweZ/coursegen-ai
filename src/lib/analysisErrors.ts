export type AnalysisErrorAction = 'retry' | 'account';

export type AnalysisFailure = {
  body: string;
  action: AnalysisErrorAction;
};

export const ANALYSIS_NO_CREDITS_MESSAGE =
  'You have no AI credits. Purchase credits or choose a membership plan to continue.';

export function isNoCreditsError(raw: string): boolean {
  return /AI_NO_CREDITS|no AI generation credits remaining|proxy error 402/i.test(raw);
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
