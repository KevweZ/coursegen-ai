/**
 * Parse and rewrite flowchart mermaid so authors can edit shape labels
 * without a full diagram builder.
 */

export const MAX_DIAGRAM_NODES = 12;

export type FlowchartShape = 'rect' | 'diamond' | 'round' | 'stadium' | 'circle';

export type FlowchartNode = {
  id: string;
  label: string;
  shape: FlowchartShape;
};

const NODE_TOKEN =
  /(^|[\s;])([A-Za-z][\w-]*)(\(\[[^\]]*\]\)|\(\([^)]*\)\)|\[[^\]]*\]|\{[^{}]*\}|\([^)]*\))/g;

const RESERVED = new Set([
  'flowchart', 'graph', 'subgraph', 'end', 'classDef', 'class', 'click', 'style',
  'linkStyle', 'direction', 'TD', 'TB', 'BT', 'LR', 'RL',
]);

/** Tokens mermaid treats as syntax, not ids — `classDef end` is a parse error. */
const CLASSDEF_RESERVED = new Set([
  'end', 'subgraph', 'graph', 'flowchart', 'class', 'style', 'click', 'direction',
]);
const NODE_RESERVED = new Set(['end', 'subgraph', 'graph', 'flowchart']);

function aliasClassDefId(id: string): string {
  if (!CLASSDEF_RESERVED.has(id.toLowerCase())) return id;
  if (/style$/i.test(id)) return id;
  return `${id}Style`;
}

function aliasNodeId(id: string): string {
  if (!NODE_RESERVED.has(id.toLowerCase())) return id;
  if (/node$/i.test(id)) return id;
  return `${id}Node`;
}

/**
 * Rename reserved flowchart ids so generated diagrams can render.
 * `end` closes a subgraph — `classDef end` / a node named `end` never parse.
 */
