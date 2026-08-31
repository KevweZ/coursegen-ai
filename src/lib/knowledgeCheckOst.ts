import { coerceOstText } from './formatTabIntroOst';

/**
 * Knowledge-check on-screen text should frame the TASK, not teach the answers.
 * Colon-heavy "term: meaning" lists and long prose are treated as cheat sheets
 * and dropped in the player (teaching belongs in feedback after submit).
 */
export function knowledgeCheckFramingOst(content: unknown): string {
  const text = coerceOstText(content).trim();
  if (!text) return '';

  const lines = text
    .split('\n')
    .map(l => l.replace(/^\s*[-*•]\s*/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!lines.length) return '';

  const colonTeaching = lines.filter(l => /:\s+\S/.test(l)).length >= 2;
  const longProse = lines.filter(l => l.split(/\s+/).length > 14).length >= 2;
  if (colonTeaching || longProse) return '';

  if (lines.length > 2) {
    return lines.slice(0, 2).map(l => `- ${l}`).join('\n');
  }
  return text;
}
