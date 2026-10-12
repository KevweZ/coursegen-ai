import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isProtectedPath, parseAppPath, ROUTES } from './routes.ts';

test('terms, privacy, and report-a-bug are public marketing paths', () => {
  assert.deepEqual(parseAppPath('/terms'), { kind: 'marketing', view: 'terms' });
  assert.deepEqual(parseAppPath('/privacy'), { kind: 'marketing', view: 'privacy' });
  assert.deepEqual(parseAppPath('/report-a-bug'), { kind: 'marketing', view: 'report-a-bug' });
  assert.equal(isProtectedPath(ROUTES.terms), false);
  assert.equal(isProtectedPath(ROUTES.privacy), false);
  assert.equal(isProtectedPath(ROUTES.reportBug), false);
});

test('/account aliases My Account for Stripe portal return', () => {
  assert.deepEqual(parseAppPath('/account'), { kind: 'myAccount' });
  assert.equal(isProtectedPath('/account'), true);
});
