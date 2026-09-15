import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  Routine,
  Activity,
  analyze,
  dailyPlan,
  redesign,
  monday,
  localDate,
  shiftDate,
} from '../src/lib/routineEngine';

const habit: Routine = {
  id: 'a',
  name: 'Read',
  anchor: 'After breakfast',
  normal_version: 'Read 20 pages',
  minimum_version: 'Read one page',
  frequency: 'Daily',
  created_at: '2026-08-01T00:00:00Z',
};
function logs(method = 'minimum', status = 'done', reason: string | null = null): Activity[] {
  return ['2026-08-24', '2026-08-25', '2026-08-26'].map((log_date) => ({
    habit_id: 'a',
    log_date,
    completion_method: method,
    status,
    skip_reason: reason,
  }));
}
test('Monday boundaries and calendar dates survive month boundaries', () => {
  assert.equal(monday('2026-09-06'), '2026-08-31');
  assert.equal(monday('2026-09-07'), '2026-09-07');
  assert.equal(shiftDate('2026-09-01', -1), '2026-08-31');
  assert.equal(localDate(new Date(2026, 8, 5, 0, 15)), '2026-09-05');
});
test('only scheduled dates count; missing logs are unknown', () => {
  const [p] = analyze(
    [{ ...habit, frequency: 'Weekdays' }],
    logs(),
    '2026-08-24',
    '2026-08-30',
  );
  assert.deepEqual(
    [p.opportunities, p.done, p.minimum, p.skipped, p.unlogged],
    [5, 3, 3, 0, 2],
  );
});
test('a new habit has no opportunities before creation', () => {
  const [p] = analyze(
    [{ ...habit, created_at: '2026-08-28T12:00:00Z' }],
    logs(),
    '2026-08-24',
    '2026-08-30',
  );
  assert.equal(p.opportunities, 3);
  assert.equal(p.done, 0);
});
test('logs outside period and duplicates cannot inflate counts', () => {
  const records = [...logs(), ...logs(), { ...logs()[0], log_date: '2027-01-01' }];
  assert.equal(analyze([habit], records, '2026-08-24', '2026-08-30')[0].done, 3);
});
test('energy and time guide version, without mutating habit', () => {
  for (const context of [
    { energy: 'low' as const, minutes: 60 },
    { energy: 'high' as const, minutes: 5 },
  ]) {
    assert.equal(dailyPlan([habit], [], context, '2026-09-05')[0].mode, 'minimum');
  }
  assert.equal(
    dailyPlan([habit], [], { energy: 'high', minutes: 30 }, '2026-09-05')[0].mode,
    'normal',
  );
  assert.equal(habit.normal_version, 'Read 20 pages');
});
test('weekday plans exclude weekends', () => {
  assert.equal(
    dailyPlan(
      [{ ...habit, frequency: 'Weekdays' }],
      [],
      { energy: 'low', minutes: 5 },
      '2026-09-05',
    ).length,
    0,
  );
});
test('three minimum completions trigger one smaller-target proposal', () => {
  const p = analyze([habit], logs(), '2026-08-24', '2026-08-30');
  const result = redesign([habit], p);
  assert.equal(result.length, 1);
  assert.equal(result[0].after, habit.minimum_version);
  assert.equal(
    dailyPlan([habit], p, { energy: 'high', minutes: 60 }, '2026-09-05')[0].mode,
    'minimum',
  );
});
test('two observations and entirely unlogged weeks do not trigger redesign', () => {
  assert.equal(
    redesign([habit], analyze([habit], logs().slice(0, 2), '2026-08-24', '2026-08-30')).length,
    0,
  );
  assert.equal(redesign([habit], analyze([habit], [], '2026-08-24', '2026-08-30')).length, 0);
});
test('explicit skip reasons determine the proposal', () => {
  const forgotten = analyze(
    [habit],
    logs('normal', 'skipped', 'forgot'),
    '2026-08-24',
    '2026-08-30',
  );
  assert.equal(redesign([habit], forgotten)[0].field, 'anchor');
  const pressure = analyze(
    [habit],
    logs('normal', 'skipped', 'no_time'),
    '2026-08-24',
    '2026-08-30',
  );
  assert.equal(redesign([habit], pressure)[0].field, 'normal_version');
});
test('already-small habits and previously tightened cues are not changed repeatedly', () => {
  const p = analyze([habit], logs(), '2026-08-24', '2026-08-30');
  assert.equal(redesign([{ ...habit, normal_version: habit.minimum_version }], p).length, 0);
  const forgotten = analyze(
    [habit],
    logs('normal', 'skipped', 'forgot'),
    '2026-08-24',
    '2026-08-30',
  );
  assert.equal(
    redesign([{ ...habit, anchor: 'Immediately after breakfast' }], forgotten).length,
    0,
  );
});
import { validateDraft, validateGoal } from '../backend/supabase/functions/_shared/habitDraft';

