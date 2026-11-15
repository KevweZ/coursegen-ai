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

test('worker maps Render HTML 429 to a JSON rate-limit, not a draft Sync toast', () => {
  const worker = readFileSync(resolve(process.cwd(), 'worker.js'), 'utf8');
  assert.match(worker, /buildProxyHeaders/);
  assert.match(worker, /cf-connecting-ip/);
  assert.match(worker, /cdn-loop/);
  assert.match(worker, /UPSTREAM_RATE_LIMIT/);
  assert.match(worker, /arrayBuffer/);
  assert.doesNotMatch(worker, /If you were saving a draft/);
  assert.match(worker, /rate-limited right now/);
  // Retrying HTML 429/524 re-runs a 90s image gen and burns the limiter.
  assert.match(worker, /COLD_START_STATUSES/);
  assert.doesNotMatch(worker, /HTML_RETRY_STATUSES/);
  const retrySet = worker.slice(
    worker.indexOf('const COLD_START_STATUSES'),
    worker.indexOf('function sleep'),
  );
  assert.match(retrySet, /502/);
  assert.match(retrySet, /503/);
  assert.doesNotMatch(retrySet, /429/);
  assert.doesNotMatch(retrySet, /524/);
  assert.match(worker, /UPSTREAM_TIMEOUT/);
  assert.match(worker, /image request timed out/);
});

test('payments, drafts, QC, and admin require a verified Bearer', () => {
  const server = readFileSync(resolve(process.cwd(), 'server.js'), 'utf8');
  const checkout = server.slice(
    server.indexOf("app.post('/api/payments/create-checkout'"),
    server.indexOf("app.post('/api/payments/billing-portal'"),
  );
  assert.match(checkout, /requireAuthedUser/);
  assert.match(checkout, /userId = auth\.userId/);
  assert.match(checkout, /stripe_customer_id/);
  assert.match(checkout, /customer: existingCustomerId/);
  assert.doesNotMatch(checkout, /const \{ planId, userId, userEmail \} = req\.body/);

  const portal = server.slice(
    server.indexOf("app.post('/api/payments/billing-portal'"),
    server.indexOf("app.post('/api/payments/webhook'"),
  );
  assert.match(portal, /requireAuthedUser/);
  assert.match(portal, /eq\('user_id', auth\.userId\)/);

  const status = server.slice(
    server.indexOf("app.get('/api/payments/status'"),
    server.indexOf("app.get('/api/workspace'"),
  );
  assert.match(status, /requireAuthedUser/);
  assert.match(status, /userId = auth\.userId/);

  const upsert = server.slice(
    server.indexOf("app.post('/api/drafts/upsert'"),
    server.indexOf("app.delete('/api/drafts/:id'"),
  );
  assert.match(upsert, /existing\.user_id !== auth\.userId/);
  assert.match(upsert, /status\(403\)/);

  const draftsList = server.slice(
    server.indexOf("app.get('/api/drafts'"),
    server.indexOf("app.get('/api/drafts/:id'"),
  );
  assert.match(draftsList, /getActiveTeamMembership/);
  assert.match(draftsList, /Forbidden/);

  const qc = server.slice(
    server.indexOf("app.post('/api/qc/content-scan'"),
    server.indexOf('const slideSummary'),
  );
  assert.match(qc, /requireAuthedUser/);

  const admin = server.slice(
    server.indexOf('async function verifyAdminJwt'),
    server.indexOf("app.post('/api/admin/invite'"),
  );
  assert.match(admin, /auth\.getUser\(token\)/);
  assert.doesNotMatch(admin, /Passed via JWT decode/);

  const requireAuth = server.slice(
    server.indexOf('async function requireAuthedUser'),
    server.indexOf("app.get('/api/drafts'"),
  );
  assert.match(requireAuth, /auth\.getUser\(token\)/);
  assert.doesNotMatch(requireAuth, /fall through to JWT decode/);

  const pay = readFileSync(resolve(process.cwd(), 'src/services/paymentService.ts'), 'utf8');
  assert.match(pay, /authJsonHeaders/);
  assert.match(pay, /openBillingPortal/);
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
