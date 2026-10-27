export const AUTH_ACCOUNT_EXISTS =
  'An account already exists with this email. Sign in, or use Forgot password.';

export function describeAuthError(message: string | null | undefined): string {
  const msg = (message || '').trim();
  if (!msg) return 'Something went wrong. Please try again.';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'Could not reach the sign-in service. Check your connection and try again.';
  }
  if (/already registered|already been registered|user already exists|email already/i.test(msg)) {
    return AUTH_ACCOUNT_EXISTS;
  }
  return msg;
}

/** Duplicate sign-up with email confirmation on returns 200 and empty identities. */
export function describeSignUpResult(
  error: { message?: string } | null | undefined,
  data: { session?: unknown; user?: { identities?: unknown[] | null } | null } | null | undefined,
): string | null {
  if (error?.message) return describeAuthError(error.message);
  const identities = data?.user?.identities;
  if (!data?.session && Array.isArray(identities) && identities.length === 0) {
    return AUTH_ACCOUNT_EXISTS;
  }
  return null;
}
