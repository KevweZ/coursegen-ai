import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactChoiceCardCopy, inferChoiceCardsMode, choiceCardsPromptForMode } from './choiceCardCopy.ts';

test('spec-table rows leave the choice-card face and join the reveal', () => {
  const next = compactChoiceCardCopy({
    label: 'High-pressure radical route (LDPE)',
    body: `Reaction conditions: 1000–3000 bar, 150–300 °C
Catalyst/initiator: Organic peroxide or oxygen
Polymer structure: Long-chain branching
Key product: Low-density polyethylene (LDPE)`,
    reveal: 'High pressure forces ethylene monomers close together.',
  });
  assert.equal(String(next.body || '').trim(), '');
  assert.match(String(next.reveal), /Reaction conditions/);
  assert.match(String(next.reveal), /Key product/);
  assert.match(String(next.reveal), /High pressure forces/);
  assert.doesNotMatch(String(next.body), /Reaction conditions/);
});

test('all-correct or oversized choice-cards are explore, not Check-all-green', () => {
  assert.equal(inferChoiceCardsMode({
    mode: 'select',
    prompt: 'Select the correct card pairs, then click Check.',
    cards: [
      { isCorrect: true }, { isCorrect: true }, { isCorrect: true }, { isCorrect: true },
      { isCorrect: true }, { isCorrect: true }, { isCorrect: true }, { isCorrect: true },
    ],
  }), 'explore');
  assert.equal(inferChoiceCardsMode({
    mode: 'select',
    cards: [{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }, { isCorrect: true }],
  }), 'explore');
  assert.equal(inferChoiceCardsMode({
    mode: 'select',
    cards: [{ isCorrect: true }, { isCorrect: false }, { isCorrect: true }, { isCorrect: false }],
  }), 'select');
  assert.equal(
    choiceCardsPromptForMode('Select the correct card pairs, then click Check.', 'explore'),
    'Select each card to explore this topic.',
  );
});

test('short teasers stay on the card face', () => {
  const next = compactChoiceCardCopy({
    label: 'LDPE',
    body: 'Long-chain branching, flexible films',
    reveal: 'Used for bags and squeeze bottles.',
  });
  assert.match(String(next.body), /Long-chain branching/);
  assert.match(String(next.reveal), /squeeze bottles/);
});
