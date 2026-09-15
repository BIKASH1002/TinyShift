export interface RescueSuggestion {
  kind: 'step' | 'pause';
  action: string;
  reason: string;
  seconds: number;
}
export interface RescuePreview {
  habitId: string;
  habitUpdatedAt: string;
  day: string;
  timeZone: string;
  suggestion: RescueSuggestion;
}
export function rescueDay(timeZone: unknown, now = new Date()): string {
  if (typeof timeZone !== 'string' || !timeZone || timeZone.length > 100)
    throw new Error('Choose a valid time zone.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}
export function validateRescueContext(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 5 || value.trim().length > 1000)
    throw new Error('Describe what is difficult in 5 to 1000 characters.');
  return value.trim();
}
export function validateRescueSuggestion(value: unknown): RescueSuggestion {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid rescue suggestion.');
  const row = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = row[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
      throw new Error('Invalid rescue suggestion.');
    return value.trim();
  };
  if (row.kind !== 'step' && row.kind !== 'pause')
    throw new Error('Invalid rescue suggestion.');
  if (
    !Number.isInteger(row.seconds) ||
    (row.kind === 'step'
      ? Number(row.seconds) < 1 || Number(row.seconds) > 60
      : row.seconds !== 0)
  )
    throw new Error('Invalid rescue duration.');
  return {
    kind: row.kind,
    action: text('action', 500),
    reason: text('reason', 400),
    seconds: row.seconds as number,
  };
}
export const rescueSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['step', 'pause'] },
    action: { type: 'string' },
    reason: { type: 'string' },
    seconds: { type: 'integer', minimum: 0, maximum: 60 },
  },
  required: ['kind', 'action', 'reason', 'seconds'],
};
