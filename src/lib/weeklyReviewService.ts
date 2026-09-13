import supabase from './supabaseClient';
import {
  ReviewResult,
  validateReview,
} from '../../backend/supabase/functions/_shared/weeklyReview';
export async function generateWeeklyReview(): Promise<ReviewResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please sign in again.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(
      import.meta.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/create-weekly-review',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          consent: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        result?.error || 'AI review is unavailable. You can still write your reflection.',
      );
    if (
      !result ||
      !Array.isArray(result.evidence) ||
      typeof result.start !== 'string' ||
      typeof result.end !== 'string'
    )
      throw new Error('Invalid weekly review response.');
    return {
      ...result,
      review: result.review === null ? null : validateReview(result.review, result.evidence),
    };
  } catch (e) {
    if (controller.signal.aborted)
      throw new Error('The review took too long. Your manual reflection is still available.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
