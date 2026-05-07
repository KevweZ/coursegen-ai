// ── Scenario Engine Types ─────────────────────────────────────────────────────

export interface ScenarioData {
  title: string;
  role: string;           // e.g. "Jordan Reyes, Operations Manager"
  introduction: string;   // Multi-paragraph scene-setter
  nodes: Record<string, ScenarioNode>;
  startNodeId: string;
  endings: ScenarioEnding[];
  competencies: string[];
  metadata: ScenarioMetadata;
}

export interface ScenarioNode {
  id: string;
  phase: number;
  label?: string;                   // Optional phase label shown in header
  type: 'single' | 'multi';
  multiSelectCount?: number;        // Exact number required for multi
  situation: string;                // Narrative context block
  question: string;
  options: ScenarioOption[];
  routing: RoutingRule[];           // Evaluated after consequence is read
}

export interface ScenarioOption {
  id: string;
  text: string;
  consequence: string;              // Narrative consequence shown after selection
  scoreDeltas: ScoreDeltas;
  nextNodeId?: string;              // Direct route (overrides routing rules)
}

export interface ScoreDeltas {
  trust?: number;
  risk?: number;                    // Positive = risk better managed
  morale?: number;
  accountability?: number;
  stakeholderConfidence?: number;
}

export type ScoreKey = keyof ScoreDeltas;

export interface RoutingRule {
  // Conditions: "always" | "else" | "score >= N" | "score < N"
  // | "multi_includes:optId" | "multi_excludes:optId"
  condition: string;
  nextNodeId: string;               // node ID, or "ending"
}

export interface ScenarioEnding {
  id: string;
  type: 'success' | 'partial' | 'negative';
  title: string;
  condition: string;                // "score >= N" | "score < N" | "else"
  narrative: string;
  outcomes: string[];
  competencyFeedback: string;
}

export interface ScenarioMetadata {
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  audience: string[];
}

// ── Engine Runtime State ──────────────────────────────────────────────────────

export interface ScenarioEngineState {
  phase: 'intro' | 'playing' | 'consequence' | 'ended';
  currentNodeId: string;
  completedNodeIds: string[];
  selectedOptions: Record<string, string[]>;  // nodeId → optionIds chosen
  scores: Record<ScoreKey, number>;
  pendingMultiSelections: string[];           // toggled but not confirmed
  endingId: string | null;
}

export const INITIAL_SCORES: Record<ScoreKey, number> = {
  trust: 0, risk: 0, morale: 0, accountability: 0, stakeholderConfidence: 0,
};

// ── Routing Evaluator ─────────────────────────────────────────────────────────

export function evaluateRouting(
  rules: RoutingRule[],
  scores: Record<ScoreKey, number>,
  lastSelectedIds: string[],
): string {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  for (const rule of rules) {
    if (rule.condition === 'always') return rule.nextNodeId;

    const sm = rule.condition.match(/^score\s*(>=|<=|>|<)\s*(-?\d+)$/);
    if (sm) {
      const num = parseInt(sm[2]);
      const pass = sm[1] === '>=' ? total >= num
                 : sm[1] === '<=' ? total <= num
                 : sm[1] === '>'  ? total > num
                 :                  total < num;
      if (pass) return rule.nextNodeId;
    }

    const mi = rule.condition.match(/^multi_includes:(.+)$/);
    if (mi && lastSelectedIds.includes(mi[1])) return rule.nextNodeId;

    const mx = rule.condition.match(/^multi_excludes:(.+)$/);
    if (mx && !lastSelectedIds.includes(mx[1])) return rule.nextNodeId;

    if (rule.condition === 'else') return rule.nextNodeId;
  }
  return rules[rules.length - 1]?.nextNodeId ?? 'ending';
}

export function evaluateEnding(
  endings: ScenarioEnding[],
  scores: Record<ScoreKey, number>,
): ScenarioEnding {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  for (const e of endings) {
    if (e.condition === 'always' || e.condition === 'else') return e;
    const m = e.condition.match(/^score\s*(>=|<=|>|<)\s*(-?\d+)$/);
    if (m) {
      const num = parseInt(m[2]);
      const pass = m[1] === '>=' ? total >= num
                 : m[1] === '<=' ? total <= num
                 : m[1] === '>'  ? total > num
                 :                  total < num;
      if (pass) return e;
    }
  }
  return endings[endings.length - 1];
}

export function applyDeltas(
  scores: Record<ScoreKey, number>,
  deltas: ScoreDeltas,
): Record<ScoreKey, number> {
  const next = { ...scores };
  (Object.entries(deltas) as [ScoreKey, number][]).forEach(([k, v]) => {
    next[k] = (next[k] ?? 0) + v;
  });
  return next;
}
