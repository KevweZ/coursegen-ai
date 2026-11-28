/** Public launch copy. Numbers here must be current product facts, not placeholders. */

export const REQUEST_ACCESS_LABEL = 'Request early access';

/** What an invited trial actually includes (admin invite, role=trial). */
export const TRIAL_WHAT_YOU_GET =
  'We’ll email a signup invite. Typical trial is 7 days, with weekly AI and narration limits. You get the full editor and SCORM 1.2 / 2004 export. Creating an account without an invite does not include generation credits.';

export const TRIAL_FAQ =
  'Access is invitation-only during this pilot. Request early access and we’ll send a signup invite. Typical trial is 7 days with weekly AI and narration limits — full editor, then Creator or Team when you subscribe. There is no public self-serve free trial, and we do not ask for a card to request access.';

export const SOURCE_QUALITY_EXPECTATION =
  'Slide-per-screen PowerPoint with speaker notes is the most reliable source. Word and PDF depend on extractable text — review the outline if the file uses tables or a layout that is not one screen per slide.';

export const TRUST_POINTS = [
  'Your files stay private to your account or Team workspace.',
  'We do not use your content to train AI models.',
  'You review and edit before you publish.',
  'Your LMS records completion and scores after you upload the SCORM package.',
] as const;

export const SCORM_VERSION_EXPLAINER =
  'SCORM 1.2 is the most widely accepted package and is the usual first choice. SCORM 2004 is the newer data model some LMS admins require. NexCourse exports both; pick the version your LMS test catalog accepts. Completion and score live in the LMS, not in NexCourse.';

export const PRE_PURCHASE_TEST =
  'Before you buy: request access (or sign in with an invite), generate from a short 5–10 slide PPT with notes, edit one slide, export SCORM 1.2, and upload the zip to your LMS test catalog (or SCORM Cloud). Confirm the LMS shows completion and score.';

/** Static homepage facts — never animate from 0. */
export const HOMEPAGE_STATS: { text: string; label: string }[] = [
  { text: '1.2 / 2004', label: 'SCORM export' },
  { text: 'Edit first', label: 'Before you publish' },
  { text: 'Your LMS', label: 'Owns scores' },
  { text: '6', label: 'AI voices on Team' },
];

export type CreditExample = {
  title: string;
  source: string;
  output: string;
  ai: string;
  tts: string;
  regen: string;
};

/**
 * Typical ranges from metering: 1 AI credit per successful /api/ai or returned
 * image; 1 TTS credit per successful clip; hydrate is ~1 call per 3 slides;
 * auto pictures cap at 14. Retries add credits. Not a quote.
 */
export const CREDIT_EXAMPLES: CreditExample[] = [
  {
    title: 'Short module',
    source: 'Short Word/PDF or ~8–12 slide PPT with notes',
    output: '1 module, about 8–15 learner slides, ~10–20 narrated clips',
    ai: '~15–40 AI credits (analysis, outline, hydrate, exam; pictures off)',
    tts: '~15–25 TTS credits',
    regen: 'Regenerate one slide = 1 AI. Re-speak one slide = 1 TTS (+1 per tab).',
  },
  {
    title: 'Typical course',
    source: '20–40 slide SME PowerPoint',
    output: '3–4 modules, about 25–40 slides, ~30–60 narrated clips',
    ai: '~40–80 AI credits for generate (matches a full hydrate). Up to 14 more if you add AI pictures.',
    tts: '~40–70 TTS credits including chrome slides and tabs',
    regen: 'Edit → Generate AI images is 1 credit per picture. A 14-picture batch is 14 AI credits.',
  },
  {
    title: 'Creator month (500 + 500)',
    source: 'One typical course plus edits, or several short modules',
    output: '500 AI + 500 TTS refresh each billing cycle',
    ai: 'Enough for about one typical generate with pictures and some slide regen — or several short modules without a 14-picture batch.',
    tts: '500 clips. A long course with a clip per slide and tab can use most of the TTS pool in one build.',
    regen: 'Failed calls do not spend credits. Pay-as-you-go packs are 100 AI ($25) or 500 AI ($100) and do not include TTS.',
  },
];

export function scrollToMarketingContact(): void {
  if (typeof window === 'undefined') return;
  const el = document.getElementById('contact');
  if (el) {
    const navHeight = 64;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
