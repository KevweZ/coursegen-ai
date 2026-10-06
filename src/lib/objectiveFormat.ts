import type { TerminalObjectiveGroup } from '../types/course';

/** Real ABCD degree/standard clauses — not everyday "to/with" phrases like "common to PE". */
const DEGREE_CLAUSE =
  /\s+(?:with\s+at\s+least\s+\d+%\s+accuracy|with\s+\d+%\s+accuracy|to\s+a\s+measurable\s+standard|to\s+at\s+least\s+\d+%\s+accuracy)\.?$/i;

const DANGLING_LAST = new Set([
  'according', 'common', 'associated', 'including', 'related', 'based', 'due',
  'such', 'as', 'of', 'to', 'with', 'for', 'in', 'on', 'by', 'and', 'or',
  'the', 'a', 'an',
]);

/** Drop a trailing incomplete word ("common", "according") left after a bad cut. */
export function repairDanglingObjectiveTail(text: string): string {
  const words = String(text || '')
    .trim()
    .replace(/\.+$/, '')
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 3) {
    const last = words[words.length - 1].replace(/[,:;]+$/g, '').toLowerCase();
    if (!DANGLING_LAST.has(last)) break;
    words.pop();
  }
  return words.join(' ').replace(/[,\s]+$/, '');
}

export function stripObjectiveCore(raw: string): { core: string; condition: string } {
  let s = String(raw || '').trim();
  let condition = '';
  const givenMatch = s.match(/^Given\s+([^,]+),\s+/i);
  if (givenMatch) {
    condition = givenMatch[1].trim();
    s = s.slice(givenMatch[0].length).trim();
  }
  s = s.replace(/^[Tt]he learner will\s+/i, '').trim();
  s = s.replace(/\.+$/, '').trim();
  s = s.replace(DEGREE_CLAUSE, '').trim();
  s = s.replace(/\.+$/, '').trim();
  s = repairDanglingObjectiveTail(s);
  return { core: s, condition };
}

function conditionFromVerb(core: string): string {
  const verb = core.split(/\s+/)[0]?.toLowerCase() ?? '';
  const verbConditionMap: Record<string, string> = {
    recall: 'a list of key terms',
    identify: 'a scenario',
    define: 'a glossary of terms',
    list: 'course content',
    name: 'a labeled diagram',
    recognize: 'practical examples',
    state: 'course content',
    label: 'a diagram or model',
    match: 'matching items',
    outline: 'course content',
    retrieve: 'course content',
    locate: 'a resource or document',
    describe: 'a written scenario',
    explain: 'a case study',
    summarize: 'a written report',
    classify: 'a set of examples',
    compare: 'two or more examples',
    contrast: 'two or more examples',
    interpret: 'a data set or report',
    paraphrase: 'a written passage',
    categorize: 'a set of items',
    distinguish: 'common challenges',
    illustrate: 'practical examples',
  };
  return verbConditionMap[verb] ?? 'relevant examples';
}

export function applyObjectiveFormat(raw: string, fmt: string): string {
  const { core, condition: existing } = stripObjectiveCore(raw);
  const condition = existing || conditionFromVerb(core);
  const s = core || 'complete the objective';
  switch (fmt) {
    case 'AB':
      return `The learner will ${s}.`;
    case 'ABC':
      return `Given ${condition}, the learner will ${s}.`;
    case 'ABCD':
      return `Given ${condition}, the learner will ${s} with at least 80% accuracy.`;
    default:
      return `The learner will ${s}.`;
  }
}

export function reformatObjectiveGroups(
  objectives: (string | TerminalObjectiveGroup)[],
  fmt: string,
): TerminalObjectiveGroup[] {
  return (objectives || []).map(obj => {
    if (typeof obj === 'string') {
      return { terminalObjective: applyObjectiveFormat(obj, fmt), enablingObjectives: [] };
    }
    return {
      terminalObjective: applyObjectiveFormat(obj.terminalObjective, fmt),
      enablingObjectives: (obj.enablingObjectives || []).map(e => applyObjectiveFormat(e, fmt)),
    };
  });
}
