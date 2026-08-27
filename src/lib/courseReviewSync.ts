/**
 * Fingerprint of the post-upload foundation used to generate the outline.
 * When it drifts, the Course structure tab is stale and should prompt to resync.
 */
export type FoundationFingerprintInput = {
  courseTitle: string;
  courseDescription: string;
  prompt: string;
  learningObjectives: unknown;
  objectiveFormat: string;
  includeModuleTitleSlides: boolean;
  includeModuleOverviewSlides: boolean;
  includeSummarySlides: boolean;
};

export function foundationFingerprint(input: FoundationFingerprintInput): string {
  return JSON.stringify({
    title: (input.courseTitle || '').trim(),
    description: (input.courseDescription || input.prompt || '').trim(),
    objectives: input.learningObjectives ?? [],
    format: input.objectiveFormat || 'AB',
    includeModuleTitleSlides: !!input.includeModuleTitleSlides,
    includeModuleOverviewSlides: !!input.includeModuleOverviewSlides,
    includeSummarySlides: !!input.includeSummarySlides,
  });
}
