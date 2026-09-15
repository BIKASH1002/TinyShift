export type HabitCategory = 'Health' | 'Focus' | 'Mood' | 'Learning' | 'Movement' | 'Other';
export type HabitFrequency = 'Daily' | 'Weekdays' | 'Custom';
export type HabitStatus = 'pending' | 'done' | 'skipped';
export type CompletionMode = 'normal' | 'minimum';
export type RescueReason = 'low_energy' | 'no_time' | 'away' | 'forgot' | 'routine_changed';
export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  anchor: string;
  normalVersion: string;
  minimumVersion: string;
  motivation: string;
  streak: number;
  weeklyAvg: number;
  statusToday: HabitStatus;
  completionMode?: CompletionMode | null;
  completedToday: boolean;
  icon: string;
  weeklyOverview: Record<'M' | 'T' | 'W' | 'T_day' | 'F' | 'S' | 'S_day', boolean>;
  aiSuggestion?: string;
}
export interface RefreshSuggestion {
  id: string;
  title: string;
  reason: string;
  category: string;
  image?: string;
  icon: string;
  isCustom?: boolean;
}
export interface WeeklyInsight {
  id: string;
  title: string;
  value?: string | number;
  label: string;
  icon: string;
  colorClass: string;
}
export interface UserProfile {
  name: string;
  avatarUrl: string;
  routineStreak: number;
  rescuedHabitsCount: number;
  consistency: number;
}
