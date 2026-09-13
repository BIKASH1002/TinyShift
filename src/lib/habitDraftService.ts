import supabase from './supabaseClient';
import {
  HabitDraft,
  validateDraft,
  validateGoal,
} from '../../backend/supabase/functions/_shared/habitDraft';
export async function generateHabitDraft(goal: string): Promise<HabitDraft> {
  const description = validateGoal(goal);
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please sign in before creating an AI draft.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(
      import.meta.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/create-habit-draft',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ goal: description }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        payload?.error || 'AI is unavailable. Try again or fill in your habit manually.',
      );
    return validateDraft(payload?.draft);
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error('AI took too long. Try again or create the habit manually.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
