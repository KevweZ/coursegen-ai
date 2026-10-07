/**
 * Split a course title into primary (large/bold subject) vs secondary (lighter
 * lead-in or subtitle) for the cover/title slide.
 *
 * Lead-ins like "Introduction to …" must NOT become the hero line — the
 * remaining subject does.
 */

export type SplitCourseTitle = {
  /** Large, extrabold subject / headline */
  primary: string;
  /** Smaller supplemental line (lead-in or subtitle). Empty if single-line. */
  secondary: string;
  /**
   * When true, render secondary above primary (natural lead-in → subject).
   * When false, primary on top (colon / em-dash / balanced splits).
   */
  secondaryFirst: boolean;
};

/**
 * Longest-first catalog of common course-title lead-ins.
 * Matched case-insensitively at the start of the title; must leave a subject.
 */
const TITLE_LEAD_INS: readonly string[] = [
  'a brief introduction to',
  'an introduction to',
  'introduction to',
  'the complete guide to',
  'a complete guide to',
  'complete guide to',
  "a beginner's guide to",
  "the beginner's guide to",
  "beginner's guide to",
  'a beginners guide to',
  'beginners guide to',
  'a practical guide to',
  'practical guide to',
  'the guide to',
  'a guide to',
  'guide to',
  'getting started with',
  'getting started in',
  'getting started on',
  'a crash course in',
  'a crash course on',
  'crash course in',
  'crash course on',
  'the fundamentals of',
  'fundamentals of',
  'an overview of',
  'overview of',
  'the basics of',
  'basics of',
  'the principles of',
  'principles of',
  'the essentials of',
  'essentials of',
  'the foundations of',
  'foundations of',
  'a handbook of',
  'handbook of',
  'a primer on',
  'a primer to',
  'primer on',
  'primer to',
  'quick start to',
  'quick start with',
  'an intro to',
  'intro to',
];

/** Short labels that appear before a colon but are not the subject. */
const GENERIC_COLON_LABELS = new Set([
  'introduction',
  'intro',
  'overview',
  'fundamentals',
  'basics',
  'guide',
  'primer',
  'essentials',
  'foundations',
  'handbook',
]);

function matchLeadIn(title: string): { leadIn: string; subject: string } | null {
  const lower = title.toLowerCase();
  for (const phrase of TITLE_LEAD_INS) {
    if (!lower.startsWith(phrase)) continue;
    const next = title.charAt(phrase.length);
    // Require a word boundary after the phrase (space / nbsp), not "Introduction toward…"
    if (next && next !== ' ' && next !== '\u00a0') continue;
    const subject = title.slice(phrase.length).trim();
    if (subject.split(/\s+/).filter(Boolean).length < 1) continue;
    if (subject.length < 2) continue;
    const leadIn = title.slice(0, phrase.length).trim();
    return { leadIn, subject };
  }
  return null;
}

/** Cover titles stay scannable — never a colon laundry list of topics. */
export const MAX_COURSE_TITLE_WORDS = 8;

function titleWordCount(text: string): number {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/** Geographic / product tokens that may stay abbreviated in a title. */
const TITLE_ACRONYM_KEEP = new Set([
  'A', 'I', 'OK', 'US', 'UK', 'UN', 'EU', 'UAE', 'KSA', 'AI', 'ID', 'FAQ', 'GPS',
]);

/** Common SME abbreviations that leak into cover/module titles. */
export const TITLE_ACRONYM_GLOSSARY: Record<string, string> = {
  PE: 'Polyethylene',
  PP: 'Polypropylene',
  HDPE: 'High-Density Polyethylene',
  LDPE: 'Low-Density Polyethylene',
  LLDPE: 'Linear Low-Density Polyethylene',
  MDPE: 'Medium-Density Polyethylene',
  EVA: 'Ethylene-Vinyl Acetate',
  PVC: 'Polyvinyl Chloride',
  PET: 'Polyethylene Terephthalate',
  MFI: 'Melt Flow Index',
  MWD: 'Molecular Weight Distribution',
};

export function isBareTitleAcronym(token: string): boolean {
  const t = String(token || '').replace(/[.,:;]+$/, '');
  if (!/^[A-Z]{2,6}$/.test(t)) return false;
  return !TITLE_ACRONYM_KEEP.has(t);
}

function titleCasePhrase(phrase: string): string {
  return String(phrase || '')
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (/^(and|or|of|the|to|for|in|on)$/i.test(w)) return w.toLowerCase();
      if (w.includes('-')) {
        return w
          .split('-')
          .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
          .join('-');
      }
      return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w;
    })
    .join(' ');
}

