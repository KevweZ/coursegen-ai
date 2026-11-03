import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyObjectiveModuleSync,
  needsObjectiveSyncPrompt,
  objectiveSyncDialogCopy,
  planObjectiveModuleSync,
  terminalObjectiveText,
} from './objectiveModuleSync.ts';

const A = { terminalObjective: 'Describe furnace operation', enablingObjectives: ['Burners'] };
const B = { terminalObjective: 'Trace cracked-gas flow', enablingObjectives: ['Quench'] };
const C = { terminalObjective: 'Identify recovery products', enablingObjectives: ['C2'] };
const D = { terminalObjective: 'Explain utility systems', enablingObjectives: ['Steam'] };
const E = { terminalObjective: 'Apply safety interlocks', enablingObjectives: ['ESD'] };

function courseOf(...titles: string[]) {
  return {
    modules: titles.map((title, i) => ({
      id: `m${i + 1}`,
      title,
      slides: [{ id: `s${i + 1}`, type: 'content', title, content: `${title} body text for coverage` }],
    })),
  };
}

test('appending a fifth terminal plans a placeholder insert at the end', () => {
  const plan = planObjectiveModuleSync([A, B, C, D], [A, B, C, D, E], 4);
  assert.equal(plan.kind, 'add');
  assert.deepEqual(plan.insertAt, [4]);
  assert.equal(needsObjectiveSyncPrompt(plan), true);
});

test('inserting a terminal in the middle plans a placeholder at that index', () => {
  const plan = planObjectiveModuleSync([A, B, C, D], [A, E, B, C, D], 4);
  assert.equal(plan.kind, 'add');
  assert.deepEqual(plan.insertAt, [1]);
});

test('renaming one terminal does not prompt', () => {
  const renamed = { terminalObjective: 'Trace the cracked-gas compressor train', enablingObjectives: ['Quench'] };
  const plan = planObjectiveModuleSync([A, B, C, D], [A, renamed, C, D], 4);
  assert.equal(plan.kind, 'none');
  assert.equal(needsObjectiveSyncPrompt(plan), false);
});

test('reordering terminals plans a module reorder', () => {
  const plan = planObjectiveModuleSync([A, B, C, D], [A, C, B, D], 4);
  assert.equal(plan.kind, 'reorder');
});

test('placeholder insert keeps existing teaching slides on their modules', () => {
  const course = courseOf('Furnace', 'Cracked gas', 'Recovery', 'Utilities');
  const plan = planObjectiveModuleSync([A, B, C, D], [A, E, B, C, D], 4);
  const next = applyObjectiveModuleSync(course, [A, B, C, D], [A, E, B, C, D], plan, 'placeholder');
  assert.equal(next.modules.length, 5);
  assert.equal(next.modules[0].id, 'm1');
  assert.equal(next.modules[1].slides.length, 0);
  assert.equal(next.modules[2].id, 'm2');
  assert.equal(next.modules[2].slides[0].id, 's2');
  assert.match(next.modules[1].title, /Safety|Interlock/i);
});

test('objectives-only leaves the module list unchanged', () => {
  const course = courseOf('Furnace', 'Cracked gas', 'Recovery', 'Utilities');
  const plan = planObjectiveModuleSync([A, B, C, D], [A, B, C, D, E], 4);
  const next = applyObjectiveModuleSync(course, [A, B, C, D], [A, B, C, D, E], plan, 'objectives-only');
  assert.equal(next.modules.length, 4);
  assert.equal(next.modules[0].title, 'Furnace');
});

test('reorder-modules moves teaching slides with the objective', () => {
  const course = courseOf('Furnace', 'Cracked gas', 'Recovery', 'Utilities');
  const plan = planObjectiveModuleSync([A, B, C, D], [A, C, B, D], 4);
  const next = applyObjectiveModuleSync(course, [A, B, C, D], [A, C, B, D], plan, 'reorder-modules');
  assert.deepEqual(next.modules.map((m: any) => m.id), ['m1', 'm3', 'm2', 'm4']);
  assert.equal(next.modules[1].slides[0].id, 's3');
});

test('removing a terminal can drop the matching module', () => {
  const course = courseOf('Furnace', 'Cracked gas', 'Recovery', 'Utilities');
  const plan = planObjectiveModuleSync([A, B, C, D], [A, C, D], 4);
  assert.equal(plan.kind, 'remove');
  const next = applyObjectiveModuleSync(course, [A, B, C, D], [A, C, D], plan, 'placeholder');
  assert.equal(next.modules.length, 3);
  assert.deepEqual(next.modules.map((m: any) => m.id), ['m1', 'm3', 'm4']);
});

test('terminalObjectiveText reads grouped and string forms', () => {
  assert.equal(terminalObjectiveText(A), 'Describe furnace operation');
  assert.equal(terminalObjectiveText('  Plain terminal  '), 'Plain terminal');
});

test('Course objectives Save prompts instead of silently adding a module', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /planObjectiveModuleSync/);
  assert.match(app, /objectiveSyncPending/);
  assert.match(app, /commitCourseObjectives/);
  const add = objectiveSyncDialogCopy({ kind: 'add', insertAt: [4], removeAt: [] });
  assert.equal(add.primaryLabel, 'Add placeholder module');
  assert.equal(add.cancelLabel, 'Objectives slide only');
});
