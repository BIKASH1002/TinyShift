import type { Evidence } from './weeklyReview.ts';
export interface AdjustmentHabit {
  id: string;
  name: string;
  anchor: string;
  normal_version: string;
  minimum_version: string;
  updated_at: string;
}
export interface Adjustment {
  field: 'anchor' | 'normal_version';
  before: string;
  after: string;
  rationale: string;
}
export interface SavedAdjustment extends Adjustment {
  id: string;
  habit_id: string;
  week_start: string;
  habit_updated_at: string;
  evidence: Evidence;
  status: 'pending' | 'accepted' | 'rejected';
}
export function eligibleForAdjustment(e: Evidence) {
  return e.normal + e.minimum + e.skipped >= 3;
}
export function validateAdjustment(
  value: unknown,
  habit: AdjustmentHabit,
  evidence: Evidence,
): Adjustment | null {
  if (!eligibleForAdjustment(evidence)) throw new Error('Not enough recorded activity.');
  const row = value as { decision?: string; field?: string; after?: string; rationale?: string };
  if (!row || !['keep', 'change'].includes(row.decision || ''))
    throw new Error('Invalid adjustment decision.');
  if (row.decision === 'keep') return null;
  if (row.field !== 'anchor' && row.field !== 'normal_version')
    throw new Error('Unsupported adjustment field.');
  if (typeof row.after !== 'string' || !row.after.trim() || row.after.trim().length > 500)
    throw new Error('Invalid proposed action.');
  if (
    typeof row.rationale !== 'string' ||
    !row.rationale.trim() ||
    row.rationale.trim().length > 700
  )
    throw new Error('Invalid rationale.');
  const before = habit[row.field];
  if (typeof before !== 'string' || row.after.trim() === before.trim())
    throw new Error('Suggestion must change the selected field.');
  return { field: row.field, before, after: row.after.trim(), rationale: row.rationale.trim() };
}
export const adjustmentSchema = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['keep', 'change'] },
    field: { type: 'string', enum: ['anchor', 'normal_version'] },
    after: { type: 'string' },
    rationale: { type: 'string' },
  },
  required: ['decision', 'field', 'after', 'rationale'],
};