export function rewriteReservedMermaidIds(code: string): string {
  let out = String(code || '');
  const classMap = new Map<string, string>();

  out = out.replace(/(^|\n)([ \t]*classDef[ \t]+)([A-Za-z][\w-]*)/g, (full, nl, kw, id) => {
    const next = aliasClassDefId(id);
    if (next === id) return full;
    classMap.set(id, next);
    return `${nl}${kw}${next}`;
  });

  out = out.replace(/(^|\n)([ \t]*class[ \t]+)([^\n]+)/g, (full, nl, kw, rest) => {
    const raw = String(rest || '').trimEnd();
    const m = raw.match(/^(.*?)([ \t]+)(\S+)([ \t]*)$/);
    if (!m) return full;
    let cls = m[3];
    if (classMap.has(cls)) cls = classMap.get(cls)!;
    const ids = m[1].split(',').map((part: string) => {
      const t = part.trim();
      if (!t) return part;
      const aliased = aliasNodeId(t);
      return aliased === t ? part : part.replace(t, aliased);
    }).join(',');
    return `${nl}${kw}${ids}${m[2]}${cls}${m[4]}`;
  });

  out = out.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;
    if (/^end$/i.test(trimmed)) return line;
    if (/^(classDef|class|click|style|linkStyle|direction|flowchart|graph|subgraph)\b/i.test(trimmed)) return line;
    return line.replace(
      /(^|[^\w-])(end|subgraph|graph|flowchart)(?=\[|\(|\{|-->|---|-\.|==>|\s|$)/gi,
      (_full, pre, id) => `${pre}${aliasNodeId(id)}`,
    );
  }).join('\n');

  return out;
}

export function isDiagramType(type?: string): boolean {
  return String(type || '') === 'diagram';
}

export function isFlowchartMermaid(code: string): boolean {
  const first = String(code || '')
    .split(/\n/)
    .map(l => l.trim())
    .find(l => l && !l.startsWith('%%'));
  return !!first && /^(flowchart|graph)\b/i.test(first);
}

export function unwrapMermaidLabel(raw: string): string {
  let s = String(raw || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s
    .replace(/#quot;/g, '"')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();
}

export function wrapMermaidLabel(label: string): string {
  const inner = String(label || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br/>')
    .replace(/"/g, '#quot;')
    .trim();
  if (!inner) return inner;
  if (/[()":;{}]/.test(inner) || /<br/i.test(inner)) {
    return `"${inner}"`;
  }
  return inner;
}

function parseShapeToken(token: string): { shape: FlowchartShape; label: string } | null {
  if (token.startsWith('([') && token.endsWith('])')) {
    return { shape: 'stadium', label: unwrapMermaidLabel(token.slice(2, -2)) };
  }
  if (token.startsWith('((') && token.endsWith('))')) {
    return { shape: 'circle', label: unwrapMermaidLabel(token.slice(2, -2)) };
  }
  if (token.startsWith('[') && token.endsWith(']')) {
    return { shape: 'rect', label: unwrapMermaidLabel(token.slice(1, -1)) };
  }
  if (token.startsWith('{') && token.endsWith('}')) {
    return { shape: 'diamond', label: unwrapMermaidLabel(token.slice(1, -1)) };
  }
  if (token.startsWith('(') && token.endsWith(')')) {
    return { shape: 'round', label: unwrapMermaidLabel(token.slice(1, -1)) };
  }
  return null;
}

function emitShape(shape: FlowchartShape, label: string): string {
  const wrapped = wrapMermaidLabel(label);
  switch (shape) {
    case 'diamond': return `{${wrapped}}`;
    case 'stadium': return `([${wrapped}])`;
    case 'circle': return `((${wrapped}))`;
    case 'round': return `(${wrapped})`;
    default: return `[${wrapped}]`;
  }
}

export function parseFlowchartNodes(code: string): FlowchartNode[] {
  if (!isFlowchartMermaid(code)) return [];
  const nodes = new Map<string, FlowchartNode>();
  const re = new RegExp(NODE_TOKEN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const id = m[2];
    if (!id || RESERVED.has(id)) continue;
    const parsed = parseShapeToken(m[3]);
    if (!parsed || !parsed.label) continue;
    if (!nodes.has(id)) {
      nodes.set(id, { id, label: parsed.label, shape: parsed.shape });
    }
  }
  return [...nodes.values()];
}

export function rewriteFlowchartNodeLabel(code: string, nodeId: string, label: string): string {
  const re = new RegExp(NODE_TOKEN.source, 'g');
  return String(code || '').replace(re, (full, prefix: string, id: string, token: string) => {
    if (id !== nodeId) return full;
    const parsed = parseShapeToken(token);
    if (!parsed) return full;
    return `${prefix}${id}${emitShape(parsed.shape, label)}`;
  });
}

function lineMentionsNode(line: string, nodeId: string): boolean {
  const stripped = line
    .replace(/\|[^|]*\|/g, ' ')
    .replace(/\(\[[^\]]*\]\)/g, ' ')
    .replace(/\(\([^)]*\)\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ');
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_-]|$)`);
  return re.test(stripped);
}

export function removeFlowchartNode(code: string, nodeId: string): string {
  const lines = String(code || '').split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push(line);
      continue;
    }
    if (/^(flowchart|graph)\b/i.test(trimmed) || trimmed.startsWith('%%')) {
      kept.push(line);
      continue;
    }
    if (/^classDef\b/i.test(trimmed) || /^(click|style|linkStyle|direction)\b/i.test(trimmed)) {
      kept.push(line);
      continue;
    }
    if (/^class\s+/i.test(trimmed)) {
      const next = trimmed
        .replace(new RegExp(`\\b${nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b,?\\s*`, 'g'), '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/, '')
        .replace(/^class\s+/i, 'class ')
        .trim();
      if (/^class\s+\S+/.test(next) && !/^class\s+$/i.test(next)) kept.push(next);
      continue;
    }
    if (lineMentionsNode(trimmed, nodeId)) continue;
    kept.push(line);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function nextFlowchartNodeId(existing: string[]): string {
  const used = new Set(existing);
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(65 + i);
    if (!used.has(id)) return id;
  }
  for (let n = 2; n < 100; n++) {
    const id = `N${n}`;
    if (!used.has(id)) return id;
  }
  return `N${Date.now()}`;
}

export function appendFlowchartNode(
  code: string,
  opts: { fromId: string; label: string; shape?: FlowchartShape },
): string {
  const nodes = parseFlowchartNodes(code);
  if (nodes.length >= MAX_DIAGRAM_NODES) return code;
  const fromId = String(opts.fromId || '').trim();
  if (!fromId || !nodes.some(n => n.id === fromId)) return code;
  const label = String(opts.label || '').trim();
  if (!label) return code;
  const id = nextFlowchartNodeId(nodes.map(n => n.id));
  const token = emitShape(opts.shape || 'rect', label);
  const edge = `  ${fromId} --> ${id}${token}`;
  const lines = String(code || '').split('\n');
  const classIdx = lines.findIndex(l => /^(classDef|class)\b/i.test(l.trim()));
  if (classIdx >= 0) {
    lines.splice(classIdx, 0, edge);
    return lines.join('\n');
  }
  return `${String(code || '').replace(/\s*$/, '')}\n${edge}`;
}

/**
 * Quote labels that contain mermaid syntax so a stray parenthesis never blanks the slide.
 */
export function sanitizeMermaidCode(code: string): string {
  let out = String(code || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');

  const wrapLabel = (label: string): string => {
    const inner = label.trim();
    if (!inner || /^".*"$/.test(inner)) return label;
    if (/[()":;{}]/.test(inner)) {
      return `"${inner.replace(/"/g, '#quot;')}"`;
    }
    return label;
  };

  out = out.replace(/\[([^\[\]]*)\]/g, (_m, label) => `[${wrapLabel(label)}]`);
  out = out.replace(/\{([^{}]*)\}/g, (_m, label) => `{${wrapLabel(label)}}`);
  out = out.replace(/\(([^()]*)\)/g, (_m, label) => `(${wrapLabel(label)})`);

  return rewriteReservedMermaidIds(out);
}

/** Last successful SVG plus mermaid source — both live on the slide JSON like imageUrl. */
export function diagramSourceCode(data: any): string {
  return String(data?.mermaidCode || data?.code || '').trim();
}

export function diagramSavedSvg(data: any): string {
  return String(data?.diagramSvg || '').trim();
}

export function diagramIsHidden(data: any): boolean {
  return !!data?.diagramHidden;
}

/**
 * Mermaid embeds a unique render id in every SVG. Comparing raw markup would
 * restamp the draft on every visit and retrigger mermaid (the left-right shake).
 */
export function diagramSvgFingerprint(svg: string): string {
  return String(svg || '')
    .replace(/id=(["'])[\s\S]*?\1/gi, '')
    .replace(/url\(#[^)]+\)/gi, 'url(#)')
    .replace(/mermaid-diagram-\d+(-\d+)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when a saved draft must still show a diagram (source and/or rendered SVG). */
export function diagramIsSaved(data: any): boolean {
  if (diagramIsHidden(data)) return false;
  return Boolean(diagramSourceCode(data) || diagramSavedSvg(data));
}

/** Fetch mermaid.core only when there is no saved SVG (or the author clicked Regenerate). */
export function diagramNeedsMermaidRender(data: any, force = false): boolean {
  if (force) return true;
  if (diagramIsHidden(data)) return false;
  if (diagramSavedSvg(data)) return false;
  return Boolean(diagramSourceCode(data));
}

export function stampDiagramSnapshot(course: any, slideId: string, svg: string, healedSource?: string): any {
  const id = String(slideId || '').trim();
  const nextSvg = String(svg || '').trim();
  if (!course?.modules || !id || !nextSvg) return course;
  const nextFp = diagramSvgFingerprint(nextSvg);
  const healed = String(healedSource || '').trim();
  let changed = false;
  const modules = course.modules.map((m: any) => ({
    ...m,
    slides: (m.slides || []).map((s: any) => {
      if (String(s?.id || '') !== id) return s;
      const existing = String(s?.data?.diagramSvg || '');
      const source = healed || diagramSourceCode(s.data);
      const nextData: any = { ...(s.data || {}) };
      if (healed && healed !== String(s?.data?.mermaidCode || '')) {
        nextData.mermaidCode = healed;
        nextData.code = healed;
      }
      if (existing && diagramSvgFingerprint(existing) === nextFp) {
        if (String(s?.data?.diagramSvgSource || '') === source
          && nextData.mermaidCode === s?.data?.mermaidCode) {
          return s;
        }
        changed = true;
        return { ...s, data: { ...nextData, diagramSvgSource: source } };
      }
      changed = true;
      return { ...s, data: { ...nextData, diagramSvg: nextSvg, diagramSvgSource: source } };
    }),
  }));
  return changed ? { ...course, modules } : course;
}

export function clearDiagramSnapshot(data: any): any {
  return {
    ...(data || {}),
    mermaidCode: '',
    code: '',
    diagramSvg: '',
    diagramSvgSource: '',
    diagramHidden: true,
  };
}
