import { CourseOutline, ExamConfig, ExamQuestion } from '../types/course';

/**
 * A comprehensive dummy course used by the Admin "Preview Mode" shortcut.
 * Covers every slide type so the player can be tested without generating content.
 */
export const DUMMY_COURSE: CourseOutline = {
  title: 'NexCourse Preview — Player Test Course',
  description: 'A pre-built sandbox course containing every slide type and interaction component. Use this to test and debug the course player without uploading files or running AI generation.',
  learningObjectives: [
    {
      terminalObjective: 'Given a description of the NexCourse player, the learner will identify each of its core components and their functions.',
      enablingObjectives: [
        'The learner will label the four layers of the NexCourse player (Slide Canvas, Player Bar, Edit Drawer, Theme System).',
        'The learner will describe the role of the Player Bar in controlling slide navigation.',
        'The learner will distinguish between the three available theme modes: Dark, Light, and Unified.',
        'The learner will recall the purpose of the Slide Canvas in rendering different slide types.',
      ],
    },
    {
      terminalObjective: 'Given a multiple-choice knowledge check, the learner will recognize the correct answer that reflects course content covered in each module.',
      enablingObjectives: [
        'The learner will identify which player component is responsible for slide navigation.',
        'The learner will recall the number of theme modes supported by the NexCourse player.',
        'The learner will match each player component to its primary function.',
      ],
    },
    {
      terminalObjective: 'Given an interactive slide, the learner will describe how each exploratory interaction type presents information to the learner.',
      enablingObjectives: [
        'The learner will explain how the accordion interaction reveals content when a heading is selected.',
        'The learner will define key player terminology using the flashcard interaction.',
        'The learner will outline the sequence of events displayed in the timeline interaction.',
        'The learner will summarize how branching scenarios require the learner to make decisions to progress.',
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
        // Content
        {
          id: 'slide-content-1',
          type: 'content',
          title: 'Understanding the Player Layout',
          content: `## Player Architecture\n\nThe NexCourse player is composed of several key layers:\n\n- **Slide Canvas** — The central content area that renders each slide type\n- **Player Bar** — The bottom navigation with play/pause, seekbar, and slide controls\n- **Edit Drawer** — The right-side panel for modifying slide text and audio\n- **Theme System** — Dark, Light, and Unified color modes\n\n## Navigation\n\nUse the **Previous** and **Next** buttons in the player bar, or click directly on the seekbar to jump to any slide. The current slide position is tracked in real time.`,
          narration: 'The NexCourse player is built from four key layers: the slide canvas, the player bar, the edit drawer, and the theme system. Let\'s explore each one.',
          voiceOverText: 'The NexCourse player is built from four key layers: the slide canvas, the player bar, the edit drawer, and the theme system.',
          imagePlaceholder: true,
          mediaPrompt: 'Clean diagram showing the layers of an eLearning player interface',
        },
        // Key-takeaways
        {
          id: 'slide-key-takeaways',
          type: 'key-takeaways',
          title: 'Key Takeaways — Module 1',
          content: '',
          data: {
            objectives: [
              { id: 'kt1', label: 'Slide Types', content: 'This course demonstrates every slide layout the player supports' },
              { id: 'kt2', label: 'Interaction Components', content: 'All gamifiable interaction types are included in the player' },
              { id: 'kt3', label: 'Navigation Controls', content: 'The player bar provides seekbar, play/pause, and slide navigation' },
              { id: 'kt4', label: 'Admin Mode', content: 'Use Preview Mode any time to test player changes without generating a full course' },
            ],
          },
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
          content: '## Testing Quiz Components\n\nThis module demonstrates the **Quiz** and **Multiple Answer** slide types. These are the core assessment tools in the NexCourse player.\n\nTry selecting an answer and clicking Submit to see the feedback logic in action.',
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
            questionText: 'Which of the following is responsible for controlling slide navigation in the NexCourse player?',
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
          content: 'Which theme modes are available in the NexCourse player?',
          narration: 'Second knowledge check. Identify the correct theme options available in the player.',
          voiceOverText: 'Second knowledge check. Identify the correct theme options.',
          interactions: [],
          data: {
            questionText: 'How many theme modes does the NexCourse player support?',
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
          content: 'Explore the key milestones in the development of the NexCourse platform.',
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
              { id: 'si-3', content: 'Core Player Built' },
              { id: 'si-1', content: 'AI Generation Pipeline' },
              { id: 'si-5', content: 'Interactive Components' },
              { id: 'si-4', content: 'Gamification Engine' },
              { id: 'si-2', content: 'SCORM Export' },
            ],
            correctOrder: ['si-3', 'si-1', 'si-5', 'si-4', 'si-2'],
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
              { id: 'pair-1', term: 'Player Bar',     definition: 'Bottom navigation with seekbar and slide controls' },
              { id: 'pair-2', term: 'Edit Drawer',    definition: 'Right-panel for inline slide text and audio editing' },
              { id: 'pair-3', term: 'Slide Canvas',   definition: 'Central area that renders each slide type' },
              { id: 'pair-4', term: 'SCORM Package',  definition: 'ZIP export for LMS-compatible course delivery' },
            ],
            correctAnswers: {
              'pair-1_item': 'pair-1_target',
              'pair-2_item': 'pair-2_target',
              'pair-3_item': 'pair-3_target',
              'pair-4_item': 'pair-4_target',
            },
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
            startNodeId: 'node-start',
            nodes: {
              'node-start': {
                id: 'node-start', type: 'scenario',
                title: 'Getting Started',
                content: 'Your manager asks you to build a 30-minute onboarding course for new hires. What is your first step?',
                isDeadEnd: false, feedback: '',
                choices: [
                  { id: 'c1', text: 'Upload existing HR documents to NexCourse AI', nextNodeId: 'node-good', isCorrectPath: true },
                  { id: 'c2', text: 'Start writing slide content from scratch manually', nextNodeId: 'node-bad', isCorrectPath: false },
                  { id: 'c3', text: 'Ask IT to build a custom LMS module', nextNodeId: 'node-bad', isCorrectPath: false },
                ],
              },
              'node-good': {
                id: 'node-good', type: 'scenario',
                title: 'Great Choice!',
                content: 'You uploaded the HR documents. NexCourse AI analysed the content and generated a 15-slide outline. Your manager wants interactive elements added. What do you do?',
                isDeadEnd: false, feedback: '',
                choices: [
                  { id: 'c4', text: 'Select quiz and accordion interactions from the Course Details page', nextNodeId: 'node-success', isCorrectPath: true },
                  { id: 'c5', text: 'Export the course as-is without interactions', nextNodeId: 'node-partial', isCorrectPath: false },
                ],
              },
              'node-bad': {
                id: 'node-bad', type: 'scenario',
                title: 'Reconsider Your Approach',
                content: 'That approach would take significantly longer and may not produce SCORM-compliant output. A better approach is to use AI to accelerate the process.',
                isDeadEnd: true, feedback: 'Tip: NexCourse AI can convert existing documents into full interactive courses in minutes.',
                choices: [
                  { id: 'c6', text: 'Start again with a better approach', nextNodeId: 'node-start', isCorrectPath: true },
                ],
              },
              'node-partial': {
                id: 'node-partial', type: 'ending',
                title: 'Course Published — But Missing Interactions',
                content: 'Your course was exported and published, but learner engagement data shows a 40% drop-off rate. Adding interactive elements would have significantly improved completion rates.',
                isDeadEnd: true, feedback: 'Try again with interactive elements for better results.', choices: [],
              },
              'node-success': {
                id: 'node-success', type: 'ending',
                title: 'Course Successfully Launched!',
                content: 'Your onboarding course was published with quizzes, accordion components, and flashcards. Learner completion rates are at 94% and your manager is thrilled. Well done!',
                isDeadEnd: true, feedback: 'Excellent work!', choices: [],
              },
            },
          },
        },
      ],
    },

    // ── MODULE 6: Wheel Diagram Demo ───────────────────────────────────────
    {
      id: 'mod-6',
      title: 'Module 6 — New Interaction Types',
      slides: [
        {
          id: 'slide-wheel',
          type: 'wheel-diagram',
          title: 'The eLearning Development Lifecycle',
          content: 'Click on any segment to explore each phase of the eLearning development process.',
          narration: 'The eLearning development lifecycle consists of several key phases. Click on each segment to explore them in detail.',
          data: {
            centerLabel: 'ADDIE\nModel',
            segments: [
              { id: 'w1', label: 'Analysis',     icon: '🔍', content: 'The Analysis phase identifies the learning problem, audience, goals, and delivery environment. It answers: What do learners need to know and why?' },
              { id: 'w2', label: 'Design',        icon: '✏️', content: 'The Design phase creates a blueprint — learning objectives, assessment strategy, media selection, and storyboard. The instructional approach is defined here.' },
              { id: 'w3', label: 'Development',   icon: '🛠️', content: 'The Development phase builds the actual course using authoring tools. Slides, interactions, audio, and video are produced and assembled.' },
              { id: 'w4', label: 'Implementation',icon: '🚀', content: 'Implementation is the delivery phase. The course is uploaded to an LMS, SCORM packages are configured, and learners are enrolled.' },
              { id: 'w5', label: 'Evaluation',    icon: '📊', content: 'Evaluation measures effectiveness — through learner feedback (Level 1), knowledge tests (Level 2), behavior change (Level 3), and business impact (Level 4).' },
              { id: 'w6', label: 'Revision',      icon: '🔄', content: 'Based on evaluation data, content is revised and improved. This makes eLearning development an iterative, continuous process.' },
            ],
          },
        },
      ],
    },

    // ── MODULE 7: Summary ──────────────────────────────────────────────────
    {
      id: 'mod-7',
      title: 'Module 7 — Course Summary',
      slides: [
        {
          id: 'slide-summary',
          type: 'summary',
          title: 'Course Summary — Player Sandbox Complete',
          content: `## What This Course Covered\n\n**Module 1** — Core slide types: Title, Content, Key Takeaways\n\n**Module 2** — Knowledge checks: Multiple Choice Quiz\n\n**Module 3** — Exploratory interactions: Accordion, Flashcards, Timeline\n\n**Module 4** — Drag-and-drop interactions: Sorting, Matching\n\n**Module 5** — Advanced interactions: Hotspot, Branching Scenario\n\n**Module 6** — New interaction: Wheel Diagram\n\n---\n\n> Use this sandbox any time via **Admin → Preview Mode** to test player changes without generating a full course.`,
          narration: 'Congratulations on completing the Admin Preview Mode sandbox. You have now seen every slide type and interaction component the NexCourse player supports.',
          voiceOverText: 'Congratulations on completing the sandbox. You have now tested every component in the player.',
          imagePlaceholder: false,
        },
      ],
    },
  ],
  examConfig: {
    enabled: true,
    passingScore: 80,
    questionMode: 'total',
    questionCount: 5,
    allowRetake: true,
    questionTypes: ['mc', 'ma', 'tf'],
    presentationMode: 'one-at-a-time',
  },
  navigationMode: 'free',
};

