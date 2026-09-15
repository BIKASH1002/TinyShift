import supabase from './supabaseClient';
import { invalidateHabitData } from './dataCache';
import { sessionUser } from './sessionUser';
import { localDate } from './routineEngine';
import { userMessage } from './userMessage';
import {
  RescuePreview,
  validateRescueContext,
  validateRescueSuggestion,
} from '../../backend/supabase/functions/_shared/rescueCoach';
export async function generateRescueStep(
  habitId: string,
  context: string,
  signal?: AbortSignal,
): Promise<RescuePreview> {
  const description = validateRescueContext(context);
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please sign in again.');
  const owner = data.session.user.id;
  const day = localDate(),
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, 35000);
  try {
    const response = await fetch(
      import.meta.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/create-rescue-step',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ habitId, context: description, consent: true, day, timeZone }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        result?.error || 'The coach is unavailable. Use your saved tiny version or try again.',
      );
    if (
      !result ||
      result.habitId !== habitId ||
      result.day !== day ||
      result.timeZone !== timeZone ||
      typeof result.habitUpdatedAt !== 'string' ||
      !Number.isFinite(Date.parse(result.habitUpdatedAt))
    )
      throw new Error('The coach returned an unusable suggestion. Please try again.');
    if ((await sessionUser()).id !== owner)
      throw new Error('Your account changed. Reopen Rescue.');
    if (day !== localDate())
      throw new Error('The day changed. Reopen Rescue for a fresh suggestion.');
    return {
      habitId,
      day,
      timeZone,
      habitUpdatedAt: result.habitUpdatedAt,
      suggestion: validateRescueSuggestion(result.suggestion),
    };
  } catch (e) {
    if (controller.signal.aborted)
      throw new Error(
        'The coach took too long or was cancelled. You can use your saved tiny version.',
      );
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
export async function completeRescueStep(preview: RescuePreview) {
  const suggestion = validateRescueSuggestion(preview.suggestion);
  if (suggestion.kind !== 'step')
    throw new Error('A pause is not a completion. You can skip today instead.');
  if (
    preview.day !== localDate() ||
    preview.timeZone !== Intl.DateTimeFormat().resolvedOptions().timeZone
  )
    throw new Error('The day or time zone changed. Reopen Rescue before completing.');
  const { data, error } = await supabase.rpc('complete_rescue_step', {
    p_habit_id: preview.habitId,
    p_action: suggestion.action,
    p_day: preview.day,
    p_time_zone: preview.timeZone,
    p_habit_updated_at: preview.habitUpdatedAt,
  });
  if (error) throw new Error(userMessage(error));
  if (
    !data ||
    data.habit_id !== preview.habitId ||
    data.log_date !== preview.day ||
    data.status !== 'done' ||
    data.completion_method !== 'minimum' ||
    data.rescue_action !== suggestion.action
  )
    throw new Error('Completion could not be confirmed. Reopen Today before trying again.');
  invalidateHabitData();
}
