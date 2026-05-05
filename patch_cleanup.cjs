const fs = require('fs');

// ── 1. dummyCourse.ts: remove slide-mod2-intro and slide-mod3-intro ──────────
let dc = fs.readFileSync('src/lib/dummyCourse.ts', 'utf8');

// Remove slide-mod2-intro (Module 2's first overview slide - lines 88-95)
dc = dc.replace(
`        {
          id: 'slide-mod2-intro',
          type: 'content',
          title: 'Module 2 — Knowledge Checks',
          content: '## Testing Quiz Components\\\\n\\\\nThis module demonstrates the **Quiz** and **Multiple Answer** slide types. These are the core assessment tools in the NexCourse player.\\\\n\\\\nTry selecting an answer and clicking Submit to see the feedback logic in action.',
          narration: 'Module 2 focuses on knowledge checks. Here you will test the quiz slide type which provides immediate feedback when a learner selects and submits their answer.',
          voiceOverText: 'Module 2 focuses on knowledge checks. Test the quiz slide by selecting an answer and clicking submit.',
        },`,
''
);

// Remove slide-mod3-intro (Module 3's first overview slide)
dc = dc.replace(
`        {
          id: 'slide-mod3-intro',
          type: 'content',
          title: 'Module 3 — Interactive Components',
          content: '## Accordion, Flashcards, Timeline\\\\n\\\\nThis module demonstrates the three most-used **exploratory interaction** slide types. Each requires the learner to click or interact to reveal information rather than passively reading.',
          narration: 'Module 3 covers interactive components. These slides require the learner to actively engage by clicking to reveal content, flipping cards, or exploring a timeline.',
          voiceOverText: 'Module 3 covers interactive components: accordion, flashcards, and timeline.',
        },`,
''
);

fs.writeFileSync('src/lib/dummyCourse.ts', dc, 'utf8');
console.log('dummyCourse before mod2-intro removal:', dc.includes('slide-mod2-intro') ? '❌ still there' : '✔ removed');
console.log('dummyCourse before mod3-intro removal:', dc.includes('slide-mod3-intro') ? '❌ still there' : '✔ removed');


// ── 2. aiService.ts: suppress title slides for ALL modules ──────────────────
let ai = fs.readFileSync('src/services/aiService.ts', 'utf8');

const ai_old = `  1. \${configParams.includeModuleTitleSlides !== false ? "Title Slide (type: content) — IMPORTANT: OMIT this title slide for Module 1 ONLY. The course already begins with a dedicated Cover/Introduction slide, so Module 1 must start directly with an Objectives or Content slide to avoid redundancy. Modules 2 and beyond should include their title slides as normal." : "NO title slide"}`;
const ai_new = `  1. NO title slide — The course player now automatically injects a styled "Module X — Overview" slide as the FIRST slide of EVERY module. This slide displays the module description and its learning objectives. Do NOT generate a title, intro, or overview slide for any module. Each module must start directly with its first content or interaction slide.`;

if (ai.includes(ai_old)) {
  ai = ai.replace(ai_old, ai_new);
  console.log('✔ aiService: title slide instruction updated for all modules');
} else {
  console.error('❌ aiService: target string not found');
}

// Also update the CRITICAL note on line 326
const crit_old = `  CRITICAL: The course player automatically injects a Cover/Introduction slide BEFORE all modules. Do NOT create an intro, overview, or welcome slide as the first slide of Module 1 — it would be redundant. Module 1 should open directly with its learning objectives or first content slide.`;
const crit_new = `  CRITICAL: The course player automatically injects (1) a Cover/Introduction slide before all modules, and (2) a "Module X — Overview" slide as the FIRST slide of EVERY module. Do NOT create any intro, overview, title, or welcome slide for ANY module. All modules must start directly with their first content or interaction slide.`;

if (ai.includes(crit_old)) {
  ai = ai.replace(ai_old, ai_new); // already done above
  ai = ai.replace(crit_old, crit_new);
  console.log('✔ aiService: CRITICAL note updated');
} else {
  // try without the CRITICAL note (already done in previous replace)
  console.log('ℹ aiService: CRITICAL note not found (may already be updated or not needed)');
}

fs.writeFileSync('src/services/aiService.ts', ai, 'utf8');
console.log('\n✅ Done');
