import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipDisplayTime, formatVideoClock, isFloatingVideo, videoClipRange } from './floatingMedia.ts';

test('video kind and data URLs count as floating video', () => {
  assert.equal(isFloatingVideo({ kind: 'video', url: 'blob:x' }), true);
  assert.equal(isFloatingVideo({ kind: 'image', url: 'clip.mp4' }), false);
  assert.equal(isFloatingVideo({ url: 'data:video/mp4;base64,aaa' }), true);
  assert.equal(isFloatingVideo({ url: 'https://cdn.example/clip.webm' }), true);
  assert.equal(isFloatingVideo({ url: 'photo.png' }), false);
});

test('trimmed clip reports the window length, not the file duration', () => {
  const clip = videoClipRange({ clipStart: 0, clipEnd: 9 }, 21);
  assert.equal(clip.clipped, true);
  assert.equal(clip.start, 0);
  assert.equal(clip.end, 9);
  assert.equal(clip.duration, 9);
  assert.equal(formatVideoClock(clip.duration), '00:09');
  assert.equal(clipDisplayTime(9, clip.start, clip.duration), 9);
  assert.equal(clipDisplayTime(4.2, clip.start, clip.duration), 4.2);
});

test('untrimmed video keeps the full file timeline', () => {
  const clip = videoClipRange({}, 21);
  assert.equal(clip.clipped, false);
  assert.equal(clip.duration, 21);
  assert.equal(formatVideoClock(clip.duration), '00:21');
});
