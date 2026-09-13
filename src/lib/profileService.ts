import { userMessage } from './userMessage';
import supabase from './supabaseClient';
import { sessionUser } from './sessionUser';
import { readCache, putCache } from './dataCache';
export interface AccountProfile {
  name: string;
  email: string;
  updatedAt: string | null;
  avatarUrl: string | null;
}
export function validateProfileName(value: string) {
  const name = value.trim();
  if (!name || name.length > 100) throw new Error('Enter a name between 1 and 100 characters.');
  return name;
}
async function account() {
  return sessionUser();
}
export async function loadProfile(force = false): Promise<AccountProfile> {
  const user = await account();
  return readCache(
    user.id,
    'profile',
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name,avatar_url,updated_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw new Error(userMessage(error));
      return {
        name: data?.full_name ?? user.user_metadata?.full_name ?? '',
        email: user.email || '',
        updatedAt: data?.updated_at || null,
        avatarUrl: data?.avatar_url || null,
      };
    },
    force,
  );
}
export async function saveProfile(
  name: string,
  updatedAt: string | null,
  avatarUrl?: string | null,
): Promise<AccountProfile> {
  const full_name = validateProfileName(name);
  const user = await account();
  const fields = { full_name, ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}) };
  const query = updatedAt
    ? supabase.from('profiles').update(fields).eq('id', user.id).eq('updated_at', updatedAt)
    : supabase.from('profiles').insert({ id: user.id, ...fields, email: user.email });
  const { data, error } = await query.select('full_name,avatar_url,updated_at').maybeSingle();
  if (error?.code === '23505' || (!error && !data))
    throw new Error('Your profile changed elsewhere. Reload the profile before saving.');
  if (error) throw new Error(userMessage(error));
  const saved = {
    name: data.full_name,
    email: user.email || '',
    updatedAt: data.updated_at,
    avatarUrl: data.avatar_url || null,
  };
  putCache(user.id, 'profile', saved);
  return saved;
}
