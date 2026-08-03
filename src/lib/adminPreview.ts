/**
 * Admin account preview modes — local-only UI/entitlement simulation
 * so the admin can QA Free / Creator / Team without paying.
 */

export type AdminAccountView = 'admin' | 'free' | 'creator' | 'team';

export const ADMIN_ACCOUNT_VIEW_KEY = 'nexcourse_admin_account_view';

export const ADMIN_ACCOUNT_VIEWS: {
  id: AdminAccountView;
  label: string;
  hint: string;
}[] = [
  { id: 'admin', label: 'Admin', hint: 'Your real entitlements + admin tools' },
  { id: 'free', label: 'Free', hint: 'New / unpaid customer' },
  { id: 'creator', label: 'Creator', hint: 'Solo plan · Alloy · 3 drafts' },
  { id: 'team', label: 'Team', hint: 'Seats panel · all voices · 10 drafts' },
];

export function readAdminAccountView(): AdminAccountView {
  try {
    const v = localStorage.getItem(ADMIN_ACCOUNT_VIEW_KEY);
    if (v === 'free' || v === 'creator' || v === 'team' || v === 'admin') return v;
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
    case 'team':
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
    case 'team':
      return { ai: 1280, tts: 1100 };
    default:
      return { ai: 0, tts: 0 };
  }
}
