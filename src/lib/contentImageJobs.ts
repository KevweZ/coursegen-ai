/**
 * Content AI-image job list + apply.
 * Only writes image URL fields. Never rewrites OST, voice-over, interaction type, or tab copy.
 */

import { hasPlayableImageUrl } from './draftMedia';

export const MAX_CONTENT_AI_IMAGES = 14;
/** One authoring click on “this slide” — intro + a few tabs/items, not a course-wide refill. */
export const MAX_SLIDE_AI_IMAGES = 8;

export const AI_CONTENT_SKIP_TYPES = new Set([
  'title', 'cover', 'module-cover', 'module-overview', 'course-objectives',
  'learning-objectives', 'objectives', 'player-tour', 'knowledge-check', 'quiz',
  'multiple-choice', 'multiple-answers', 'true-false', 'mastery-exam', 'exam-intro',
  'exam-results', 'closing', 'hub-menu', 'scenario', 'game-template', 'matching', 'sorting',
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

export type ContentImageJobStatus = 'pending' | 'generating' | 'done' | 'skipped';

export type ContentImageJobGroup = {
  slideId: string;
  mi: number;
  si: number;
  slideTitle: string;
  moduleTitle: string;
  tocRef?: string;
  jobs: ContentImageJob[];
};

export function contentImageJobKey(job: Pick<ContentImageJob, 'slideId' | 'kind' | 'tabIndex'>): string {
  if (job.kind === 'tab') return `${job.slideId}:tab:${job.tabIndex ?? 0}`;
  return `${job.slideId}:${job.kind}`;
}

/** Short slot name next to the slide title (Overview photo, Frame, Slide photo). */
export function contentImageJobSlotLabel(job: ContentImageJob): string {
  if (job.kind === 'slide') return 'Slide photo';
  if (job.kind === 'intro') return 'Overview photo';
  const label = String(job.panelLabel || '').trim();
  const title = String(job.slideTitle || '').trim();
  if (label && label.toLowerCase() !== title.toLowerCase()) return label;
  return `Picture ${(job.tabIndex ?? 0) + 1}`;
}

export function groupContentImageJobs(
  jobs: ContentImageJob[],
  tocRefBySlideId?: Map<string, string> | Record<string, string>,
): ContentImageJobGroup[] {
  const groups: ContentImageJobGroup[] = [];
  const indexById = new Map<string, number>();
  const lookup = (id: string) => {
    if (!tocRefBySlideId) return undefined;
    if (tocRefBySlideId instanceof Map) return tocRefBySlideId.get(id);
    return tocRefBySlideId[id];
  };
  for (const job of jobs) {
    const id = String(job.slideId || '');
    let i = indexById.get(id);
    if (i == null) {
      i = groups.length;
      indexById.set(id, i);
      groups.push({
        slideId: id,
        mi: job.mi,
        si: job.si,
        slideTitle: job.slideTitle || 'Untitled slide',
        moduleTitle: job.moduleTitle || '',
        tocRef: lookup(id),
        jobs: [],
      });
    }
    groups[i].jobs.push(job);
  }
  return groups;
}

function floatsOn(slide: any): any[] {
  return Array.isArray(slide?.floatingMedia) ? slide.floatingMedia : [];
}

/** Slide-level visual already present (in-flow or a slide-scoped float with a real URL). */
export function contentSlideHasVisual(slide: any): boolean {
  if (hasPlayableImageUrl(slide?.imageUrl) || hasPlayableImageUrl(slide?.coverImage)) return true;
  return floatsOn(slide).some((f: any) => !f?.tabId && hasPlayableImageUrl(f?.url));
}

export function introHasVisual(slide: any): boolean {
  if (hasPlayableImageUrl(slide?.data?.introImageUrl)) return true;
  return floatsOn(slide).some((f: any) => f?.tabId === '__intro__' && hasPlayableImageUrl(f?.url));
}

export function tabHasVisual(slide: any, tab: any): boolean {
  if (hasPlayableImageUrl(tab?.imageUrl)) return true;
  const tabId = tab?.id != null ? String(tab.id) : '';
  if (tabId && floatsOn(slide).some((f: any) => String(f?.tabId || '') === tabId && hasPlayableImageUrl(f?.url))) return true;
  return false;
}

export function collectContentImageJobs(
  course: any,
  opts?: { slideId?: string; skipBenefitHeuristic?: boolean; noCap?: boolean },
): ContentImageJob[] {
  const jobs: ContentImageJob[] = [];
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
            jobs.push({
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

  if (opts?.noCap) return jobs;
  const cap = onlyId ? MAX_SLIDE_AI_IMAGES : MAX_CONTENT_AI_IMAGES;
  return jobs.slice(0, cap);
}

/** Author-facing count: pictures vs slides, never “14 slides” for 14 picture slots. */
export function summarizeImageSelection(opts: {
  pictureCount: number;
  slideCount: number;
  maxPictures?: number;
}): string {
  const max = opts.maxPictures ?? MAX_CONTENT_AI_IMAGES;
  const pics = Math.max(0, opts.pictureCount);
  const slides = Math.max(0, opts.slideCount);
  const picWord = pics === 1 ? 'picture' : 'pictures';
  const slideWord = slides === 1 ? 'slide' : 'slides';
  if (pics === 0) return 'No pictures selected.';
  if (pics > max) {
    return `${pics} ${picWord} on ${slides} ${slideWord} selected. This run will generate the first ${max} pictures in course order.`;
  }
  return `${pics} ${picWord} on ${slides} ${slideWord} selected (up to ${max} pictures per run).`;
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
