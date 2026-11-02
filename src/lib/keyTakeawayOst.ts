/**
 * Edit Slide for Key Takeaways / Module Summary.
 * The player renders data.objectives (numbered cards). Leftover slide.content
 * is a different, shorter list and must not be the edit surface.
 */

import { AUTHORED_KEY_TAKEAWAY_MAX, normalizeKeyTakeaways } from './hydrateGuards';

export const MAX_KEY_TAKEAWAYS = AUTHORED_KEY_TAKEAWAY_MAX;
export const MIN_KEY_TAKEAWAYS = 2;

export function isKeyTakeawaysType(type?: string): boolean {
  return String(type || '') === 'key-takeaways';
}

/** Same text a learner sees on a numbered takeaway card. */
export function takeawayCardStatement(obj: any): string {
  const rawLabel = String(obj?.label || obj?.title || '').trim();
  const rawContent = String(obj?.content || obj?.description || '').trim();
  return (rawContent && rawContent !== rawLabel ? rawContent : rawLabel).trim();
}

export type KeyTakeawayEditItem = { id: string; text: string };

/** Player source first: card statements on data.objectives, not leftover OST bullets. */
export function keyTakeawayEditItems(slide: any): KeyTakeawayEditItem[] {
  const raw = Array.isArray(slide?.data?.objectives) && slide.data.objectives.length
    ? slide.data.objectives
    : (Array.isArray(slide?.interactions) ? slide.interactions : []);
  const fromRaw = raw
    .map((obj: any, i: number) => ({
      id: String(obj?.id || i + 1),
      text: takeawayCardStatement(obj),
    }))
    .filter((row: KeyTakeawayEditItem) => row.text);
  if (fromRaw.length) return fromRaw.slice(0, MAX_KEY_TAKEAWAYS);
  const objectives = normalizeKeyTakeaways(slide)?.data?.objectives;
  if (!Array.isArray(objectives) || !objectives.length) {
    return [{ id: '1', text: '' }, { id: '2', text: '' }];
  }
  return objectives.slice(0, MAX_KEY_TAKEAWAYS).map((obj: any, i: number) => ({
    id: String(obj?.id || i + 1),
    text: takeawayCardStatement(obj),
  }));
}

function numberedContent(items: KeyTakeawayEditItem[]): string {
  return items
    .map((item, i) => String(item.text || '').trim())
    .filter(Boolean)
    .map((text, i) => `${i + 1}. ${text}`)
    .join('\n');
}

/**
 * Write edited takeaways to data.objectives (player) and numbered content
 * so OST/review stay aligned. Do not leave leftover short bullets in content.
 */
export function applyKeyTakeawayEdits(slide: any, items: KeyTakeawayEditItem[]): any {
  const cleaned = (items || []).slice(0, MAX_KEY_TAKEAWAYS).map((item, i) => ({
    id: String(item?.id || i + 1),
    label: String(item?.text || '').trim(),
    content: '',
  }));

  const next: any = {
    ...slide,
    type: 'key-takeaways',
    content: numberedContent(cleaned.map(o => ({ id: o.id, text: o.label }))),
    data: {
      ...(slide?.data || {}),
      objectives: cleaned,
    },
  };

  if (Array.isArray(slide?.interactions) && slide.interactions.length) {
    next.interactions = cleaned;
  }
  return next;
}
