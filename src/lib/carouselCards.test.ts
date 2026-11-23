import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalizeHydratedSlide, teachingSlideNeedsRetry } from './hydrateGuards.ts';
import {
  contentPromisesCarousel,
  ensureCarouselCards,
  listCarouselCards,
} from './carouselCards.ts';

test('empty carousel-panel synthesizes cards instead of a blank canvas', () => {
  const next = ensureCarouselCards({
    type: 'carousel-panel',
    title: 'Real-World Installation Examples by Turbine Type',
    content: '- Scroll to explore turbine installations worldwide\n- Each card shows a real hydroelectric station',
    data: { cards: [] },
  }, 'How Hydraulic Turbines Work');
  assert.equal(next.type, 'carousel-panel');
  assert.ok(listCarouselCards(next).length >= 2);
  assert.match(next.data.cards[0].label, /installation|turbine/i);
});

test('content that promised a scrollable card stage becomes a carousel', () => {
  const slide = {
    type: 'content',
    title: 'Real-World Installation Examples by Turbine Type',
    content: '- Scroll to explore turbine installations worldwide\n- Each card shows a real hydroelectric station',
  };
  assert.equal(contentPromisesCarousel(slide), true);
  assert.equal(teachingSlideNeedsRetry(slide), true);
  const next = finalizeHydratedSlide(slide, 'How Hydraulic Turbines Work');
  assert.equal(next.type, 'carousel-panel');
  assert.ok(next.data.cards.length >= 2);
  assert.doesNotMatch(next.data.cards[0].label, /scroll to explore/i);
});

test('object-shaped carousel cards are coerced to an array', () => {
  const next = ensureCarouselCards({
    type: 'carousel-panel',
    title: 'Installations',
    content: '- Browse examples',
    data: {
      cards: {
        c1: { label: 'Pelton plant', description: 'High-head impulse site.', expandedContent: 'A mountain Pelton installation.' },
        c2: { label: 'Francis plant', description: 'Medium-head reaction site.', expandedContent: 'A river Francis installation.' },
        c3: { label: 'Kaplan plant', description: 'Low-head axial site.', expandedContent: 'A dam Kaplan installation.' },
      },
    },
  });
  assert.equal(listCarouselCards(next).length, 3);
  assert.equal(next.data.cards[0].label, 'Pelton plant');
});

test('a filled carousel is left alone', () => {
  const cards = [
    { id: 'a', label: 'Pelton', description: 'High head', expandedContent: 'Impulse turbine at a mountain site.' },
    { id: 'b', label: 'Francis', description: 'Medium head', expandedContent: 'Reaction turbine in a spiral casing.' },
  ];
  const next = finalizeHydratedSlide({
    type: 'carousel-panel',
    title: 'Installations',
    content: '- Scroll to explore examples',
    voiceOverText: 'Look at two real plants.',
    data: { cards },
  }, 'Turbines');
  assert.equal(next.type, 'carousel-panel');
  assert.deepEqual(next.data.cards.map((c: any) => c.label), ['Pelton', 'Francis']);
});
