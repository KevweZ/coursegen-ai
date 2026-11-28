import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREDIT_EXAMPLES,
  HOMEPAGE_STATS,
  PRE_PURCHASE_TEST,
  REQUEST_ACCESS_LABEL,
  SCORM_VERSION_EXPLAINER,
  SOURCE_QUALITY_EXPECTATION,
  TRIAL_FAQ,
  TRIAL_WHAT_YOU_GET,
  TRUST_POINTS,
} from './marketingLaunch.ts';
import { TEAM_VOICES } from './planEntitlements.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('homepage hero says eLearning, keeps SCORM in the supporting line, and ships the walkthrough', () => {
  const home = src('src/components/marketing/MarketingHomepage.tsx');
  const html = src('index.html');
  const video = resolve(process.cwd(), 'public/marketing/nexcourse-walkthrough.mp4');

  assert.match(home, /editable eLearning course for your LMS/);
  assert.doesNotMatch(home, /editable SCORM course for your LMS — without needing an authoring tool/);
  assert.match(home, /export SCORM 1\.2 or 2004/);
  assert.match(home, /\/marketing\/nexcourse-walkthrough\.mp4/);
  assert.match(html, /editable eLearning course for your LMS/);
  assert.match(html, /rel="canonical" href="https:\/\/nexcourse\.ai\/"/);

  const bytes = statSync(video).size;
  assert.ok(bytes > 1_000_000, 'walkthrough mp4 should be present');
  assert.ok(bytes < 26_214_400, 'walkthrough must stay under the Cloudflare 25 MiB asset cap');
});

test('homepage stats are static verified facts, not 0+ counters', () => {
  const home = src('src/components/marketing/MarketingHomepage.tsx');
  assert.doesNotMatch(home, /AnimatedCounter/);
  assert.doesNotMatch(home, /suffix: '\+'/);
  assert.doesNotMatch(home, /Start Building Free/);
  assert.doesNotMatch(home, /Try It Now — It's Free/);
  assert.doesNotMatch(home, /No credit card required/);
  assert.match(home, /HOMEPAGE_STATS/);
  assert.match(home, /REQUEST_ACCESS_LABEL/);
  assert.equal(HOMEPAGE_STATS.length, 4);
  assert.equal(TEAM_VOICES.length, 6);
  assert.equal(HOMEPAGE_STATS.some((s) => s.text === '6' && /voices/i.test(s.label)), true);
  assert.equal(HOMEPAGE_STATS.some((s) => /1\.2/.test(s.text)), true);
});

test('trial copy is invitation-only and says what the invite includes', () => {
  const home = src('src/components/marketing/MarketingHomepage.tsx');
  const examples = src('src/components/marketing/ExamplesPage.tsx');
  const methodology = src('src/components/marketing/MethodologyPage.tsx');
  const app = src('src/App.tsx');
  const auth = src('src/components/auth/AuthPage.tsx');
  const terms = src('src/components/legal/TermsOfServicePage.tsx');

  assert.match(TRIAL_FAQ, /invitation-only/i);
  assert.match(TRIAL_WHAT_YOU_GET, /7 days/);
  assert.match(TRIAL_WHAT_YOU_GET, /does not include generation credits/);
  assert.match(home, /TRIAL_FAQ/);
  assert.match(home, /TRIAL_WHAT_YOU_GET/);
  assert.match(examples, /REQUEST_ACCESS_LABEL/);
  assert.match(methodology, /REQUEST_ACCESS_LABEL/);
  assert.doesNotMatch(examples, /Start Building Free/);
  assert.doesNotMatch(examples, /No credit card required/);
  assert.doesNotMatch(methodology, /Start Building for Free/);
  assert.doesNotMatch(methodology, /Try It Free/);
  assert.match(app, /requestAccess/);
  assert.match(auth, /Have an invite/);
  assert.match(terms, /invitation/);
});

test('pricing explains credits with three measured examples plus LMS trust', () => {
  const pricing = src('src/components/PricingPage.tsx');
  assert.equal(CREDIT_EXAMPLES.length, 3);
  assert.match(pricing, /CREDIT_EXAMPLES/);
  assert.match(pricing, /SCORM_VERSION_EXPLAINER/);
  assert.match(pricing, /PRE_PURCHASE_TEST/);
  assert.match(pricing, /TRUST_POINTS/);
  assert.match(SCORM_VERSION_EXPLAINER, /SCORM 1\.2/);
  assert.match(SCORM_VERSION_EXPLAINER, /SCORM 2004/);
  assert.match(PRE_PURCHASE_TEST, /LMS test catalog/);
  for (const ex of CREDIT_EXAMPLES) {
    assert.ok(ex.source && ex.output && ex.ai && ex.tts && ex.regen);
  }
  assert.match(TRUST_POINTS.join(' '), /not use your content to train/i);
  assert.match(TRUST_POINTS.join(' '), /LMS records completion/i);
});

test('upload chooser states source quality and privacy next to the file', () => {
  const upload = src('src/components/builder/UploadPathModal.tsx');
  assert.match(upload, /SOURCE_QUALITY_EXPECTATION/);
  assert.match(upload, /TRUST_POINTS/);
  assert.match(SOURCE_QUALITY_EXPECTATION, /speaker notes/);
});
