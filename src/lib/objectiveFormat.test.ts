import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyObjectiveFormat,
  repairDanglingObjectiveTail,
  reformatObjectiveGroups,
} from './objectiveFormat.ts';

test('AB keeps "common to" and "according to" instead of chopping the sentence', () => {
  assert.equal(
    applyObjectiveFormat(
      'The learner will recall the major process steps common to PE and PP production.',
      'AB',
    ),
    'The learner will recall the major process steps common to PE and PP production.',
  );
  assert.equal(
    applyObjectiveFormat(
      'The learner will classify the major types of natural and synthetic polymers, including PE and PP variants, according to density and branching.',
      'AB',
    ),
    'The learner will classify the major types of natural and synthetic polymers, including PE and PP variants, according to density and branching.',
  );
});

test('ABCD still strips a real accuracy clause then reapplies it', () => {
  const next = applyObjectiveFormat(
    'Given a case study, the learner will explain catalyst choice with at least 80% accuracy.',
    'ABCD',
  );
  assert.match(next, /explain catalyst choice with at least 80% accuracy\.$/);
  assert.equal((next.match(/80% accuracy/g) || []).length, 1);
});

test('dangling "common" / "according" tails are dropped on already-cut strings', () => {
  assert.equal(
    repairDanglingObjectiveTail('The learner will recall the major process steps common'),
    'The learner will recall the major process steps',
  );
  assert.equal(
    applyObjectiveFormat(
      'The learner will classify the major types of natural and synthetic polymers, including PE and PP variants, according.',
      'AB',
    ),
    'The learner will classify the major types of natural and synthetic polymers, including PE and PP variants.',
  );
});

test('enabling "associated" tails are repaired with the group reformat', () => {
  const next = reformatObjectiveGroups(
    [{
      terminalObjective: 'The learner will recall the major process steps common.',
      enablingObjectives: [
        'The learner will identify the end use applications associated.',
      ],
    }],
    'AB',
  );
  assert.equal(next[0].terminalObjective, 'The learner will recall the major process steps.');
  assert.equal(next[0].enablingObjectives[0], 'The learner will identify the end use applications.');
});
