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
