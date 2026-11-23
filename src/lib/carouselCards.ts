/**
 * Carousel-panel cards must actually exist. "Scroll to explore" with an empty
 * canvas is a hydrate miss — retry, then synthesize cards from the title.
 */

import { coerceCarouselColor } from './colorContrast';

const CHROME_LINE =
  /^(scroll to explore|swipe to |flick through|browse the cards?|click (a |each |the )?cards?\b|select (a |each |the )?cards?\b|tap (a |each |the )?cards?\b|each card shows)\b/i;

function stripToPlain(text: unknown): string {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asCardArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
}

function cardText(card: any): string {
  if (!card || typeof card !== 'object') return '';
  return stripToPlain(
    `${card.label || card.title || ''} ${card.description || ''} ${card.expandedContent || card.content || card.body || ''}`,
  );
}

export function isUsableCarouselCard(card: unknown): boolean {
  if (!card || typeof card !== 'object') return false;
  const text = cardText(card);
  if (text.length < 8) return false;
  if (CHROME_LINE.test(text)) return false;
  return true;
}

export function isCarouselChromeLine(line: unknown): boolean {
  const t = stripToPlain(line).replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
  return CHROME_LINE.test(t);
}

/** Learner copy that promises a scrollable card stage. */
export function contentPromisesCarousel(slide: any): boolean {
  const text = `${slide?.content || ''} ${slide?.data?.prompt || ''} ${slide?.voiceOverText || ''}`;
  return /\bscroll to explore\b|\bswipe to (explore|see|browse)\b|\beach card shows\b/i.test(text);
}

export function listCarouselCards(slide: any): any[] {
  const data = slide?.data && typeof slide.data === 'object' ? slide.data : {};
  const ix = Array.isArray(slide?.interactions) ? slide.interactions[0] : null;
  const raw = data.cards ?? data.items ?? ix?.cards ?? ix?.items;
  return asCardArray(raw)
    .filter(isUsableCarouselCard)
    .map((c: any, i: number) => ({
      ...c,
      id: String(c.id || `c${i + 1}`),
      label: stripToPlain(c.label || c.title || `Card ${i + 1}`),
      description: stripToPlain(c.description || c.body || ''),
      expandedContent: stripToPlain(c.expandedContent || c.content || c.reveal || ''),
      color: coerceCarouselColor(c.color, i),
    }));
}

function usefulContentLines(content: unknown): string[] {
  return String(content || '')
    .split(/\n+/)
    .map(l => stripToPlain(l).replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''))
    .filter(l => l.length > 8 && !isCarouselChromeLine(l));
}

function fallbackCarouselCards(slide: any, moduleTitle = ''): any[] {
  const title = stripToPlain(slide?.title) || 'this topic';
  const lines = usefulContentLines(slide?.content);
  if (lines.length >= 2) {
    return lines.slice(0, 5).map((line, i) => ({
      id: `c${i + 1}`,
      label: line.split(/[.!?]/)[0].slice(0, 48).trim() || `Example ${i + 1}`,
      description: line,
      expandedContent: `${line} Review how this shows up in ${moduleTitle || 'this module'}.`,
      color: coerceCarouselColor(undefined, i),
    }));
  }
  const topic = title.replace(/^real-world\s+/i, '').trim() || title;
  const place = moduleTitle || 'this module';
  return [
    {
      id: 'c1',
      label: topic,
      description: `A representative example of ${topic}.`,
      expandedContent: `Look at how ${topic} appears in a real installation. Note the setting, equipment, and operating role in ${place}.`,
      color: coerceCarouselColor(undefined, 0),
    },
    {
      id: 'c2',
      label: `Where it is used`,
      description: `Typical sites and operating conditions for ${topic}.`,
      expandedContent: `Compare the conditions that make this example the right fit — head, flow, or duty — in ${place}.`,
      color: coerceCarouselColor(undefined, 1),
    },
    {
      id: 'c3',
      label: `What to notice on site`,
      description: `Visual cues that distinguish this example.`,
      expandedContent: `When you see this in the field, use those cues to confirm the type and operating intent from ${place}.`,
      color: coerceCarouselColor(undefined, 2),
    },
  ];
}

function stampCards(slide: any, cards: any[]): any {
  const colored = cards.map((c, i) => ({ ...c, color: coerceCarouselColor(c.color, i) }));
  const nextData = { ...(slide.data && typeof slide.data === 'object' ? slide.data : {}), cards: colored };
  const next: any = { ...slide, type: 'carousel-panel', data: nextData };
  if (Array.isArray(slide.interactions) && slide.interactions[0] && typeof slide.interactions[0] === 'object') {
    next.interactions = [
      { ...slide.interactions[0], cards: colored },
      ...slide.interactions.slice(1),
    ];
  }
  return next;
}

/**
 * Empty carousel (or content that promised one) gets real cards.
 * Idempotent when 2+ usable cards already exist.
 */
export function ensureCarouselCards(slide: any, moduleTitle = ''): any {
  if (!slide || typeof slide !== 'object') return slide;
  const type = String(slide.type || '');
  const promised = type === 'content' && contentPromisesCarousel(slide);
  if (type !== 'carousel-panel' && !promised) return slide;
  const existing = listCarouselCards(slide);
  if (existing.length >= 2) {
    return type === 'carousel-panel' ? stampCards(slide, existing) : slide;
  }
  if (existing.length === 1 && type === 'carousel-panel') {
    return stampCards(slide, existing);
  }
  return stampCards(slide, existing.length ? existing : fallbackCarouselCards(slide, moduleTitle));
}
