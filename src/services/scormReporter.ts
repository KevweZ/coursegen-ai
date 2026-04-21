/**
 * scormReporter.ts
 *
 * Thin wrapper around the pipwerks SCORM 1.2 API that is injected into the
 * SCORM package by scormService.ts.
 *
 * The pipwerks API lives on window.pipwerks (attached by scorm_api.js).
 * When running in the NexCourse builder/preview (no LMS), all calls are
 * silently no-ops — the API is only active inside an exported SCORM package.
 *
 * SCORM 1.2 Data Model elements used:
 *   cmi.core.lesson_status    — "passed" | "failed" | "completed" | "incomplete"
 *   cmi.core.score.raw        — numeric score 0-100
 *   cmi.core.score.min        — always 0
 *   cmi.core.score.max        — always 100
 *   cmi.core.lesson_location  — slide index bookmark (string)
 *   cmi.suspend_data          — JSON blob for full session state (max 4096 chars)
 */

declare global {
  interface Window {
    // Injected by scorm_api.js in the exported SCORM package
    pipwerks?: {
      SCORM: {
        init: () => boolean;
        quit: () => void;
        set: (param: string, val: string) => void;
        get: (param: string) => string;
        connection: { isActive: boolean };
      };
    };
  }
}

function getAPI() {
  return window.pipwerks?.SCORM ?? null;
}

/** Initialize the SCORM session. Called once on player mount inside a SCORM package. */
export function scormInit(): boolean {
  const api = getAPI();
  if (!api) return false;
  const ok = api.init();
  if (ok) {
    api.set('cmi.core.lesson_status', 'incomplete');
  }
  return ok;
}

/** Terminate the SCORM session. Called on page unload. */
export function scormQuit(): void {
  getAPI()?.quit();
}

/** Save the learner's current slide position as a bookmark. */
export function scormSetLocation(slideIndex: number): void {
  const api = getAPI();
  if (!api?.connection.isActive) return;
  api.set('cmi.core.lesson_location', String(slideIndex));
}

/**
 * Report Mastery Quiz results to the LMS.
 * This is the key function that transmits pass/fail and score back to the LMS.
 *
 * @param score       Numeric score 0-100
 * @param passed      Whether the learner met the passing threshold
 * @param passingScore The configured passing threshold (for reference only — not a SCORM field)
 */
export function scormReportScore(score: number, passed: boolean): void {
  const api = getAPI();
  if (!api?.connection.isActive) return;

  // SCORM 1.2 score fields
  api.set('cmi.core.score.min', '0');
  api.set('cmi.core.score.max', '100');
  api.set('cmi.core.score.raw', String(Math.round(score)));

  // SCORM 1.2 lesson status — "passed" or "failed" are the standard LMS-reportable values
  api.set('cmi.core.lesson_status', passed ? 'passed' : 'failed');
}

/**
 * Persist arbitrary session state so the learner can resume later.
 * Uses cmi.suspend_data (max 4096 chars per SCORM 1.2 spec).
 */
export function scormSuspend(data: Record<string, unknown>): void {
  const api = getAPI();
  if (!api?.connection.isActive) return;
  try {
    const json = JSON.stringify(data).slice(0, 4096);
    api.set('cmi.suspend_data', json);
  } catch {
    // Silently ignore serialization errors
  }
}

/** Read previously saved suspend data. Returns null if none or on error. */
export function scormResume(): Record<string, unknown> | null {
  const api = getAPI();
  if (!api?.connection.isActive) return null;
  try {
    const raw = api.get('cmi.suspend_data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
