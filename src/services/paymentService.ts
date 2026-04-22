/**
 * paymentService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend service layer for all Stripe payment operations.
 * Talks to the Railway backend proxy (never directly to Stripe from the client).
 *
 * Security model:
 *   - Secret key lives on Railway (server.js) ONLY
 *   - Publishable key used by browser only for display (not used here directly)
 *   - Checkout sessions created server-side, user redirected to Stripe-hosted page
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_BASE =
  import.meta.env.MODE === 'production'
    ? '' // same origin in production (Railway serves the frontend)
    : 'http://localhost:3001';

// ── Plan IDs that map to Stripe Price IDs on the backend ─────────────────────
export type StripePlanId =
  | 'teacher_pro'
  | 'pro_creator'
  | 'business_team'
  | 'credits_standard'
  | 'credits_volume';

export interface CheckoutOptions {
  planId: StripePlanId;
  userId: string;
  userEmail: string;
}

export interface CheckoutResponse {
  url: string; // Stripe-hosted checkout page URL
}

export interface PaymentStatus {
  subscription: 'free' | 'teacher_pro' | 'pro_creator' | 'business_team' | null;
  credits_ai: number;
  credits_tts: number;
  stripe_customer_id: string | null;
}

// ── Create Checkout Session ───────────────────────────────────────────────────
/**
 * Creates a Stripe Checkout Session and returns the URL to redirect to.
 * The user is redirected to Stripe's hosted checkout page.
 */
export async function createCheckoutSession(
  options: CheckoutOptions
): Promise<CheckoutResponse> {
  const res = await fetch(`${API_BASE}/api/payments/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to create checkout session');
  }

  return res.json();
}

/**
 * Redirects the user to Stripe's hosted checkout page.
 * Uses window.location.href for a clean full-page redirect.
 */
export async function redirectToCheckout(options: CheckoutOptions): Promise<void> {
  const { url } = await createCheckoutSession(options);
  window.location.href = url;
}

// ── Get Payment Status ────────────────────────────────────────────────────────
/**
 * Fetches the current user's subscription tier and credit balance.
 * Returns null if the user has no entitlement record yet (new user = free tier).
 */
export async function getPaymentStatus(userId: string): Promise<PaymentStatus | null> {
  const res = await fetch(`${API_BASE}/api/payments/status?userId=${encodeURIComponent(userId)}`);

  if (!res.ok) {
    console.warn('[paymentService] Failed to fetch payment status:', res.statusText);
    return null;
  }

  return res.json();
}
