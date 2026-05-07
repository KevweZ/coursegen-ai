import { CourseOutline, ExamConfig, ExamQuestion } from '../types/course';
import { deadlineSpiral } from '../data/deadlineSpiral';

/**
 * A comprehensive dummy course used by the Admin "Preview Mode" shortcut.
 * Covers every slide type so the player can be tested without generating content.
 */
export const DUMMY_COURSE: CourseOutline = {
  title: 'NexCourse Preview — Player Test Course',
  description: 'A pre-built sandbox course containing every slide type and interaction component. Use this to test and debug the course player without uploading files or running AI generation.',
  learningObjectives: [
    {
      terminalObjective: 'Given a description of the NexCourse player, the learner will identify each core component and its function.',
      enablingObjectives: [
        'The learner will label the four layers of the NexCourse player: Slide Canvas, Player Bar, Edit Drawer, and Theme System.',
        'The learner will describe the role of the Player Bar in controlling slide navigation and audio playback.',
        'The learner will distinguish between the three available theme modes: Dark, Light, and Unified.',
        'The learner will answer multiple-choice knowledge checks on player architecture and quiz interaction formats.',
      ],
    },
    {
      terminalObjective: 'Given an interactive slide, the learner will demonstrate how exploratory and display interactions present information.',
      enablingObjectives: [
        'The learner will explain how the accordion interaction reveals content when a heading is selected.',
        'The learner will define key player terminology using the flashcard interaction.',
        'The learner will outline a sequence of events displayed in the timeline interaction.',
        'The learner will navigate a wheel diagram to explore layered content segments.',
      ],
    },
    {
      terminalObjective: 'Given an assessment interaction, the learner will demonstrate how drag-and-drop and spatial interactions are used to verify knowledge.',
      enablingObjectives: [
        'The learner will sort items into the correct order using the sorting interaction.',
        'The learner will connect terms to definitions using the matching interaction.',
        'The learner will click hotspot targets to reveal location-specific information.',
      ],
    },
    {
      terminalObjective: 'Given a multi-phase workplace scenario, the learner will navigate decision nodes and interpret consequence-based feedback.',
      enablingObjectives: [
        'The learner will select a decision option that reflects sound professional judgment.',
        'The learner will interpret the narrative consequence of each decision made.',
        'The learner will review their Decision Profile to identify strengths and development areas.',
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
    // ── MODULE 1: Core Player & Knowledge Checks ───────────────────────────
    {
      id: 'mod-1',
      title: 'Module 1 — Core Player & Knowledge Checks',
      slides: [
        {
          id: 'slide-content-1',
          type: 'content',
          title: 'Understanding the Player Layout',
          content: `## Player Architecture\n\nThe NexCourse player is composed of several key layers:\n\n- **Slide Canvas** — The central content area that renders each slide type\n- **Player Bar** — The bottom navigation with play/pause, seekbar, and slide controls\n- **Edit Drawer** — The right-side panel for modifying slide text and audio\n- **Theme System** — Dark, Light, and Unified color modes\n\n---\n\n## Navigation\n\nUse the **Previous** and **Next** buttons in the player bar, or click directly on the seekbar to jump to any slide.`,
          narration: 'The NexCourse player is built from four key layers: the slide canvas, the player bar, the edit drawer, and the theme system.',
          voiceOverText: 'The NexCourse player has four key layers: the slide canvas, the player bar, the edit drawer, and the theme system.',
          imagePlaceholder: true,
          mediaPrompt: 'Clean diagram showing the layers of an eLearning player interface',
        },
        {
          id: 'slide-key-takeaways',
          type: 'key-takeaways',
          title: 'Key Takeaways — Player Architecture',
          content: '',
          data: {
            objectives: [
              { id: 'kt1', label: 'Slide Canvas', content: 'Renders every slide type dynamically based on the type field.' },
              { id: 'kt2', label: 'Player Bar', content: 'Contains the seekbar, play/pause controls, and slide navigation.' },
              { id: 'kt3', label: 'Edit Drawer', content: 'Right-side panel for editing slide text and audio narration.' },
              { id: 'kt4', label: 'Theme System', content: 'Three modes: Dark, Light, and Unified — switchable at any time.' },
            ],
          },
          narration: 'Let us consolidate what we covered. You explored the player architecture and its four core layers.',
          voiceOverText: 'Let us consolidate. You explored the four core layers of the NexCourse player.',
          imagePlaceholder: false,
        },
        {
          id: 'slide-quiz-1',
          type: 'quiz',
          title: 'Knowledge Check — Player Components',
          content: 'Test your understanding of the player architecture.',
          narration: 'Here is your first knowledge check. Select the best answer and click Submit.',
          voiceOverText: 'Select the best answer and click submit.',
          interactions: [],
          data: {
            questionText: 'Which component is responsible for controlling slide navigation in the NexCourse player?',
            options: [
              { id: 'a', text: 'The Slide Canvas', isCorrect: false },
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
          content: 'How many theme modes are available?',
          narration: 'Second knowledge check. Identify the correct theme options.',
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

    // ── MODULE 2: Exploratory Interactions ────────────────────────────────
    {
      id: 'mod-2',
      title: 'Module 2 — Exploratory Interactions',
      slides: [
        {
          id: 'slide-accordion',
          type: 'accordion',
          title: 'Accordion — Player Components Deep Dive',
          content: 'Click each section to expand and explore the details.',
          narration: 'This is the accordion interaction. Click each heading to expand the content panel beneath it.',
          voiceOverText: 'This is the accordion interaction. Click each heading to expand the panel.',
          data: {
            items: [
              { id: 'acc-1', title: 'Slide Canvas', content: 'The slide canvas is the main rendering area of the player. It dynamically switches between slide type renderers based on the current slide\'s type field. Supports 12+ distinct layouts.' },
              { id: 'acc-2', title: 'Player Bar', content: 'The player bar is the bottom navigation strip. It includes a seekbar, a play/pause button for audio narration, elapsed time display, and previous/next navigation controls.' },
              { id: 'acc-3', title: 'Edit Drawer', content: 'The edit drawer slides in from the right when Edit Slide is clicked. It provides two tabs: Text for editing slide content inline and Audio for recording or uploading narration.' },
              { id: 'acc-4', title: 'Theme System', content: 'Three themes are supported: Dark, Light, and Unified. The theme is stored globally and applied via CSS class prefixes across the entire player.' },
            ],
          },
        },
        {
          id: 'slide-flashcards',
          type: 'flashcards',
          title: 'Flashcards — Player Terminology',
          content: 'Click each card to flip it and reveal the definition.',
          narration: 'These are the flashcards. Click each card to flip it and reveal the answer on the back.',
          voiceOverText: 'Click each card to flip it and reveal the definition.',
          data: {
            cards: [
              { front: 'What is a Slide Type?', back: 'A property on each slide object that determines which renderer the player uses — e.g., title, content, quiz, accordion, flashcards, timeline.' },
              { front: 'What is the Player Bar?', back: 'The horizontal navigation toolbar at the bottom of the player containing the seekbar, play/pause control, and slide navigation buttons.' },
              { front: 'What is the Edit Drawer?', back: 'The right-side panel that opens when the user clicks Edit Slide, enabling inline text editing and audio narration management.' },
              { front: 'What is a SCORM Package?', back: 'A ZIP file containing the course HTML, JavaScript, and assets in a format compatible with Learning Management Systems like Moodle or Cornerstone.' },
              { front: 'What is Voiceover / Narration?', back: 'AI-generated or recorded audio that plays automatically when a slide is entered, synchronized with the seekbar progress.' },
            ],
          },
        },
        {
          id: 'slide-timeline',
          type: 'timeline',
          title: 'Timeline — NexCourse Development Milestones',
          content: 'Explore the key milestones in the development of the NexCourse platform.',
          narration: 'This is the timeline interaction. Click each node to expand its detail panel.',
          voiceOverText: 'This is the timeline interaction. Click each node to reveal its detail panel.',
          data: {
            events: [
              { id: 'ev-1', year: 'Phase 1', title: 'Core Player Built', content: 'The foundational eLearning player was constructed with slide navigation, the player bar, and the dark theme system.' },
              { id: 'ev-2', year: 'Phase 2', title: 'AI Generation Pipeline', content: 'Integration of the Gemini API for outline generation and full course hydration including narration scripts.' },
              { id: 'ev-3', year: 'Phase 3', title: 'Interactive Components', content: 'Accordion, Flashcards, Timeline, Hotspot, Sorting, Matching, and Decision Simulation interactions were built and integrated.' },
              { id: 'ev-4', year: 'Phase 4', title: 'Gamification Engine', content: 'Six game templates added: Jeopardy, Millionaire, Family Feud, Escape Room, Spin the Wheel, and Price Estimator.' },
              { id: 'ev-5', year: 'Phase 5', title: 'SCORM Export', content: 'Full SCORM 1.2/2004 package export with LMS tracking, course completion logic, and xAPI event reporting.' },
            ],
          },
        },
        {
          id: 'slide-wheel',
          type: 'wheel-diagram',
          title: 'The eLearning Development Lifecycle',
          content: 'Click on any segment to explore each phase of the eLearning development process.',
          narration: 'The eLearning development lifecycle consists of several key phases. Click on each segment to explore them in detail.',
          data: {
            centerLabel: 'ADDIE\nModel',
            segments: [
              { id: 'w1', label: 'Analysis',      icon: '🔍', content: 'The Analysis phase identifies the learning problem, audience, goals, and delivery environment.' },
              { id: 'w2', label: 'Design',         icon: '✏️', content: 'The Design phase creates a blueprint — learning objectives, assessment strategy, and storyboard.' },
              { id: 'w3', label: 'Development',    icon: '🛠️', content: 'The Development phase builds the actual course using authoring tools like NexCourse AI.' },
              { id: 'w4', label: 'Implementation', icon: '🚀', content: 'Implementation is the delivery phase. The course is uploaded to an LMS and learners are enrolled.' },
              { id: 'w5', label: 'Evaluation',     icon: '📊', content: 'Evaluation measures effectiveness through learner feedback, knowledge tests, and business impact.' },
              { id: 'w6', label: 'Revision',       icon: '🔄', content: 'Based on evaluation data, content is revised. This makes eLearning development an iterative process.' },
            ],
          },
        },
      ],
    },

    // ── MODULE 3: Assessment Interactions ─────────────────────────────────
    {
      id: 'mod-3',
      title: 'Module 3 — Assessment Interactions',
      slides: [
        {
          id: 'slide-mod3-intro',
          type: 'content',
          title: 'Module 3 — Assessment & Spatial Interactions',
          content: '## Assessment Interactions\n\nThis module covers three interaction types that challenge the learner to actively categorize, connect, and locate information:\n\n- **Sorting** — Drag items into the correct order\n- **Matching** — Connect terms to their definitions\n- **Hotspot** — Click labeled regions to reveal details',
          narration: 'Module 3 covers assessment interactions: sorting, matching, and hotspot.',
          voiceOverText: 'Module 3 covers sorting, matching, and hotspot interactions.',
        },
        {
          id: 'slide-sorting',
          type: 'sorting',
          title: 'Sorting — Order the Development Phases',
          content: 'Drag the phases into the correct chronological order.',
          narration: 'This is the sorting interaction. Drag and drop the items to arrange them in the correct order.',
          voiceOverText: 'Drag the items to arrange them in the correct order.',
          data: {
            prompt: 'Arrange the NexCourse development phases in the correct order:',
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
        {
          id: 'slide-matching',
          type: 'matching',
          title: 'Matching — Components to Descriptions',
          content: 'Match each player component to its correct description.',
          narration: 'This is the matching interaction. Connect each item on the left to its matching definition on the right.',
          voiceOverText: 'Match each component to its correct description.',
          data: {
            prompt: 'Match each NexCourse component to its function:',
            pairs: [
              { id: 'pair-1', term: 'Player Bar',    definition: 'Bottom navigation with seekbar and slide controls' },
              { id: 'pair-2', term: 'Edit Drawer',   definition: 'Right-panel for inline slide text and audio editing' },
              { id: 'pair-3', term: 'Slide Canvas',  definition: 'Central area that renders each slide type' },
              { id: 'pair-4', term: 'SCORM Package', definition: 'ZIP export for LMS-compatible course delivery' },
            ],
            correctAnswers: {
              'pair-1_item': 'pair-1_target',
              'pair-2_item': 'pair-2_target',
              'pair-3_item': 'pair-3_target',
              'pair-4_item': 'pair-4_target',
            },
          },
        },
        {
          id: 'slide-hotspot',
          type: 'hotspot',
          title: 'Hotspot — Click the Highlighted Regions',
          content: 'Click each highlighted point to reveal information about that location.',
          narration: 'This is the hotspot interaction. Click each pinpoint to reveal the information attached to that location.',
          voiceOverText: 'Click the pinpoints to reveal information about each location.',
          data: {
            backgroundImage: null,
            hotspots: [
              { id: 'hs-1', x: 25, y: 40, label: 'Player Bar',   content: 'The Player Bar handles all slide navigation and audio playback controls.' },
              { id: 'hs-2', x: 55, y: 30, label: 'Slide Canvas', content: 'The Slide Canvas dynamically renders whichever slide type is currently active.' },
              { id: 'hs-3', x: 75, y: 60, label: 'Edit Drawer',  content: 'The Edit Drawer opens from the right side and allows inline content and audio editing.' },
              { id: 'hs-4', x: 40, y: 70, label: 'Theme Toggle', content: 'Switch between Dark, Light, and Unified themes from the toolbar at the top of the preview.' },
            ],
          },
        },
      ],
    },

    // ── MODULE 4: Course Summary ───────────────────────────────────────────
    {
      id: 'mod-4',
      title: 'Module 4 — Course Summary',
      slides: [
        {
          id: 'slide-summary',
          type: 'summary',
          title: 'Course Summary — Player Sandbox Complete',
          content: `## What This Course Covered\n\n**Module 1** — Core player architecture: Slide Canvas, Player Bar, Edit Drawer, Theme System + Knowledge Checks\n\n**Module 2** — Exploratory interactions: Accordion, Flashcards, Timeline, Wheel Diagram\n\n**Module 3** — Assessment interactions: Sorting, Matching, Hotspot\n\n**Module 4** — This summary\n\n**Module 5** — Decision Simulation: The Deadline Spiral (SHRM/ATD-quality workplace scenario)\n\n---\n\n> Use this sandbox any time via **Admin → Preview Mode** to test player changes without generating a full course.`,
          narration: 'Congratulations on completing the Admin Preview Mode sandbox. You have now seen every major slide type and interaction component the NexCourse player supports.',
          voiceOverText: 'Congratulations on completing the sandbox. You have now tested every major component in the player.',
          imagePlaceholder: false,
        },
      ],
    },

    // ── MODULE 5: Decision Simulation ─────────────────────────────────────
    {
      id: 'mod-5',
      title: 'Module 5 — Decision Simulation',
      slides: [
        {
          id: 'slide-scenario-intro',
          type: 'content',
          title: 'Decision Simulation — The Deadline Spiral',
          content: `## Workplace Decision Simulation\n\nThe following scenario places you in a realistic leadership situation. You will navigate multiple decision points, each with realistic consequences. Your accumulated choices determine the outcome.\n\nThis simulation assesses:\n- Leadership Communication\n- Conflict Resolution\n- Emotional Intelligence\n- Accountability Management\n- Stakeholder Communication`,
          narration: 'In this module you will experience a workplace decision simulation.',
          imagePlaceholder: false,
        },
        {
          id: 'slide-scenario',
          type: 'scenario',
          title: 'Scenario — The Deadline Spiral',
          content: '',
          narration: '',
          imagePlaceholder: false,
          data: deadlineSpiral,
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