export const DUMMY_EXAM_CONFIG: ExamConfig = DUMMY_COURSE.examConfig!;

export const DUMMY_EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q1', type: 'mc',
    question: 'Which component of the NexCourse player is responsible for controlling slide navigation?',
    options: ['Slide Canvas', 'Player Bar', 'Edit Drawer', 'Theme System'],
    correctAnswer: 1,
    explanation: 'The Player Bar contains the Prev/Next buttons, progress bar, and playback controls used to navigate between slides.',
    moduleIndex: 0,
  },
  {
    id: 'q2', type: 'tf',
    question: 'The NexCourse player supports three theme modes: Dark, Light, and Unified.',
    options: ['True', 'False'],
    correctAnswer: 0,
    explanation: 'True — the player supports Dark, Light, and Unified theme modes selectable from the top bar or Player Properties.',
    moduleIndex: 0,
  },
  {
    id: 'q3', type: 'ma',
    question: 'Which of the following are exploratory interaction types available in the NexCourse player? (Select all that apply)',
    options: ['Accordion', 'Flashcards', 'Sorting', 'Timeline'],
    correctAnswer: [0, 1, 3],
    explanation: 'Accordion, Flashcards, and Timeline are exploratory interactions. Sorting is a drag-and-drop interaction.',
    moduleIndex: 1,
  },
  {
    id: 'q4', type: 'mc',
    question: 'What is the primary purpose of the Edit Drawer in the NexCourse player?',
    options: ['To change the course theme', 'To edit slide text and audio narration', 'To add new modules', 'To export the course as SCORM'],
    correctAnswer: 1,
    explanation: 'The Edit Drawer allows authors to edit slide text content and record or upload audio narration.',
    moduleIndex: 1,
  },
  {
    id: 'q5', type: 'tf',
    question: 'In the NexCourse player, the Slide Canvas is responsible for rendering different slide types.',
    options: ['True', 'False'],
    correctAnswer: 0,
    explanation: 'True — the Slide Canvas is where all slide types (content, quiz, interaction, etc.) are rendered to the learner.',
    moduleIndex: 2,
  },
];
