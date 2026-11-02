import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyKeyTakeawayEdits,
  isKeyTakeawaysType,
  keyTakeawayEditItems,
} from './keyTakeawayOst.ts';

test('Edit Slide reads takeaway cards from objectives, not leftover OST bullets', () => {
  const slide = {
    type: 'key-takeaways',
    title: 'Module Summary',
    content: [
      '- Ethylene and propylene are primary steam-cracking products',
      '- Petrochemical derivatives unlock higher margins than fuels',
      '- Ethylene feeds polyethylene, packaging, textiles globally',
      '- Asian urbanization and middle-class growth drive olefin demand',
    ].join('\n'),
    data: {
      objectives: [
        {
          id: '1',
          label: 'Steam cracking produces primary products such as ethylene and propylene, along with secondary products including butadiene, benzene, and hydrogen.',
          content: '',
        },
        {
          id: '2',
          label: 'Ethylene is the foundation for polyethylene, ethylene oxide, vinyl chloride, and a broad range of downstream petrochemicals spanning packaging, textiles, and construction.',
          content: '',
        },
      ],
    },
  };
  const items = keyTakeawayEditItems(slide);
  assert.equal(items.length, 2);
  assert.match(items[0].text, /Steam cracking produces primary products/);
  assert.doesNotMatch(items[0].text, /Ethylene and propylene are primary steam-cracking products/);
});

test('short leftover OST does not replace a detailed objective card', () => {
  const items = keyTakeawayEditItems({
    type: 'key-takeaways',
    content: '- Ethylene and propylene are primary steam cracking products',
    data: {
      objectives: [{
        id: '1',
        label: 'Ethylene end-use applications',
        content: 'Ethylene is the foundation for polyethylene, ethylene oxide, vinyl chloride, and a broad range of downstream petrochemicals spanning packaging, textiles, and construction.',
      }, {
        id: '2',
        label: 'Petrochemical vs. fuel margins',
        content: 'Petrochemical margins exceed fuel margins because chemical derivatives command higher value-added pricing relative to commodity fuels.',
      }],
    },
  });
  assert.match(items[0].text, /foundation for polyethylene/);
  assert.doesNotMatch(items[0].text, /primary steam cracking products/);
});

test('Save writes takeaway edits onto objectives so the player updates', () => {
  const slide = {
    type: 'key-takeaways',
    title: 'Module Summary',
    content: '- Old leftover bullet that is not on the slide',
    data: {
      objectives: [
        { id: '1', label: 'Original takeaway one is a full sentence about olefins.', content: '' },
        { id: '2', label: 'Original takeaway two is a full sentence about demand.', content: '' },
      ],
    },
  };
  const items = keyTakeawayEditItems(slide);
  items[0].text = 'Lower olefins are the primary C2 and C3 products from steam cracking.';
  const saved = applyKeyTakeawayEdits(slide, items);
  assert.match(saved.data.objectives[0].label, /Lower olefins/);
  assert.match(saved.content, /^1\. Lower olefins/);
  assert.doesNotMatch(saved.content, /Old leftover bullet/);
  assert.equal(saved.data.objectives[1].label, items[1].text);
});

test('Edit Slide hides leftover takeaway OST and binds numbered card fields', () => {
  assert.equal(isKeyTakeawaysType('key-takeaways'), true);
  assert.equal(isKeyTakeawaysType('content'), false);
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /isKeyTakeawaysType\(editingSlide\.type\) \? null/);
  const fields = readFileSync(resolve(process.cwd(), 'src/components/builder/EditSlideItemFields.tsx'), 'utf8');
  assert.match(fields, /keyTakeawayEditItems/);
  assert.match(fields, /applyKeyTakeawayEdits/);
  assert.match(fields, /numbered cards/);
  assert.match(fields, /\+ Add takeaway/);
  assert.match(fields, /items\.length < MAX_KEY_TAKEAWAYS/);
});
