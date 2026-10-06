import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySlideBackdrop } from './slideBackdrop.ts';

const course = {
  modules: [
    {
      id: 'm1',
      slides: [
        { id: 's1', title: 'A' },
        { id: 's2', title: 'B' },
      ],
    },
    {
      id: 'm2',
      slides: [{ id: 's3', title: 'C' }],
    },
  ],
};

test('backdrop applies to one slide, a module, or the whole course', () => {
  const one = applySlideBackdrop(course, {
    slideId: 's1',
    backgroundImage: 'data:img-1',
    backgroundDim: true,
    scope: 'slide',
  });
  assert.equal(one.modules[0].slides[0].backgroundImage, 'data:img-1');
  assert.equal(one.modules[0].slides[0].backgroundDim, true);
  assert.equal(one.modules[0].slides[1].backgroundImage, undefined);

  const mod = applySlideBackdrop(course, {
    slideId: 's1',
    backgroundImage: 'data:mod',
    backgroundDim: false,
    scope: 'module',
  });
  assert.equal(mod.modules[0].slides[0].backgroundImage, 'data:mod');
  assert.equal(mod.modules[0].slides[1].backgroundImage, 'data:mod');
  assert.equal(mod.modules[1].slides[0].backgroundImage, undefined);

  const all = applySlideBackdrop(course, {
    slideId: 's3',
    backgroundImage: 'data:all',
    backgroundDim: true,
    scope: 'course',
  });
  assert.equal(all.modules[0].slides[0].backgroundImage, 'data:all');
  assert.equal(all.modules[1].slides[0].backgroundImage, 'data:all');
  assert.equal(all.modules[1].slides[0].backgroundDim, true);
});

test('null backgroundImage clears the field', () => {
  const seeded = applySlideBackdrop(course, {
    slideId: 's1',
    backgroundImage: 'data:x',
    scope: 'course',
  });
  const cleared = applySlideBackdrop(seeded, {
    slideId: 's2',
    backgroundImage: null,
    backgroundDim: false,
    scope: 'module',
  });
  assert.equal(cleared.modules[0].slides[0].backgroundImage, undefined);
  assert.equal(cleared.modules[1].slides[0].backgroundImage, 'data:x');
});
