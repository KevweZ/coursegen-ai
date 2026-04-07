__CourseGen AI — Full System v2__

*Comprehensive recovery and source\-of\-truth specification for Antigravity*

__Purpose\. __This document is the source of truth for rebuilding the Course Builder, file\-ingestion pipeline, course generation engine, interaction engine, learner player, review workflow, preview/export parity, and validation rules\. Screenshots are visual references only\. System behavior must come from this spec\.

# 1\. Product scope and guiding principles

- The platform generates SCORM\-compliant eLearning courses primarily from uploaded source files such as PowerPoint decks and PDFs\.
- The system must transform uploaded source material into structured eLearning, not visually copy raw slides into the course\.
- Corporate Training and Education \(K–12\) are two distinct authoring modes with different terminology, defaults, and pedagogy logic\.
- Preview mode and exported SCORM output must be the same course build, not two different renderers or content paths\.
- Every generated slide must be instructionally coherent, visually balanced, interaction\-complete, and validation\-safe\.

# 2\. End\-to\-end system architecture

## 2\.1 Layer model

- Input engine: file upload, parsing, extraction, classification, image/media capture, objective detection, structure inference\.
- Course generation engine: chunking, slide mapping, interaction injection, narration script generation, visual composition\.
- Review and editing engine: slide\-by\-slide editing, image replacement, text/audio editing, background controls, layout reset\.
- Player and export engine: preview rendering, learner controls, narration playback, SCORM packaging, static asset publishing\.
- Validation and QA engine: pre\-render validation, fallback regeneration, export validation, parity checks\.

## 2\.2 Single source of truth

Preview mode and SCORM export must derive from the same finalized course data model\. The export pipeline must package the exact preview build and its resolved assets\.

- No separate simplified export renderer\.
- No preview\-only blob URLs that fail during packaging\.
- No placeholder or dummy package downloads\.

# 3\. Input processing and file\-ingestion pipeline

## 3\.1 Supported inputs

- Primary user path: From File\.
- Accepted source formats: PPTX, PDF, and future\-ready support for DOCX and URL ingestion\. Hidden UI options may remain in code, but the visible landing page should show only the file\-upload path for now\.

## 3\.2 File ingestion behavior

- When a file is uploaded, the system must extract all text, slide/page order, headings, bullets, diagrams, charts, and individual images\.
- The system must preserve slide\-level relationships between text blocks and nearby visuals\.
- The system must never default to pasting full\-slide screenshots into the course unless a last\-resort fallback is explicitly invoked\.
- The course builder details page for uploaded files must prepopulate title, summary, and objectives from the scanned file\.

## 3\.3 Extraction rules

- Extract titles, headings, bullets, definitions, procedures, comparisons, and glossary\-like phrases separately\.
- Extract images individually where possible; preserve diagrams, process visuals, technical illustrations, and topic\-relevant photography\.
- Ignore or deprioritize tiny logos, decorative marks, and low\-value clutter\.
- If explicit objectives exist in the source file, use them as the starting objective set\.
- If objectives do not exist, infer them from the content structure and convert them into the selected authoring format\.

# 4\. Course builder details page

## 4\.1 Shared top\-level flow

- User uploads file or arrives through the topic flow\. For this rebuild, the visible landing page should simplify to file upload only\.
- After upload, the system scans the file and opens the Course Builder Details page in uploaded\-file mode\.
- The user reviews and adjusts AI\-derived title, summary, objectives, presets, interactions, and advanced settings before generation\.

## 4\.2 Corporate Training mode

- Course presets: Quick Overview, Standard Training, Comprehensive Course\.
- Learning objectives: AB, ABC, or ABCD formats\.
- Interactive content options: Multiple Choice, Drag & Drop, Hotspot, Accordion, Flashcards, Timeline, Sorting, Matching, Drop Targets, Branching\.
- Advanced settings: Module Titles, Objective Slides, Knowledge Checks, Summary Slides\.
- Gamified Interactions \(renamed from Comprehensive Knowledge Check\): No Final Game, Knowledge Board, Millionaire Challenge, Ranked Survey, Digital Escape Room, Price Estimator, Spin the Wheel\.

