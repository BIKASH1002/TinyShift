export const categories = ['Health', 'Focus', 'Mood', 'Learning', 'Movement', 'Other'] as const;
export const frequencies = ['Daily', 'Weekdays'] as const;
export interface HabitDraft {
  name: string;
  anchor: string;
  normalVersion: string;
  minimumVersion: string;
  motivation: string;
  category: (typeof categories)[number];
  frequency: (typeof frequencies)[number];
}
export function validateDraft(value: unknown): HabitDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a habit draft.');
  const row = value as Record<string, unknown>;
  const labels: Record<string, string> = {
    name: 'Habit name',
    anchor: 'When this happens',
    normalVersion: 'Normal version',
    minimumVersion: 'Tiny version',
    motivation: 'Why it matters',
  };
  const text = (key: string, optional = false) => {
    if (typeof row[key] !== 'string')
      throw new Error('Please fill in ' + labels[key].toLowerCase() + '.');
    const result = (row[key] as string).trim();
    if (!optional && !result) throw new Error('Please fill in ' + labels[key].toLowerCase() + '.');
    if (result.length > 500) throw new Error(labels[key] + ' must be 500 characters or fewer.');
    return result;
  };
  if (!categories.includes(row.category as HabitDraft['category']))
    throw new Error('Choose a supported category.');
  if (!frequencies.includes(row.frequency as HabitDraft['frequency']))
    throw new Error('Choose Daily or Weekdays.');
  return {
    name: text('name'),
    anchor: text('anchor'),
    normalVersion: text('normalVersion'),
    minimumVersion: text('minimumVersion'),
    motivation: text('motivation', true),
    category: row.category as HabitDraft['category'],
    frequency: row.frequency as HabitDraft['frequency'],
  };
}
export function validateGoal(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 10 || value.trim().length > 1500)
    throw new Error('Describe your goal in 10 to 1500 characters.');
  return value.trim();
}
export const draftSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    anchor: { type: 'string' },
    normalVersion: { type: 'string' },
    minimumVersion: { type: 'string' },
    motivation: { type: 'string' },
    category: { type: 'string', enum: [...categories] },
    frequency: { type: 'string', enum: [...frequencies] },
  },
  required: [
    'name',
    'anchor',
    'normalVersion',
    'minimumVersion',
    'motivation',
    'category',
    'frequency',
  ],
};
