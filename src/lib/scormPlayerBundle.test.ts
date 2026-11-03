import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('deploy rebuilds the SCORM player so LMS packages match preview', () => {
  const pkg = JSON.parse(src('package.json'));
  assert.match(String(pkg.scripts.build), /build:player/);
  const scorm = src('src/services/scormService.ts');
  assert.match(scorm, /html,body,#root\{height:100%/);
  const app = src('src/App.tsx');
  assert.match(app, /stampFloatingMediaOnCourse/);
});

test('committed SCORM player includes the Overview / Instruction tab layout', () => {
  const playerPath = resolve(process.cwd(), 'public/scorm-player/index.html');
  assert.equal(existsSync(playerPath), true);
  const html = readFileSync(playerPath, 'utf8');
  assert.match(html, /children:"Instruction"/);
  assert.match(html, /Select a topic tab to continue/);
  assert.match(html, /data-float-stage/);
});
