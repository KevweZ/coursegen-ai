/**
 * Legacy "IDENTIFY: rest" layout used to split Bloom verbs into a blue
 * label + hanging sentence. Teaching bullets must stay one sentence.
 */

const INSTRUCTIONAL_LEAD =
  /^(Describe|Identify|Explain|Understand)[:\s]+(.*)$/i;

const CONTINUATION =
  /^(and|or|to|the|a|an|your|their|its|his|her|our|this|that)\b/i;

export function splitInstructionalVerb(
  text: string,
  opts?: { inList?: boolean },
): { verb: string; rest: string } | null {
  if (opts?.inList) return null;
  const match = String(text || '').trim().match(INSTRUCTIONAL_LEAD);
  if (!match) return null;
  const rest = String(match[2] || '').trim();
  if (!rest || CONTINUATION.test(rest)) return null;
  if (rest.split(/\s+/).filter(Boolean).length < 4) return null;
  return { verb: match[1], rest };
}
