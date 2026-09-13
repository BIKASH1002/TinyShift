export interface Evidence {
  habitId: string;
  name: string;
  normal: number;
  minimum: number;
  skipped: number;
  reasons: Record<string, number>;
}
export interface Review {
  summary: string;
  observations: { habitId: string; interpretation: string; question: string }[];
}
export interface ReviewResult {
  start: string;
  end: string;
  evidence: Evidence[];
  review: Review | null;
}
export function completedWeek(timeZone: unknown, now = new Date()) {
  if (typeof timeZone !== 'string' || timeZone.length > 100) throw new Error('Invalid time zone.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const day = new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T12:00:00Z');
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7) - 7);
  const start = day.toISOString().slice(0, 10);
  day.setUTCDate(day.getUTCDate() + 6);
  return { start, end: day.toISOString().slice(0, 10) };
}
export function buildEvidence(
  habits: { id: string; name: string }[],
  logs: {
    habit_id: string;
    log_date: string;
    status: string;
    completion_method: string;
    skip_reason: string | null;
  }[],
  start: string,
  end: string,
): Evidence[] {
  return habits.map((h) => {
    const row: Evidence = {
      habitId: h.id,
      name: h.name.slice(0, 500),
      normal: 0,
      minimum: 0,
      skipped: 0,
      reasons: {},
    };
    const unique = new Map(
      logs
        .filter((l) => l.habit_id === h.id && l.log_date >= start && l.log_date <= end)
        .map((l) => [l.log_date, l]),
    );
    for (const log of unique.values()) {
      if (log.status === 'done') log.completion_method === 'minimum' ? row.minimum++ : row.normal++;
      if (log.status === 'skipped') {
        row.skipped++;
        if (
          log.skip_reason &&
          ['low_energy', 'no_time', 'away', 'forgot', 'routine_changed'].includes(log.skip_reason)
        )
          row.reasons[log.skip_reason] = (row.reasons[log.skip_reason] || 0) + 1;
      }
    }
    return row;
  });
}
export function validateReview(value: unknown, evidence: Evidence[]): Review {
  const row = value as Review;
  const text = (v: unknown, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max)
      throw new Error('Invalid review text.');
    return v.trim();
  };
  if (
    !row ||
    !Array.isArray(row.observations) ||
    row.observations.length < 1 ||
    row.observations.length > 3
  )
    throw new Error('Invalid observations.');
  const seen = new Set<string>();
  return {
    summary: text(row.summary, 1000),
    observations: row.observations.map((o) => {
      if (
        !o ||
        seen.has(o.habitId) ||
        !evidence.some((e) => e.habitId === o.habitId && e.normal + e.minimum + e.skipped > 0)
      )
        throw new Error('Observation references unsupported evidence.');
      seen.add(o.habitId);
      return {
        habitId: o.habitId,
        interpretation: text(o.interpretation, 700),
        question: text(o.question, 400),
      };
    }),
  };
}
export const reviewSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    observations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          habitId: { type: 'string' },
          interpretation: { type: 'string' },
          question: { type: 'string' },
        },
        required: ['habitId', 'interpretation', 'question'],
      },
    },
  },
  required: ['summary', 'observations'],
};
