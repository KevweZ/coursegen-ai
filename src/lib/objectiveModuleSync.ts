import { newCourseEntityId } from './courseSlideEdits';
import { shortenModuleTitle } from './splitCourseTitle';

export type ObjectiveSyncKind = 'none' | 'add' | 'remove' | 'reorder';

export type ObjectiveSyncChoice = 'placeholder' | 'reorder-modules' | 'overviews' | 'objectives-only';

export type ObjectiveSyncPlan = {
  kind: ObjectiveSyncKind;
  insertAt: number[];
  removeAt: number[];
};

export function terminalObjectiveText(obj: unknown): string {
  if (typeof obj === 'string') return obj.trim();
  if (obj && typeof obj === 'object') {
    return String((obj as any).terminalObjective || '').trim();
  }
  return '';
}

export function enablingObjectiveList(obj: unknown): string[] {
  if (!obj || typeof obj === 'string') return [];
  return ((obj as any).enablingObjectives || [])
    .map((e: unknown) => String(e || '').trim())
    .filter(Boolean);
}

function terminalKey(obj: unknown): string {
  return terminalObjectiveText(obj).toLowerCase();
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const k of a) counts.set(k, (counts.get(k) || 0) + 1);
  for (const k of b) {
    const n = counts.get(k) || 0;
    if (n < 1) return false;
    counts.set(k, n - 1);
  }
  return true;
}

/**
 * Diff previous vs next terminals against an already-generated module list.
 * Text-only edits (same count, not a reorder) are `none` — overviews already live-bind.
 */
export function planObjectiveModuleSync(
  previous: unknown[],
  next: unknown[],
  moduleCount: number,
): ObjectiveSyncPlan {
  const empty: ObjectiveSyncPlan = { kind: 'none', insertAt: [], removeAt: [] };
  if (!moduleCount) return empty;
  const prevKeys = (previous || []).map(terminalKey);
  const nextKeys = (next || []).map(terminalKey);
  if (prevKeys.join('\0') === nextKeys.join('\0')) return empty;

  const matchedPrev = new Set<number>();
  const insertAt: number[] = [];
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    const found = prevKeys.findIndex((pk, pi) => pk === key && key && !matchedPrev.has(pi));
    if (found >= 0) matchedPrev.add(found);
    else insertAt.push(i);
  }
  const removeAt = prevKeys.map((_, i) => i).filter(i => !matchedPrev.has(i));

  if (!insertAt.length && !removeAt.length) {
    return { kind: 'reorder', insertAt: [], removeAt: [] };
  }

  const sameCount = nextKeys.length === prevKeys.length;
  if (sameCount && insertAt.length === 1 && removeAt.length === 1) {
    return empty;
  }
  if (sameCount && !sameMultiset(prevKeys.filter(Boolean), nextKeys.filter(Boolean))) {
    return empty;
  }

  if (insertAt.length && nextKeys.length > prevKeys.length) {
    return { kind: 'add', insertAt, removeAt: [] };
  }
  if (removeAt.length && nextKeys.length < prevKeys.length) {
    return { kind: 'remove', insertAt: [], removeAt };
  }
  return empty;
}

export function needsObjectiveSyncPrompt(plan: ObjectiveSyncPlan): boolean {
  return plan.kind === 'add' || plan.kind === 'remove' || plan.kind === 'reorder';
}

export function buildPlaceholderModule(obj: unknown, index: number): {
  id: string;
  title: string;
  description: string;
  slides: any[];
} {
  const term = terminalObjectiveText(obj);
  const title = shortenModuleTitle(term) || `New module ${index + 1}`;
  return {
    id: newCourseEntityId('mod'),
    title,
    description: enablingObjectiveList(obj).join(' '),
    slides: [],
  };
}

export function applyOverviewTitles(course: any, nextObjectives: unknown[]): any {
  if (!course?.modules) return course;
  return {
    ...course,
    modules: course.modules.map((m: any, i: number) => {
      const obj = nextObjectives[i];
      if (!obj) return m;
      const title = shortenModuleTitle(terminalObjectiveText(obj)) || m.title;
      const description = enablingObjectiveList(obj).join(' ') || m.description;
      return { ...m, title, description };
    }),
  };
}

