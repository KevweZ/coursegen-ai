/**
 * markdownInline.ts
 * Shared lightweight Markdown → HTML converter for all interaction components.
 *
 * Converts:  **bold**  ***bold+italic***  `code`  - bullet lists  and em-dash protection.
 * Safe:      returns existing HTML unchanged (isHTML guard).
 * Usage:     <span dangerouslySetInnerHTML={{ __html: md(text) }} />
 */

const isHTML = (str: string): boolean => /<[a-z][\s\S]*>/i.test(str);

export function markdownToHtml(text: string): string {
  if (!text) return '';
  if (isHTML(text)) return text; // already HTML — don't double-process
  return text
    // Bold + italic (***)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold (** or __)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic (* or _) — single asterisk/underscore
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bullet lists: lines starting with - or *
    .replace(/^[ \t]*[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> runs in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="padding-left:1.25rem;margin:0.4rem 0;list-style:disc">$1</ul>')
    // Prevent em-dash from orphaning at start of a new line
    .replace(/ \u2014 /g, '\u00a0\u2014 ')
    // Newlines → <br>
    .replace(/\n/g, '<br/>');
}

/** Short alias for dangerouslySetInnerHTML usage */
export const md = markdownToHtml;
