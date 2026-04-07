# MASTER RECOVERY DOCUMENT
## CourseGen AI — eLearning Authoring Platform
### Last Updated: 2026-04-05 | Version: Full-Build Recovery Guide

> **PURPOSE:** This document is the single source of truth for reconstructing the entire CourseGen AI application from scratch. It captures every feature, design decision, AI prompt specification, component architecture, and implementation detail needed to rebuild if all code is ever lost.

---

## TABLE OF CONTENTS

1. [Project Overview & Tech Stack](#1-project-overview--tech-stack)
2. [File & Folder Architecture](#2-file--folder-architecture)
3. [Application Flow & State Management](#3-application-flow--state-management)
4. [Course Builder — Details Page](#4-course-builder--details-page)
5. [Complexity Level Presets & Auto-Configuration Logic](#5-complexity-level-presets--auto-configuration-logic)
6. [AI Generation Pipeline](#6-ai-generation-pipeline)
7. [Course Preview Mode (Player)](#7-course-preview-mode-player)
8. [Slide Type Renderers](#8-slide-type-renderers)
9. [Slide Editor — Edit Drawer & Player Bar](#9-slide-editor--edit-drawer--player-bar)
10. [Voice-Over Synced Seekbar Player](#10-voice-over-synced-seekbar-player)
11. [Game Show & Game-Based Interaction Templates](#11-game-show--game-based-interaction-templates)
12. [Floating Image System (Drag / Resize / Crop)](#12-floating-image-system-drag--resize--crop)
13. [Player Properties Modal](#13-player-properties-modal)
14. [SCORM Export Service](#14-scorm-export-service)
15. [ISD & eLearning Best Practices Applied](#15-isd--elearning-best-practices-applied)
16. [Key Prompts & Specifications (Verbatim)](#16-key-prompts--specifications-verbatim)
17. [Known Issues & Fixes Log](#17-known-issues--fixes-log)

---

## 1. PROJECT OVERVIEW & TECH STACK

### What It Is
An AI-powered eLearning authoring SaaS that generates complete, SCORM-compliant courses from uploaded documents or text prompts. Targets two audiences: **Corporate Training** and **K-12 Education**.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 6 |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| AI Backend | Anthropic Claude (claude-sonnet-4-6 for complex, claude-haiku-4-5 for bulk) |
| Image Drag/Resize | Interact.js |
| PDF processing | pdfjs-dist |
| PPTX processing | JSZip (unzip + extract media) |
| DOCX processing | mammoth |
| SCORM packaging | JSZip (client-side ZIP) |
| Markdown rendering | react-markdown |
| Interactive components | @zomako/elearning-components |
| Icons | lucide-react |

### Environment Variables Required
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### Dev Server Command
```
npm run dev   →  runs: vite --port=3000 --host=0.0.0.0
```

---

## 2. FILE & FOLDER ARCHITECTURE

```
coursegen-ai/
├── src/
│   ├── App.tsx                          # Main application (107KB) — all state, steps, routing
│   ├── main.tsx                         # React 18 createRoot entry point
│   ├── index.css                        # Global CSS (Tailwind base)
│   │
│   ├── types/
│   │   ├── course.ts                    # CourseOutline, Module, Slide, FloatingImage types
│   │   └── game.ts                      # GameTemplateType enum
│   │
│   ├── lib/
│   │   ├── gameEngine.ts               # GAME_TEMPLATES array + getRecommendedGames()
│   │   ├── presetEngine.ts             # getPresetConfig(), getPresetOptions() — thoroughness logic
│   │   ├── usePlayer.ts                # usePlayer() hook — audio engine + seekbar state
│   │   ├── fileProcessor.ts            # extractTextFromFile(), extractImagesFromFile()
│   │   ├── backgrounds.ts              # getRandomBackgroundForTheme()
│   │   ├── backgroundData.json         # Array of background image URLs by theme
│   │   └── utils.ts                    # cn() className helper
│   │
│   ├── services/
│   │   ├── aiService.ts               # Core AI generation: outline → hydration → analysis
│   │   ├── aiGameService.ts           # Game template AI generation (6 separate prompts)
│   │   └── scormService.ts            # createScormPackage() — builds SCORM 1.2 ZIP
│   │
│   └── components/
│       ├── FlashcardGrid.tsx          # Flashcard flip interaction
│       ├── FloatingImageCanvas.tsx    # Drag+resize+crop floating images on slides
│       │
│       ├── builder/
│       │   ├── OutlinePreview.tsx     # Step 3: Review generated outline before hydration
│       │   └── PlayerPropertiesModal.tsx  # Storyline-style player config + live preview
│       │
│       ├── player/
│       │   ├── PlayerBar.tsx          # Bottom player bar: seekbar + Slide Editor tab row
│       │   ├── Seekbar.tsx            # Draggable audio seekbar component
│       │   └── SlideContent.tsx       # Rich markdown renderer (styled bullets, callouts)
│       │
│       └── game-templates/
│           ├── core/
│           │   └── GameContainer.tsx  # Routes to the correct game renderer by templateType
│           └── templates/
│               ├── JeopardyGame.tsx
│               ├── MillionaireGame.tsx
│               ├── FamilyFeudGame.tsx
│               ├── EscapeRoomGame.tsx
│               ├── SpinWheelGame.tsx
│               └── PriceIsRightGame.tsx
│
├── public/
│   └── SME Documents/                 # Reference screenshots, ISD Basics, game show research
│
├── index.html                         # Single HTML shell with <div id="root">
├── package.json
├── vite.config.ts
└── MASTER_RECOVERY_DOCUMENT.md        # ← THIS FILE
```

---

## 3. APPLICATION FLOW & STATE MANAGEMENT

### Step Machine
The app uses a single `step` state that controls which screen renders:

```
'home'     → Landing page: upload file OR type a prompt
'details'  → Course Builder form (thoroughness, slides, objectives, interactions, gamification)
'outline'  → AI-generated outline review (OutlinePreview component)
'preview'  → Full course player (sidebar + slides + PlayerBar)
```

### Critical State Variables in App.tsx
```typescript
// Navigation
const [step, setStep] = useState<'home'|'details'|'outline'|'preview'>('home');

// Pathway
const [pathway, setPathway] = useState<'corporate'|'k12'>('corporate');

// Course content
const [course, setCourse] = useState<CourseOutline | null>(null);
const [originalCourse, setOriginalCourse] = useState<CourseOutline | null>(null); // used for reset
const [outlineDraft, setOutlineDraft] = useState<CourseOutlineDraft | null>(null);

// Builder form
const [courseTitle, setCourseTitle] = useState('');
const [prompt, setPrompt] = useState('');
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
const [sourceContent, setSourceContent] = useState('');
const [sourceImages, setSourceImages] = useState<SourceImage[]>([]); // extracted from uploaded file

// Preset / complexity level
const [preset, setPreset] = useState<'quick'|'standard'|'comprehensive'>('standard');
const [slideCount, setSlideCount] = useState(17);
const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
const [interactionTypes, setInteractionTypes] = useState<string[]>([]);
const [objectiveFormat, setObjectiveFormat] = useState<string>('ABC');

// Gamification — multi-select array (first item drives AI generation)
const [gameTemplateIds, setGameTemplateIds] = useState<string[]>([]);
const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(false);

// Preview / player
const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
const [theme, setTheme] = useState<'light'|'dark'|'unified'>('dark');
const [viewMode, setViewMode] = useState<'desktop'|'mobile'>('desktop');
const [courseBg, setCourseBg] = useState<string|null>(null);

// Editing
const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
const [editDrawerOpen, setEditDrawerOpen] = useState(false);
const [showImageGalleryForSlide, setShowImageGalleryForSlide] = useState<string|null>(null);

// Player properties
const [showPlayerProperties, setShowPlayerProperties] = useState(false);
const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(defaultPlayerConfig);

// Generation
const [isGenerating, setIsGenerating] = useState(false);
const [isHydrating, setIsHydrating] = useState(false);
const [progress, setProgress] = useState(0);
const [error, setError] = useState<string|null>(null);
const [quizState, setQuizState] = useState<Record<string, any>>({});

// Interaction preview modal
const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);
```

### allSlides Derived Value
```typescript
const allSlides = useMemo(() =>
  course?.modules?.flatMap((m: any) => m.slides || []) ?? [],
  [course]
);
const currentSlide = allSlides[currentSlideIndex];
```

---

## 4. COURSE BUILDER — DETAILS PAGE

### Sections (in order)
1. **Audience Pathway** — Corporate / K-12 toggle
2. **Complexity Level** — Quick Overview / Standard Training / Comprehensive Course *(previously called "Thoroughness")*
3. **Course Topic** — Text input for the course prompt
4. **Slide Count** — Number slider controlled by preset min/max
5. **Learning Objectives** — Editable list, AI-suggest button, format selector (AB/ABC/ABCD/I Can)
6. **Interaction Types** — Multi-select tiles (Multiple Choice, Drag & Drop, Hotspot, Accordion, Flashcards, Timeline, Sorting, Matching, Drop Targets, Branching). Each tile has an Eye icon for a **visual preview modal**.
7. **Gamification** — Multi-select game template tiles (all templates always visible, no locks). Eye icon opens visual game preview. Best Fit (★) and Multiplayer badges shown per pathway.
8. **Audio & Accessibility** — Voice-Over toggle, Sound Effects toggle
9. **Footer Actions** — Cancel | ⚙ Player Properties | Generate Course Design

### Interaction Preview Modal
Every interaction type and game template has a dedicated visual preview opened by clicking the Eye icon:
- **Multiple Choice** — Radio-button question with 4 answer options (one highlighted as selected)
- **Hotspot** — Animated numbered marker dots on a diagram background with hover tooltips
- **Drop Targets** — Dashed-border category zones with draggable items shown
- **Branching** — Scenario card + two diverging choice cards with outcome labels
- **Knowledge Board** — Full Jeopardy-style grid with topic headers + $ value cells
- **Millionaire** — Blue question panel + prize money pyramid sidebar
- **Spin the Wheel** — 6-wedge colored triangular spinner with center SPIN label
- **Family Feud** — "Survey Says!" board with ranked answer bars + percentages
- **Escape Room** — Lock icon + 4-digit code + per-clue progress dots
- All other types (Accordion, Flashcards, Drag & Drop, Matching, Timeline, Sorting) use their **live React components** in the preview

### Complexity Level Auto-Configuration
Selecting a Complexity Level preset triggers `applyPreset()` which calls `getPresetConfig(pathway, presetId)` and sets:
- `slideCount` → `presetConfig.slideCountTarget`
- `learningObjectives` → cleared (re-suggested by AI for that format)
- `objectiveFormat` → `presetConfig.objectiveFormat`
- `interactionTypes` → `presetConfig.interactions`
- Various `include*` flags passed into the AI prompt

---

## 5. COMPLEXITY LEVEL PRESETS & AUTO-CONFIGURATION LOGIC

*(Previously titled "Thoroughness Presets" — renamed in UI to "Complexity Level")*

### Corporate Pathway

| Setting | Quick Overview | Standard Training | Comprehensive Course |
|---------|---------------|-------------------|---------------------|
| Duration | 3-5 min | 10-15 min | 20-30 min |
| Slides | 5-8 (target 6) | 15-20 (target 17) | 25-35 (target 30) |
| Objective Format | AB | ABC | ABCD |
| Objective Count | 1-2 | 3-4 | 4-6 |
| Interactions | Quiz, Accordion, Flashcards | + Timeline, Matching | + DragDrop, Branching, Sorting |
| Module Title Slides | No | Yes | Yes |
| Objective Slides | No | Yes | Yes |
| Knowledge Checks | Yes | Yes | Yes |
| Summary Slides | No | Yes | Yes |
| Exit Tickets | No | No | Yes |
| Game Templates | Jeopardy, Millionaire, Spin Wheel | + Family Feud, Price Is Right | + Escape Room |

### K-12 Pathway

| Setting | Bell Ringer | Standard Lesson | Deep Dive Unit |
|---------|------------|----------------|----------------|
| Duration | 3-5 min | 10-15 min | 20-30 min |
| Slides | 5-8 | 15-20 | 25-35 |
| Objective Format | I Can | ABC | ABCD |
| Bloom's Level | Remember/Recall | Understand/Apply | Analyze/Evaluate/Create |
| Interactions | Flashcards, Quiz | + Matching, Timeline | + DragDrop, Branching, Sorting |

---

## 6. AI GENERATION PIPELINE

### Phase 1: File Analysis (on upload)
```
analyzeUploadedFile(text, filename) → {
  title, summary, objectives, recommendedObjectiveFormat,
  recommendedInteractions, recommendedPreset
}
```
- Model: claude-haiku (fast)
- Also runs `extractImagesFromFile(file)` in parallel → `setSourceImages()`

### Phase 2: Outline Generation
```
generateCourseOutline(prompt, options) → CourseOutlineDraft {
  modules: [{ title, slideCount, learningObjectives }]
}
```
- Model: claude-sonnet
- Options include: pathway, preset, slideCount, objectiveFormat, interactionTypes, source content
- `gameTemplateId: gameTemplateIds[0] || null` (first selected game drives outline)

### Phase 3: Hydration (Outline → Full Course)
```
hydrateCourseContent(outline, options, onProgress?) → CourseOutline
```
- `onProgress(pct: number)` fires after each 3-slide chunk completes
- `totalChunks` pre-calculated across all modules before loop starts
- Progress range: 10% start → `10 + (completedChunks/totalChunks × 88)%` per chunk → 100% on finish
- Model: claude-haiku for each chunk (bulk), 3-tier fallback per chunk:
  - Tier 1: Full prompt → Tier 2: Simplified prompt → Tier 3: Per-slide individual calls
- Each Tier 3 slide also fires `onProgress` after completing
- **Slide Types Generated:** `title`, `content`, `key-takeaways`, `summary`, `quiz`, `accordion`, `flashcards`, `matching`, `sorting`, `drag-drop-activity`, `timeline`, `branching`, `game-template`

### Progress Bar System (Phase-Driven — NOT timer-based)

| Phase | Progress Behavior |
|-------|-----------------|
| File Upload / Analysis | 0% → 50% (text extracted) → 90% (AI done) → 100% |
| Outline Generation | 5% start, +4%/600ms timer (caps at 85%) → clears on return → 100% flash |
| Course Hydration | 10% start → `onProgress(pct)` fires after each chunk → 100% on complete |

### Error Handling
- Each module is generated with retry logic
- If a module fails JSON parse: log error + return empty slides (do not show placeholder)
- `sanitizeContent()` function strips malformed markdown artifacts before rendering

---

## 7. COURSE PREVIEW MODE (PLAYER)

### Layout Structure
```
<motion.div>                          ← full-screen overlay (z-50)
  <TopToolbar />                      ← back, desktop/mobile toggle, theme, export SCORM
  <div className="flex-1 flex">
    <LeftSidebar />                   ← course outline (TOC), clamp(180px, 15vw, 260px)
    <SlideCanvas />                   ← main content area with background image + overlay
      <SlideTypeBadge />
      <SlideContentArea>
        <AnimatePresence>
          <Slide-specific renderer />
        </AnimatePresence>
      </SlideContentArea>
      <PlayerBar />                   ← seekbar + navigation + Slide Editor tabs
  </div>
</motion.div>
```

### Slide Canvas Styles
- Background image: `courseBg` state (random from `backgrounds.ts`)
- Overlay: `rgba(15,23,42,0.70)` for dark theme, `rgba(248,250,252,0.72)` for light
- Content box: `bg-slate-900/88 backdrop-blur-sm rounded-2xl min-h-[84vh]`
- Desktop: `max-w-6xl`, Mobile: `max-w-[375px] rounded-[2rem] border-[8px] border-gray-800`
- TOC sidebar: `clamp(220px, 22vw, 340px)` responsive width (scales with browser window)

### Top Toolbar Features
- ← back to home
- Monitor / Smartphone toggle (desktop / mobile preview)
- Light / Dark / Unified theme toggle
- Course title display
- Edit slide button (opens right drawer)
- Discard button (clears course, returns home)
- Export SCORM button (calls `createScormPackage()`)

---

## 8. SLIDE TYPE RENDERERS

### `title` Slide
- Decorative concentric rings (absolute positioned, pointer-events-none)
- `eLearning Course` chip with Sparkles icon
- Giant `h1` (text-4xl to text-6xl font-black)
- Optional subtitle via `ReactMarkdown`
- Decorative "Begin Course" divider

### `content` / `summary` / `key-takeaways` Slides
- `h2` title (text-2xl/text-3xl font-extrabold)
- Content rendered via `<SlideContent>` component (NOT bare ReactMarkdown)
- **SlideContent.tsx** provides:
  - `ul/li` → ◆ diamond bullet on colored card background (`bg-indigo-50` / `bg-slate-800/60`)
  - `h1/h2/h3` → themed font weights + colors
  - `p` → `leading-relaxed mb-3`
  - `blockquote` → callout box with colored left border
  - `code` → inline or block code with syntax styling
  - `table` → full responsive table

### `quiz` Slide
- Question text (bold, large)
- 4 answer options as button cards with radio indicators
- Submit Answer button (disabled until selection made)
- Post-submit: green correct / red incorrect feedback with explanation
- Supports: `options[].isCorrect`, `options[].text`, `quiz.feedback`

### `accordion` Slide
- Delegates to `<Accordion>` from `@zomako/elearning-components`

### `flashcards` Slide
- Delegates to `<FlashcardGrid>` component

### `matching` Slide
- Delegates to `<MatchingActivity>` from `@zomako/elearning-components`

### `sorting` Slide
- Delegates to `<SortingActivity>` from `@zomako/elearning-components`

### `drag-drop-activity` Slide
- Delegates to `<DragAndDropActivity>` from `@zomako/elearning-components`

### `timeline` Slide
- Delegates to `<InteractiveTimeline>` from `@zomako/elearning-components`

### `branching` Slide
- Delegates to `<BranchingScenario>` from `@zomako/elearning-components`

### `game-template` Slide
- Routes through `<GameContainer payload={slide.data} />`
- `slide.data.templateType` determines which game renderer loads

---

## 9. SLIDE EDITOR — EDIT DRAWER & PLAYER BAR

### PlayerBar Slide Editor Tab Row
The PlayerBar (`src/components/player/PlayerBar.tsx`) renders three rows:
1. **Slide progress track** — thin indigo bar at top, tracks slide position
2. **Audio seekbar row** — shown only when `player.hasAudio`
3. **Main controls row** — Play/Pause, slide counter, Prev/Next
4. **Slide Editor tab row** — rendered when `editorActions` prop is provided

#### Slide Editor Buttons (in order)
| Button | Color | Action |
|--------|-------|--------|
| ✏ Edit Text | Indigo | Opens right edit drawer (text tab) |
| 🎤 Audio | Emerald | Opens right edit drawer (audio/narration tab) |
| 🖼 Background | Violet | Calls `getRandomBackgroundForTheme()` |
| ↺ Reset Layout | Amber | Calls `handleResetSlide(currentSlide.id)` |
| ⬆ Upload | Rose | Opens `imageUploadRef` file picker |
| 📷 Source Image | Pink | Opens source image gallery modal (only if sourceImages.length > 0) |

### Right Edit Drawer
- Slides in from right edge, `max-w-md`, `z-[120]`
- Backdrop click saves + closes
- **Fields:**
  - Slide Title (text input)
  - On-Screen Text (textarea, 8 rows, markdown supported, char counter)
  - Audio Narration Script (textarea, 5 rows, word count + read-time estimate)
  - Slide Image (preview, trash button, Upload + PPT Image buttons)
- **Footer:** Cancel | Save Changes

### Source Image Gallery Modal
- Shows all images extracted from the uploaded PPTX/PDF
- Full-screen modal with 2-3 column grid of `aspect-video` image cards
- Click any image → `handleUpdateSlideMedia(slideId, { mediaUrl: img.dataUrl || img.url })`

---

## 10. VOICE-OVER SYNCED SEEKBAR PLAYER

### usePlayer Hook (`src/lib/usePlayer.ts`)
```typescript
interface Player {
  hasAudio: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  isSeeking: boolean;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  beginSeek: () => void;
  endSeek: (time: number) => void;
}
```

### Architecture
- Uses `HTMLAudioElement` directly (no third-party audio library)
- `audioRef` holds the element, replaced on slide change
- Cleans up `objectURL` on unmount/slide change to prevent memory leaks
- `isSeeking` flag prevents time-update events during scrub

### Seekbar Component (`src/components/player/Seekbar.tsx`)
- Pure HTML div-based draggable seekbar (no `<input type="range">`)
- Responds to `mousedown`, `mousemove`, `mouseup` and `touchstart`, `touchmove`, `touchend`
- Calls `onSeekStart()` on mousedown, `onSeek(normalizedTime)` on mouseup
- Shows elapsed time / total time
- Keyboard: Space = play/pause, ← = -5s, → = +5s

### formatTime utility
```typescript
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

---

## 11. GAME SHOW & GAME-BASED INTERACTION TEMPLATES

### 6 Templates Implemented

#### 1. Knowledge Board (Jeopardy)
- **Mechanic:** 4-column grid × 3-4 rows of escalating point values (100/200/300)
- **Data Schema:**
```json
{
  "templateType": "jeopardy",
  "categories": [
    { "name": "Category Name", "questions": [
      { "points": 100, "question": "...", "answer": "..." }
    ]}
  ]
}
```
- **Min Preset:** Quick
- **Multiplayer:** Yes

#### 2. Millionaire Challenge
- **Mechanic:** 15 linear questions with increasing difficulty, lifelines (50:50, Phone, Audience)
- **Data Schema:**
```json
{
  "templateType": "millionaire",
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "correct": 0, "moneyValue": "$100" }
  ],
  "safeHavens": [5, 10]
}
```
- **Min Preset:** Quick

#### 3. Ranked Survey (Family Feud)
- **Mechanic:** Open-ended prompts, rank top answers by popularity, 3-strike limit
- **Data Schema:**
```json
{
  "templateType": "family-feud",
  "rounds": [
    { "prompt": "...", "answers": [
      { "text": "...", "rank": 1, "points": 40 }
    ]}
  ]
}
```
- **Min Preset:** Standard

#### 4. Digital Escape Room
- **Mechanic:** Sequential puzzle stages, gate-locked, story-driven narrative
- **Data Schema:**
```json
{
  "templateType": "escape-room",
  "stages": [
    { "id": "stage1", "title": "...", "narrative": "...",
      "puzzle": { "type": "multiple-choice|code|sequence", "question": "...", "answer": "..." },
      "unlocks": "stage2" }
  ],
  "startStageId": "stage1"
}
```
- **Min Preset:** Comprehensive

#### 5. Spin the Wheel
- **Mechanic:** Animated wheel → random category → question from that pool
- **Data Schema:**
```json
{
  "templateType": "spin-wheel",
  "segments": [
    { "label": "Category", "color": "#6366f1",
      "questions": [{ "question": "...", "answer": "..." }] }
  ]
}
```
- **Min Preset:** Quick

#### 6. Price Estimator (Price Is Right)
- **Mechanic:** Estimate numeric value without going over; closest wins
- **Data Schema:**
```json
{
  "templateType": "price-is-right",
  "items": [
    { "label": "...", "description": "...", "actualValue": 450,
      "unit": "$", "hint": "..." }
  ]
}
```
- **Min Preset:** Standard

### GameContainer Routing Logic
`src/components/game-templates/core/GameContainer.tsx`:
```typescript
switch (payload.templateType) {
  case 'jeopardy':      return <JeopardyGame payload={payload} />;
  case 'millionaire':   return <MillionaireGame payload={payload} />;
  case 'family-feud':   return <FamilyFeudGame payload={payload} />;
  case 'escape-room':   return <EscapeRoomGame payload={payload} />;
  case 'spin-wheel':    return <SpinWheelGame payload={payload} />;
  case 'price-is-right':return <PriceIsRightGame payload={payload} />;
}
```

### getRecommendedGames() Logic
```typescript
// Returns ALL templates — NO preset filtering or locks — sorted by pathway emphasis
export function getRecommendedGames(pathway, preset): GameTemplateMeta[]
```
- All templates always visible regardless of Complexity Level selected
- Corporate pathway: Knowledge Board + Millionaire shown as "Best Fit" (★)
- K-12 pathway: Spin Wheel + Family Feud shown as "Best Fit" (★)
- Users select multiple templates (stored in `gameTemplateIds: string[]`)
- `gameTemplateIds[0]` drives the AI outline; future: all selected games can generate slides

---

## 12. FLOATING IMAGE SYSTEM (DRAG / RESIZE / CROP)

### Overview
- Slides support **unlimited** floating images (no cap per slide)
- Images stored in `slide.floatingImages: FloatingImage[]` — NOT the old single `mediaUrl`
- The Upload button accepts `multiple` files — each appended to `floatingImages`
- The Source Image Gallery adds source document images as floating elements
- **Landing page:** Clicking anywhere on the dark blue upload rectangle triggers the file picker

### FloatingImage Type
```typescript
interface FloatingImage {
  id: string;
  url: string;        // data URL or object URL
  x: number;         // pixels from left
  y: number;         // pixels from top
  width?: number;    // px (default 320)
  height?: number;   // px (default 240)
}
```

### FloatingImageCanvas Integration in Slide Render
```tsx
{/* Outer wrapper: pointer-events: none so slide text remains clickable */}
<div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
  {/* Inner wrapper: pointer-events: auto so drag/resize work */}
  <div style={{ position:'relative', width:'100%', height:'100%', pointerEvents:'auto' }}>
    <FloatingImageCanvas
      floatingImages={currentSlide.floatingImages || []}
      onUpdate={(id, updates) => { /* setProgress to update state */ }}
      onDelete={(id) => { /* filter out from floatingImages */ }}
    />
  </div>
</div>
```

### Image Crop Modal (inside FloatingImageCanvas.tsx)
- Canvas-based crop UI — no external crop library
- `cropRect: { x, y, w, h }` stored as normalized 0-1 values
- Draws: image → dark overlay outside crop → indigo crop border → 3×3 rule-of-thirds grid → corner handle squares
- Mouse events: `getHandle()` detects whether click is on corner (nw/ne/sw/se) or inside (move)
- `applyCrop()`: creates offscreen canvas, draws cropped region, returns `canvas.toDataURL('image/png')`
- On Apply: updates floating image `url` in state

---

## 13. PLAYER PROPERTIES MODAL

### File: `src/components/builder/PlayerPropertiesModal.tsx`

### PlayerConfig Interface
```typescript
interface PlayerConfig {
  playerStyle: 'modern' | 'classic';
  theme: 'dark' | 'light' | 'unified';
  tocPosition: 'sidebar-left' | 'sidebar-right' | 'dropdown-top' | 'dropdown-bottom' | 'hidden';
  tocStartsCollapsed: boolean;
  showTitle: boolean;
  courseTitle: string;
  showPlayPause: boolean;
  showVolume: boolean;
  showCaptions: boolean;
  showPlaybackSpeed: boolean;
  showProgressBar: boolean;
  showSlideCounter: boolean;
  showPrevNext: boolean;
  allowFullscreen: boolean;
  logoUrl: string | null;
}
```

### UI Layout
- **Left panel (w-72):** Settings — player style, theme, 5 TOC position options, 8 control toggles
- **Right panel (flex-1):** Simulated browser chrome + `<LivePlayerPreview>` that updates in real-time
- **Footer:** "Reset to defaults" | Cancel | Save Properties

### LivePlayerPreview
- A miniature version of the full course player
- TopBar: shows/hides title, renders ☰ for sidebar or Menu dropdown button for dropdown modes
- SidebarCol: renders 5 sample slide names with active state highlighting
- BottomBar: renders only the controls that are toggled ON
- All colors respond to the selected theme (dark/light/unified)

### Trigger
- Button: `⚙ Player Properties` in the Course Builder footer (between Cancel and Generate)
- State: `showPlayerProperties` / `setShowPlayerProperties`

---

## 14. SCORM EXPORT SERVICE

### File: `src/services/scormService.ts`

### createScormPackage(course: CourseOutline): Promise<Blob>
- Builds a SCORM 1.2 compliant ZIP using JSZip
- Structure:
```
course.zip
├── imsmanifest.xml     ← SCORM 1.2 manifest
├── index.html          ← course player shell
└── content/
    └── course.json     ← serialized CourseOutline
```
- The `index.html` inside SCORM uses a self-contained inline player that reads `course.json`
- `api.LMSInitialize()`, `LMSSetValue('cmi.core.lesson_status','passed')`, `LMSFinish()` are called

---

## 15. ISD & ELEARNING BEST PRACTICES APPLIED

### Content Architecture
- **Chunking:** Each module 5-8 slides, each slide one concept only
- **Objective Alignment:** Every quiz question maps back to a stated learning objective
- **Bloom's Taxonomy:** Quick = Remember/Recognize, Standard = Understand/Apply, Comprehensive = Analyze/Evaluate/Create
- **Cognitive Load:** Bullet points max 3-5 per slide, no walls of text

### Interaction Design
- Immediate corrective feedback on all quiz answers
- Flashcards support spaced repetition flow
- Branching scenarios present consequences of choices
- Game templates used as formative (not summative) assessment

### Voice-Over Design
- Narration EXPANDS on bullets — never reads them verbatim
- Voice-over text field shows word count + estimated read time
- Audio seeks independently of slide navigation

### Visual Design Spec
- Blue content box (slide canvas): `bg-slate-900/88 backdrop-blur-sm` on dark, min-h `82vh`
- Background image behind overlay shows through
- Table of contents sidebar: `clamp(180px, 15vw, 260px)` responsive width
- Slide type badge above content, small, muted color

---

## 16. KEY PROMPTS & SPECIFICATIONS (VERBATIM)

### Original Implementation Prompt — Voice-Over Player
> "Implement a fully functional learner player system that includes: audio playback controls (play/pause, seekbar, volume), voice-over synchronized with slide content, a draggable/clickable seekbar, and a responsive player bar UI. The system must be fully SCORM-compatible, accessible, and handle edge cases like rapid slide switching and non-audio slides."

### Original Implementation Prompt — Text Formatting Fix
> "In the preview mode, the text formatting and font is very poor. There are no bulletpoints and no stylistic designs. There's also too much white space. Please revise, globally."
- **Fix Applied:** Created `SlideContent.tsx` with rich ReactMarkdown custom components (diamond ◆ bullets on colored card backgrounds, callout blockquotes, themed header hierarchy).

### Original Implementation Prompt — Slide Editor Tab
> "The preview mode options for editing text, editing narration, uploading images, and resetting the slide all needs to be revised. Please see the attached image, at the very bottom you will see what the previous 'Slide Editor' UI tab looks like that you created before. It's hard to see but you will notice the options of edit text & audio, change background, reset layout, upload, and source image. Please add/bring back this 'Slide Editor' UI tab. Note that the 'Source Image' button allows the user to open up all the images from the uploaded source file to select an image from there."
- **Fix Applied:** Added Slide Editor tab row to the bottom of PlayerBar with 6 colored action buttons.

### Original Implementation Prompt — Image Manipulation
> "The uploaded images still need to be movable, resizable, and croppable."
- **Fix Applied:** FloatingImageCanvas already had interact.js drag+resize. Added Canvas-based CropModal.

### Original Implementation Prompt — Player Properties
> "Can we include a button for player properties? It can be on the Course Builder details page. It essentially gives the user a chance to view what the live eLearning player would look like, without tasking the AI App to generate any content yet. It also allows some player customization, such as whether they want the table of contents to always be available on the left side, or to appear as a drop down at the top or bottom."
- **Fix Applied:** Created `PlayerPropertiesModal.tsx` with left settings panel + right live preview.

### Course Generation Error Handling Prompt
> "No, a 'content could not be generated' placeholder slide is unacceptable. A reduction of content is unacceptable. You must ensure the generation error is fixed without jeopardizing the content."
- **Fix Applied:** All generation errors are caught per-module, logged, and modules are retried. Never replaced with placeholder slides.

---

## 17. KNOWN ISSUES & FIXES LOG

| Date | Issue | Root Cause | Fix Applied |
|------|-------|-----------|-------------|
| 2026-04-03 | ~3000 lines lost from App.tsx | Destructive code edit wiped preview mode | Full re-implementation of preview, game templates, edit drawer |
| 2026-04-04 | Blank page on app load | `PlayerPropertiesModal.tsx` imported invalid lucide icons not in installed version | Replaced with verified icons from App.tsx imports |
| 2026-04-04 | `extractImagesFromFile` never called | `handleFileUpload` only called `extractTextFromFile` | Added image extraction call + `setSourceImages()` |
| 2026-04-04 | Source image gallery thumbnails blank | Gallery rendered `img.url` but type uses `dataUrl` field | Fixed to `img.dataUrl \|\| img.url` |
| 2026-04-04 | App.tsx content slide renderer missing closing `)}` | PowerShell replace skipped closing brace | Verified + inserted via view_file + targeted replace |
| 2026-04-05 | Progress bar stalls at 98% | Random timer (`+0.5–2.5%/300ms`) disconnected from actual AI work | Phase-driven progress: file analysis=50%/90%, outline=+4%/600ms timer, hydration=`onProgress` callback per chunk |
| 2026-04-05 | Hotspot/Multiple Choice/Branching/Drop Targets show "Generic Layout" | Preview modal missing cases for those interaction types | Added full visual inline JSX demos for all 10 interaction types and all 6 game templates |
| 2026-04-05 | Gamification templates locked behind preset | `getRecommendedGames()` filtered by `minPreset` | Removed all filtering — all templates always shown; lock badge and description removed |
| 2026-04-05 | Only 1 game template could be selected | State used `gameTemplateId: string\|null` (single) | Changed to `gameTemplateIds: string[]` multi-select array; First selected item drives AI outline |
| Various | Module AI generation fails JSON parse | Claude outputs markdown fences or extra text | `sanitizeContent()` strips fences; per-module error catch prevents cascade failures |

---

## RECONSTRUCTION CHECKLIST

If code is lost, rebuild in this order:

- [ ] 1. Clone/init new Vite + React + TypeScript project
- [ ] 2. Install dependencies (see package.json — key: anthropic, framer-motion, interact.js, pdfjs-dist, jszip, mammoth, react-markdown, lucide-react, @zomako/elearning-components)
- [ ] 3. Create `src/types/course.ts` and `src/types/game.ts`
- [ ] 4. Create `src/lib/utils.ts`, `backgrounds.ts`, `backgroundData.json`
- [ ] 5. Create `src/lib/presetEngine.ts` (3 presets × 2 pathways — see Section 5)
- [ ] 6. Create `src/lib/gameEngine.ts` (6 templates + `getRecommendedGames` — see Section 11)
- [ ] 7. Create `src/lib/fileProcessor.ts` (text + image extraction)
- [ ] 8. Create `src/lib/usePlayer.ts` (HTMLAudioElement-based hook — see Section 10)
- [ ] 9. Create `src/services/aiService.ts` (3 phases: analyze, outline, hydrate)
- [ ] 10. Create `src/services/aiGameService.ts` (6 per-template AI prompts)
- [ ] 11. Create `src/services/scormService.ts` (SCORM 1.2 ZIP generator)
- [ ] 12. Create `src/components/player/SlideContent.tsx` (rich markdown — see Section 8)
- [ ] 13. Create `src/components/player/Seekbar.tsx` (canvas-free drag seekbar)
- [ ] 14. Create `src/components/player/PlayerBar.tsx` (3 rows: progress + controls + editor tabs)
- [ ] 15. Create `src/components/FloatingImageCanvas.tsx` (drag + resize + crop modal)
- [ ] 16. Create 6 game template components in `src/components/game-templates/templates/`
- [ ] 17. Create `src/components/game-templates/core/GameContainer.tsx` (router)
- [ ] 18. Create `src/components/builder/OutlinePreview.tsx`
- [ ] 19. Create `src/components/builder/PlayerPropertiesModal.tsx` (see Section 13)
- [ ] 20. Create `src/components/FlashcardGrid.tsx`
- [ ] 21. Assemble `src/App.tsx` with all state, step machine, and renderers (see Sections 3-9)