test('AI and manual drafts share strict validation', () => {
  const draft = {
    name: ' Read ',
    anchor: 'After breakfast',
    normalVersion: 'Read five pages',
    minimumVersion: 'Read one sentence',
    motivation: '',
    category: 'Learning',
    frequency: 'Daily',
  };
  assert.equal(validateDraft(draft).name, 'Read');
  assert.equal(validateDraft({ ...draft, category: 'Other' }).category, 'Other');
  for (const invalid of [
    null,
    [],
    {},
    { ...draft, name: ' ' },
    { ...draft, anchor: 42 },
    { ...draft, minimumVersion: 'x'.repeat(501) },
    { ...draft, category: 'Unsupported' },
    { ...draft, frequency: 'Custom' },
  ]) {
    assert.throws(() => validateDraft(invalid));
  }
  assert.equal(validateGoal('  I want to read more  '), 'I want to read more');
  for (const invalid of [undefined, '', 'short', 'x'.repeat(1501)])
    assert.throws(() => validateGoal(invalid));
});
import {
  eligibleForAdjustment,
  validateAdjustment,
} from '../backend/supabase/functions/_shared/habitAdjustment';

test('AI adjustments require evidence, supported fields and bounded changed text', () => {
  const habit = {
    id: 'read',
    name: 'Read',
    anchor: 'After tea',
    normal_version: 'Read 20 pages',
    minimum_version: 'Read one page',
    updated_at: '2026-09-07T00:00:00Z',
  };
  const evidence = {
    habitId: 'read',
    name: 'Read',
    normal: 0,
    minimum: 3,
    skipped: 0,
    reasons: {},
  };
  const candidate = {
    decision: 'change',
    field: 'normal_version',
    after: ' Read two pages ',
    rationale: 'A smaller step may fit.',
  };
  assert.equal(eligibleForAdjustment({ ...evidence, minimum: 2 }), false);
  assert.equal(validateAdjustment(candidate, habit, evidence)?.before, habit.normal_version);
  assert.equal(validateAdjustment(candidate, habit, evidence)?.after, 'Read two pages');
  assert.equal(validateAdjustment({ decision: 'keep' }, habit, evidence), null);
  assert.throws(() => validateAdjustment(candidate, habit, { ...evidence, minimum: 2 }));
  for (const invalid of [
    null,
    {},
    { ...candidate, field: 'frequency' },
    { ...candidate, after: ' ' },
    { ...candidate, after: 'x'.repeat(501) },
    { ...candidate, after: habit.normal_version },
    { ...candidate, rationale: 'x'.repeat(701) },
  ])
    assert.throws(() => validateAdjustment(invalid, habit, evidence));
});

test('rescue completions contribute to tiny completion totals', () => {
  const records = logs().map((log) => ({ ...log, rescue_action: 'Recall one idea.' }));
  const [pattern] = analyze([habit], records, '2026-08-24', '2026-08-30');
  assert.equal(pattern.done, 3);
  assert.equal(pattern.minimum, 3);
  assert.equal(pattern.skipped, 0);
});