export function reorderModulesToObjectives(
  course: any,
  previousObjectives: unknown[],
  nextObjectives: unknown[],
): any {
  if (!course?.modules) return course;
  const keys = (previousObjectives || []).map(terminalKey);
  const source = course.modules.slice();
  const used = new Set<number>();
  const modules = (nextObjectives || []).map((obj) => {
    const key = terminalKey(obj);
    const idx = keys.findIndex((pk, i) => pk === key && !used.has(i));
    if (idx < 0 || idx >= source.length) return null;
    used.add(idx);
    return source[idx];
  }).filter(Boolean);
  if (modules.length !== source.length) return applyOverviewTitles(course, nextObjectives);
  return applyOverviewTitles({ ...course, modules }, nextObjectives);
}

export function objectiveSyncDialogCopy(plan: ObjectiveSyncPlan): {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  cancelLabel: string;
  primaryChoice: ObjectiveSyncChoice;
  secondaryChoice: ObjectiveSyncChoice;
} {
  const cancelLabel = 'Objectives slide only';
  if (plan.kind === 'reorder') {
    return {
      title: 'Match modules to the new objective order?',
      body: 'You reordered terminal objectives. Reordering modules keeps each module’s slides with its original objective. Updating titles and overviews only leaves teaching slides where they are.',
      primaryLabel: 'Reorder modules',
      secondaryLabel: 'Update titles & overviews only',
      cancelLabel,
      primaryChoice: 'reorder-modules',
      secondaryChoice: 'overviews',
    };
  }
  if (plan.kind === 'remove') {
    const many = plan.removeAt.length > 1;
    return {
      title: many ? 'Remove the matching modules?' : 'Remove the matching module?',
      body: 'You removed a terminal objective. Removing the matching module also removes its slides. Keeping modules leaves extra content that no longer has a terminal.',
      primaryLabel: many ? 'Remove matching modules' : 'Remove matching module',
      secondaryLabel: 'Keep modules, update overviews',
      cancelLabel,
      primaryChoice: 'placeholder',
      secondaryChoice: 'overviews',
    };
  }
  const many = plan.insertAt.length > 1;
  return {
    title: many ? 'Add placeholder modules for these objectives?' : 'Add a placeholder module for this objective?',
    body: 'Terminals map one-to-one with modules. A placeholder keeps existing teaching slides with their current modules. Fill the new module with Add content — a full generate from a one-line objective is skipped.',
    primaryLabel: many ? 'Add placeholder modules' : 'Add placeholder module',
    secondaryLabel: 'Update titles & overviews only',
    cancelLabel,
    primaryChoice: 'placeholder',
    secondaryChoice: 'overviews',
  };
}

export function applyObjectiveModuleSync(
  course: any,
  previousObjectives: unknown[],
  nextObjectives: unknown[],
  plan: ObjectiveSyncPlan,
  choice: ObjectiveSyncChoice,
): any {
  if (!course?.modules) return course;
  if (choice === 'objectives-only' || plan.kind === 'none') return course;

  if (choice === 'overviews') {
    return applyOverviewTitles(course, nextObjectives);
  }

  if (choice === 'placeholder' && plan.kind === 'add') {
    const modules = [...course.modules];
    for (const index of [...plan.insertAt].sort((a, b) => a - b)) {
      modules.splice(index, 0, buildPlaceholderModule(nextObjectives[index], index));
    }
    return applyOverviewTitles({ ...course, modules }, nextObjectives);
  }

  if (choice === 'reorder-modules' && plan.kind === 'reorder') {
    return reorderModulesToObjectives(course, previousObjectives, nextObjectives);
  }

  if (choice === 'placeholder' && plan.kind === 'remove') {
    const drop = new Set(plan.removeAt);
    const modules = course.modules.filter((_: any, i: number) => !drop.has(i));
    return applyOverviewTitles({ ...course, modules }, nextObjectives);
  }

  return course;
}
