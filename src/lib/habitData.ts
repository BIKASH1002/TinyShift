import supabase from './supabaseClient';
import { readCache } from './dataCache';
import { HabitLog } from './habitService';
import { shiftDate } from './routineEngine';
export interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  frequency: string;
  anchor: string;
  normal_version: string;
  minimum_version: string;
  motivation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export function loadHabitRows(id: string, force = false): Promise<HabitRow[]> {
  return readCache(
    id,
    'habits',
    async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', id)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    force,
  );
}
export function loadActivity(id: string, day: string, force = false): Promise<HabitLog[]> {
  return readCache(
    id,
    'activity:' + day,
    async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', id)
        .gte('log_date', shiftDate(day, -14))
        .lte('log_date', day);
      if (error) throw error;
      return data || [];
    },
    force,
  );
}
