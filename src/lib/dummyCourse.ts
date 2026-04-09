import { CourseOutline } from '../types/course';

/**
 * A comprehensive dummy course used by the Admin "Preview Mode" shortcut.
 * Covers every slide type so the player can be tested without generating content.
 */
export const DUMMY_COURSE: CourseOutline = {
  title: 'CourseGEN Preview — Player Test Course',
  description: 'A pre-built sandbox course containing every slide type and interaction component. Use this to test and debug the course player without uploading files or running AI generation.',
  learningObjectives: [
    {
      terminalObjective: 'Navigate and interact with every component of the CourseGEN eLearning player.',
      enablingObjectives: [
        'Identify all slide types available in the player',
        'Test interactive components including quizzes, accordions, and flashcards',
        'Verify media and narration display correctly',
        'Confirm branching scenario navigation works end-to-end',
      ],
    },
  ],
  settings: {
    voiceOverEnabled: true,
    soundEffectsEnabled: true,
    theme: 'dark',
    pathway: 'corporate',
  },
  modules: [
    // ── MODULE 1: Core Slide Types ─────────────────────────────────────────
    {
      id: 'mod-1',
      title: 'Module 1 — Core Slide Types',
      slides: [
        // Title
        {
          id: 'slide-title',
          type: 'title',
          title: 'CourseGEN Player Sandbox',
          content: 'Welcome to the **Admin Preview Mode**. This course lets you test every player component without generating a real course. Use the navigation controls below to move between slides.',
          narration: 'Welcome to the Admin Preview Mode. This is a sandbox course that contains every slide type and interactive component. Use this environment to test and debug the course player.',
          voiceOverText: 'Welcome to the Admin Preview Mode. This is a sandbox course that contains every slide type.',
          imagePlaceholder: true,
          mediaPrompt: 'Professional eLearning studio with glowing screens',
        },
        // Content
        {
          id: 'slide-content-1',
          type: 'content',
          title: 'Understanding the Player Layout',
          content: `## Player Architecture\n\nThe CourseGEN player is composed of several key layers:\n\n- **Slide Canvas** — The central content area that renders each slide type\n- **Player Bar** — The bottom navigation with play/pause, seekbar, and slide controls\n- **Edit Drawer** — The right-side panel for modifying slide text and audio\n- **Theme System** — Dark, Light, and Unified color modes\n\n## Navigation\n\nUse the **Previous** and **Next** buttons in the player bar, or click directly on the seekbar to jump to any slide. The current slide position is tracked in real time.`,
          narration: 'The CourseGEN player is built from four key layers: the slide canvas, the player bar, the edit drawer, and the theme system. Let's explore each one.',
          voiceOverText: 'The CourseGEN player is built from four key layers: the slide canvas, the player bar, the edit drawer, and the theme system.',
          imagePlaceholder: true,
          mediaPrompt: 'Clean diagram showing the layers of an eLearning player interface',
        },
        // Key-takeaways
        {
          id: 'slide-key-takeaways',
          type: 'key-takeaways',
          title: 'Key Takeaways — Module 1',
          content: `## What You Covered\n\n✅ **Slide Types** — This course demonstrates every slide layout the player supports\n\n✅ **Interaction Components** — All gamifiable interaction types are included\n\n✅ **Navigation Controls** — The player bar provides seekbar, play, and slide controls\n\n✅ **Admin Mode** — Use Preview Mode any time to test player changes without generating a full course`,
          narration: 'Let\'s consolidate what we covered in this module. You explored the player architecture, its navigation controls, and how the slide canvas dynamically renders different content types.',
          voiceOverText: 'Let\'s consolidate what we covered. You explored the player architecture, navigation controls, and the slide canvas.',
          imagePlaceholder: false,
        },
      ],
    },

    // ── MODULE 2: Knowledge Checks ─────────────────────────────────────────
    {
      id: 'mod-2',
      title: 'Module 2 — Knowledge Checks',
      slides: [
        {
          id: 'slide-mod2-intro',
          type: 'content',
          title: 'Module 2 — Knowledge Checks',
          content: '## Testing Quiz Components\n\nThis module demonstrates the **Quiz** and **Multiple Answer** slide types. These are the core assessment tools in the CourseGEN player.\n\nTry selecting an answer and clicking Submit to see the feedback logic in action.',
          narration: 'Module 2 focuses on knowledge checks. Here you will test the quiz slide type which provides immediate feedback when a learner selects and submits their answer.',
          voiceOverText: 'Module 2 focuses on knowledge checks. Test the quiz slide by selecting an answer and clicking submit.',
        },
        // Quiz
        {
          id: 'slide-quiz-1',
          type: 'quiz',
          title: 'Knowledge Check — Player Components',
          content: 'Test your understanding of the player architecture covered in Module 1.',
          narration: 'Here is your first knowledge check. Read the question, select the best answer, and click Submit.',
          voiceOverText: 'Here is your first knowledge check. Select the best answer and click submit.',
          interactions: [],
          data: {
            questionText: 'Which of the following is responsible for controlling slide navigation in the CourseGEN player?',
            options: [
              { id: 'a', text: 'The slide canvas', isCorrect: false },
              { id: 'b', text: 'The Player Bar', isCorrect: true },
              { id: 'c', text: 'The Edit Drawer', isCorrect: false },
              { id: 'd', text: 'The Theme System', isCorrect: false },
            ],
            correctAnswer: 'b',
            feedback: 'Correct! The Player Bar contains the seekbar, play/pause controls, and previous/next navigation buttons.',
          },
        },
        {
          id: 'slide-quiz-2',
          type: 'quiz',
          title: 'Knowledge Check — Themes',
          content: 'Which theme modes are available in the CourseGEN player?',
          narration: 'Second knowledge check. Identify the correct theme options available in the player.',
          voiceOverText: 'Second knowledge check. Identify the correct theme options.',
          interactions: [],
          data: {
            questionText: 'How many theme modes does the CourseGEN player support?',
            options: [
              { id: 'a', text: '2 — Light and Dark', isCorrect: false },
              { id: 'b', text: '3 — Dark, Light, and Unified', isCorrect: true },
              { id: 'c', text: '4 — including High Contrast', isCorrect: false },
              { id: 'd', text: '1 — Dark only', isCorrect: false },
            ],
            correctAnswer: 'b',
            feedback: 'Correct! You can toggle between Dark, Light, and Unified modes using the theme button in the preview toolbar.',
          },
        },
      ],
    },

    // ── MODULE 3: Interactive Components ──────────────────────────────────
    {
      id: 'mod-3',
      title: 'Module 3 — Interactive Components',
      slides: [
        {
          id: 'slide-mod3-intro',
          type: 'content',
          title: 'Module 3 — Interactive Components',
          content: '## Accordion, Flashcards, Timeline\n\nThis module demonstrates the three most-used **exploratory interaction** slide types. Each requires the learner to click or interact to reveal information rather than passively reading.',
          narration: 'Module 3 covers interactive components. These slides require the learner to actively engage by clicking to reveal content, flipping cards, or exploring a timeline.',
          voiceOverText: 'Module 3 covers interactive components: accordion, flashcards, and timeline.',
        },
        // Accordion
        {
          id: 'slide-accordion',
          type: 'accordion',
          title: 'Accordion — Player Components Deep Dive',
          content: 'Click each section to expand and explore the details.',
          narration: 'This is the accordion interaction. Click each heading to expand the content panel beneath it.',
          voiceOverText: 'This is the accordion interaction. Click each heading to expand the panel.',
          data: {
            items: [
              { id: 'acc-1', title: 'Slide Canvas', content: 'The slide canvas is the main rendering area of the player. It dynamically switches between slide type renderers based on the current slide\'s `type` field. Supports 12+ distinct layouts.' },
              { id: 'acc-2', title: 'Player Bar', content: 'The player bar is the bottom navigation strip. It includes a seekbar for scrubbing through slides, a play/pause button for audio narration, elapsed time display, and previous/next navigation controls.' },
              { id: 'acc-3', title: 'Edit Drawer', content: 'The edit drawer slides in from the right when the "Edit Slide" button is clicked. It provides two tabs: Text (for editing slide content inline) and Audio (for recording or uploading narration audio).' },
              { id: 'acc-4', title: 'Theme System', content: 'Three themes are supported: Dark (slate backgrounds with white text), Light (white backgrounds), and Unified (a cohesive purple-tinted dark mode). The theme is stored globally and applied via CSS class prefixes.' },
            ],
          },
        },
        // Flashcards
        {
          id: 'slide-flashcards',
          type: 'flashcards',
          title: 'Flashcards — Player Terminology',
          content: 'Click each card to flip it and reveal the definition.',
          narration: 'These are the flashcards. Click each card to flip it over and reveal the answer on the back.',
          voiceOverText: 'Click each card to flip it and reveal the definition.',
          data: {
            cards: [
              { front: 'What is a Slide Type?', back: 'A property on each slide object that determines which renderer the player uses — e.g., title, content, quiz, accordion, flashcards, timeline.' },
              { front: 'What is the Player Bar?', back: 'The horizontal navigation toolbar at the bottom of the player containing the seekbar, play/pause control, and slide navigation buttons.' },
              { front: 'What is the Edit Drawer?', back: 'The right-side panel that opens when the user clicks "Edit Slide", enabling inline text editing and audio narration management.' },
              { front: 'What is a SCORM Package?', back: 'A ZIP file containing the course HTML, JavaScript, and assets in a format compatible with Learning Management Systems (LMS) like Moodle, Cornerstone, or Blackboard.' },
              { front: 'What is Voiceover / Narration?', back: 'AI-generated or recorded audio that plays automatically when a slide is entered, synchronized with the seekbar progress.' },
            ],
          },
        },
        // Timeline
        {
          id: 'slide-timeline',
          type: 'timeline',
          title: 'Timeline — CourseGEN Development Milestones',
          content: 'Explore the key milestones in the development of the CourseGEN platform.',
          narration: 'This is the timeline interaction. Click each node to expand its detail panel.',
          voiceOverText: 'This is the timeline interaction. Click each node to reveal its detail panel.',
          data: {
            events: [
              { id: 'ev-1', year: 'Phase 1', title: 'Core Player Built', content: 'The foundational eLearning player was constructed with slide navigation, the player bar, and the dark theme system.' },
              { id: 'ev-2', year: 'Phase 2', title: 'AI Generation Pipeline', content: 'Integration of the Claude Anthropic API for outline generation and full course hydration including narration scripts.' },
              { id: 'ev-3', year: 'Phase 3', title: 'Interactive Components', content: 'Accordion, Flashcards, Timeline, Hotspot, Sorting, Matching, and Branching Scenario interactions were built and integrated.' },
              { id: 'ev-4', year: 'Phase 4', title: 'Gamification Engine', content: 'Six game templates added: Jeopardy, Millionaire, Family Feud, Escape Room, Spin the Wheel, and Price Estimator.' },
              { id: 'ev-5', year: 'Phase 5', title: 'SCORM Export', content: 'Full SCORM 1.2/2004 package export with LMS tracking, course completion logic, and xAPI event reporting.' },
            ],
          },
        },
      ],
    },

    // ── MODULE 4: Assessment Interactions ──────────────────────────────────
    {
      id: 'mod-4',
      title: 'Module 4 — Assessment Interactions',
      slides: [
        {
          id: 'slide-mod4-intro',
          type: 'content',
          title: 'Module 4 — Sorting, Matching & Drop Targets',
          content: '## Drag-and-Drop Interactions\n\nThis module covers the three drag-and-drop interaction types: **Sorting**, **Matching**, and **Drop Targets**. Each requires the learner to physically categorise or connect items.',
          narration: 'Module 4 covers drag-and-drop interactions. These include sorting, matching, and drop target components.',
          voiceOverText: 'Module 4 covers drag-and-drop interactions: sorting, matching, and drop targets.',
        },
        // Sorting
        {
          id: 'slide-sorting',
          type: 'sorting',
          title: 'Sorting — Order the Development Phases',
          content: 'Drag the phases into the correct chronological order.',
          narration: 'This is the sorting interaction. Drag and drop the items to arrange them in the correct order.',
          voiceOverText: 'Drag the items to arrange them in the correct order.',
          data: {
            prompt: 'Arrange the CourseGEN development phases in the correct order:',
            items: [
              { id: 'si-1', content: 'AI Generation Pipeline', correctPosition: 2 },
              { id: 'si-2', content: 'SCORM Export', correctPosition: 5 },
              { id: 'si-3', content: 'Core Player Built', correctPosition: 1 },
              { id: 'si-4', content: 'Gamification Engine', correctPosition: 4 },
              { id: 'si-5', content: 'Interactive Components', correctPosition: 3 },
            ],
          },
        },
        // Matching
        {
          id: 'slide-matching',
          type: 'matching',
          title: 'Matching — Components to Descriptions',
          content: 'Match each player component to its correct description.',
          narration: 'This is the matching interaction. Connect each item on the left to its matching definition on the right.',
          voiceOverText: 'Match each component to its correct description.',
          data: {
            prompt: 'Match each CourseGEN component to its function:',
            pairs: [
              { id: 'pair-1', term: 'Player Bar', definition: 'Bottom navigation with seekbar and slide controls' },
              { id: 'pair-2', term: 'Edit Drawer', definition: 'Right-panel for inline slide text and audio editing' },
              { id: 'pair-3', term: 'Slide Canvas', definition: 'Central area that renders each slide type' },
              { id: 'pair-4', term: 'SCORM Package', definition: 'ZIP export for LMS-compatible course delivery' },
            ],
          },
        },
      ],
    },

    // ── MODULE 5: Advanced Interactions ──────────────────────────────────
    {
      id: 'mod-5',
      title: 'Module 5 — Advanced Interactions',
      slides: [
        // Hotspot
        {
          id: 'slide-hotspot',
          type: 'hotspot',
          title: 'Hotspot — Click the Highlighted Regions',
          content: 'Click each highlighted point on the map to reveal information about that location.',
          narration: 'This is the hotspot interaction. Click each pinpoint to reveal the information attached to that location.',
          voiceOverText: 'Click the pinpoints to reveal information about each location.',
          data: {
            backgroundImage: null,
            hotspots: [
              { id: 'hs-1', x: 25, y: 40, label: 'Player Bar', content: 'The Player Bar handles all slide navigation and audio playback controls.' },
              { id: 'hs-2', x: 55, y: 30, label: 'Slide Canvas', content: 'The Slide Canvas dynamically renders whichever slide type is currently active.' },
              { id: 'hs-3', x: 75, y: 60, label: 'Edit Drawer', content: 'The Edit Drawer opens from the right side and allows inline content and audio editing.' },
              { id: 'hs-4', x: 40, y: 70, label: 'Theme Toggle', content: 'Switch between Dark, Light, and Unified themes from the toolbar at the top of the preview.' },
            ],
          },
        },
        // Branching
        {
          id: 'slide-branching',
          type: 'branching',
          title: 'Branching Scenario — Build a Course',
          content: 'You are a new instructional designer at a company. Navigate the decisions below to build your first course.',
          narration: 'This is a branching scenario. Read the situation and choose the best action. Your choice will affect the path through the scenario.',
          voiceOverText: 'Read the situation and choose the best option. Your choice determines the next step.',
          data: {
            nodes: [
              {
                id: 'node-start',
                type: 'scenario',
                title: 'Getting Started',
                content: 'Your manager asks you to build a 30-minute onboarding course for new hires. What is your first step?',
                choices: [
                  { id: 'c1', text: 'Upload existing HR documents to CourseGEN AI', nextNodeId: 'node-good', isCorrectPath: true },
                  { id: 'c2', text: 'Start writing slide content from scratch manually', nextNodeId: 'node-bad' },
                  { id: 'c3', text: 'Ask IT to build a custom LMS module', nextNodeId: 'node-bad' },
                ],
              },
              {
                id: 'node-good',
                type: 'scenario',
                title: 'Great Choice!',
                content: 'You uploaded the HR documents. CourseGEN AI analysed the content and generated a 15-slide outline. Your manager wants interactive elements added. What do you do?',
                choices: [
                  { id: 'c4', text: 'Select quiz and accordion interactions from the Course Details page', nextNodeId: 'node-success', isCorrectPath: true },
                  { id: 'c5', text: 'Export the course as-is without interactions', nextNodeId: 'node-partial' },
                ],
              },
              {
                id: 'node-bad',
                type: 'scenario',
                title: 'Reconsider Your Approach',
                content: 'That approach would take significantly longer and may not produce SCORM-compliant output. A better approach is to use AI to accelerate the process.',
                feedback: 'Tip: CourseGEN AI can convert existing documents into full interactive courses in minutes.',
                choices: [
                  { id: 'c6', text: 'Start again with a better approach', nextNodeId: 'node-start' },
                ],
              },
              {
                id: 'node-partial',
                type: 'ending',
                title: 'Course Published — But Missing Interactions',
                content: 'Your course was exported and published, but learner engagement data shows a 40% drop-off rate. Adding interactive elements would have significantly improved completion rates.',
                isDeadEnd: false,
                choices: [],
              },
              {
                id: 'node-success',
                type: 'ending',
                title: '🎉 Course Successfully Launched!',
                content: 'Your onboarding course was published with quizzes, accordion components, and flashcards. Learner completion rates are at 94% and your manager is thrilled. Well done!',
                isDeadEnd: false,
                choices: [],
              },
            ],
          },
        },
      ],
    },

    // ── MODULE 6: Summary ──────────────────────────────────────────────────
    {
      id: 'mod-6',
      title: 'Module 6 — Course Summary',
      slides: [
        {
          id: 'slide-summary',
          type: 'summary',
          title: 'Course Summary — Player Sandbox Complete',
          content: `## What This Course Covered\n\n**Module 1** — Core slide types: Title, Content, Key Takeaways\n\n**Module 2** — Knowledge checks: Multiple Choice Quiz\n\n**Module 3** — Exploratory interactions: Accordion, Flashcards, Timeline\n\n**Module 4** — Drag-and-drop interactions: Sorting, Matching\n\n**Module 5** — Advanced interactions: Hotspot, Branching Scenario\n\n---\n\n> Use this sandbox any time via **Admin → Preview Mode** to test player changes without generating a full course.`,
          narration: 'Congratulations on completing the Admin Preview Mode sandbox. You have now seen every slide type and interaction component the CourseGEN player supports.',
          voiceOverText: 'Congratulations on completing the sandbox. You have now tested every component in the player.',
          imagePlaceholder: false,
        },
      ],
    },
  ],
};
