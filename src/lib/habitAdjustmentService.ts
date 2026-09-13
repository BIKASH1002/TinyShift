import { userMessage } from './userMessage';
import supabase from './supabaseClient';
import { SavedAdjustment } from '../../backend/supabase/functions/_shared/habitAdjustment';
import { currentUserId } from './routineService';
import { readCache, invalidateHabitData, invalidateCache } from './dataCache';
export async function loadAIAdjustments(
  weekStart: string,
  force = false,
): Promise<SavedAdjustment[]> {
  const userId = await currentUserId();
  return readCache(
    userId,
    'adjustments:' + weekStart,
    async () => {
      const { data, error } = await supabase
        .from('ai_habit_adjustments')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .order('created_at');
      if (error) throw new Error('We could not load your AI suggestions. Please try again later.');
      return (data || []) as SavedAdjustment[];
    },
    force,
  );
}
export async function decideAIAdjustment(
  id: string,
  accept: boolean,
): Promise<SavedAdjustment['status']> {
  const { data, error } = await supabase.rpc('decide_ai_habit_adjustment', {
    proposal_id: id,
    accept_change: accept,
  });
  if (error) throw new Error(userMessage(error));
  if (data !== 'accepted' && data !== 'rejected')
    throw new Error('Unexpected decision response. Reload before retrying.');
  invalidateHabitData();
  return data;
}
export async function generateAIAdjustment(habitId: string): Promise<{
  proposal: SavedAdjustment | null;
  start: string;
  end: string;
  message?: string;
}> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please sign in again.');
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(
      import.meta.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/create-habit-adjustment',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          habitId,
          consent: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(result?.error || 'AI suggestion unavailable. Your habit is unchanged.');
    if (
      !result ||
      typeof result.start !== 'string' ||
      (result.proposal !== null &&
        (typeof result.proposal?.id !== 'string' || result.proposal.habit_id !== habitId))
    )
      throw new Error('Invalid suggestion response. Reload your saved suggestions.');
    invalidateCache('adjustments:');
    return result;
  } catch (e) {
    if (controller.signal.aborted)
      throw new Error(
        'AI took too long. Reload saved suggestions before retrying; a preview may have been saved, but no habit was changed.',
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
