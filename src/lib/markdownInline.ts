/**
 * markdownInline.ts
 * Shared lightweight Markdown → HTML converter for all interaction components.
 *
 * Supports: **bold**, nested bullet lists (2-space or tab indent), inline code.
 * Nested items under a bold heading are indented as sub-bullets.
 */

const isHTML = (str: string): boolean => /<[a-z][\s\S]*>/i.test(str);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/ \u2014 /g, '\u00a0\u2014 ');
}

/**
 * Convert markdown (including nested lists) to HTML with theme-friendly list styles.
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';
  if (isHTML(text)) return text;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  let listDepth = 0;

  const closeLists = (toDepth: number) => {
    while (listDepth > toDepth) {
      out.push('</ul>');
      listDepth--;
    }
    if (listDepth === 0) inList = false;
  };

  const openList = (depth: number) => {
    while (listDepth < depth) {
      const pad = listDepth === 0 ? '1.1rem' : '1.35rem';
      out.push(
        `<ul class="md-list" style="padding-left:${pad};margin:0.35rem 0;list-style:disc;list-style-position:outside;">`
      );
      listDepth++;
      inList = true;
    }
  };

  for (const raw of lines) {
    const bulletMatch = raw.match(/^([ \t]*)([-*•])\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].replace(/\t/g, '  ').length;
      const depth = Math.min(3, Math.floor(indent / 2) + 1);
      const body = bulletMatch[3];

      // "Bold heading: rest" → treat rest as sibling content under same li when nested content follows
      openList(depth);
      closeLists(depth);
      out.push(`<li style="margin:0.28rem 0;padding-left:0.15rem;line-height:1.45;">${inlineFormat(body)}</li>`);
      continue;
    }

    // Non-bullet line
    closeLists(0);
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push('<br/>');
      continue;
    }
    out.push(`<p style="margin:0.35rem 0;line-height:1.5;">${inlineFormat(trimmed)}</p>`);
  }

  closeLists(0);
  return out.join('');
}

/** Short alias for dangerouslySetInnerHTML usage */
export const md = markdownToHtml;