/** Pull "polyethylene (PE)" / "PE (polyethylene)" pairs from source or description. */
const GLOSSARY_STOP = /^(and|or|of|on|the|a|an|for|to|in|with|including|focusing|using|covering|providing|overview)$/i;

function glossaryPhrase(raw: string): string {
  const words = String(raw || '')
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && GLOSSARY_STOP.test(words[0])) words.shift();
  return words.slice(-4).join(' ');
}

export function extractAcronymGlossary(...texts: Array<string | undefined | null>): Record<string, string> {
  const out: Record<string, string> = { ...TITLE_ACRONYM_GLOSSARY };
  const src = texts.filter(Boolean).join('\n');
  const take = (acr: string, full: string) => {
    const key = String(acr || '').toUpperCase();
    const phrase = titleCasePhrase(glossaryPhrase(full));
    if (!isBareTitleAcronym(key) || titleWordCount(phrase) < 1 || titleWordCount(phrase) > 6) return;
    if (GLOSSARY_STOP.test(phrase)) return;
    out[key] = phrase;
  };
  let m: RegExpExecArray | null;
  const reFullFirst = /\b([A-Za-z][A-Za-z][A-Za-z0-9\-\s]{1,48}?)\s*\(\s*([A-Z]{2,6})\s*\)/g;
  while ((m = reFullFirst.exec(src))) take(m[2], m[1]);
  const reAcrFirst = /\b([A-Z]{2,6})\s*\(\s*([A-Za-z][A-Za-z][A-Za-z0-9\-\s]{1,48}?)\s*\)/g;
  while ((m = reAcrFirst.exec(src))) take(m[1], m[2]);
  return out;
}

function cleanupTitleConnectors(text: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+:/g, ':')
    .replace(/:\s*(and|or)\s+/gi, ': ')
    .replace(/\s+(and|or)(\s+\1)+/gi, ' $1')
    .replace(/^(and|or)\s+/i, '')
    .replace(/\s+(and|or)$/i, '')
    .replace(/[:;,]+$/g, '')
    .trim();
}

/**
 * Cover/module titles must not use unexplained acronyms (PE, PP, EVA).
 * Two+ acronyms in a title → drop them for a simpler subject line when enough
 * words remain. A single acronym (or a title that would collapse to one word)
 * expands from the glossary when it still fits the word budget.
 */
export function stripOrExpandTitleAcronyms(
  title: string,
  maxWords: number,
  glossary?: Record<string, string>,
): string {
  let t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return t;
  t = t.replace(/\b([A-Z]{2,6})\s*\/\s*([A-Z]{2,6})\b/g, '$1 and $2');
  t = t.replace(/\s*\(([A-Z]{2,6})\)/g, '');
  t = cleanupTitleConnectors(t);

  const gloss = { ...TITLE_ACRONYM_GLOSSARY, ...(glossary || {}) };
  const words = t.split(/\s+/).filter(Boolean);
  const acronyms = words
    .map((w) => w.replace(/[.,:;]+$/, ''))
    .filter((w) => isBareTitleAcronym(w));
  if (!acronyms.length) return t;

  const expandWord = (w: string): string[] => {
    const core = w.replace(/[.,:;]+$/, '');
    const punct = (w.match(/[.,:;]+$/) || [''])[0];
    if (isBareTitleAcronym(core) && gloss[core]) {
      const parts = gloss[core].split(/\s+/).filter(Boolean);
      if (punct && parts.length) parts[parts.length - 1] += punct;
      return parts;
    }
    return [w];
  };

  const expanded = cleanupTitleConnectors(words.flatMap(expandWord).join(' '));
  const strippedWords = words.filter((w) => !isBareTitleAcronym(w.replace(/[.,:;]+$/, '')));
  const stripped = cleanupTitleConnectors(strippedWords.join(' '));
  const strippedCount = titleWordCount(stripped);
  const expandedCount = titleWordCount(expanded);
  const allKnown = acronyms.every((a) => !!gloss[a]);

  if (acronyms.length >= 2 && strippedCount >= 2 && strippedCount <= maxWords) {
    return stripped;
  }
  if (allKnown && expandedCount >= 2 && expandedCount <= maxWords) {
    return expanded;
  }
  if (strippedCount >= 2) return stripped;
  if (allKnown && expandedCount >= 2) {
    const cut = expanded.split(/\s+/).filter(Boolean).slice(0, maxWords);
    return cleanupTitleConnectors(cut.join(' '));
  }
  return stripped || t;
}

