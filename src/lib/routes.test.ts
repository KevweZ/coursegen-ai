import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isProtectedPath,
  parseAppPath,
  ROUTES,
  teamInviteFromSearch,
  myAccountInvitePath,
} from './routes.ts';

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

test('worker does not SPA-fallback hashed /assets bundles to index.html', () => {
  const worker = readFileSync(resolve(process.cwd(), 'worker.js'), 'utf8');
  assert.match(worker, /url\.pathname\.startsWith\('\/assets\/'\)/);
  assert.match(worker, /Failed to fetch dynamically imported module/);
});

test('team invite query survives /account and /MyAccount path parsing', () => {
  assert.equal(teamInviteFromSearch('?team_invite=abc123'), 'abc123');
  assert.equal(teamInviteFromSearch('team_invite=abc123&x=1'), 'abc123');
  assert.equal(myAccountInvitePath('tok'), '/MyAccount?team_invite=tok');
  assert.deepEqual(parseAppPath('/MyAccount?team_invite=abc'), { kind: 'myAccount' });
  assert.deepEqual(parseAppPath('/account?team_invite=abc'), { kind: 'myAccount' });
  assert.equal(isProtectedPath('/MyAccount?team_invite=abc'), true);
  assert.equal(isProtectedPath('/account?team_invite=abc'), true);
});
