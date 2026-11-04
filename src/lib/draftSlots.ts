/**
 * Draft library size by plan. Admin quota is independent of Stripe / Account preview.
 */
export const MAX_PRO_DRAFTS = 3;
export const MAX_TEAM_DRAFTS = 10;
export const MAX_ADMIN_DRAFTS = 100;

export function getDraftLimitForPlan(plan?: string | null, isAdmin?: boolean): number {
  if (isAdmin) return MAX_ADMIN_DRAFTS;
  if (!plan) return MAX_PRO_DRAFTS;
  const p = plan.toLowerCase();
  if (p.includes('enterprise') || p.includes('team') || p.includes('business')) return MAX_TEAM_DRAFTS;
  return MAX_PRO_DRAFTS;
}
