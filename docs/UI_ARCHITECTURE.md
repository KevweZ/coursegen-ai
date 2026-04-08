# UI Architecture & Objective Mapping Guide

This document captures the visual logic, location, and behavior of the **CourseGen AI** layout parameters. Special consideration is placed on the differential between handling Corporate Training logic vs. K-12 "I Can" methodologies.

## Core Interface Map

### 1. The Global Project Canvas
When you first load the platform, you initiate interacting with the platform's core dashboard logic. You define the trajectory, the complexity, and crucially, the *Audience Pathway*.

![Landing Experience](/docs/images/landing_page.png)

* **Key Interactions**:
  - The Course Configuration panel sets the `pathway` variable.
  - Toggling between Corporate vs. K-12 completely modifies the downstream UI interaction models to use either the "Nested Terminal/Enabling structure" or the flat "I Can" string standard.

### 2. Corporate Training - Terminal Framework Model
When you drop into the **Course Details** view for a professional or enterprise course (like the `Advanced Cybersecurity` default), you interact with the primary nested architecture.

![Corporate Objectives View](/docs/images/course_details_corporate_default.png)

* **Logic Under the Hood**:
  - The AI prompt utilizes stringent parameters: `{"terminalObjective": [goal], "enablingObjectives": [stepping stones]}`.
  - The UI dynamically scopes 1 Terminal Goal per internal Array Object.
  - The **Add Terminal Framework** button is intentionally visible natively to inject raw object frameworks, alongside the standard **Add Custom String** field for legacy inputs.

### 3. Corporate Training - Objective Format Hot-Swapping (AB, ABC, ABCD)

To enforce proper pedagogical/andragogical consistency, the AI adheres strictly to precise grammatical definitions of the Terminal and Enabling rules. By clicking the associated quick-buttons above the Objectives section, you will instantly rewrite the overarching goals.

![Formats Applied (ABCD Example)](/docs/images/course_details_corporate_abcd.png)

* **The Formatting Variables**:
  - `AB`: "The learner will [behavior] [outcome]."
  - `ABC`: "Given [condition], the learner will [behavior]."
  - `ABCD`: "Given [condition], the learner will [behavior] to [degree]."
* **AI Instructions**: The updated backend engine ensures the formatting rules are equally distributed across the *Terminal overarching objective* and the *subcomponent Enabling Objectives*, treating them harmoniously.

### 4. K-12 Pedagogy - The 'I Can' Standard
Instead of deeply nested architectural outlines, the K-12 Educational branch simplifies the structural UI significantly to accommodate the foundational `SWBAT` (Students Will Be Able To) system and subsequent `I Can` statements.

![K-12 Primary Ecosystems View](/docs/images/course_details_k12_view.png)

* **Logic Constraints**:
  - The **Add Terminal Framework** tool is actively hidden from educators to preserve pure string constraints.
  - Mock demos and live AI-generated goals map distinctly towards simple, unified strings (`"Goal | I can..."`).

---
*Generated via automated documentation crawling system.*
