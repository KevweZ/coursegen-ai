import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDraftAdminQuota } from './adminPreview.ts';
import { getDraftLimitForPlan, MAX_ADMIN_DRAFTS, MAX_PRO_DRAFTS, MAX_TEAM_DRAFTS } from './draftSlots.ts';

test('admin keeps the full draft library while Account preview is Creator', () => {
  const asAdmin = resolveDraftAdminQuota(true, 'creator');
  assert.equal(asAdmin, true);
  assert.equal(getDraftLimitForPlan('pro_creator', asAdmin), MAX_ADMIN_DRAFTS);
});

test('admin keeps the full draft library in Free, Team, and Admin views', () => {
  for (const view of ['admin', 'free', 'team_owner', 'team_member'] as const) {
    assert.equal(resolveDraftAdminQuota(true, view), true);
    assert.equal(getDraftLimitForPlan('free', true), MAX_ADMIN_DRAFTS);
  }
});

test('non-admin Creator stays at three draft slots', () => {
  assert.equal(resolveDraftAdminQuota(false, 'creator'), false);
  assert.equal(getDraftLimitForPlan('pro_creator', false), MAX_PRO_DRAFTS);
  assert.equal(getDraftLimitForPlan(null, false), MAX_PRO_DRAFTS);
});

test('non-admin Team gets ten draft slots', () => {
  assert.equal(getDraftLimitForPlan('business_team', false), MAX_TEAM_DRAFTS);
});
