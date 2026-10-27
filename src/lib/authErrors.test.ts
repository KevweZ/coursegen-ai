import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AUTH_ACCOUNT_EXISTS,
  describeAuthError,
  describeSignUpResult,
} from './authErrors.ts';

test('duplicate and network auth errors become readable copy', () => {
  assert.equal(describeAuthError('User already registered'), AUTH_ACCOUNT_EXISTS);
  assert.equal(describeAuthError('Failed to fetch'), 'Could not reach the sign-in service. Check your connection and try again.');
  assert.equal(describeAuthError('Invalid login credentials'), 'Invalid login credentials');
});

test('confirmed-email duplicate sign-up (empty identities) is treated as already exists', () => {
  assert.equal(
    describeSignUpResult(null, { session: null, user: { identities: [] } }),
    AUTH_ACCOUNT_EXISTS,
  );
  assert.equal(
    describeSignUpResult(null, { session: null, user: { identities: [{ id: 'email' }] } }),
    null,
  );
  assert.equal(
    describeSignUpResult({ message: 'Failed to fetch' }, null),
    'Could not reach the sign-in service. Check your connection and try again.',
  );
});

test('sign-up and sign-in surface mapped auth errors', () => {
  const auth = readFileSync(resolve(process.cwd(), 'src/contexts/AuthContext.tsx'), 'utf8');
  assert.match(auth, /describeSignUpResult/);
  assert.match(auth, /describeAuthError/);
});
