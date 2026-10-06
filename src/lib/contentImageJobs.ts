/**
 * Content AI-image job list + apply.
 * Only writes image URL fields. Never rewrites OST, voice-over, interaction type, or tab copy.
 */

export const MAX_CONTENT_AI_IMAGES = 14;
/** One authoring click on “this slide” — intro + a few tabs/items, not a course-wide refill. */
export const MAX_SLIDE_AI_IMAGES = 8;

export const AI_CONTENT_SKIP_TYPES = new Set([
  'title', 'cover', 'module-cover', 'module-overview', 'course-objectives',
  'learning-objectives', 'objectives', 'player-tour', 'knowledge-check', 'quiz',
  'multiple-choice', 'multiple-answers', 'true-false', 'mastery-exam', 'exam-intro',
  'exam-results', 'closing', 'scenario', 'game-template', 'matching', 'sorting',
  'drop-targets',
]);

export function slideTypeSkipsAiContentImages(type?: string | null): boolean {
  return AI_CONTENT_SKIP_TYPES.has(String(type || ''));
}

/**
 * Heuristic: only spend an AI image when the topic can be shown as a concrete visual
 * (signs, equipment, zones, vehicles…) — skip pure ideas / calculations / policy prose.
 * Bypassed when the author asks for the current slide only.
 */
export function topicBenefitsFromVisual(label: string, content?: string): boolean {
  const text = `${label || ''} ${content || ''}`.replace(/<[^>]+>/g, ' ').trim();
  if (text.length < 2) return false;
  const lower = text.toLowerCase();

  if (/\b(calculat|equation|formula|algebra|percentage|budget|policy language|terms and conditions|learning objective)\b/i.test(lower)
    && !/\b(sign|signal|vehicle|equipment|machine|zone|highway|school|traffic|pump|hvac|valve)\b/i.test(lower)) {
    return false;
  }

  if (/\b(sign|signal|stop|yield|light|traffic|vehicle|car|truck|bus|highway|school zone|residential|equipment|pump|valve|hvac|duct|motor|engine|pipe|panel|meter|gauge|tool|device|machine|intersection|crosswalk|lane|brake|steering|airbag|helmet|ppe|furnace|cracker|olefin|ethylene|reactor|distill|refinery|pipeline|compressor|tower|column|exchanger|catalyst|feedstock|vessel|tank|flare|steam|heat|process|schematic|diagram|plant|unit)\b/i.test(lower)) {
    return true;
  }

  const words = (label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= 4 && !/^(how|why|what|when|overview|introduction|summary|tips|notes)\b/i.test(label)) {
    return true;
  }

  return false;
}

export type ContentImageJob = {
  kind: 'slide' | 'tab' | 'intro';
  mi: number;
  si: number;
  slideId: string;
  tabIndex?: number;
  subject: string;
  slideTitle: string;
  moduleTitle: string;
  panelLabel: string;
  panelBody: string;
  mediaPrompt?: string;
};

function floatsOn(slide: any): any[] {
  return Array.isArray(slide?.floatingMedia) ? slide.floatingMedia : [];
}

/** Slide-level visual already present (in-flow or a slide-scoped float). */
export function contentSlideHasVisual(slide: any): boolean {
  if (slide?.imageUrl || slide?.coverImage) return true;
  return floatsOn(slide).some((f: any) => !f?.tabId);
}

export function introHasVisual(slide: any): boolean {
  if (slide?.data?.introImageUrl) return true;
  return floatsOn(slide).some((f: any) => f?.tabId === '__intro__');
}

export function tabHasVisual(slide: any, tab: any): boolean {
  if (tab?.imageUrl) return true;
  const tabId = tab?.id != null ? String(tab.id) : '';
  if (tabId && floatsOn(slide).some((f: any) => String(f?.tabId || '') === tabId)) return true;
  return false;
}

