-- Supabase Auth profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;

create policy "Users can read their own profile" on public.profiles
  for select to authenticated
  using (auth.uid () = id);

drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid () = id);

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using (auth.uid () = id)
  with check (auth.uid () = id);

create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles for each row
  execute function public.set_updated_at ();

create or replace function public.create_profile_for_new_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
    values (new.id, new.raw_user_meta_data ->> 'full_name', new.email, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id)
    do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;

create trigger create_profile_after_signup
  after insert on auth.users for each row
  execute function public.create_profile_for_new_user ();

