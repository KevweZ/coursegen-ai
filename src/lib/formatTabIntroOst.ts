/**
 * Build richer Introduction OST for tabbed slides.
 * Prefers existing educational intro content; enriches thin intros from narration
 * into short bullets (same density as content tabs) — never a long paragraph.
 *
 * Also exports formatTabOstBody for tab panel content: short multi-line phrases
 * become bullets; full sentences / paragraphs stay as prose.
 */

/** Bullet/list body with no real words — empty or punctuation-only (e.g. "-", "—", "•"). */
export function isSymbolOnlyOstLine(line: string): boolean {
  const body = String(line || '')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
  if (!body) return true;
  // No letters or digits — only dashes, bullets, arrows, dots, spaces, etc.
  return !/[A-Za-z0-9\u00C0-\u024F]/.test(body);
}

function isInstructionOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return (
    /^(select|choose|click|tap)\b/i.test(t) &&
    t.split(/\n/).filter(Boolean).length <= 2 &&
    !/[.!?].*[.!?]/s.test(t.replace(/select a tab.*/i, ''))
  );
}

/** Remove CTA lines entirely (including a leading bullet marker). */
function stripCta(text: string): string {
  return text
    .split(/\n/)
    .filter(line => {
      const body = line
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim();
      return !/^(select|choose)\s+a\s+tab\b/i.test(body);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function alreadyBulleted(text: string): boolean {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return /^[-*•]\s+/.test(text.trim());
  const bulletish = lines.filter(l => /^[-*•]\s+|^\d+[.)]\s+/.test(l)).length;
  return bulletish >= Math.ceil(lines.length * 0.5);
}

/** Drop blank / symbol-only OST lines so orphans like "• -" never reach the player. */
export function filterMeaningfulOstLines(lines: string[]): string[] {
  return lines
    .map(l => l.trim())
    .filter(l => l.length > 0 && !isSymbolOnlyOstLine(l));
}

/**
 * Sanitize OST markdown/plain text for edit + display:
 * remove empty and symbol-only bullets; normalize remaining list markers.
 */
export function sanitizeOstText(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    // Strip empty / symbol-only list items from HTML (Edit Slide path)
    return raw
      .replace(/<li[^>]*>\s*(?:&nbsp;|&#8203;|[-–—*•·…→←]|&mdash;|&ndash;)?\s*<\/li>/gi, '')
      .replace(/<ul[^>]*>\s*<\/ul>/gi, '')
      .replace(/<ol[^>]*>\s*<\/ol>/gi, '');
  }

  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks
    .map(block => {
      const lines = filterMeaningfulOstLines(block.split(/\n/));
      if (!lines.length) return '';
      if (alreadyBulleted(block) || lines.every(l => /^[-*•]\s+|^\d+[.)]\s+/.test(l))) {
        return lines
          .map(l => {
            if (/^[-*•]\s+/.test(l)) return `- ${l.replace(/^[-*•]\s+/, '').trim()}`;
            if (/^\d+[.)]\s+/.test(l)) return `- ${l.replace(/^\d+[.)]\s+/, '').trim()}`;
            return `- ${l}`;
          })
          .filter(l => !isSymbolOnlyOstLine(l))
          .join('\n');
      }
      return lines.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
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
    return filterMeaningfulOstLines(
      stripCta(trimmed)
        .split(/\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, 6)
        .map(l => (/^[-*•]\s+|^\d+[.)]\s+/.test(l) ? l.replace(/^[-*•]\s+/, '- ').replace(/^\d+[.)]\s+/, '- ') : `- ${l}`))
    )
      .slice(0, 5)
      .join('\n');
  }

  const sentences = trimmed
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 12 && !/^(select|choose|click|tap)\b/i.test(s));

  if (!sentences.length) {
    const one = `- ${shortenForOst(trimmed, 14)}`;
    return isSymbolOnlyOstLine(one) ? '' : one;
  }

  const count = Math.min(5, Math.max(3, sentences.length >= 3 ? 4 : sentences.length));
  return filterMeaningfulOstLines(
    sentences.slice(0, count).map(s => `- ${shortenForOst(s)}`)
  ).join('\n');
}

export function formatTabIntroOst(opts: {
  introContent?: string;
  voiceOverText?: string;
  title?: string;
}): string {
  const raw = sanitizeOstText(opts.introContent || '').trim();
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

  return sanitizeOstText(body);
}

/**
 * Format tab panel OST for display.
 * - Short multi-line phrases (bullet-shaped) → markdown bullets
 * - Already-bulleted markdown → normalize markers
 * - Sentence paragraphs after a list stay as prose (split by blank line)
 * - Long sentence-only blocks stay as paragraphs (no forced bullets)
 */
export function formatTabOstBody(text: string): string {
  const raw = sanitizeOstText(text || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw; // already HTML from rich editor (sanitized)

  // Split into blocks separated by blank lines so a bullet list + paragraph
  // after it (common AI pattern) can be handled independently.
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (!blocks.length) return raw;

  return blocks.map(block => {
    const lines = filterMeaningfulOstLines(block.split(/\n/));
    if (!lines.length) return '';

    if (alreadyBulleted(block) || lines.every(l => /^[-*•]\s+|^\d+[.)]\s+/.test(l))) {
      return lines
        .map(l => {
          if (/^[-*•]\s+/.test(l)) return `- ${l.replace(/^[-*•]\s+/, '')}`;
          if (/^\d+[.)]\s+/.test(l)) return `- ${l.replace(/^\d+[.)]\s+/, '')}`;
          return `- ${l}`;
        })
        .filter(l => !isSymbolOnlyOstLine(l))
        .join('\n');
    }

    const isShortPhrase = (l: string) => {
      const words = l.split(/\s+/).filter(Boolean).length;
      // Long sentences (or mid-length ending in .!?) stay prose
      if (words > 14) return false;
      if (words > 10 && /[.!?]$/.test(l)) return false;
      return true;
    };

    // Multi-line: leading short phrases → bullets; trailing prose stays paragraphs
    // e.g. 4 short rows + "Diffuser casings are common in high-pressure…"
    if (lines.length >= 2) {
      let splitAt = 0;
      while (splitAt < lines.length && isShortPhrase(lines[splitAt])) splitAt++;
      // Need at least 2 short lines to treat as a list
      if (splitAt >= 2) {
        const bullets = lines
          .slice(0, splitAt)
          .map(l => `- ${l.replace(/^[-*•]\s+/, '')}`)
          .filter(l => !isSymbolOnlyOstLine(l))
          .join('\n');
        const prose = lines.slice(splitAt).join('\n');
        return prose ? `${bullets}\n\n${prose}` : bullets;
      }
    }

    // Single short line or paragraph prose — leave alone
    return lines.join('\n');
  }).filter(Boolean).join('\n\n');
}
