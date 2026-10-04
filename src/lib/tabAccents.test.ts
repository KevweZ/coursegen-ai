import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCKS_WELL_DEFAULT,
  PROCESS_PANEL_DEFAULT,
  resolveBlocksPanelBg,
  resolveProcessCanvas,
  resolveProcessSkin,
} from './tabAccents.ts';
import { sanitizeInteractionOstOnSave } from '../components/builder/EditSlideItemFields.tsx';

test('Classic vs Blocks skins resolve independently of player theme', () => {
  assert.equal(resolveProcessSkin('blocks'), 'blocks');
  assert.equal(resolveProcessSkin('process'), 'default');
  assert.equal(resolveProcessSkin(undefined), 'default');

  const classic = resolveProcessCanvas({ skin: 'process' });
  assert.equal(classic.bg, PROCESS_PANEL_DEFAULT);
  assert.equal(classic.ink, '#0f172a');
  assert.equal(classic.lightTypeLock, true);

  const blocks = resolveProcessCanvas({ skin: 'blocks' });
  assert.equal(blocks.bg, BLOCKS_WELL_DEFAULT);
  assert.equal(blocks.ink, '#ffffff');
  assert.equal(blocks.lightTypeLock, false);

  assert.equal(resolveBlocksPanelBg(BLOCKS_WELL_DEFAULT, true), BLOCKS_WELL_DEFAULT);
});

test('Edit save keeps process skin and well colors on the slide', () => {
  const saved = sanitizeInteractionOstOnSave({
    id: 's1',
    type: 'tabbed-horizontal',
    content: '- Three steps',
    data: {
      tabSkin: 'blocks',
      blocksWellColor: '#111827',
      processPanelColor: '#eef2ff',
      processRailColor: '#f1f5f9',
      showProcessStepLabels: false,
      tabs: [{ id: 't1', label: 'Initiation', content: '- Radical attack' }],
    },
  });
  assert.equal(saved.data.tabSkin, 'blocks');
  assert.equal(saved.data.blocksWellColor, '#111827');
  assert.equal(saved.data.showProcessStepLabels, false);
  assert.match(saved.data.tabs[0].content, /Radical attack/);
});