/**
 * First on-screen/narration mention: "polyethylene (PE)", later mentions may stay PE.
 */
export function expandFirstAcronymMentions(
  text: string,
  glossary?: Record<string, string>,
): string {
  let out = String(text || '');
  if (!out.trim()) return out;
  const gloss = { ...TITLE_ACRONYM_GLOSSARY, ...(glossary || {}) };
  const keys = Object.keys(gloss).sort((a, b) => b.length - a.length);
  for (const acr of keys) {
    const full = gloss[acr];
    if (!full) continue;
    if (new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(out)) continue;
    const re = new RegExp(`\\b${acr}\\b`);
    if (!re.test(out)) continue;
    out = out.replace(re, `${full} (${acr})`);
  }
  return out;
}

export type TitleSanitizeOpts = { glossary?: Record<string, string> };

/** Rewrite course.title, module titles, and first-mention description. */
export function sanitizeCourseTitles(course: any, opts?: TitleSanitizeOpts): any {
  if (!course) return course;
  const gloss = extractAcronymGlossary(
    course.description,
    course.title,
    ...(course.modules || []).map((m: any) => m?.title),
  );
  const merged = { ...gloss, ...(opts?.glossary || {}) };
  const title = shortenCourseTitle(course.title || '', { glossary: merged });
  const description = course.description
    ? expandFirstAcronymMentions(course.description, merged)
    : course.description;
  let changed = title !== (course.title || '') || description !== course.description;
  const modules = (course.modules || []).map((m: any) => {
    const nextTitle = shortenModuleTitle(m?.title || '', { glossary: merged });
    if (nextTitle === m.title) return m;
    changed = true;
    return { ...m, title: nextTitle };
  });
  if (!changed) return course;
  return { ...course, title, description, modules };
}

/**
 * Deterministic cover-title lock. Models often emit
 * "Introduction to X: A, B, and C" — collapse to the subject, at most 8 words.
 */
export function shortenCourseTitle(title: string, opts?: TitleSanitizeOpts): string {
  let t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return t;

  const lead = matchLeadIn(t);
  if (lead && titleWordCount(lead.subject) >= 2) {
    t = lead.subject.replace(/^[:\-—–]\s*/, '').trim();
  } else if (GENERIC_COLON_LABELS.has(t.split(':')[0].trim().toLowerCase())) {
    const after = t.slice(t.indexOf(':') + 1).trim();
    if (titleWordCount(after) >= 2) t = after;
  }

  t = stripOrExpandTitleAcronyms(t, MAX_COURSE_TITLE_WORDS, opts?.glossary);

  const colonIdx = t.indexOf(':');
  if (colonIdx > 0) {
    const before = t.slice(0, colonIdx).trim();
    let after = t.slice(colonIdx + 1).trim();
    const commaParts = after.split(',').map(s => s.trim()).filter(Boolean);
    const laundryList = commaParts.length >= 2;
    if (laundryList && (commaParts.length >= 3 || titleWordCount(t) > 6)) {
      after = commaParts[0];
      t = before && after ? `${before}: ${after}` : (before || after);
    }
  }

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_COURSE_TITLE_WORDS) return t.replace(/[,:;]+\s*$/, '');

  let cut = words.slice(0, MAX_COURSE_TITLE_WORDS);
  while (cut.length > 4 && /^(and|or|of|to|the|for|with|in|on)$/i.test(cut[cut.length - 1] || '')) {
    cut.pop();
  }
  return cut.join(' ').replace(/[,:;]+\s*$/, '');
}

