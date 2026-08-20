import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

const ADMIN_EMAIL = ((import.meta as any).env.VITE_ADMIN_EMAIL as string ?? '').toLowerCase().trim();
const RECOVERY_FLAG_KEY = 'nexcourse_password_recovery';

/** True inside Capacitor native shell (optional global — no hard dependency on @capacitor/core). */
function isNativeApp(): boolean {
  try {
    const cap = (globalThis as any).Capacitor;
    return typeof cap?.isNativePlatform === 'function' && !!cap.isNativePlatform();
  } catch {
    return false;
  }
}

/** Web local-dev uses localhost; Capacitor WebView also reports localhost — use production origin there. */
function getAuthRedirectOrigin(): string {
  if (isNativeApp()) return 'https://nexcourse.ai';
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  return 'https://nexcourse.ai';
}

/** True when the URL is our password-reset landing (email redirect). */
export function isPasswordResetLandingUrl(): boolean {
  if (typeof window === 'undefined') return false;
  // Prefer hash path on Capacitor; pathname on web (and reset deep links).
  const pathFromHash = (window.location.hash || '').replace(/^#/, '').split('?')[0];
  const path = (pathFromHash || window.location.pathname).replace(/\/+$/, '') || '/';
  if (path === '/reset-password') return true;
  return new URLSearchParams(window.location.search).get('reset') === 'true';
}

function markPasswordRecoveryPending() {
  try {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, '1');
  } catch { /* ignore */ }
}

function clearPasswordRecoveryPending() {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch { /* ignore */ }
}

function hasPasswordRecoveryPending(): boolean {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function stripResetQueryFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('reset')) {
    url.searchParams.delete('reset');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next || '/');
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type UserTrack = 'corporate';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialExpiresAt: string | null;
  /** User arrived via password-reset email and must choose a new password. */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    track: UserTrack
  ) => Promise<{ error: string | null; needsVerification: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(() =>
    isPasswordResetLandingUrl() || hasPasswordRecoveryPending()
  );

  // Derived: admin by email match OR user_metadata.role === 'admin'
  const isAdmin = !!(
    (user?.email && user.email.toLowerCase() === ADMIN_EMAIL)
    || user?.user_metadata?.role === 'admin'
  );

  // Derived: trial role flags (read from Supabase user_metadata set at invite time)
  const isTrial        = user?.user_metadata?.role === 'trial';
  const trialExpiresAt = (user?.user_metadata?.trial_expires_at as string) ?? null;
  const isTrialExpired = isTrial && trialExpiresAt
    ? new Date(trialExpiresAt) < new Date()
    : false;

  useEffect(() => {
    if (isPasswordResetLandingUrl()) {
      markPasswordRecoveryPending();
      setPasswordRecovery(true);
    }

    // Restore any existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session && (isPasswordResetLandingUrl() || hasPasswordRecoveryPending())) {
        setPasswordRecovery(true);
      }
      setLoading(false);
    });

    // Listen for login / logout / token refresh / password recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        markPasswordRecoveryPending();
        setPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth Methods ────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    track: UserTrack
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          track,
          plan: 'free',
        },
      },
    });

    if (error) return { error: error.message, needsVerification: false };
    return { error: null, needsVerification: !data.session };
  };

  const signInWithGoogle = async () => {
    // After OAuth, land on /upload. On native this opens the system browser for now;
    // email/password stays in-app (smoke-test path). Deep-link return is a later milestone.
    const redirectTo = `${getAuthRedirectOrigin()}/upload`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    clearPasswordRecoveryPending();
    setPasswordRecovery(false);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // Keep ?reset=true — already allowed in Supabase redirect URLs for nexcourse.ai
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAuthRedirectOrigin()}?reset=true`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      clearPasswordRecoveryPending();
      setPasswordRecovery(false);
      stripResetQueryFromUrl();
    }
    return { error: error?.message ?? null };
  };

  const clearPasswordRecovery = () => {
    clearPasswordRecoveryPending();
    setPasswordRecovery(false);
    stripResetQueryFromUrl();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isTrial,
        isTrialExpired,
        trialExpiresAt,
        passwordRecovery,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
