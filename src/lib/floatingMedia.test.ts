import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFloatingVideo } from './floatingMedia.ts';

test('video kind and data URLs count as floating video', () => {
  assert.equal(isFloatingVideo({ kind: 'video', url: 'blob:x' }), true);
  assert.equal(isFloatingVideo({ kind: 'image', url: 'clip.mp4' }), false);
  assert.equal(isFloatingVideo({ url: 'data:video/mp4;base64,aaa' }), true);
  assert.equal(isFloatingVideo({ url: 'https://cdn.example/clip.webm' }), true);
  assert.equal(isFloatingVideo({ url: 'photo.png' }), false);
});
