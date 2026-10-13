import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  countAudioAssetKeys,
  countImageAssetKeys,
  needsCloudImageDownload,
  courseHasEmptyVisualSlots,
} from './draftMedia.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('audio keys present, zero image keys still needs cloud download', () => {
  const assets = {
    'modules[0].slides[0].voiceOverUrl': new Blob([new Uint8Array(80)]),
    'slide:abc': new Blob([new Uint8Array(80)]),
  };
  assert.equal(countAudioAssetKeys(assets), 2);
  assert.equal(countImageAssetKeys(assets), 0);
  assert.equal(needsCloudImageDownload(assets), true);
});

test('local images skip a second cloud download', () => {
  const assets = {
    coverImage: new Blob([new Uint8Array(40)]),
    'modules[0].slides[0].voiceOverUrl': new Blob([new Uint8Array(80)]),
  };
  assert.equal(countImageAssetKeys(assets), 1);
  assert.equal(needsCloudImageDownload(assets), false);
});

test('empty cover or content slots look unrestored', () => {
  assert.equal(courseHasEmptyVisualSlots({ title: 'Tega', coverImage: null, modules: [] }), true);
  assert.equal(
    courseHasEmptyVisualSlots({
      coverImage: 'data:image/png;base64,aaa',
      modules: [{ slides: [{ type: 'content', imageUrl: null }] }],
    }),
    true,
  );
  assert.equal(
    courseHasEmptyVisualSlots({
      coverImage: 'data:image/png;base64,aaa',
      modules: [{ slides: [{ type: 'content', imageUrl: 'data:image/png;base64,bbb' }] }],
    }),
    false,
  );
});

test('loadDraftAssets fetches cloud when image keys are missing, not when audio count is zero', () => {
  const load = src('src/lib/useDraftCourses.ts');
  const start = load.indexOf('const loadDraftAssets');
  const end = load.indexOf('const loadDraftNarration');
  assert.ok(start >= 0 && end > start, 'loadDraftAssets markers missing');
  const fn = load.slice(start, end);
  assert.match(fn, /needsCloudImageDownload\(blobs\)/);
  assert.doesNotMatch(fn, /countAudioAssetKeys\(blobs\) === 0/);
});