## 4\.3 Education \(K–12\) mode

- Audience toggle: Corporate Training vs Education \(K–12\)\.
- Education mode must expose grade band, unit title, lesson focus, standards alignment, and pedagogical settings\.
- Learning objectives should support student\-facing 'I Can' statements and optional teacher\-facing objectives\.
- Curriculum Scope & Sequence section should include grade level, unit title, and current lesson focus\.
- Pedagogical & UDL settings should include Module Titles, Objective Slides, Knowledge Checks, Exit Tickets, Summary Slides, and future\-ready accessibility/multimodal controls\.

## 4\.4 Uploaded\-file mode differences

- Display an Uploaded Source Review panel with file name, file type, page/slide count, extraction status, and detected topic summary\.
- Prepopulate Course Title and Source Summary from scanned content\.
- Prepopulate objectives from the file when possible and keep an Optimize Objectives action\.
- Expose Conversion Preferences such as preserve source sequence, reorganize for better instructional flow, reduce text density, maintain technical terminology, and emphasize key takeaways\.

# 5\. Preset engine and auto\-configuration logic

## 5\.1 Naming

Use Course Preset as the section title\. This replaces earlier wording like Thoroughness\.

  


## 5\.2 Corporate preset logic

Preset

Objective format

Default interactions

Slide count

Assessment strategy

Quick Overview

AB, 1–2 objectives

Multiple Choice, Accordion, Flashcards

5–8

1–2 simple checks at the end

Standard Training

ABC, 3–4 objectives

Drag & Drop, Sorting, Hotspots, Multiple Choice

15–20

Module checks plus short summary quiz

Comprehensive Course

ABCD, 5\+ objectives

Branching, Timeline, Matching, Drag & Drop

30–40

Pre\-assessment, module checks, mastery quiz

  


## 5\.3 Education preset logic

Preset

Learning targets

Default interactions

Pedagogical toggles

Slide count

Quick Overview

1 I Can statement

Flashcards, Matching

Objective Slides, Exit Tickets

4–6

Standard Lesson

2–3 I Can statements

Drag & Drop, Hotspots, Multiple Choice

Module Titles, Objective Slides, Knowledge Checks, Exit Tickets, Summary Slides

12–18

Unit Module / Deep Dive

Multiple I Can statements

Branching, Sorting, Drop Targets, Timeline

All pedagogical toggles on

25–35

Selecting a preset must visibly update the UI and generation settings immediately\. Users may override any default afterward\.

# 6\. Slide type system

- Standard slides: Title Slide, Section Divider, Content Slide, Objectives Slide, Key Takeaways, Summary Slide\.
- Interaction slides: Multiple Choice, Drag & Drop, Sorting, Matching, Drop Targets, Flashcards, Accordion, Hotspot, Timeline, Branching Scenario\.
- Gamified interaction modules: Knowledge Board \(Jeopardy\), Millionaire Challenge, Digital Escape Room, Ranked Survey, Spin the Wheel, Price Estimator, or No Final Game\.
- Games are not ordinary content slides\. They are end\-of\-module or end\-of\-course review experiences\.

# 7\. Strict design and content engine

- Never generate large paragraph walls when chunking is possible\.
- Always use headings, subheadings, bullet groups, cards, comparison blocks, process steps, or concise grouped sections\.
- If a slide becomes too dense, split it into multiple slides automatically with a naming convention like '\(1 of 2\)'\.
- Key Takeaways slides may become Key Takeaways 1, Key Takeaways 2, etc\., if the content exceeds a single clean layout\.
- No blank media placeholders when no image exists\. Collapse or rebalance the layout instead\.
- No awkward left\-only text columns that leave large dead space unless intentionally designed\.
- No raw markdown shown to users in editors or on slides\.

