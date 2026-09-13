/** Keep infrastructure details out of alerts while preserving useful form feedback. */
export function userMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : '';
  if (!message) return fallback;
  if (/failed to fetch|fetch failed|network|load failed|connectivity/i.test(message))
    return 'We could not reach TinyShift. Check your internet connection or try again shortly; the service may be unavailable.';
  if (/invalid login credentials/i.test(message))
    return 'The email or password is incorrect. Please try again.';
  if (/email not confirmed/i.test(message))
    return 'Please verify your email before signing in. Check your inbox and spam folder.';
  if (/jwt|refresh token|session.*expired/i.test(message))
    return 'Please sign in again to continue.';
  if (/rate limit|too many requests|UTC|quota/i.test(message))
    return 'You have made too many requests. Please wait and try again later.';
  if (
    /phase\d|migration|schema|SQL|PGRST|relation |column |constraint|permission denied|row.level|API.key|GEMINI_|not configured|configuration|Edge Function|non.2xx|Unexpected token|JSON|stack trace/i.test(
      message,
    )
  )
    return 'This feature is temporarily unavailable. Please try again later.';
  return message;
}
