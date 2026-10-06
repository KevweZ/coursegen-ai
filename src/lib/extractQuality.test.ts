import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessExtract, extractBusyCopy } from './extractQuality.ts';
import { looksLikeStoryboard, shouldOfferStoryboardChoice, defaultSourceModeFromFileName } from './storyboardSource.ts';

test('filename storyboard defaults source mode without waiting for extract', () => {
  assert.equal(defaultSourceModeFromFileName('Supply_Chain_Storyboard.docx'), 'storyboard');
  assert.equal(defaultSourceModeFromFileName('polymers.pptx'), 'raw');
});

test('filename or heading storyboard always offers Follow vs lecture', () => {
  assert.equal(shouldOfferStoryboardChoice('short', 'Supply_Chain_Storyboard.docx'), true);
  assert.equal(
    shouldOfferStoryboardChoice('eLEARNING PRODUCTION STORYBOARD\n\nAudience and seat time.', 'notes.docx'),
    true,
  );
  assert.equal(shouldOfferStoryboardChoice('A lecture about pumps and valves.'.repeat(20), 'pumps.pptx'), false);
});

test('Word production storyboard language is detected as a spec', () => {
  const text = `
eLEARNING PRODUCTION STORYBOARD
Supply Chain Fundamentals
Learner screen specification
ON-SCREEN TEXT (FINAL)
Narration script
[DEV: Retain visited state]
Screen 1 of 8
asset manifest
`.repeat(4);
  assert.equal(looksLikeStoryboard(text, 'Supply_Chain_Fundamentals_eLearning_Storyboard_Word.docx'), true);
});

test('busy extract copy names the file', () => {
  const copy = extractBusyCopy('Polymers Course.pptx');
  assert.match(copy.heading, /Polymers Course\.pptx/);
  assert.match(copy.detail, /storyboard/i);
  assert.doesNotMatch(copy.detail, /unlock|Continue stays/i);
});

test('thin and image-only extracts get a warning line', () => {
  const thin = assessExtract('Plan source make deliver return.', 'outline.docx');
  assert.equal(thin.thin, true);
  assert.ok(thin.lines.some(l => /short extract|little extractable/i.test(l)));
  assert.equal(thin.layoutBestEffort, true);

  const emptyish = assessExtract('Hi', 'scan.pdf');
  assert.equal(emptyish.imageOnly, true);

  const rich = assessExtract('Polymerization '.repeat(400), 'polymers.pptx');
  assert.equal(rich.thin, false);
  assert.equal(rich.layoutBestEffort, false);
  assert.match(rich.lines[0], /extracted about/i);
});