## 7\.1 Content chunking examples

- Definition material → short explanation plus 3–5 bullets\.
- Comparison material → side\-by\-side comparison cards or accordion groups\.
- Process material → steps, timeline, or labeled sequence\.
- Terminology → flashcards or glossary cards\.

# 8\. Interaction engine rules

## 8\.1 Universal rules

- Every interaction must have complete data before render\.
- Every interaction must include instructions, interaction elements, submission behavior, and feedback behavior\.
- If interaction generation fails, the system must regenerate or gracefully fall back to another valid interaction or a structured content slide\.

## 8\.2 Multiple choice and knowledge checks

- Question must be tied to real slide/module content, not generic filler\.
- Answer choices must be visible, formatted correctly, and not auto\-graded on click\.
- A Submit button is required\. Evaluation occurs only after submission\.
- Knowledge checks may reveal correct answers immediately after incorrect submission\. Final quiz/final exam items must not reveal answers immediately\.

## 8\.3 Drag & Drop / Matching / Sorting / Drop Targets

- All draggable items must be droppable into any bucket or target unless a very specific constraint is intentional and communicated\.
- Do not restrict placement based on correctness prior to submission\.
- Use Submit as the primary grading trigger\. Avoid visible Check Answer and Reset buttons unless there is a compelling reason\.
- After incorrect knowledge\-check submissions, show explicit item\-to\-target mapping using a clear format like 'Item → Correct Bucket'\.
- Feedback for drag\-and\-drop must make sense and clearly show the proper placements\.

## 8\.4 Accordion

- Do not use a single accordion panel to reveal a large messy paragraph\.
- Chunk content into multiple bars such as How It Works, Characteristics, Subtypes, Applications, Key Takeaways\.
- Inside each expanded panel use bullets, sublabels, and concise grouped content\.

## 8\.5 Hotspots

- A hotspot slide must have a visible base image plus 2–5 hotspots with labels and reveal content\.
- If hotspot data fails or no valid image exists, do not render a blank slide\. Regenerate or fall back to an alternate interaction type\.

## 8\.6 Flashcards, timeline, branching

- Flashcards: concise front prompt, concise back explanation\.
- Timeline: chronological order with compact entries\.
- Branching: decision points and outcomes must be complete and coherent\.

# 9\. Gamified interactions engine

- Section label in the builder should be Gamified Interactions or Final Review Game\.
- Only one game should be attached to a module or course\-ending review location unless intentionally designed otherwise\.
- Knowledge Board: categories plus escalating values/questions\.
- Millionaire Challenge: progressive difficulty ladder with optional lifelines\.
- Digital Escape Room: staged progression with puzzle unlock logic\.
- Ranked Survey: best for opinion or reflection style prompts, not a scored quiz clone\.
- Spin the Wheel: randomized category/question selector\.
- Price Estimator: estimation game with tolerance or nearest\-correct logic\.

A blank game screen is a hard fail condition\. If game data is incomplete, regenerate before presenting the game\.

# 10\. Audio and narration engine

- Each slide must have its own narration script and its own audio file\.
- Narration must match the exact on\-screen meaning of that slide\. No cross\-slide reuse\.
- The learner player seekbar must control actual audio position when dragged or clicked\.
- On slide change: stop previous audio, unload it, load the correct current slide audio, reset timing, and update the player state\.
- The UI must never show 'No narration' while narration is playing\.
- If audio generation fails, log it and fall back gracefully rather than leaving inconsistent player states\.

# 11\. Learner player and scroll behavior

- Player controls must be anchored to the true bottom of the player container and must never overlap readable content\.
- Scrollable content must have sufficient bottom padding so the final lines are never hidden behind player controls\.
- For long slides, the browser/page or the player shell must allow users to access the full content without needing to zoom out the browser\.
- Prev/Next and progress information must remain visible and usable\.
- Preview and exported SCORM must use the same learner shell\.

# 12\. Editing and review workflow

