/**
 * QC Service — AI-powered content scan layer.
 * Sends slide text to the AI in batches and returns spelling/grammar/clarity issues.
 * Works alongside structuralValidator.ts which handles non-AI structural checks.
 */

import { QCIssue, QCReport, IssueSeverity, IssueType, FixAction, validateCourse, applyFixes } from './structuralValidator';

const BATCH_SIZE = 5;
/** Always use same-origin /api/* (Cloudflare Worker → Render). Never localhost in production. */
const API_BASE = '';

// ── Types re-exported for consumers ─────────────────────────────────────────
export type { QCIssue, QCReport, IssueSeverity, IssueType, FixAction };
export { validateCourse, applyFixes };


// ── Slide text extractor ─────────────────────────────────────────────────────
function extractSlideText(slide: any): Record<string, string> {
  const fields: Record<string, string> = {};
  if (slide.title)       fields.title       = slide.title;
  if (slide.content)     fields.content     = slide.content;
  if (slide.voiceOverText) fields.voiceOverText = slide.voiceOverText;

  const data = slide.data ?? {};

  // Quiz
  if (data.questionText) fields['data.questionText'] = data.questionText;
  if (data.feedback)     fields['data.feedback']     = data.feedback;
  (data.options ?? []).forEach((opt: any, i: number) => {
    if (opt.text) fields[`data.options.${i}.text`] = opt.text;
  });

  // Accordion
  (data.items ?? []).forEach((item: any, i: number) => {
    if (item.title)   fields[`data.items.${i}.title`]   = item.title;
    if (item.content) fields[`data.items.${i}.content`] = item.content;
  });

  // Flashcards
  (data.cards ?? []).forEach((card: any, i: number) => {
    if (card.front) fields[`data.cards.${i}.front`] = card.front;
    if (card.back)  fields[`data.cards.${i}.back`]  = card.back;
  });

  // Timeline
  (data.events ?? []).forEach((ev: any, i: number) => {
    if (ev.title)   fields[`data.events.${i}.title`]   = ev.title;
    if (ev.content) fields[`data.events.${i}.content`] = ev.content;
  });

    (data.nodes ?? []).forEach((node: any, ni: number) => {
    if (node.title)   fields[`data.nodes.${ni}.title`]   = node.title;
    if (node.content) fields[`data.nodes.${ni}.content`] = node.content;
    (node.choices ?? []).forEach((ch: any, ci: number) => {
      if (ch.text) fields[`data.nodes.${ni}.choices.${ci}.text`] = ch.text;
    });
  });

  return fields;
}

// ── AI scan for a single batch ───────────────────────────────────────────────
interface RawAIIssue {
  slideId: string;
  field: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  originalText: string;
  suggestion: string;
}

async function scanBatch(slides: any[]): Promise<RawAIIssue[]> {
  const payload = slides.map(slide => ({
    id: slide.id,
    type: slide.type,
    fields: extractSlideText(slide),
  }));

  const res = await fetch(`${API_BASE}/api/qc/content-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: payload }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QC scan failed: ${err}`);
  }

  const json = await res.json();
  return Array.isArray(json.issues) ? json.issues : [];
}

// ── Merge AI issues into QCReport ────────────────────────────────────────────
function aiIssuesToQCIssues(
  rawIssues: RawAIIssue[],
  course: any
): QCIssue[] {
  const slideMap = new Map<string, { slide: any; modIdx: number; slideIdx: number; modTitle: string }>();
  (course.modules ?? []).forEach((mod: any, modIdx: number) => {
    (mod.slides ?? []).forEach((slide: any, slideIdx: number) => {
      slideMap.set(slide.id, { slide, modIdx, slideIdx, modTitle: mod.title ?? `Module ${modIdx + 1}` });
    });
  });

  let counter = 0;
  return rawIssues
    .filter(raw => slideMap.has(raw.slideId) && raw.originalText !== raw.suggestion)
    .map(raw => {
      const { slide, modIdx, slideIdx, modTitle } = slideMap.get(raw.slideId)!;
      return {
        id: `qc-ai-${Date.now()}-${counter++}`,
        slideId: raw.slideId,
        slideTitle: slide.title ?? '(untitled)',
        moduleTitle: modTitle,
        moduleIndex: modIdx,
        slideIndex: slideIdx,
        slideRef: `${modIdx + 1}.${slideIdx + 1}`,
        field: raw.field,
        type: raw.type,
        severity: raw.severity,
        message: raw.message,
        originalText: raw.originalText,
        suggestion: raw.suggestion,
        autoFixable: raw.severity === 'error' && raw.type === 'spelling',
      };
    });
}

