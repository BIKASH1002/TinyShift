export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export interface Routine {
  id: string;
  name: string;
  anchor: string;
  normal_version: string;
  minimum_version: string;
  frequency: string;
  created_at: string;
}
export interface Activity {
  id?: string;
  completed_at?: string | null;
  habit_id: string;
  log_date: string;
  status: string;
  completion_method: string;
  skip_reason: string | null;
  rescue_action?: string | null;
}
export interface Context {
  energy: 'low' | 'steady' | 'high';
  minutes: number;
}
export interface Pattern {
  habitId: string;
  name: string;
  done: number;
  minimum: number;
  skipped: number;
  unlogged: number;
  opportunities: number;
  reasons: Record<string, number>;
}
export interface Proposal {
  habit_id: string;
  field: 'normal_version' | 'anchor';
  before: string;
  after: string;
  evidence: string;
}
export const reasonLabels: Record<string, string> = {
  low_energy: 'low energy',
  no_time: 'limited time',
  away: 'being away',
  forgot: 'forgetting',
  routine_changed: 'changed plans',
};
export function shiftDate(value: string, days: number): string {
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function monday(value = localDate()): string {
  const weekday = new Date(value + 'T12:00:00').getDay();
  return shiftDate(value, -(weekday === 0 ? 6 : weekday - 1));
}
export function isScheduled(habit: Routine, day: string): boolean {
  return (
    localDate(new Date(habit.created_at)) <= day &&
    (habit.frequency !== 'Weekdays' || ![0, 6].includes(new Date(day + 'T12:00:00').getDay()))
  );
}

// Missing records remain unknown; they are never treated as skips.
export function analyze(
  habits: Routine[],
  logs: Activity[],
  start: string,
  end: string,
): Pattern[] {
  return habits.map((habit) => {
    const dates: string[] = [];
    for (let day = start; day <= end; day = shiftDate(day, 1)) {
      if (isScheduled(habit, day)) dates.push(day);
    }
    const records = new Map(
      logs.filter((l) => l.habit_id === habit.id).map((l) => [l.log_date, l]),
    );
    const pattern: Pattern = {
      habitId: habit.id,
      name: habit.name,
      done: 0,
      minimum: 0,
      skipped: 0,
      unlogged: 0,
      opportunities: dates.length,
      reasons: {},
    };
    dates.forEach((day) => {
      const log = records.get(day);
      if (log?.status === 'done') {
        pattern.done++;
        if (log.completion_method === 'minimum') pattern.minimum++;
      } else if (log?.status === 'skipped') {
        pattern.skipped++;
        if (log.skip_reason)
          pattern.reasons[log.skip_reason] = (pattern.reasons[log.skip_reason] || 0) + 1;
      } else pattern.unlogged++;
    });
    return pattern;
  });
}

export function dailyPlan(
  habits: Routine[],
  patterns: Pattern[],
  context: Context,
  day = localDate(),
) {
  return habits
    .filter((h) => isScheduled(h, day))
    .map((habit) => {
      const pattern = patterns.find((p) => p.habitId === habit.id);
      const struggling = pattern && (pattern.skipped >= 3 || pattern.minimum >= 3);
      const minimum = context.energy === 'low' || context.minutes <= 10 || struggling;
      return {
        habit,
        mode: minimum ? ('minimum' as const) : ('normal' as const),
        action: minimum ? habit.minimum_version : habit.normal_version,
        reason:
          context.energy === 'low'
            ? 'You reported low energy.'
            : context.minutes <= 10
              ? 'You have limited time available.'
              : struggling
                ? 'Recent logs suggest a smaller step may fit better.'
                : 'Start with your usual version. You can still make it smaller.',
      };
    });
}

// One proposed change per habit, with at least three explicit observations.
export function redesign(habits: Routine[], patterns: Pattern[]): Proposal[] {
  return habits.flatMap<Proposal>((habit) => {
    const p = patterns.find((p) => p.habitId === habit.id);
    if (!p || p.done + p.skipped < 3) return [];
    const pressure = (p.reasons.low_energy || 0) + (p.reasons.no_time || 0);
    if ((p.minimum >= 3 || pressure >= 3) && habit.normal_version !== habit.minimum_version) {
      return [
        {
          habit_id: habit.id,
          field: 'normal_version' as const,
          before: habit.normal_version,
          after: habit.minimum_version,
          evidence: `${p.minimum} tiny completions and ${pressure} skips linked to time or energy. Try a smaller regular target.`,
        },
      ];
    }
    if ((p.reasons.forgot || 0) >= 3 && !habit.anchor.startsWith('Immediately ')) {
      return [
        {
          habit_id: habit.id,
          field: 'anchor' as const,
          before: habit.anchor,
          after: `Immediately ${habit.anchor.charAt(0).toLowerCase()}${habit.anchor.slice(1)}`,
          evidence: `${p.reasons.forgot} days marked as skipped due to forgetting. Try acting immediately after your existing cue.`,
        },
      ];
    }
    return [];
  });
}
