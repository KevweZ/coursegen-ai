import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureAuthoredListMarkers, markdownToHtml } from './markdownInline.ts';
import { formatTabIntroOst, sanitizeOstText } from './formatTabIntroOst.ts';

test('markdown lists still render with md-list discs', () => {
  const html = markdownToHtml('- Ethylene is the most widely produced organic chemical\n- Ethylene serves as a critical building block');
  assert.match(html, /<ul class="md-list">/);
  assert.match(html, /<li>/);
  assert.match(html, /Ethylene is the most widely produced/);
});

test('TipTap HTML lists get md-list so player discs survive Save', () => {
  const authored = `<ul><li><p>Ethylene is the most widely produced organic chemical globally</p></li><li><p>Ethylene serves as a critical building block across multiple industries</p></li></ul>`;
  const html = markdownToHtml(authored);
  assert.match(html, /<ul class="md-list">/i);
  assert.match(html, /<li>/i);
  assert.doesNotMatch(html, /<ul class="md-list md-list"/i);
  assert.match(html, /critical building block/i);
});

test('ensureAuthoredListMarkers merges class and covers ordered lists', () => {
  assert.equal(
    ensureAuthoredListMarkers('<ul class="tight"><li>A</li></ul>'),
    '<ul class="md-list tight"><li>A</li></ul>',
  );
  assert.match(ensureAuthoredListMarkers('<ol><li>One</li></ol>'), /<ol class="md-list">/);
  assert.equal(
    ensureAuthoredListMarkers('<ul class="md-list"><li>A</li></ul>'),
    '<ul class="md-list"><li>A</li></ul>',
  );
});

test('sanitizeOstText and tab intro keep authored HTML bullets', () => {
  const html = `<ul><li><p>Chain branching changes density</p></li><li><p>Cracker margins follow derivative demand</p></li></ul>`;
  const saved = sanitizeOstText(html);
  assert.match(saved, /<ul/i);
  assert.match(saved, /<li/i);
  assert.match(saved, /Chain branching changes density/);
  const intro = formatTabIntroOst({ introContent: html, title: 'Ethylene Across the Value Chain' });
  assert.match(intro, /<ul/i);
  assert.match(intro, /Chain branching changes density/);
  assert.doesNotMatch(intro, /select a tab/i);
});

test('tab Overview CSS restores discs on authored ul, not only md-list', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
  assert.match(css, /\.tab-ost-body ul \{[\s\S]{0,180}list-style-type:\s*disc\s*!important/);
  assert.match(css, /\.tab-ost-body ol \{[\s\S]{0,180}list-style-type:\s*decimal\s*!important/);
  assert.match(css, /ol\.md-list[\s\S]{0,120}list-style-type:\s*decimal/);
});

test('list markers follow author color instead of locking --slide-marker', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
  assert.doesNotMatch(
    css,
    /\.rich-slide-content li::marker[\s\S]{0,120}color:\s*var\(--slide-marker[^)]*\)\s*!important/,
  );
  assert.match(css, /li\[style\*="color"\]::marker[\s\S]{0,80}color:\s*inherit/);
});

test('dark editor remaps Black/Dark so authored slide-black stays readable', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
  assert.match(css, /tiptap-editor-wrapper[\s\S]*color: #000000[\s\S]*#e2e8f0\s*!important/);
  const editor = readFileSync(resolve(process.cwd(), 'src/components/player/RichTextEditor.tsx'), 'utf8');
  assert.match(editor, /updateAttributes\('listItem'/);
  assert.match(editor, /@tiptap\/extension-list-item/);
});

test('content markdown no longer collapses a one-item list into a paragraph', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.doesNotMatch(app, /if \(n === 1\) \{\s*const only = React\.Children/);
  assert.doesNotMatch(app, /if \(items\.length === 1\) \{\s*const inner/);
});
