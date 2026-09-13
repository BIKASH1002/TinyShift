-- Simple weekly insights and reflections
-- Analytics stay simple: the frontend reads habits/logs and saves a weekly snapshot here.
create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  completed_habits_count integer not null default 0,
  most_completed_habit text,
  most_skipped_habit text,
  reflection_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_reflections_one_per_user_week unique (user_id, week_start_date)
);

create index if not exists weekly_reflections_user_id_idx on public.weekly_reflections (user_id);

create index if not exists weekly_reflections_user_week_start_idx on public.weekly_reflections (user_id, week_start_date desc);

alter table public.weekly_reflections enable row level security;

create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Users can read their own weekly reflections" on public.weekly_reflections;

create policy "Users can read their own weekly reflections" on public.weekly_reflections
  for select to authenticated
  using (auth.uid () = user_id);

drop policy if exists "Users can insert their own weekly reflections" on public.weekly_reflections;

create policy "Users can insert their own weekly reflections" on public.weekly_reflections
  for insert to authenticated
  with check (auth.uid () = user_id);

drop policy if exists "Users can update their own weekly reflections" on public.weekly_reflections;

create policy "Users can update their own weekly reflections" on public.weekly_reflections
  for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

drop policy if exists "Users can delete their own weekly reflections" on public.weekly_reflections;

create policy "Users can delete their own weekly reflections" on public.weekly_reflections
  for delete to authenticated
  using (auth.uid () = user_id);

drop trigger if exists set_weekly_reflections_updated_at on public.weekly_reflections;

create trigger set_weekly_reflections_updated_at
  before update on public.weekly_reflections for each row
  execute function public.set_updated_at ();

