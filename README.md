<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CourseGEN AI — eLearning Authoring Platform

> A full-stack AI-powered eLearning authoring platform that generates interactive, SCORM-compliant courses from a simple prompt. Built with React + Vite, powered by Anthropic Claude.

---

## Table of Contents
- [Quick Start](#quick-start)
- [Features Overview](#features-overview)
- [Preview Mode (Sandbox)](#preview-mode-sandbox)
  - [Top Bar Layout](#top-bar-layout)
  - [Course Navigation Sidebar](#course-navigation-sidebar)
  - [Slide Editor Drawer](#slide-editor-drawer)
- [Gamification Engine](#gamification-engine)
- [Admin Tools](#admin-tools)
- [Architecture](#architecture)

---

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Set your API key in .env.local
VITE_ANTHROPIC_API_KEY=your_key_here

# 3. Run dev server
npm run dev
```

---

## Features Overview

| Feature | Description |
|---|---|
| 🤖 **AI Course Generation** | Full course outline + content hydration via Claude |
| 🎮 **Gamification Engine** | 5 game templates: Jeopardy, Spin Wheel, Family Feud, Escape Room, Price is Right |
| 🎨 **3 Themes** | Dark · Light · Unified (purple) — live preview toggle |
| 📱 **Responsive** | Desktop and Mobile preview modes |
| 🖼️ **Image Editor** | Upload, drag/resize/crop floating images on any slide |
| 🎤 **Narration Editor** | Per-slide voice-over script with read-time estimate |
| 📦 **SCORM Export** | One-click SCORM 1.2 zip download |
| 🔧 **Admin Sandbox** | Preview Mode for testing the player without generating content |

---

## Preview Mode (Sandbox)

Access via **Admin → Preview Mode** in the header. This loads a pre-built dummy course covering all 12 slide types and lets you test and refine the player UI without uploading files or generating new content.

### Top Bar Layout

The preview top bar is organized into **three functional groups** separated by dividers:

```
← [Course Title]   │  🖥 Desktop  🌑 Dark  │  ✏ Edit Text & Audio  🖼 Change Bg  ↺ Reset  ⬆ Upload Image  📚 Source Image  ⚙ Player Props  │  [Export SCORM]  [Discard]
```

| Group | Buttons | Purpose |
|---|---|---|
| **View Controls** | Desktop/Mobile • Theme (Dark/Light/Unified) | Switch viewport and color theme |
| **Editor Tools** | Edit Text & Audio • Change Bg • Reset • Upload Image • Source Image • Player Props | Author and customize slide content |
| **Actions** | Export SCORM • Discard | Output or exit course |

![Preview Mode Top Bar](public/SME%20Documents/Referenced%20Screenshots/preview_mode_topbar.png)

#### Editor Tool Reference

| Button | Color | What It Does |
|---|---|---|
| **Edit Text & Audio** | Indigo | Opens the right slide-in drawer with the full rich-text editor (Tiptap) and narration script editor |
| **Change Bg** | Pink | Upload a custom background image for the full preview area |
| **Reset** | Amber | Reverts the entire course to its original generated state — clears all edits, uploaded images, and background |
| **Upload Image** | Green | Upload one or more images to appear on the current slide as **floating images** — fully draggable, resizable, and croppable |
| **Source Image** | Teal | Opens the Source Document image gallery (images extracted from the user's uploaded file) |
| **Player Props** | Orange | Opens the Player Properties modal to configure playback settings |

> **Note:** Labels hide below `lg` breakpoint — only icons show on small screens.

---

### Course Navigation Sidebar

A collapsible panel on the **left side** of the player shows the full course structure.

![Course Navigation Sidebar](public/SME%20Documents/Referenced%20Screenshots/preview_mode_sidebar.png)

**Features:**
- 📂 **Modules** — collapsible headings, click to expand/collapse
- 📄 **Slides** — each slide shown with its type emoji and title; click to jump directly to it
- 🔵 **Active slide** highlighted with an indigo left border
- ◀ **Collapse button** — collapses to a narrow icon-only strip to maximize player width
- Fully **theme-aware** (Dark / Light / Unified colors)

#### Slide Type Emoji Legend

| Emoji | Type | Emoji | Type |
|---|---|---|---|
| 🎯 | Title | ❓ | Quiz |
| 📄 | Content | 📂 | Accordion |
| 🃏 | Flashcards | 📅 | Timeline |
| ↕️ | Sorting | 🔗 | Matching |
| 📍 | Hotspot | 🌿 | Branching Scenario |
| 🎮 | Game Template | 📋 | Summary |

---

### Slide Editor Drawer

Click **Edit Text & Audio** to open the right slide-in drawer.

**Text Tab:**
- Full **Tiptap WYSIWYG** rich text editor
- Formatting toolbar: **Bold · Italic · Underline · Heading · Bullet List · Numbered List · Horizontal Rule**
- 8 color swatches: White · Light · Indigo · Emerald · Amber · Rose · Dark · Black
- Editable **slide title** (plain input at top)

**Audio / Narration Tab:**
- Narration script textarea with word count + read-time estimate (@ 130 wpm)
- ISD best practice reminder: *"Narration should expand on what's on screen — never read line-by-line."*
- Shows current audio URL if one is attached

---

## Gamification Engine

Five game templates, selectable during course generation:

| Template | Format | Scoring |
|---|---|---|
| **Jeopardy** | Multiple-choice, 5 categories × 4 price points | Target score = 80% of max; stars indicate difficulty |
| **Spin the Wheel** | Topic spin → multiple-choice answer | Pass/fail per spin |
| **Family Feud** | Top answers hidden; reveal by selecting | Hints popup with decoy answers |
| **Escape Room** | Interactive evidence (emails/logs) → unlock code | Progressive clue discovery |
| **Price is Right** | Estimate values with sliding range | Closest estimate wins |

---

## Admin Tools

Access the **Admin** dropdown from the header (top-right):

| Option | Description |
|---|---|
| **Course Details** | Jump to the course setup form |
| **Course Outline** | Jump to the outline review step |
| **Course Preview** | Jump to the player (only if a course is loaded) |
| **Preview Mode** | Load the sandbox dummy course instantly |
| **Player Properties** | Open the Player Properties config modal |

> The Admin dropdown renders at `z-[600]`, always above the preview overlay.

---

## Architecture

```
src/
├── App.tsx                          # Main app shell, all routing + preview player
├── components/
│   ├── player/
│   │   ├── PlayerBar.tsx            # Audio seek bar + prev/next navigation
│   │   ├── CourseNavSidebar.tsx     # Collapsible course outline sidebar ← NEW
│   │   ├── RichTextEditor.tsx       # Tiptap WYSIWYG editor ← NEW
│   │   └── SlideEditorBar.tsx       # Bottom editor toolbar (legacy, inactive) 
│   ├── FloatingImageCanvas.tsx      # Drag/resize/crop image overlay
│   ├── builder/
│   │   ├── OutlinePreview.tsx       # Course outline review UI
│   │   └── PlayerPropertiesModal.tsx
│   ├── interactions/                # Accordion, Timeline, Matching, etc.
│   └── game-templates/
│       ├── core/GameContainer.tsx   # Unified game router
│       └── templates/               # Jeopardy, SpinWheel, FamilyFeud, EscapeRoom, PriceIsRight
├── lib/
│   ├── dummyCourse.ts               # Sandbox course (all 12 slide types)
│   ├── usePlayer.ts                 # Audio playback state machine
│   └── gameEngine.ts               # Game template recommendation logic
├── services/
│   ├── aiService.ts                 # Claude API — outline + content generation
│   └── aiGameService.ts             # Claude API — game content generation
└── types/
    └── course.ts                    # CourseOutline, Slide, SlideType, FloatingImage
```

---

## Recent Changes (April 2026)

### Preview Mode Overhaul
- ✅ Editor toolbar moved to **top bar** (Edit Text & Audio, Change Bg, Reset, Upload Image, Source Image, Player Props)
- ✅ Removed redundant in-player slide buttons (Edit/Reset/Upload)
- ✅ Added collapsible **Course Navigation Sidebar** with module/slide tree
- ✅ Replaced textarea with **Tiptap WYSIWYG** rich text editor (bold, italic, underline, heading, lists, 8 colors)
- ✅ **Reset Layout** restores original course snapshot (in-memory, non-destructive)
- ✅ **Upload Image** adds `FloatingImageCanvas` images per slide (drag/resize/crop)
- ✅ Admin dropdown `z-index` fixed to always render above preview overlay

### Gamification
- ✅ Jeopardy: Multiple-choice format, target score (80%), star difficulty ratings
- ✅ Family Feud: Hints button with randomized decoy answers
- ✅ Spin the Wheel: Fixed answer feedback bug
- ✅ Escape Room: Interactive clickable evidence (email/log)

### Audience
- ✅ "Corporate Training" renamed to **Adult Learning** across the app
