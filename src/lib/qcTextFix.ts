/**
 * Safe QC text replacement: never dump AI commentary into a whole slide field.
 */

const META_HINT =
  /space before|consistent with|voiceOverText|on-screen text|OST usage|narration script|suggested fix/i;

/** Strip parenthetical / "A or B (because…)" commentary from a QC suggestion. */
export function cleanQcSuggestion(suggestion: string, originalText = ''): string {
  let t = String(suggestion || '').trim();
  if (!t) return '';
  t = t.replace(/\s*\([^)]*(?:space before|consistent with|voiceOverText|OST|narration|usage)[^)]*\)/gi, '').trim();
  if (META_HINT.test(String(suggestion || '')) && /\s+or\s+/i.test(t)) {
    t = t.split(/\s+or\s+/i)[0].trim();
  }
  t = t.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  if (META_HINT.test(t) && originalText && !t.includes(originalText) && originalText.length < 80) {
    return originalText;
  }
  return t || originalText;
}

function looksLikeCommentary(text: string): boolean {
  return META_HINT.test(text) || /\(space before/i.test(text);
}

/**
 * Apply a QC suggestion to one field value.
 * If originalText is a substring of the field, replace that span only.
 */
export function applyFieldTextFix(
  currentValue: unknown,
  originalText: string,
  suggestion: string,
): string {
  const current = currentValue == null ? '' : String(currentValue);
  const cleaned = cleanQcSuggestion(suggestion, originalText);
  if (!cleaned) return current;

  if (looksLikeCommentary(cleaned) && current.length > cleaned.length + 20) {
    return current;
  }

  const orig = String(originalText || '').trim();
  if (orig && current.includes(orig) && orig !== current.trim()) {
    return current.split(orig).join(cleaned);
  }
  if (orig && current.trim() === orig) return cleaned;

  // Whole-field replace is only safe when the field is already that snippet
  // (or empty). Never replace a long OST block with a short token/comment.
  if (current.trim().length > 120 && cleaned.length < Math.min(80, current.length * 0.4)) {
    if (orig && current.includes(orig)) return current.split(orig).join(cleaned);
    return current;
  }
  return cleaned;
}
