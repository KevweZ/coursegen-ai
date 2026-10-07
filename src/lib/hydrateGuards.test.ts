import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expandFirstAcronymMentions,
  sanitizeCourseTitles,
  shortenCourseTitle,
  shortenModuleTitle,
} from './splitCourseTitle.ts';
import { markdownToHtml } from './markdownInline.ts';
import {
  collapseChoiceCardsOst,
  ensureSelectChoicePrompt,
  finalizeHydratedSlide,
  normalizeKeyTakeaways,
  quizHasLearnerPayload,
  stripMarkdownArtifacts,
  teachingSlideNeedsRetry,
  toTakeawayStatement,
  isRichTakeaway,
  isMetaKnowledgeCheckText,
  knowledgeCheckHasMetaStem,
  remapOversizedProcessToTabs,
} from './hydrateGuards.ts';
import { alignHydratedSlidesToOutline } from './knowledgeCheckBudget.ts';

test('cover titles drop Introduction-to laundry lists and stay at most 8 words', () => {
  const next = shortenCourseTitle(
    'Introduction to Polymers: PE and PP Chemistry, Properties, and Processes',
  );
  assert.equal(next, 'Polymers: Chemistry');
  assert.ok(next.split(/\s+/).length <= 8);
  assert.doesNotMatch(next, /\bPE\b|\bPP\b/);
  assert.equal(shortenCourseTitle('Steam Cracker Technology'), 'Steam Cracker Technology');
});

test('cover titles ban unexplained acronyms and prefer a simple subject line', () => {
  assert.equal(
    shortenCourseTitle('Polymers: PE and PP Chemistry and Processes'),
    'Polymers: Chemistry and Processes',
  );
  assert.doesNotMatch(shortenCourseTitle('Polymers: PE and PP Chemistry and Processes'), /\bPE\b|\bPP\b/);
  assert.ok(shortenCourseTitle('Polymers: Chemistry and Processes').split(/\s+/).length <= 8);
});

test('module titles drop Bloom gerunds, stay short, and spell out PE/PP', () => {
  const next = shortenModuleTitle(
    'Tracing the Sequential Stages of the Steam Cracking Process',
  );
  assert.doesNotMatch(next, /^Tracing/i);
  assert.ok(next.split(/\s+/).length <= 6);
  assert.equal(shortenModuleTitle('PE and PP Types'), 'Polyethylene and Polypropylene Types');
  assert.equal(shortenModuleTitle('Identifying PE Types'), 'Polyethylene Types');
});

test('first mention of a title acronym is spelled out with the short form in parentheses', () => {
  const next = expandFirstAcronymMentions(
    'This course focuses on PE and PP chemistry.',
  );
  assert.match(next, /Polyethylene \(PE\)/);
  assert.match(next, /Polypropylene \(PP\)/);
  const again = expandFirstAcronymMentions(next);
  assert.equal(again, next);
});

test('sanitizeCourseTitles rewrites an existing polymer draft without touching slide copy', () => {
  const course = {
    title: 'Polymers: PE and PP Chemistry and Processes',
    description: 'This course provides an overview of polyolefin chemistry, focusing on polyethylene (PE) and polypropylene (PP).',
    modules: [
      { title: 'PE and PP Types', slides: [{ id: 's1', type: 'content', title: 'HDPE', content: 'Keep this.' }] },
    ],
  };
  const next = sanitizeCourseTitles(course);
  assert.equal(next.title, 'Polymers: Chemistry and Processes');
  assert.equal(next.modules[0].title, 'Polyethylene and Polypropylene Types');
  assert.equal(next.modules[0].slides[0].content, 'Keep this.');
  assert.equal(next.modules[0].slides[0].title, 'HDPE');
  assert.match(next.description, /polyethylene \(PE\)/i);
});