## 12\.1 Slide editor

- Provide a direct slide editing workflow for text, audio, background, and media\.
- Preferred UX: inline editing of on\-screen text directly on the slide\. Acceptable fallback: a rich text editor modal with visible dark text and WYSIWYG formatting controls\.
- Rename 'Content Markdown' to 'On\-Screen Text'\. Do not expose raw markdown like \*\*bold\*\* to users\.
- Allow font size, font color, bold, italic, and other light formatting controls in editing mode\.
- Edit Text & Audio must display title and on\-screen text in visible dark font in the modal if a modal is used\.

## 12\.2 Background and image controls

- Change Background must allow user\-uploaded background images\.
- Reset Layout must restore the slide to the original generated version and clear all user modifications to that slide\.
- Uploaded/selected images must support move, resize, and crop controls\.
- If automatic PPT image extraction remains unreliable, the app must support a pre\-publish review stage where users can manually place or replace images on each content slide\.

# 13\. Preview and export parity

- The downloaded SCORM package must be the same course as preview, not a simplified rebuild\.
- Package all referenced images, audio assets, styles, JS bundles, interaction configs, and player assets\.
- Validate launch file, asset paths, manifest, and static file resolution before allowing export\.
- If export validation fails, block the export instead of downloading a broken package\.

# 14\. Visual design rules

- Background templates should only be used when topic relevance is strong\. If no strong match exists, use a neutral or blank professional background\.
- The app must use the learned reference eLearning design language: title hierarchy, content blocks, spacing, visual rhythm, and well\-composed layouts\.
- Interaction components such as accordion and flashcards must adapt their colors to work with the current background/theme instead of always defaulting to white\.
- Keyword\-and\-definition formatting should use a clean colon without an unnecessary divider bar\.

# 15\. Content cleanup and formatting hygiene

- Clean orphan commas, broken punctuation\-only lines, malformed lists, empty bold labels, and stray markdown artifacts before render\.
- Instructional objective formatting should use consistent indentation\. The text following verbs like Identify, Describe, or Understand must align cleanly after the verb, not hang awkwardly beneath it\.
- Do not combine a colon and vertical divider when a simple colon format is sufficient\.
- For long content, rebalance line length and container widths to avoid awkward dead space or narrow text columns\.

# 16\. Validation, regeneration, and fallback engine

- Before any slide renders, validate content completeness, formatting integrity, interaction validity, audio binding, visual balance, and media readiness\.
- If validation fails, regenerate the slide or fall back to a safe, structured slide type\.
- Never present blank, broken, or placeholder slides to the learner\.

## 16\.1 Hard fail conditions

- Blank slide or blank interaction area\.
- Missing answer data for a knowledge check\.
- Broken or truncated audio\.
- Wrong audio mapped to a slide\.
- Blank hotspot screen\.
- Malformed content with obvious punctuation/layout corruption\.
- Game launch with no playable game state\.

# 17\. Landing page simplification

- Visible landing page should show only the From File path for now\.
- Text should guide the user with language such as 'Upload File to Begin'\.
- Do not delete the underlying From Topic or From URL logic from the codebase\. Keep it hidden and recoverable for future use\.

# 18\. Rebuild checklist for Antigravity

- Rebuild file upload → parse → transform → generate pipeline\.
- Restore course builder details page for Corporate Training\.
- Restore course builder details page for Education \(K–12\)\.
- Restore uploaded\-file mode prepopulation behavior\.
- Restore preset auto\-configuration logic\.
- Restore interaction engine rules and validation\.
- Restore gamified interactions engine\.
- Restore player/audio synchronization rules\.
- Restore preview/export parity and SCORM packaging validation\.
- Restore slide editor, reset, background upload, and media controls\.

# 19\. Instruction to Antigravity

__Use this document as the authoritative implementation spec\. __Do not infer behavior from screenshots alone\. Rebuild logic from this specification, verify it in code, and validate each subsystem before considering the rebuild complete\.

