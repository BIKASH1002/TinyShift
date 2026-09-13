-- Core habit system
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text,
  frequency text,
  reminder_time text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid (),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  status text not null,
  completed_at timestamptz,
  completion_method text not null,
  created_at timestamptz not null default now(),
  constraint habit_logs_one_log_per_habit_per_date unique (habit_id, log_date),
  constraint habit_logs_status_check check (status in ('done', 'skipped')),
  constraint habit_logs_completion_method_check check (completion_method in ('normal', 'minimum'))
);

create index if not exists habits_user_id_idx on public.habits (user_id);

create index if not exists habits_user_active_idx on public.habits (user_id, is_active);

create index if not exists habit_logs_user_id_idx on public.habit_logs (user_id);

create index if not exists habit_logs_habit_id_idx on public.habit_logs (habit_id);

create index if not exists habit_logs_log_date_idx on public.habit_logs (log_date);

alter table public.habits enable row level security;

alter table public.habit_logs enable row level security;

create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Users can read their own habits" on public.habits;

create policy "Users can read their own habits" on public.habits
  for select to authenticated
  using (auth.uid () = user_id);

drop policy if exists "Users can insert their own habits" on public.habits;

create policy "Users can insert their own habits" on public.habits
  for insert to authenticated
  with check (auth.uid () = user_id);

drop policy if exists "Users can update their own habits" on public.habits;

create policy "Users can update their own habits" on public.habits
  for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

drop policy if exists "Users can delete their own habits" on public.habits;

create policy "Users can delete their own habits" on public.habits
  for delete to authenticated
  using (auth.uid () = user_id);

drop policy if exists "Users can read their own habit logs" on public.habit_logs;

create policy "Users can read their own habit logs" on public.habit_logs
  for select to authenticated
  using (auth.uid () = user_id);

drop policy if exists "Users can insert their own habit logs" on public.habit_logs;

create policy "Users can insert their own habit logs" on public.habit_logs
  for insert to authenticated
  with check (auth.uid () = user_id
  and exists (
    select
      1
    from
      public.habits
    where
      habits.id = habit_logs.habit_id
      and habits.user_id = auth.uid ()));

drop policy if exists "Users can update their own habit logs" on public.habit_logs;

create policy "Users can update their own habit logs" on public.habit_logs
  for update to authenticated
  using (auth.uid () = user_id
    and exists (
      select
        1
      from
        public.habits
      where
        habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid ()))
  with check (auth.uid () = user_id
  and exists (
    select
      1
    from
      public.habits
    where
      habits.id = habit_logs.habit_id
      and habits.user_id = auth.uid ()));

drop policy if exists "Users can delete their own habit logs" on public.habit_logs;

create policy "Users can delete their own habit logs" on public.habit_logs
  for delete to authenticated
  using (auth.uid () = user_id
    and exists (
      select
        1
      from
        public.habits
      where
        habits.id = habit_logs.habit_id
        and habits.user_id = auth.uid ()));

drop trigger if exists set_habits_updated_at on public.habits;

create trigger set_habits_updated_at
  before update on public.habits for each row
  execute function public.set_updated_at ();