test('analyze prompt does not prefer a PE/PP cover title', () => {
  const prompt = readFileSync(resolve(process.cwd(), 'src/services/aiService.ts'), 'utf8');
  assert.doesNotMatch(prompt, /Polymers: PE and PP/);
  assert.match(prompt, /not acronyms|spell out|unexplained acronym/i);
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

test('scored choice-card prompts name the correct answers and Check', () => {
  const next = ensureSelectChoicePrompt(
    'Select the process conditions and outcomes for each polymerization type.',
    2,
  );
  assert.match(next, /correct/i);
  assert.match(next, /check/i);
  assert.doesNotMatch(next, /^Select the process conditions/i);
  const already = ensureSelectChoicePrompt('Select the two correct options, then click Check.', 2);
  assert.equal(already, 'Select the two correct options, then click Check.');

  const scored = finalizeHydratedSlide({
    type: 'choice-cards',
    title: 'High-Pressure vs. Low-Pressure Processes',
    content: '',
    data: {
      mode: 'select',
      prompt: 'Select the process conditions and outcomes for each polymerization type.',
      cards: [
        { id: 'a', label: 'LDPE', isCorrect: true },
        { id: 'b', label: 'HDPE', isCorrect: false },
        { id: 'c', label: 'HDPE/PP', isCorrect: true },
        { id: 'd', label: 'LDPE catalytic', isCorrect: false },
      ],
    },
  }, 'PE Types');
  assert.match(String(scored.data.prompt), /correct/i);
});

test('choice-card spec rows hydrate into reveal, not the tile face', () => {
  const next = finalizeHydratedSlide({
    type: 'choice-cards',
    title: 'High-Pressure vs. Low-Pressure Polymerization Routes',
    data: {
      mode: 'explore',
      prompt: 'Select each process route to explore its conditions.',
      cards: [{
        id: 'hp',
        label: 'High-pressure radical route (LDPE)',
        body: `Reaction conditions: 1000–3000 bar, 150–300 °C
Catalyst/initiator: Organic peroxide or oxygen
Polymer structure: Long-chain branching
Key product: Low-density polyethylene (LDPE)`,
        reveal: 'High pressure forces ethylene monomers close together.',
      }],
    },
  }, 'Polymerization Chemistry');
  const card = next.data.cards[0];
  assert.doesNotMatch(String(card.body || ''), /Reaction conditions/);
  assert.match(String(card.reveal), /Reaction conditions/);
  assert.match(String(card.reveal), /High pressure forces/);
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

test('key takeaways retry when they are 5-8 word titles instead of sentences', () => {
  assert.equal(isRichTakeaway('CATALYST ROLE'), false);
  assert.equal(isRichTakeaway('Three Steps of Radical Polymerization'), false);
  assert.equal(
    isRichTakeaway('Free-radical polymerization builds PE chains in three steps, and how those steps are controlled decides branching and grade.'),
    true,
  );
  const thin = teachingSlideNeedsRetry({
    type: 'key-takeaways',
    title: 'Module Summary: Polymerization Chemistry',
    data: {
      objectives: [
        { id: '1', label: 'CATALYST ROLE' },
        { id: '2', label: 'Three Steps of Radical Polymerization' },
        { id: '3', label: 'High-Pressure vs. Low-Pressure Routes' },
        { id: '4', label: 'Comonomers and Density Control' },
      ],
    },
  });
  assert.equal(thin, true);
  const rich = teachingSlideNeedsRetry({
    type: 'key-takeaways',
    title: 'Module Summary: Polymerization Chemistry',
    data: {
      objectives: [
        {
          id: '1',
          label: 'Catalysts decide which PE or PP grade you get by controlling how chains grow and how much they branch.',
        },
        {
          id: '2',
          label: 'Free-radical polymerization builds chains in initiation, propagation, and termination. Those three steps set molecular weight and branching.',
        },
      ],
    },
  });
  assert.equal(rich, false);
});

test('key takeaways keep 2-4 points and retry Bloom gerund titles', () => {
  const slide = normalizeKeyTakeaways({
    type: 'key-takeaways',
    title: 'Module Summary',
    data: {
      objectives: Array.from({ length: 6 }, (_, i) => ({
        id: String(i + 1),
        label: `Catalysts decide grade ${i + 1} by controlling how polymer chains grow and how much they branch in the reactor.`,
      })),
    },
  });
  assert.equal(slide.data.objectives.length, 4);
  assert.equal(
    teachingSlideNeedsRetry({
      type: 'key-takeaways',
      data: {
        objectives: [
          { id: '1', label: 'Distinguish how branching affects density and flexibility' },
          { id: '2', label: 'Select polyethylene grades based on application needs' },
          { id: '3', label: 'Connect molecular structure to processing and performance' },
        ],
      },
    }),
    true,
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

test('content ALL-CAPS parents become headings, not bullets', () => {
  const next = finalizeHydratedSlide({
    type: 'content',
    title: 'Crystallinity in PE: Density and Branching',
    content: `- DENSITY CONTROLS CRYSTALLINITY
- Linear PE (HDPE): low branching to high density
- Branched PE (LDPE): more branches to low density
- BRANCHING REDUCES CRYSTALLINE PACKING
- Branch points disrupt regular chain alignment
- Comonomer branches create amorphous regions`,
  }, 'Molecular Structure');
  assert.match(String(next.content), /^### /m);
  assert.doesNotMatch(String(next.content), /^- DENSITY CONTROLS/m);
  assert.match(String(next.content), /^- Linear PE/m);
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

test('knowledge checks have no spoken narration after finalize', () => {
  const next = finalizeHydratedSlide({
    type: 'quiz',
    title: 'Knowledge Check: Polymer Basics',
    content: 'Check density trends',
    voiceOverText: 'The correct answer is HDPE because it is denser.',
    data: {
      questionText: 'Which PE grade is densest?',
      options: [
        { id: 'a', text: '**HDPE**', isCorrect: true },
        { id: 'b', text: 'LDPE', isCorrect: false },
      ],
    },
  }, 'PE Grades');
  assert.equal(next.voiceOverText, '');
  assert.equal(next.data.options[0].text, 'HDPE');
});

test('click-reveal instruction-only OST is dropped so items are the only on-screen text', () => {
  const next = finalizeHydratedSlide({
    type: 'click-reveal',
    title: 'PE Grades',
    content: 'Select each grade to explore density and melting point.',
    data: {
      items: [
        { id: 'i1', term: 'LDPE', definition: '- Low density\n- Flexible film' },
        { id: 'i2', term: 'HDPE', definition: '- High density\n- Rigid bottles' },
      ],
    },
  }, 'PE and PP Types');
  assert.equal(String(next.content || '').trim(), '');
});

test('meta knowledge-check stems are banned and rewritten', () => {
  assert.equal(isMetaKnowledgeCheckText('Initiation is a core idea in this module.'), true);
  assert.equal(isMetaKnowledgeCheckText('Which PE grade is densest?'), false);
  const meta = {
    type: 'true-false',
    title: 'Knowledge Check: Initiation',
    data: {
      questionText: 'Initiation is a core idea in this module.',
      options: [
        { id: 't', text: 'True', isCorrect: true },
        { id: 'f', text: 'False', isCorrect: false },
      ],
    },
  };
  assert.equal(knowledgeCheckHasMetaStem(meta), true);
  assert.equal(teachingSlideNeedsRetry(meta), true);
  const next = finalizeHydratedSlide(meta, 'Polymerization Chemistry');
  assert.equal(knowledgeCheckHasMetaStem(next), false);
  assert.doesNotMatch(String(next.data.questionText), /core idea in this module/i);
  assert.doesNotMatch(JSON.stringify(next.data.options), /not part of this module|none of these ideas appear/i);
  assert.equal(teachingSlideNeedsRetry(next), false);
});

test('process slides with 5+ steps remap to vertical tabs', () => {
  const four = remapOversizedProcessToTabs({
    type: 'tabbed-horizontal',
    data: { tabs: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] },
  });
  assert.equal(four.type, 'tabbed-horizontal');
  const seven = finalizeHydratedSlide({
    type: 'tabbed-horizontal',
    title: 'Polymerization Steps',
    content: '- Ordered process\n- Walk through each step\n- Keep the sequence',
    voiceOverText: 'Walk through each polymerization stage in order.',
    data: {
      tabs: Array.from({ length: 7 }, (_, i) => ({
        id: `t${i + 1}`,
        label: `Step ${i + 1}`,
        content: '- Point one here\n- Point two here\n- Point three here',
      })),
    },
  }, 'Polymerization Chemistry');
  assert.equal(seven.type, 'tabbed-vertical');
  assert.equal(seven.data.tabs.length, 7);
});
