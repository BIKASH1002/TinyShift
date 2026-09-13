// @ts-nocheck -- Supabase Deno runtime, tested with mocked Auth clients.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST')
    return json({ error: 'This action is not supported. Please try again from the app.' }, 405);
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Please sign in.' }, 401);
    const url = Deno.env.get('SUPABASE_URL'),
      anon = Deno.env.get('SUPABASE_ANON_KEY');
    const options = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    };
    const caller = createClient(url, anon, {
      ...options,
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
      error,
    } = await caller.auth.getUser();
    if (error || !user) return json({ error: 'Please sign in again.' }, 401);
    let body;
    try {
      const raw = await req.text();
      if (raw.length > 2000) return json({ error: 'Request is too long.' }, 413);
      body = JSON.parse(raw);
      if (
        body.confirmation !== 'DELETE' ||
        typeof body.password !== 'string' ||
        !body.password ||
        body.password.length > 1024
      )
        return json({ error: 'Enter your current password and type DELETE.' }, 400);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (!user.email || user.factors?.some((f) => f.status === 'verified'))
      return json(
        {
          error:
            'This deletion flow supports email/password accounts without MFA. Contact the app administrator for assisted deletion.',
        },
        409,
      );
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey)
      return json(
        { error: 'Account deletion is temporarily unavailable. Please try again later.' },
        503,
      );
    const quota = await caller.rpc('reserve_account_deletion');
    if (quota.error)
      return json(
        { error: 'Account deletion is temporarily unavailable. Please try again later.' },
        503,
      );
    if (!quota.data)
      return json(
        { error: 'Wait 15 seconds between deletion attempts. You can try up to five times a day.' },
        429,
      );
    const verifier = createClient(url, anon, options);
    try {
      const checked = await verifier.auth.signInWithPassword({
        email: user.email,
        password: body.password,
      });
      if (checked.error || checked.data.user?.id !== user.id || !checked.data.session)
        return json({ error: 'Password verification failed. No account was deleted.' }, 403);
      if (checked.data.user.factors?.some((f) => f.status === 'verified'))
        return json({ error: 'This account requires an MFA-aware assisted deletion flow.' }, 409);
      const admin = createClient(url, serviceKey, options);
      // The target is always from validated Auth, never a request-body ID or email.
      const deleted = await admin.auth.admin.deleteUser(user.id, false);
      if (deleted.error)
        return json(
          { error: 'Account deletion failed. Try again later or contact the app administrator.' },
          502,
        );
      return json({ deleted: true });
    } finally {
      // Revoke the temporary verification session if deletion failed; never expose its tokens.
      await verifier.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  } catch {
    return json(
      {
        error:
          'Account deletion could not be completed. Check your account status before retrying.',
      },
      500,
    );
  }
});
