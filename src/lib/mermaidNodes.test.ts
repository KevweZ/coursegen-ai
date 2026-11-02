import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  appendFlowchartNode,
  isDiagramType,
  isFlowchartMermaid,
  parseFlowchartNodes,
  removeFlowchartNode,
  rewriteFlowchartNodeLabel,
  sanitizeMermaidCode,
} from './mermaidNodes.ts';

const SAMPLE = `flowchart TD
  A([Cracked Gas 200°C, 25 barg]) --> B[Recovery Exchangers]
  B --> C{C5+ Heavy Hydrocarbons?}
  C -->|Yes| D[Light Naphtha (Product)]
  C -->|No| E[Cooled Gas 70°C]
  classDef blue fill:#dbeafe,stroke:#2563eb,color:#0f172a
  class B,E blue`;

test('flowchart nodes parse stadium, box, and decision labels', () => {
  const nodes = parseFlowchartNodes(SAMPLE);
  assert.equal(nodes.length, 5);
  assert.equal(nodes[0].id, 'A');
  assert.match(nodes[0].label, /Cracked Gas/);
  assert.equal(nodes[0].shape, 'stadium');
  assert.equal(nodes.find(n => n.id === 'C')?.shape, 'diamond');
  assert.match(nodes.find(n => n.id === 'D')?.label || '', /Light Naphtha/);
});

test('rewrite, remove, and append keep the rest of the flow', () => {
  const renamed = rewriteFlowchartNodeLabel(SAMPLE, 'B', 'Recovery heat exchangers');
  assert.match(renamed, /Recovery heat exchangers/);
  assert.doesNotMatch(renamed, /Recovery Exchangers/);

  const removed = removeFlowchartNode(SAMPLE, 'C');
  assert.doesNotMatch(removed, /C5\+ Heavy/);
  assert.match(removed, /Recovery Exchangers/);
  assert.equal(parseFlowchartNodes(removed).some(n => n.id === 'C'), false);

  const added = appendFlowchartNode(SAMPLE, {
    fromId: 'E',
    label: 'Flare knockout',
    shape: 'rect',
  });
  const nodes = parseFlowchartNodes(added);
  assert.equal(nodes.length, 6);
  assert.match(added, /Flare knockout/);
  assert.match(added, /E --> F/);
});

test('quoted labels with parentheses survive sanitize', () => {
  const code = 'flowchart TD\n  A[Check Suite Availability (fast path)] --> B[Done]';
  const out = sanitizeMermaidCode(code);
  assert.match(out, /"Check Suite Availability \(fast path\)"/);
  assert.equal(isFlowchartMermaid(code), true);
  assert.equal(isDiagramType('diagram'), true);
  assert.equal(isDiagramType('content'), false);
});

test('Edit Slide hides leftover diagram OST and binds shape fields', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const fields = readFileSync(resolve(process.cwd(), 'src/components/builder/EditSlideItemFields.tsx'), 'utf8');
  assert.match(app, /isDiagramType\(editingSlide\.type\) \? null/);
  assert.match(fields, /parseFlowchartNodes/);
  assert.match(fields, /Add a shape/);
});
