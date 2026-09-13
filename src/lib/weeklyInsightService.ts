import { userMessage } from './userMessage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import supabase from './supabaseClient';
import { sessionUser } from './sessionUser';
import { readCache, putCache, invalidateCache } from './dataCache';
import { HabitLog } from './habitService';

export interface WeeklyInsightServiceResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WeeklyReflection {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  completed_habits_count: number;
  most_completed_habit: string | null;
  most_skipped_habit: string | null;
  reflection_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyInsights {
  weekStartDate: string;
  weekEndDate: string;
  completedHabitsCount: number;
  mostCompletedHabit: string | null;
  mostSkippedHabit: string | null;
  summaryText: string;
  reflectionText: string;
}

interface HabitNameRow {
  id: string;
  name: string;
}

interface SaveWeeklyReflectionInput {
  reflectionText: string;
  insights?: WeeklyInsights;
}

function getErrorMessage(error: unknown) {
  return userMessage(error, 'Something went wrong');
}

async function getLoggedInUserId(): Promise<WeeklyInsightServiceResult<string>> {
  try {
    return { success: true, data: (await sessionUser()).id };
  } catch (error) {
    return { success: false, error: userMessage(error) };
  }
}

function getDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - daysSinceMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    weekStartDate: getDateOnly(weekStart),
    weekEndDate: getDateOnly(weekEnd),
  };
}

function findTopHabitName(
  logs: HabitLog[],
  habitsById: Record<string, string>,
  status: 'done' | 'skipped',
) {
  const counts: Record<string, number> = {};

  logs
    .filter((log) => log.status === status)
    .forEach((log) => {
      counts[log.habit_id] = (counts[log.habit_id] || 0) + 1;
    });

  const topHabitId = Object.keys(counts).sort((firstId, secondId) => {
    return counts[secondId] - counts[firstId];
  })[0];

  return topHabitId ? habitsById[topHabitId] || null : null;
}

function buildSummaryText(completedCount: number, mostCompletedHabit: string | null) {
  if (completedCount === 0) {
    return 'No completions logged yet this week. Start with one small habit today.';
  }

  if (mostCompletedHabit) {
    return `You completed ${completedCount} habit${completedCount === 1 ? '' : 's'} this week. "${mostCompletedHabit}" is leading the way.`;
  }

  return `You completed ${completedCount} habit${completedCount === 1 ? '' : 's'} this week.`;
}

export async function getWeeklyInsights(
  force = false,
): Promise<WeeklyInsightServiceResult<WeeklyInsights>> {
  try {
    const userResult = await getLoggedInUserId();

    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error };
    }

    const { weekStartDate, weekEndDate } = getCurrentWeekRange();

    const id = userResult.data;
    const summary = await readCache(
      id,
      'week:' + weekStartDate,
      async () => {
        const [habitResult, logResult, reflectionResult] = await Promise.all([
          supabase.from('habits').select('id,name').eq('user_id', id),
          supabase
            .from('habit_logs')
            .select('habit_id,status,completion_method,log_date')
            .eq('user_id', id)
            .gte('log_date', weekStartDate)
            .lte('log_date', weekEndDate),
          supabase
            .from('weekly_reflections')
            .select('*')
            .eq('user_id', id)
            .eq('week_start_date', weekStartDate)
            .maybeSingle(),
        ]);
        for (const result of [habitResult, logResult, reflectionResult])
          if (result.error) throw result.error;
        const habitRows = habitResult.data;

        const habitsById = ((habitRows || []) as HabitNameRow[]).reduce<Record<string, string>>(
          (names, habit) => {
            names[habit.id] = habit.name;
            return names;
          },
          {},
        );

        const logs = (logResult.data || []) as HabitLog[];
        const completedHabitsCount = logs.filter((log) => log.status === 'done').length;
        const mostCompletedHabit = findTopHabitName(logs, habitsById, 'done');
        const mostSkippedHabit = findTopHabitName(logs, habitsById, 'skipped');

        return {
          weekStartDate,
          weekEndDate,
          completedHabitsCount,
          mostCompletedHabit,
          mostSkippedHabit,
          summaryText: buildSummaryText(completedHabitsCount, mostCompletedHabit),
          reflectionText: (reflectionResult.data as WeeklyReflection | null)?.reflection_text || '',
        };
      },
      force,
    );
    return { success: true, data: summary };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function saveWeeklyReflection(
  input: SaveWeeklyReflectionInput,
): Promise<WeeklyInsightServiceResult<WeeklyReflection>> {
  try {
    const userResult = await getLoggedInUserId();

    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error };
    }

    const insightsResult = input.insights ? null : await getWeeklyInsights(true);

    if (insightsResult && (!insightsResult.success || !insightsResult.data)) {
      return { success: false, error: insightsResult.error };
    }

    const insights = input.insights || insightsResult?.data;

    if (!insights) {
      return { success: false, error: 'Weekly insights could not be prepared.' };
    }

    // Upsert keeps one editable reflection per user per week.
    const { data, error } = await supabase
      .from('weekly_reflections')
      .upsert(
        {
          user_id: userResult.data,
          week_start_date: insights.weekStartDate,
          week_end_date: insights.weekEndDate,
          completed_habits_count: insights.completedHabitsCount,
          most_completed_habit: insights.mostCompletedHabit,
          most_skipped_habit: insights.mostSkippedHabit,
          reflection_text: input.reflectionText.trim() || null,
        },
        { onConflict: 'user_id,week_start_date' },
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: userMessage(error) };
    }

    putCache(userResult.data, 'week:' + insights.weekStartDate, {
      ...insights,
      reflectionText: input.reflectionText.trim(),
    });
    invalidateCache('history:');
    return { success: true, data: data as WeeklyReflection };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getPreviousReflections(
  force = false,
): Promise<WeeklyInsightServiceResult<WeeklyReflection[]>> {
  try {
    const userResult = await getLoggedInUserId();

    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error };
    }

    const { weekStartDate } = getCurrentWeekRange();
    const id = userResult.data;
    const history = await readCache(
      id,
      'history:' + weekStartDate,
      async () => {
        const { data, error } = await supabase
          .from('weekly_reflections')
          .select('*')
          .eq('user_id', id)
          .lt('week_start_date', weekStartDate)
          .order('week_start_date', { ascending: false })
          .limit(12);

        if (error) {
          throw error;
        }

        return (data || []) as WeeklyReflection[];
      },
      force,
    );
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
