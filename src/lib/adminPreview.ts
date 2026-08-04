/**
 * Admin account preview modes — local-only UI/entitlement simulation
 * so the admin can QA Free / Creator / Team without paying.
 */

export type AdminAccountView =
  | 'admin'
  | 'free'
  | 'creator'
  | 'team_owner'
  | 'team_member';

export const ADMIN_ACCOUNT_VIEW_KEY = 'nexcourse_admin_account_view';

export const ADMIN_ACCOUNT_VIEWS: {
  id: AdminAccountView;
  label: string;
  hint: string;
}[] = [
  { id: 'admin', label: 'Admin', hint: 'Your real entitlements + admin tools' },
  { id: 'free', label: 'Free', hint: 'New / unpaid customer' },
  { id: 'creator', label: 'Creator', hint: 'Solo plan · Alloy · 3 drafts' },
  { id: 'team_owner', label: 'Team Owner', hint: 'Billing · invites · top-ups' },
  { id: 'team_member', label: 'Team Seat', hint: 'Pooled credits · no billing' },
];

function normalizeView(v: string | null): AdminAccountView {
  // Migrate legacy single "team" preview → owner
  if (v === 'team') return 'team_owner';
  if (
    v === 'free'
    || v === 'creator'
    || v === 'team_owner'
    || v === 'team_member'
    || v === 'admin'
  ) {
    return v;
  }
  return 'admin';
}

export function readAdminAccountView(): AdminAccountView {
  try {
    return normalizeView(localStorage.getItem(ADMIN_ACCOUNT_VIEW_KEY));
  } catch { /* ignore */ }
  return 'admin';
}

export function writeAdminAccountView(view: AdminAccountView) {
  try {
    localStorage.setItem(ADMIN_ACCOUNT_VIEW_KEY, view);
    window.dispatchEvent(new CustomEvent('nexcourse-admin-view', { detail: view }));
  } catch { /* ignore */ }
}

/** Map preview → subscription id used by plan gates (voices, drafts, Account UI). */
export function planForAdminView(view: AdminAccountView, realPlan: string | null | undefined): string {
  switch (view) {
    case 'free':
      return 'free';
    case 'creator':
      return 'pro_creator';
    case 'team_owner':
    case 'team_member':
      return 'business_team';
    case 'admin':
    default:
      return realPlan ?? 'free';
  }
}

export function demoCreditsForView(view: AdminAccountView): { ai: number; tts: number } {
  switch (view) {
    case 'free':
      return { ai: 50, tts: 0 };
    case 'creator':
      return { ai: 420, tts: 380 };
    case 'team_owner':
    case 'team_member':
      return { ai: 1280, tts: 1100 };
    default:
      return { ai: 0, tts: 0 };
  }
}

/** True when admin is previewing either Team role. */
export function isTeamPreviewView(view: AdminAccountView): boolean {
  return view === 'team_owner' || view === 'team_member';
}
