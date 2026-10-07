/**
 * Player / Word review script share one TOC numbering pass:
 * sequential N.M in the same order the learner sees (allSlides).
 * Never key the number by slide id — duplicate ids after regen must not
 * collapse two rows onto the same "4.4".
 */

export const TOC_UNNUMBERED_TYPES = new Set([
  'cover',
  'player-tour',
  'course-objectives',
  'hub-menu',
  'module-cover',
  'exam-intro',
  'mastery-exam',
  'exam-results',
  'closing',
]);

type TocSlide = { id?: string; type?: string; _moduleNumber?: number } | null | undefined;

export function isTocNumberedSlide(slide: TocSlide): boolean {
  if (!slide) return false;
  const type = String(slide.type || '');
  if (TOC_UNNUMBERED_TYPES.has(type)) return false;
  const id = String(slide.id || '');
  if (id === '__cover__' || id === '__player-tour__' || id === '__course-objectives__' || id === '__hub-menu__') return false;
  if (id === '__exam-intro__' || id === '__mastery-exam__' || id === '__exam-results__' || id === '__closing__') return false;
  if (id.startsWith('__module-cover-')) return false;
  return true;
}

/** One entry per slide in player order. Unnumbered chrome is `undefined`. */
export function tocNumberByIndex(slides: TocSlide[]): (string | undefined)[] {
  const refs: (string | undefined)[] = new Array(slides.length);
  let moduleNum = 0;
  let n = 0;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (!slide) continue;
    const type = String(slide.type || '');
    const id = String(slide.id || '');
    if (type === 'module-cover' || id.startsWith('__module-cover-')) {
      const m = id.match(/__module-cover-(\d+)__/);
      moduleNum = Number(slide._moduleNumber) || (m ? Number(m[1]) : moduleNum + 1);
      n = 0;
      continue;
    }
    if (!isTocNumberedSlide(slide)) continue;
    const overview = id.match(/__module-overview-(\d+)__/);
    if (overview) {
      moduleNum = Number(overview[1]);
      n = 0;
    } else if (!moduleNum) {
      moduleNum = 1;
    }
    n += 1;
    refs[i] = `${moduleNum}.${n}`;
  }
  return refs;
}

/** First-wins map for QC / issue rows that still look up by id. */
export function tocRefMapFirstWins(slides: TocSlide[]): Map<string, string> {
  const map = new Map<string, string>();
  const refs = tocNumberByIndex(slides);
  slides.forEach((slide, i) => {
    const id = String(slide?.id || '').trim();
    const ref = refs[i];
    if (id && ref && !map.has(id)) map.set(id, ref);
  });
  return map;
}

/**
 * Resolve a TOC row to the player index. Prefer object identity so two slides
 * that reused an id (regen / splice) still highlight independently.
 */
export function indexOfPlayerSlide(
  allSlides: Array<{ id?: string } | null | undefined>,
  slide: { id?: string } | null | undefined,
  occurrence = 0,
): number {
  if (!slide || !allSlides.length) return -1;
  const byRef = allSlides.findIndex(s => s === slide);
  if (byRef >= 0) return byRef;
  const id = String(slide.id || '').trim();
  if (!id) return -1;
  let found = 0;
  for (let i = 0; i < allSlides.length; i++) {
    if (String(allSlides[i]?.id || '').trim() !== id) continue;
    if (found === occurrence) return i;
    found += 1;
  }
  return -1;
}