export function collectContentImageJobs(
  course: any,
  opts?: { slideId?: string; skipBenefitHeuristic?: boolean },
): ContentImageJob[] {
  const jobs: ContentImageJob[] = [];
  const introJobs: ContentImageJob[] = [];
  const onlyId = opts?.slideId ? String(opts.slideId) : '';
  const forceVisual = !!opts?.skipBenefitHeuristic;

  const benefits = (label: string, body?: string) =>
    forceVisual || topicBenefitsFromVisual(label, body);

  for (let mi = 0; mi < (course?.modules || []).length; mi++) {
    const m = course.modules[mi];
    for (let si = 0; si < (m.slides || []).length; si++) {
      const s = m.slides[si];
      if (onlyId && String(s.id) !== onlyId) continue;
      if (slideTypeSkipsAiContentImages(s.type)) continue;

      if (s.type === 'content' || s.type === 'summary' || s.type === 'key-takeaways') {
        if (contentSlideHasVisual(s)) continue;
        if (!benefits(s.title || '', s.content || '')) continue;
        jobs.push({
          kind: 'slide',
          mi,
          si,
          slideId: String(s.id || ''),
          subject: s.title || 'course topic',
          slideTitle: s.title || '',
          moduleTitle: m.title || '',
          panelLabel: s.title || 'course topic',
          panelBody: s.content || s.voiceOverText || '',
          mediaPrompt: s.mediaPrompt,
        });
        continue;
      }

      if (s.type === 'tabbed-horizontal' || s.type === 'tabbed-vertical') {
        const tabs = s.data?.tabs || s.data?.items || [];
        if (!introHasVisual(s)) {
          const introBody = s.content || s.data?.introContent || s.voiceOverText || s.narration || '';
          if (benefits(s.title || '', introBody)) {
            introJobs.push({
              kind: 'intro',
              mi,
              si,
              slideId: String(s.id || ''),
              subject: s.title || 'course topic',
              slideTitle: s.title || '',
              moduleTitle: m.title || '',
              panelLabel: s.title || 'course topic',
              panelBody: introBody,
              mediaPrompt: s.mediaPrompt,
            });
          }
        }
        if (Array.isArray(tabs)) {
          tabs.forEach((tab: any, tabIndex: number) => {
            if (tabHasVisual(s, tab)) return;
            const label = tab?.label || tab?.title || `Tab ${tabIndex + 1}`;
            const body = `${tab?.content || ''} ${tab?.voiceOverText || ''} ${s.title || ''}`;
            if (!benefits(label, body) && !benefits(s.title || '', tab?.content || '')) return;
            const panelLabel = /^(introduction|overview|summary)$/i.test(String(label).trim())
              ? (s.title || label)
              : label;
            jobs.push({
              kind: 'tab',
              mi,
              si,
              slideId: String(s.id || ''),
              tabIndex,
              subject: panelLabel,
              slideTitle: s.title || label,
              moduleTitle: m.title || '',
              panelLabel,
              panelBody: tab?.content || tab?.voiceOverText || s.content || '',
              mediaPrompt: tab?.mediaPrompt || s.mediaPrompt,
            });
          });
        }
        continue;
      }

      if (s.type === 'click-reveal' || s.type === 'accordion') {
        const items = s.data?.items || [];
        if (!Array.isArray(items)) continue;
        items.forEach((item: any, tabIndex: number) => {
          if (tabHasVisual(s, item) || item?.imageUrl) return;
          const label = item?.title || item?.label || item?.term || `Item ${tabIndex + 1}`;
          const body = item?.content || item?.definition || '';
          if (!benefits(label, body)) return;
          jobs.push({
            kind: 'tab',
            mi,
            si,
            slideId: String(s.id || ''),
            tabIndex,
            subject: label,
            slideTitle: s.title || label,
            moduleTitle: m.title || '',
            panelLabel: label,
            panelBody: body,
            mediaPrompt: item?.mediaPrompt || s.mediaPrompt,
          });
        });
      }
    }
  }

  const pooled = [...introJobs, ...jobs];
  const cap = onlyId ? MAX_SLIDE_AI_IMAGES : MAX_CONTENT_AI_IMAGES;
  return pooled.slice(0, cap);
}

/**
 * Write only the image URL for this job. Leaves content, type, tab labels/copy, and skin intact.
 */
export function applyContentImageUrl(slide: any, job: Pick<ContentImageJob, 'kind' | 'tabIndex'>, url: string): any {
  if (!slide || !url) return slide;
  if (job.kind === 'slide') {
    return { ...slide, imageUrl: url };
  }
  if (job.kind === 'intro') {
    return {
      ...slide,
      data: { ...(slide.data || {}), introImageUrl: url },
    };
  }
  if (typeof job.tabIndex !== 'number') return slide;
  if (slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical') {
    const key = slide.data?.tabs ? 'tabs' : 'items';
    const list = [...(slide.data?.[key] || [])];
    if (!list[job.tabIndex]) return slide;
    list[job.tabIndex] = { ...list[job.tabIndex], imageUrl: url };
    return {
      ...slide,
      data: { ...(slide.data || {}), [key]: list },
    };
  }
  if (slide.type === 'click-reveal' || slide.type === 'accordion') {
    const list = [...(slide.data?.items || [])];
    if (!list[job.tabIndex]) return slide;
    list[job.tabIndex] = { ...list[job.tabIndex], imageUrl: url };
    return {
      ...slide,
      data: { ...(slide.data || {}), items: list },
    };
  }
  return slide;
}
