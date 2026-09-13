import { userMessage } from './userMessage';
import supabase from './supabaseClient';
import { sessionUser } from './sessionUser';
import { invalidateHabitData } from './dataCache';
import { loadHabitRows, loadActivity } from './habitData';
import { localDate } from './routineEngine';
import { HabitDraft, validateDraft } from '../../backend/supabase/functions/_shared/habitDraft';
import { Activity } from './routineEngine';
import { CompletionMode, Habit, HabitCategory, HabitFrequency, RescueReason } from '../types';
export interface HabitServiceResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  status: 'done' | 'skipped';
  completed_at: string | null;
  completion_method: 'normal' | 'minimum';
  skip_reason: RescueReason | null;
  created_at: string;
}
interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  frequency: string | null;
  anchor: string | null;
  normal_version: string | null;
  minimum_version: string | null;
  motivation: string | null;
  is_active: boolean;
}
export interface HabitInput {
  name: string;
  category?: HabitCategory;
  frequency?: HabitFrequency;
  anchor: string;
  normalVersion: string;
  minimumVersion: string;
  motivation?: string;
}
const today = () => localDate();
const icon = (c: HabitCategory) =>
  c === 'Health'
    ? 'HeartPulse'
    : c === 'Focus'
      ? 'Brain'
      : c === 'Mood'
        ? 'Smile'
        : c === 'Learning'
          ? 'BookOpen'
          : 'Footprints';
const week = (done: boolean) => {
  const w = { M: false, T: false, W: false, T_day: false, F: false, S: false, S_day: false };
  const keys = ['S_day', 'M', 'T', 'W', 'T_day', 'F', 'S'] as const;
  w[keys[new Date().getDay()]] = done;
  return w;
};
async function user() {
  try {
    return { id: (await sessionUser()).id, error: null };
  } catch (e) {
    return { id: null, error: userMessage(e) };
  }
}
function map(row: HabitRow, log?: HabitLog): Habit {
  const category = (row.category || 'Health') as HabitCategory;
  return {
    id: row.id,
    name: row.name,
    category,
    frequency: (row.frequency || 'Daily') as HabitFrequency,
    anchor: row.anchor || 'After an existing routine',
    normalVersion: row.normal_version || row.name,
    minimumVersion: row.minimum_version || `Do one tiny step toward ${row.name}`,
    motivation: row.motivation || '',
    streak: log?.status === 'done' ? 1 : 0,
    weeklyAvg: 0,
    statusToday: log?.status || 'pending',
    completionMode: log?.completion_method || null,
    completedToday: log?.status === 'done',
    icon: icon(category),
    weeklyOverview: week(log?.status === 'done'),
  };
}
function habitFields(input: HabitInput) {
  const draft = validateDraft({
    ...input,
    category: input.category || 'Health',
    frequency: input.frequency || 'Daily',
    motivation: input.motivation || '',
  });
  return {
    name: draft.name,
    category: draft.category,
    frequency: draft.frequency,
    anchor: draft.anchor,
    normal_version: draft.normalVersion,
    minimum_version: draft.minimumVersion,
    motivation: draft.motivation,
  };
}
export async function createHabit(input: HabitInput): Promise<HabitServiceResult<Habit>> {
  try {
    const fields = habitFields(input);
    const u = await user();
    if (!u.id) return { success: false, error: u.error || undefined };
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...fields, user_id: u.id })
      .select()
      .single();
    if (!error) invalidateHabitData();
    return error
      ? { success: false, error: userMessage(error) }
      : { success: true, data: map(data as HabitRow) };
  } catch (e) {
    return { success: false, error: userMessage(e, 'Could not create habit.') };
  }
}