export const MAX_MODULE_TITLE_WORDS = 6;

const MODULE_GERUNDS =
  /^(Identifying|Tracing|Distinguishing|Recognizing|Mapping|Understanding|Positioning|Selecting|Protecting|Explaining|Describing|Comparing|Classifying|Analyzing|Evaluating|Applying)\s+/i;

/**
 * Module TOC labels stay short topic names — not Bloom sentences.
 */
export function shortenModuleTitle(title: string, opts?: TitleSanitizeOpts): string {
  let t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return t;
  t = t.replace(/^module\s+\d+\s*[:.—–-]?\s*/i, '');
  t = t.replace(/^chapter\s+\d+\s*[:.—–-]?\s*/i, '');
  t = t.replace(MODULE_GERUNDS, '');
  t = t.replace(/^(the|a|an)\s+/i, '');
  t = stripOrExpandTitleAcronyms(t, MAX_MODULE_TITLE_WORDS, opts?.glossary);
  const words = t.split(/\s+/).filter(Boolean);
  if (!words.length) return String(title || '').replace(/\s+/g, ' ').trim();
  if (words.length <= MAX_MODULE_TITLE_WORDS) return words.join(' ').replace(/[,:;]+\s*$/, '');
  let cut = words.slice(0, MAX_MODULE_TITLE_WORDS);
  while (cut.length > 3 && /^(and|or|of|to|the|for|with|in|on)$/i.test(cut[cut.length - 1] || '')) {
    cut.pop();
  }
  return cut.join(' ');
}

/**
 * Split course title into bold headline + lighter subtitle.
 * Prefer lead-in → subject, then "Subject: Rest…", then em/en-dash, then a
 * balanced word cut.
 */
export function splitCourseTitle(title: string): SplitCourseTitle {
  const t = title.trim().replace(/\s+/g, ' ');
  if (!t) return { primary: '', secondary: '', secondaryFirst: false };

  const lead = matchLeadIn(t);
  if (lead) {
    return {
      primary: lead.subject,
      secondary: lead.leadIn,
      secondaryFirst: true,
    };
  }

  const colonIdx = t.indexOf(':');
  if (colonIdx > 0 && colonIdx < t.length - 1) {
    const before = t.slice(0, colonIdx).trim();
    const after = t.slice(colonIdx + 1).trim();
    if (before && after) {
      // "Introduction: Steam Cracker Technology" → subject is after the colon
      if (GENERIC_COLON_LABELS.has(before.toLowerCase())) {
        return { primary: after, secondary: before, secondaryFirst: true };
      }
      return { primary: `${before}:`, secondary: after, secondaryFirst: false };
    }
  }

  const dash = t.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (dash?.[1] && dash?.[2]) {
    return {
      primary: dash[1].trim(),
      secondary: dash[2].trim(),
      secondaryFirst: false,
    };
  }

  const words = t.split(' ').filter(Boolean);
  if (words.length <= 2) {
    return { primary: words.join(' '), secondary: '', secondaryFirst: false };
  }

  // Balanced fallback for titles without a structural separator.
  // Bias slightly toward a longer primary (subject) line vs. the old 40% cut
  // that often left thin lead-ish phrases huge.
  const n = Math.min(Math.max(2, Math.ceil(words.length * 0.55)), words.length - 1);
  return {
    primary: words.slice(0, n).join(' '),
    secondary: words.slice(n).join(' '),
    secondaryFirst: false,
  };
}
