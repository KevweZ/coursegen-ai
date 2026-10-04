/** Parked like Game Modes — keep the engines, hide author-facing picks this version. */
export const PARKED_INTERACTION_TYPES = ['scenario'] as const;

export function stripParkedInteractionTypes(ids: string[] | undefined | null): string[] {
  const parked = new Set<string>(PARKED_INTERACTION_TYPES);
  return (ids || []).filter(t => !parked.has(t));
}
