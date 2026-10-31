/** Final image-toast state after generateContentSlideImages returns. */

export type ImageGenResultLike = {
  jobsAttempted: number;
  jobsApplied: number;
  lastError: string | null;
};

export type FinishedImageGenProgress = {
  isRunning: false;
  isDone: boolean;
  current: number;
  total: number;
  error: string | null;
  stopping: false;
};

/**
 * Auto-gen after Build used to leave the toast at "0 of 14" with isRunning true
 * whenever every job failed (progress only increments on success). Always close
 * the run so the spinner cannot loop after narration is done.
 */
export function finishImageGenProgress(result: ImageGenResultLike): FinishedImageGenProgress {
  const jobsAttempted = Number(result?.jobsAttempted) || 0;
  const jobsApplied = Number(result?.jobsApplied) || 0;
  const lastError = result?.lastError || null;
  if (jobsAttempted <= 0) {
    return {
      isRunning: false,
      isDone: false,
      current: 0,
      total: 0,
      error: null,
      stopping: false,
    };
  }
  const failMsg = lastError || 'No image was returned.';
  return {
    isRunning: false,
    isDone: true,
    current: jobsApplied,
    total: jobsAttempted,
    error: jobsApplied === 0 ? failMsg : (jobsApplied < jobsAttempted ? lastError : null),
    stopping: false,
  };
}
