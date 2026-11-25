import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

test('homepage hero says eLearning, keeps SCORM in the supporting line, and ships the walkthrough', () => {
  const home = readFileSync(resolve(process.cwd(), 'src/components/marketing/MarketingHomepage.tsx'), 'utf8');
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const video = resolve(process.cwd(), 'public/marketing/nexcourse-walkthrough.mp4');

  assert.match(home, /editable eLearning course for your LMS/);
  assert.doesNotMatch(home, /editable SCORM course for your LMS — without needing an authoring tool/);
  assert.match(home, /export SCORM 1\.2 or 2004/);
  assert.match(home, /\/marketing\/nexcourse-walkthrough\.mp4/);
  assert.match(html, /editable eLearning course for your LMS/);

  const bytes = statSync(video).size;
  assert.ok(bytes > 1_000_000, 'walkthrough mp4 should be present');
  assert.ok(bytes < 26_214_400, 'walkthrough must stay under the Cloudflare 25 MiB asset cap');
});
