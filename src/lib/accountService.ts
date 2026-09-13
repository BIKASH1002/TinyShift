import { userMessage } from './userMessage';
import supabase from './supabaseClient';
export function validateNewPassword(password: string) {
  if (password.length < 10 || password.length > 128)
    throw new Error('Use a password between 10 and 128 characters.');
}
export async function requestPasswordReset(email: string) {
  const redirect = new URL(import.meta.env.BASE_URL, window.location.origin);
  redirect.searchParams.set('account', 'recovery');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirect.toString(),
  });
  if (error) throw new Error('Could not send the reset request. Wait a moment and try again.');
}
export async function updateAccountPassword(password: string) {
  validateNewPassword(password);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(userMessage(error));
}
export async function downloadAccountExport() {
  const { data, error } = await supabase.rpc('export_my_account');
  if (error) throw new Error('We could not download your data. Please try again later.');
  if (!data || data.format_version !== 1) throw new Error('Invalid export response.');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = 'tinyshift-export-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function deleteMyAccount(password: string, confirmation: string) {
  if (confirmation !== 'DELETE' || !password)
    throw new Error('Enter your current password and type DELETE.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please sign in again.');
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(
      import.meta.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/delete-account',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ password, confirmation }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.deleted)
      throw new Error(
        result?.error ||
          'Deletion status is uncertain. Check whether you can still sign in before retrying.',
      );
  } catch (e) {
    if (controller.signal.aborted)
      throw new Error(
        'Deletion status is uncertain because the request timed out. Check whether you can still sign in before retrying.',
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