// ── Score recalculate after merging both report layers ───────────────────────
function mergeReports(structural: QCReport, aiIssues: QCIssue[], totalSlides: number): QCReport {
  const allIssues = [...structural.issues, ...aiIssues];
  const penalties = allIssues.reduce((sum, iss) => {
    if (iss.severity === 'error')   return sum + 10;
    if (iss.severity === 'warning') return sum + 4;
    return sum + 1;
  }, 0);
  const score = Math.max(0, Math.round(100 - (penalties / Math.max(totalSlides, 1)) * 10));
  return {
    ...structural,
    issues: allIssues,
    totalIssues: allIssues.length,
    errors:   allIssues.filter(i => i.severity === 'error').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    info:     allIssues.filter(i => i.severity === 'info').length,
    score,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Full audit: structural + AI scan. For post-generation Auto QC. */
export async function runFullQC(
  course: any,
  narrationEnabled = false,
  onPhase?: (phase: 'structural' | 'ai' | 'done') => void
): Promise<QCReport> {
  onPhase?.('structural');
  const structural = validateCourse(course, narrationEnabled);

  onPhase?.('ai');
  const allSlides: any[] = (course.modules ?? []).flatMap((m: any) => m.slides ?? []);
  const totalSlides = allSlides.length;
  const rawAIIssues: RawAIIssue[] = [];

  // AI scan is best-effort — structural report is always returned even if AI fails
  let aiScanFailed = false;
  try {
    for (let i = 0; i < allSlides.length; i += BATCH_SIZE) {
      const batch = allSlides.slice(i, i + BATCH_SIZE);
      const batchIssues = await scanBatch(batch);
      rawAIIssues.push(...batchIssues);
    }
  } catch {
    aiScanFailed = true;
    console.warn('[QC] AI scan unavailable — returning structural results only.');
  }

  const aiIssues = aiIssuesToQCIssues(rawAIIssues, course).filter(i => {
    const t = String(i.slideTitle || '');
    if (/module\s+\d+\s*[—\-:]?\s*overview/i.test(t) || /^(learning\s+)?objectives?$/i.test(t.trim())) {
      return false;
    }
    return true;
  });
  onPhase?.('done');
  let report = mergeReports(structural, aiIssues, totalSlides);
  if (aiScanFailed) {
    const scanIssue: QCIssue = {
      id: 'qc-ai-scan-unavailable',
      slideId: '',
      slideTitle: 'Course QC',
      moduleTitle: 'Quality Check',
      moduleIndex: -1,
      slideIndex: -1,
      field: 'ai_scan',
      type: 'consistency',
      severity: 'warning',
      message: 'AI content scan unavailable — score reflects structural checks only (incomplete QC).',
      originalText: '',
      suggestion: 'Re-run QC when the API is reachable for a full review.',
      autoFixable: false,
    };
    const issues = [...report.issues, scanIssue];
    // Cap score so a failed AI scan never looks like a perfect 100
    const capped = Math.min(report.score, 85);
    report = {
      ...report,
      issues,
      totalIssues: issues.length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      score: capped,
    };
  }
  // Attach a flag so the UI can show a note when AI scan was skipped
  return { ...report, aiScanFailed } as QCReport;
}


/** Structural-only audit — instant, no network. For quick checks. */
export function runStructuralQC(course: any, narrationEnabled = false): QCReport {
  return validateCourse(course, narrationEnabled);
}

/** Auto-fix pass: applies all autoFixable issues and returns the cleaned course. */
export function autoFixCourse(course: any, report: QCReport): { course: any; fixedCount: number } {
  const autoFixable = report.issues.filter(i => i.autoFixable);
  if (autoFixable.length === 0) return { course, fixedCount: 0 };
  return { course: applyFixes(course, autoFixable), fixedCount: autoFixable.length };
}

/** Manual fix pass: applies only the user-confirmed issues. */
export function applyConfirmedFixes(course: any, confirmedIssueIds: string[], report: QCReport): any {
  const confirmed = report.issues.filter(i => confirmedIssueIds.includes(i.id));
  return applyFixes(course, confirmed);
}

// ── Single-Slide Regeneration ─────────────────────────────────────────────────

const SCHEMA_HINTS: Record<string, string> = {
  accordion:       '{ "items": [{ "id": "string", "title": "string", "content": "string" }] }',
  flashcards:      '{ "cards": [{ "id": "string", "front": "string", "back": "string" }] }',
  timeline:        '{ "events": [{ "id": "string", "year": "string", "title": "string", "content": "string" }] }',
  quiz:            '{ "questionText": "string", "options": [{ "id": "string", "text": "string", "isCorrect": boolean }], "feedback": "string" }',
  'multiple-answer':'{ "questionText": "string", "options": [{ "id": "string", "text": "string", "isCorrect": boolean }] }',
  jeopardy:        '{ "categories": [{ "id": "string", "title": "string", "questions": [{ "id": "string", "points": number, "question": "string", "answer": "string" }] }] }',
  matching:        '{ "items": [{ "id": "i1", "content": "left term" }], "targets": [{ "id": "t1", "content": "right definition" }], "correctAnswers": { "i1": "t1" } }',
  sorting:         '{ "items": [{ "id": "string", "content": "string" }], "correctOrder": ["id1", "id2"] }',
  'drop-targets':  '{ "items": [{ "id": "string", "content": "string", "category": "string" }], "categories": ["Cat A", "Cat B"] }',
  'multiple-choice':'{ "questionText": "string", "options": [{ "id": "string", "text": "string", "isCorrect": boolean }], "feedback": "string" }',
  'multiple-answers':'{ "questionText": "string", "options": [{ "id": "string", "text": "string", "isCorrect": boolean }], "feedback": "string" }',
  'true-false':    '{ "questionText": "string", "options": [{ "id": "a", "text": "True", "isCorrect": true }, { "id": "b", "text": "False", "isCorrect": false }], "feedback": "string" }',
  content:         '{ "bullets": ["key point 1", "key point 2", "key point 3"] }',
  diagram:         '{ "mermaidCode": "flowchart TD\\n  A[Start] --> B[Step]\\n  B --> C[End]", "caption": "optional short caption" }',
  'carousel-panel':'{ "cards": [{ "id": "string", "label": "string", "color": "#6366f1", "description": "string", "expandedContent": "string" }] }',
  'click-reveal':  '{ "items": [{ "id": "string", "term": "string", "definition": "string" }] }',
  'tabbed-horizontal': '{ "tabs": [{ "id": "string", "label": "string", "content": "- short bullet", "voiceOverText": "spoken elaboration" }] }',
  'tabbed-vertical':   '{ "tabs": [{ "id": "string", "label": "string", "content": "- short bullet", "voiceOverText": "spoken elaboration" }] }',
  hotspot:         '{ "hotspots": [{ "id": "string", "x": 30, "y": 40, "label": "string", "content": "string" }], "imageUrl": "" }',
};

/**
 * Regenerates a single slide's interaction data by sending a focused prompt to
 * the AI. Returns `{ type, data, content? }` to merge into the course.
 * Pass `targetType` to change the interaction kind (or `"content"` for plain bullets).
 */
export async function regenerateSlideData(
  slide: any,
  courseTopic: string,
  targetType?: string
): Promise<{ type: string; data: any; content?: string }> {
  const type = targetType || slide.type || 'content';
  const schema = SCHEMA_HINTS[type] ?? SCHEMA_HINTS.content;
  const prompt = `You are an expert eLearning content author.

Regenerate rich, educational content for this "${type}" slide.

Slide title: "${slide.title}"
Course topic: "${courseTopic}"
${slide.content ? `Existing slide text (for context): "${String(slide.content).slice(0, 300)}"` : ''}

Return ONLY a valid JSON object matching this exact schema for the "${type}" type:
${schema}

Rules:
- Use 3–6 items/events/cards/options unless the schema implies otherwise
- Write in clear, professional English
- For matching: every item id must appear as a key in correctAnswers mapping to a target id
- For drop-targets: every item must have a category that exactly matches one entry in categories[]
- For sorting: correctOrder must list every item id in the intended sequence; items should NOT already be in correctOrder
- For content with bullets: return { "bullets": ["...", "..."] }
- Do NOT include markdown, backticks, or any explanation — pure JSON only`;

  let lastErr: any = null;
  let parsed: any = null;
  for (let attempt = 0; attempt < 3 && !parsed; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1500 * attempt));
      const res = await fetch(`${API_BASE}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, complexity: 'simple' }),
      });
      if (!res.ok) throw new Error(`Regeneration API error: ${res.status}`);
      const aiRes = await res.json();
      const text: string = aiRes.content?.[0]?.text ?? aiRes.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI did not return valid JSON');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (!/failed to fetch|networkerror|load failed|timeout|API error: 5/i.test(msg) && attempt === 0) {
        break;
      }
    }
  }
  if (!parsed) {
    const msg = String(lastErr?.message || 'Regeneration failed');
    if (/failed to fetch/i.test(msg)) {
      throw new Error('Failed to fetch — API may be cold-starting. Wait ~20s and try again.');
    }
    throw lastErr || new Error(msg);
  }

  if (type === 'content') {
    const bullets: string[] = Array.isArray(parsed.bullets)
      ? parsed.bullets
      : Array.isArray(parsed.items)
        ? parsed.items.map((it: any) => (typeof it === 'string' ? it : it.content || it.title || '')).filter(Boolean)
        : [];
    const content = bullets.length
      ? bullets.map(b => `- ${b}`).join('\n')
      : (parsed.content || slide.content || `Key points for: ${slide.title}`);
    return { type: 'content', data: undefined, content };
  }

  // Normalize matching pairs → items/targets if model returns pairs
  if (type === 'matching' && Array.isArray(parsed.pairs) && !parsed.items) {
    const items = parsed.pairs.map((p: any, i: number) => ({
      id: p.id ? `${p.id}_item` : `i${i + 1}`,
      content: p.term || p.left || p.content || '',
    }));
    const targets = parsed.pairs.map((p: any, i: number) => ({
      id: p.id ? `${p.id}_target` : `t${i + 1}`,
      content: p.definition || p.right || '',
    }));
    const correctAnswers = Object.fromEntries(
      items.map((it: any, i: number) => [it.id, targets[i].id])
    );
    return { type, data: { items, targets, correctAnswers } };
  }

  return { type, data: parsed };
}

/**
 * Converts a broken/empty interaction slide to a simple content slide,
 * preserving the title and any available narration text.
 */
export function simplifySlide(course: any, moduleIndex: number, slideIndex: number): any {
  const cloned = JSON.parse(JSON.stringify(course));
  const slide = cloned.modules[moduleIndex]?.slides[slideIndex];
  if (!slide) return cloned;

  // Gather any available text to use as content
  const fallbackContent =
    slide.content ||
    slide.voiceOverText ||
    `This slide covers: ${slide.title}`;

  slide.type    = 'content';
  slide.content = fallbackContent;
  slide.data    = undefined;

  return cloned;
}
