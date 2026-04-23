/**
 * QC Service — AI-powered content scan layer.
 * Sends slide text to the AI in batches and returns spelling/grammar/clarity issues.
 * Works alongside structuralValidator.ts which handles non-AI structural checks.
 */

import { QCIssue, QCReport, IssueSeverity, IssueType, validateCourse, applyFixes } from './structuralValidator';

const BATCH_SIZE = 5;
const API_BASE = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

// ── Types re-exported for consumers ─────────────────────────────────────────
export type { QCIssue, QCReport, IssueSeverity, IssueType };
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

  // Branching
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

  for (let i = 0; i < allSlides.length; i += BATCH_SIZE) {
    const batch = allSlides.slice(i, i + BATCH_SIZE);
    const batchIssues = await scanBatch(batch);
    rawAIIssues.push(...batchIssues);
  }

  const aiIssues = aiIssuesToQCIssues(rawAIIssues, course);
  onPhase?.('done');
  return mergeReports(structural, aiIssues, totalSlides);
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
