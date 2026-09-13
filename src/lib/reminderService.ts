import { userMessage } from './userMessage';
import supabase from './supabaseClient';
import { currentUserId } from './routineService';
export interface ReminderPreferences {
  time_zone: string;
  daily_enabled: boolean;
  daily_time: string;
  weekly_enabled: boolean;
  weekly_time: string;
  last_checked_at?: string | null;
  last_error?: string | null;
}
export interface RoutineReminder {
  id: string;
  kind: 'daily' | 'weekly';
  period_start: string;
  created_at: string;
}
export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  const id = await currentUserId();
  const { data, error } = await supabase
    .from('routine_preferences')
    .select('*')
    .eq('user_id', id)
    .maybeSingle();
  if (error) throw new Error('We could not load your reminder settings. Please try again.');
  return (
    data || {
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      daily_enabled: false,
      daily_time: '20:00',
      weekly_enabled: false,
      weekly_time: '09:00',
    }
  );
}
export async function saveReminderPreferences(p: ReminderPreferences) {
  const zone = p.time_zone.trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format();
  } catch {
    throw new Error('Enter a valid time zone, such as Asia/Kolkata.');
  }
  if (
    !zone ||
    !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(p.daily_time) ||
    !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(p.weekly_time)
  )
    throw new Error('Choose valid reminder times.');
  const { error } = await supabase.rpc('save_routine_preferences', {
    zone,
    daily_on: p.daily_enabled,
    daily_at: p.daily_time,
    weekly_on: p.weekly_enabled,
    weekly_at: p.weekly_time,
  });
  if (error) throw new Error(userMessage(error));
}
export async function loadReminders(): Promise<RoutineReminder[]> {
  const id = await currentUserId();
  const { data, error } = await supabase
    .from('routine_reminders')
    .select('id,kind,period_start,created_at')
    .eq('user_id', id)
    .is('dismissed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error('Reminders could not load. You can still use your routine.');
  return data || [];
}
export async function dismissReminder(id: string) {
  const { error } = await supabase.rpc('dismiss_routine_reminder', { reminder_id: id });
  if (error) throw new Error(userMessage(error));
}
