import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortenCourseTitle } from './splitCourseTitle.ts';
import { markdownToHtml } from './markdownInline.ts';
import {
  collapseChoiceCardsOst,
  finalizeHydratedSlide,
  normalizeKeyTakeaways,
  quizHasLearnerPayload,
  stripMarkdownArtifacts,
  teachingSlideNeedsRetry,
  toTakeawayStatement,
} from './hydrateGuards.ts';
import { alignHydratedSlidesToOutline } from './knowledgeCheckBudget.ts';

test('cover titles drop Introduction-to laundry lists and stay at most 8 words', () => {
  const next = shortenCourseTitle(
    'Introduction to Polymers: PE and PP Chemistry, Properties, and Processes',
  );
  assert.equal(next, 'Polymers: PE and PP Chemistry');
  assert.ok(next.split(/\s+/).length <= 8);
  assert.equal(shortenCourseTitle('Steam Cracker Technology'), 'Steam Cracker Technology');
});

test('markdown artifacts are stripped for plain-text surfaces and rendered for HTML', () => {
  assert.equal(stripMarkdownArtifacts('Produces **broad** molecular weight'), 'Produces broad molecular weight');
  assert.equal(stripMarkdownArtifacts('### Atactic (a-PP) - CH3 groups'), 'Atactic (a-PP) - CH3 groups');
  const html = markdownToHtml('### Atactic (a-PP)\nProduces **broad** distribution');
  assert.match(html, /<strong>Atactic \(a-PP\)<\/strong>/);
  assert.match(html, /<strong>broad<\/strong>/);
  assert.doesNotMatch(html, /###/);
  assert.doesNotMatch(html, /\*\*broad\*\*/);
});

test('choice-cards keep a single instruction when content and prompt overlap', () => {
  const ost = collapseChoiceCardsOst(
    'Select each structure to explore how methyl group arrangement affects crystallinity.\nSelect each structure to reveal how methyl placement affects PP performance.',
    'Select each structure to reveal how methyl placement affects PP performance.',
  );
  assert.equal(ost.content, '');
  assert.match(ost.prompt, /select each structure/i);
  assert.doesNotMatch(ost.prompt, /explore how methyl[\s\S]*reveal how methyl/i);

  const three = collapseChoiceCardsOst(
    '- Classify polymers by origin\n- Identify key examples of each type',
    'Select each polymer to classify it as natural or synthetic.',
  );
  assert.equal(three.content, '');
  assert.equal(three.prompt, 'Select each polymer to classify it as natural or synthetic.');
});

test('key takeaways become statements instead of spec-table rows or empty numbers', () => {
  const slide = normalizeKeyTakeaways({
    type: 'key-takeaways',
    title: 'Module 2 Key Takeaways',
    data: {
      objectives: [
        { id: '1', label: 'DENSITY AND MELTING POINT TRENDS', content: '' },
        { id: '2', label: 'LDPE: 0.910-0.940 G/CM³, MELTS ~105-115 °C', content: '' },
        { id: '3', label: '**', content: '' },
      ],
    },
  });
  const labels = slide.data.objectives.map((o: any) => o.label);
  assert.ok(labels.every((l: string) => /[A-Za-z]{4,}/.test(l)));
  assert.ok(labels.some((l: string) => /LDPE is /i.test(l)));
  assert.ok(!labels.some((l: string) => l === '**' || /^[0-9]+$/.test(l)));
});

test('spec-row takeaway helper writes a sentence', () => {
  assert.match(
    toTakeawayStatement('LDPE: 0.910-0.940 g/cm³, melts ~105-115 °C'),
    /LDPE is 0\.910/,
  );
});

test('blank knowledge checks keep quiz type and gain a learner payload', () => {
  const next = finalizeHydratedSlide({
    type: 'quiz',
    title: 'Knowledge Check: Polymer Basics',
    content: 'Test your understanding of polymer concepts',
  }, 'Polymer Science Fundamentals');
  assert.equal(next.type, 'quiz');
  assert.equal(quizHasLearnerPayload(next), true);
  assert.equal(teachingSlideNeedsRetry(next), false);
});

test('thin content slides are not left as a single overview sentence', () => {
  const next = finalizeHydratedSlide({
    type: 'content',
    title: 'Density, Melting Point, and Branching in PE Grades',
    content: 'Compare how chain branching influences thermal and mechanical properties across PE grades',
  }, 'PE and PP Types');
  assert.match(String(next.content), /^- /m);
  assert.ok(String(next.content).split('\n').filter((l: string) => l.startsWith('- ')).length >= 2);
  assert.equal(teachingSlideNeedsRetry(next), false);
});

test('hydrate alignment prefers outline position over a stray empty extra KC', () => {
  const outline = [
    { id: 't1', type: 'content', title: 'What Is a Polymer' },
    { id: 'k1', type: 'quiz', title: 'Knowledge Check: Polymer Basics' },
  ];
  const parsed = [
    { type: 'quiz', title: 'Knowledge Check: Extra', content: 'Test your understanding' },
    {
      type: 'quiz',
      title: 'Knowledge Check: Polymer Basics',
      data: {
        questionText: 'Which material is a polymer?',
        options: [
          { id: 'a', text: 'Polyethylene', isCorrect: true },
          { id: 'b', text: 'Water', isCorrect: false },
        ],
      },
    },
  ];
  const aligned = alignHydratedSlidesToOutline(parsed, outline);
  assert.equal(aligned[1].id, 'k1');
  assert.equal(aligned[1].type, 'quiz');
  assert.equal(quizHasLearnerPayload(aligned[1]), true);
});
