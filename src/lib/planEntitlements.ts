/**
 * Plan entitlements — single source of truth for what each subscription unlocks.
 * Canonical entitlement IDs stored in user_entitlements.subscription:
 *   free | teacher_pro | pro_creator | business_team
 */

export type EntitlementPlan =
  | 'free'
  | 'teacher_pro'
  | 'pro_creator'
  | 'business_team'
  | string
  | null
  | undefined;

export const CREATOR_VOICES = ['alloy'] as const;
export const TEAM_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

/** Normalize checkout plan IDs (monthly/annual variants) → entitlement tier. */
export function normalizeEntitlementPlan(planId: string | null | undefined): string {
  if (!planId) return 'free';
  if (planId === 'pro_creator_monthly' || planId === 'pro_creator_annual') return 'pro_creator';
  if (planId === 'business_team_annual') return 'business_team';
  return planId;
}

export function isTeamPlan(plan: EntitlementPlan): boolean {
  const p = (plan ?? '').toLowerCase();
  return p.includes('business_team') || p.includes('team') || p.includes('enterprise');
}

export function isCreatorPlan(plan: EntitlementPlan): boolean {
  const p = (plan ?? '').toLowerCase();
  return p.includes('pro_creator') || p === 'creator';
}

/** Team (and above) unlock all 6 OpenAI TTS voices; Creator/free get Alloy only. */
export function canUseAllVoices(plan: EntitlementPlan): boolean {
  return isTeamPlan(plan);
}

export function allowedTtsVoices(plan: EntitlementPlan): readonly string[] {
  return canUseAllVoices(plan) ? TEAM_VOICES : CREATOR_VOICES;
}

export function planDisplayName(plan: EntitlementPlan): string {
  switch (normalizeEntitlementPlan(plan ?? 'free')) {
    case 'pro_creator':
      return 'Creator';
    case 'business_team':
      return 'Team';
    case 'teacher_pro':
      return 'Teacher Pro';
    case 'free':
      return 'Free';
    default:
      return plan ? String(plan) : 'Free';
  }
}
