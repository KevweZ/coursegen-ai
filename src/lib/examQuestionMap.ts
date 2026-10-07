/** Default on for both One at a Time and All at Once. Explicit false hides the card. */
export function examShowsQuestionMap(config?: { showQuestionMap?: boolean } | null): boolean {
  return config?.showQuestionMap !== false;
}