export interface EditableHabit {
  id: string;
  updatedAt: string;
  draft: HabitDraft;
}
export async function getEditableHabit(id: string): Promise<EditableHabit> {
  const u = await user();
  if (!u.id) throw new Error(u.error || 'Please sign in.');
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('id', id)
    .eq('user_id', u.id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(userMessage(error));
  if (!data) throw new Error('Habit is no longer available.');
  return {
    id: data.id,
    updatedAt: data.updated_at,
    draft: {
      name: data.name,
      anchor: data.anchor || '',
      normalVersion: data.normal_version || data.name,
      minimumVersion: data.minimum_version || '',
      motivation: data.motivation || '',
      category: data.category || 'Health',
      frequency: data.frequency || 'Daily',
    },
  };
}
export async function updateHabit(id: string, input: HabitInput, updatedAt: string) {
  const fields = habitFields(input);
  const u = await user();
  if (!u.id) throw new Error(u.error || 'Please sign in.');
  const { data, error } = await supabase
    .from('habits')
    .update(fields)
    .eq('id', id)
    .eq('user_id', u.id)
    .eq('is_active', true)
    .eq('updated_at', updatedAt)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(userMessage(error));
  if (!data)
    throw new Error(
      'This habit changed or was deleted. Close the editor and open it again before saving.',
    );
  invalidateHabitData();
}
// Delete only the displayed snapshot; a newer completion in another tab is not undone.
export async function undoHabitLog(log: Activity) {
  if (!log.id) throw new Error('Reload the plan before undoing this record.');
  if (log.log_date !== localDate())
    throw new Error('The day changed. Reload Today before undoing.');
  const u = await user();
  if (!u.id) throw new Error(u.error || 'Please sign in.');
  let query = supabase
    .from('habit_logs')
    .delete()
    .eq('id', log.id)
    .eq('user_id', u.id)
    .eq('habit_id', log.habit_id)
    .eq('log_date', log.log_date)
    .eq('status', log.status)
    .eq('completion_method', log.completion_method);
  query = log.completed_at
    ? query.eq('completed_at', log.completed_at)
    : query.is('completed_at', null);
  query = log.skip_reason
    ? query.eq('skip_reason', log.skip_reason)
    : query.is('skip_reason', null);
  const { data, error } = await query.select('id');
  if (error) throw new Error(userMessage(error));
  if (!data?.length) throw new Error('This record has changed. Reload Today before undoing it.');
  invalidateHabitData();
}
export async function getTodayHabits(): Promise<HabitServiceResult<Habit[]>> {
  const u = await user();
  if (!u.id) return { success: false, error: u.error || undefined };
  try {
    const day = today();
    const [rows, activity] = await Promise.all([loadHabitRows(u.id), loadActivity(u.id, day)]);
    const logs = activity.filter((log) => log.log_date === day);
    let habits = [...rows].reverse().map((row) =>
      map(
        row,
        logs.find((log) => log.habit_id === row.id),
      ),
    );
    if ([0, 6].includes(new Date().getDay()))
      habits = habits.filter((h) => h.frequency !== 'Weekdays');
    return { success: true, data: habits };
  } catch (error) {
    return { success: false, error: userMessage(error) };
  }
}
async function saveLog(
  habitId: string,
  status: 'done' | 'skipped',
  mode: CompletionMode = 'normal',
  reason: RescueReason | null = null,
): Promise<HabitServiceResult<HabitLog>> {
  const u = await user();
  if (!u.id) return { success: false, error: u.error || undefined };
  const payload = {
    habit_id: habitId,
    user_id: u.id,
    log_date: today(),
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
    completion_method: mode,
    skip_reason: reason,
  };
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(payload, { onConflict: 'habit_id,log_date' })
    .select()
    .single();
  if (!error) invalidateHabitData();
  return error
    ? { success: false, error: userMessage(error) }
    : { success: true, data: data as HabitLog };
}
export const markHabitDone = (id: string, mode: CompletionMode = 'normal') =>
  saveLog(id, 'done', mode);
export const skipHabit = (id: string, reason: RescueReason) =>
  saveLog(id, 'skipped', 'normal', reason);
export async function deleteHabit(id: string): Promise<HabitServiceResult> {
  try {
    const u = await user();
    if (!u.id) return { success: false, error: u.error || undefined };
    const { data, error } = await supabase
      .from('habits')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', u.id)
      .select('id')
      .maybeSingle();
    if (error) return { success: false, error: userMessage(error) };
    if (!data) return { success: false, error: 'Habit not found or no longer accessible.' };
    invalidateHabitData();
    return { success: true };
  } catch (error) {
    return { success: false, error: userMessage(error, 'Could not delete habit. Please retry.') };
  }
}
export async function getHabitLogs(id: string): Promise<HabitServiceResult<HabitLog[]>> {
  const u = await user();
  if (!u.id) return { success: false, error: u.error || undefined };
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', id)
    .eq('user_id', u.id)
    .order('log_date', { ascending: false });
  return error
    ? { success: false, error: userMessage(error) }
    : { success: true, data: (data || []) as HabitLog[] };
}
