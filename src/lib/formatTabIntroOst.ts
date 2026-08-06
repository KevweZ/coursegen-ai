/**
 * Build richer Introduction OST for tabbed slides.
 * Prefers existing educational intro content; enriches thin intros from narration
 * into short bullets (same density as content tabs) — never a long paragraph.
 */

function isInstructionOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return (
    /^(select|choose|click|tap)\b/i.test(t) &&
    t.split(/\n/).filter(Boolean).length <= 2 &&
    !/[.!?].*[.!?]/s.test(t.replace(/select a tab.*/i, ''))
  );
}

function stripCta(text: string): string {
  return text
    .replace(/\n*Select a tab[^\n]*/gi, '')
    .replace(/\n*Choose a tab[^\n]*/gi, '')
    .trim();
}

function alreadyBulleted(text: string): boolean {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return /^[-*•]\s+/.test(text.trim());
  const bulletish = lines.filter(l => /^[-*•]\s+|^\d+[.)]\s+/.test(l)).length;
  return bulletish >= Math.ceil(lines.length * 0.5);
}

/** Shorten a sentence for on-screen bullet (keep meaning, avoid walls of text). */
function shortenForOst(sentence: string, maxWords = 12): string {
  const clean = sentence.replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function toBullets(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (alreadyBulleted(trimmed)) {
    return stripCta(trimmed)
      .split(/\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map(l => (/^[-*•]\s+|^\d+[.)]\s+/.test(l) ? l.replace(/^[-*•]\s+/, '- ').replace(/^\d+[.)]\s+/, '- ') : `- ${l}`))
      .join('\n');
  }

  const sentences = trimmed
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 12 && !/^(select|choose|click|tap)\b/i.test(s));

  if (!sentences.length) {
    return `- ${shortenForOst(trimmed, 14)}`;
  }

  const count = Math.min(5, Math.max(3, sentences.length >= 3 ? 4 : sentences.length));
  return sentences
    .slice(0, count)
    .map(s => `- ${shortenForOst(s)}`)
    .join('\n');
}

export function formatTabIntroOst(opts: {
  introContent?: string;
  voiceOverText?: string;
  title?: string;
}): string {
  const raw = (opts.introContent || '').trim();
  const vo = (opts.voiceOverText || '').trim();
  const topic = (opts.title || 'this topic').replace(/^Knowledge Check:\s*/i, '').trim();

  let body = '';

  if (raw && !isInstructionOnly(raw)) {
    body = stripCta(raw);
    const words = body.split(/\s+/).filter(Boolean).length;
    const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 8).length;
    // Thin OST + richer narration → lift key points into bullets
    if (words < 45 && sentences <= 2 && vo.length > body.length + 30) {
      body = toBullets(vo);
    } else {
      body = toBullets(body);
    }
  } else if (vo) {
    body = toBullets(vo);
  } else {
    body = [
      `- Introduces the core ideas behind ${topic}`,
      `- Shows how the concepts connect in practice`,
      `- Prepares you to explore each topic tab`,
    ].join('\n');
  }

  return body;
}
