import supabase from './supabaseClient';
// The session provides a query scope, not authorization. Supabase RLS still
// validates the JWT and ownership on every database read and write.
export async function sessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) throw new Error('Please sign in again.');
  return data.session.user;
}
