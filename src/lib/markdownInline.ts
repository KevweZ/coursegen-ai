/**
 * markdownInline.ts
 * Shared lightweight Markdown → HTML converter for all interaction components.
 *
 * Supports: **bold**, nested bullet lists (2-space or tab indent), inline code.
 * Nested items under a bold heading are indented as sub-bullets.
 * Lists use neutral markers; parent components may restyle via CSS.
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
 * Convert markdown (including nested lists) to HTML.
 * Avoid putting left padding on <ul> that fights parent CSS — markers are
 * drawn by the host component (e.g. VerticalTimeline accent squares).
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';
  if (isHTML(text)) return text;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let listDepth = 0;

  const closeLists = (toDepth: number) => {
    while (listDepth > toDepth) {
      out.push('</ul>');
      listDepth--;
    }
  };

  const openList = (depth: number) => {
    while (listDepth < depth) {
      out.push('<ul class="md-list">');
      listDepth++;
    }
  };

  for (const raw of lines) {
    const bulletMatch = raw.match(/^([ \t]*)([-*•])\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].replace(/\t/g, '  ').length;
      const depth = Math.min(3, Math.floor(indent / 2) + 1);
      const body = bulletMatch[3];
      openList(depth);
      closeLists(depth);
      out.push(`<li>${inlineFormat(body)}</li>`);
      continue;
    }

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
