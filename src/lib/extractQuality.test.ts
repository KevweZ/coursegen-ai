import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessExtract, extractBusyCopy } from './extractQuality.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { looksLikeStoryboard, shouldOfferStoryboardChoice, defaultSourceModeFromFileName, fileSourceConfigFromExtract, CONTENT_FILE_SOURCE_CHARS } from './storyboardSource.ts';

test('Content file extract is passed into outline and hydrate, not title-only', () => {
  const raw = 'Ethylene-vinyl acetate copolymerization kinetics. '.repeat(80);
  const cfg = fileSourceConfigFromExtract('raw', raw);
  assert.equal(cfg.sourceMode, 'raw');
  assert.equal(cfg.isSourceConversion, true);
  assert.ok(String(cfg.sourceContent).includes('Ethylene-vinyl acetate'));
  assert.ok(String(cfg.sourceContent).length <= CONTENT_FILE_SOURCE_CHARS);
  assert.deepEqual(fileSourceConfigFromExtract('raw', '   '), {});

  const board = fileSourceConfigFromExtract('storyboard', 'ON-SCREEN TEXT\nNarration script\nScreen 1');
  assert.equal(board.sourceMode, 'storyboard');
  assert.equal(board.isSourceConversion, undefined);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /fileSourceConfigFromExtract/);
  assert.doesNotMatch(app, /mode === 'storyboard' && text/);

  const ai = readFileSync(resolve(process.cwd(), 'src/services/aiService.ts'), 'utf8');
  assert.match(ai, /CONTENT_FILE_SOURCE_CHARS/);
  assert.match(ai, /isSourceConversion && configParams\.sourceContent/);
});

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
