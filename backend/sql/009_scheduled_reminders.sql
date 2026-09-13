begin;
create table if not exists public.routine_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  time_zone text not null default 'UTC',
  daily_enabled boolean not null default false,
  daily_time time not null default '20:00',
  weekly_enabled boolean not null default false,
  weekly_time time not null default '09:00',
  weekly_prepared_for date,
  last_checked_at timestamptz,
  last_error text
);
create index if not exists routine_preferences_due on public.routine_preferences (last_checked_at)
where
  daily_enabled or weekly_enabled;
create table if not exists public.routine_reminders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('daily', 'weekly')),
  period_start date not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  dismissed_at timestamptz,
  unique (user_id, kind, period_start)
);
create index if not exists routine_reminders_inbox on public.routine_reminders (user_id, expires_at)
where
  dismissed_at is null;
alter table public.routine_preferences enable row level security;
alter table public.routine_reminders enable row level security;
revoke all on public.routine_preferences, public.routine_reminders from public, anon, authenticated;
grant select on public.routine_preferences, public.routine_reminders to authenticated;
drop policy if exists read_own_routine_preferences on public.routine_preferences;
create policy read_own_routine_preferences on public.routine_preferences
  for select to authenticated
  using (user_id = auth.uid ());
drop policy if exists read_own_routine_reminders on public.routine_reminders;
create policy read_own_routine_reminders on public.routine_reminders
  for select to authenticated
  using (user_id = auth.uid ());
create or replace function public.save_routine_preferences (zone text, daily_on boolean, daily_at time, weekly_on boolean, weekly_at time)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  if auth.uid () is null then
    raise exception 'Please sign in.';
  end if;
  if zone is null or not exists (
    select
      1
    from
      pg_timezone_names
    where
      name = zone) or daily_on is null or weekly_on is null or daily_at is null or weekly_at is null or daily_at >= time '24:00' or weekly_at >= time '24:00' then
    raise exception 'Choose a valid time zone and reminder times.';
  end if;
  insert into public.routine_preferences (user_id, time_zone, daily_enabled, daily_time, weekly_enabled, weekly_time)
    values (auth.uid (), zone, daily_on, daily_at, weekly_on, weekly_at)
  on conflict (user_id)
    do update set
      time_zone = excluded.time_zone,
      daily_enabled = excluded.daily_enabled,
      daily_time = excluded.daily_time,
      weekly_enabled = excluded.weekly_enabled,
      weekly_time = excluded.weekly_time,
      last_checked_at = null,
      last_error = null;
  update
    public.routine_reminders
  set
    dismissed_at = coalesce(dismissed_at, now())
  where
    user_id = auth.uid ()
    and ((kind = 'daily'
        and not daily_on)
      or (kind = 'weekly'
        and not weekly_on));
end;
$$;
create or replace function public.dismiss_routine_reminder (reminder_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  if auth.uid () is null then
    raise exception 'Please sign in.';
  end if;
  update
    public.routine_reminders
  set
    dismissed_at = coalesce(dismissed_at, now())
  where
    id = reminder_id
    and user_id = auth.uid ();
  if not found then
    raise exception 'Reminder not found.';
  end if;
end;
$$;
revoke all on function public.save_routine_preferences (text, boolean, time, boolean, time) from public;
revoke all on function public.dismiss_routine_reminder (uuid) from public;
grant execute on function public.save_routine_preferences (text, boolean, time, boolean, time) to authenticated;
grant execute on function public.dismiss_routine_reminder (uuid) to authenticated;
-- Owner-only entry point for pg_cron. No network, AI calls, or habit mutations.
create or replace function public.process_routine_schedule (run_at timestamptz default now(), batch_size integer default 100)
  returns integer
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  p public.routine_preferences;
  local_now timestamp;
  today date;
  week date;
  handled integer := 0;
begin
  if run_at is null or batch_size is null or batch_size not between 1 and 500 then
    raise exception 'Invalid job parameters.';
  end if;
  for p in
  select
    *
  from
    public.routine_preferences
  where (daily_enabled
    or weekly_enabled)
    and (last_checked_at is null
      or last_checked_at <= run_at - interval '4 minutes')
  order by
    last_checked_at nulls first,
    user_id
  limit batch_size
  for update
    skip locked loop
      begin
        local_now := run_at at time zone p.time_zone;
        today := local_now::date;
        week := date_trunc('week', local_now)::date;
        if p.weekly_enabled and p.weekly_prepared_for is distinct from week and (today > week or local_now::time >= p.weekly_time) then
          -- Match the on-demand rules: scheduled prior-week records only, missing is unknown.
          with counts as (
            select
              h.id,
              h.normal_version,
              h.minimum_version,
              h.anchor,
              count(*) as records,
              count(*) filter (where l.status = 'done'
                and l.completion_method = 'minimum') as tiny,
              count(*) filter (where l.status = 'skipped'
                and l.skip_reason in ('no_time', 'low_energy')) as pressure,
              count(*) filter (where l.status = 'skipped'
                and l.skip_reason = 'forgot') as forgot
            from
              public.habits h
              join public.habit_logs l on l.habit_id = h.id
                and l.user_id = p.user_id
            where
              h.user_id = p.user_id
              and h.is_active
              and l.log_date >= week - 7
              and l.log_date < week
              and l.log_date >= (h.created_at at time zone p.time_zone)::date
              and (coalesce(h.frequency, 'Daily') <> 'Weekdays'
                or extract(isodow from l.log_date) <= 5)
            group by
              h.id
),
candidates as (
  select
    id,
    case when (tiny >= 3
      or pressure >= 3)
      and normal_version <> minimum_version then
      'normal_version'
    else
      'anchor'
    end as field,
    case when (tiny >= 3
      or pressure >= 3)
      and normal_version <> minimum_version then
      normal_version
    else
      anchor
    end as before,
    case when (tiny >= 3
      or pressure >= 3)
      and normal_version <> minimum_version then
      minimum_version
    else
      'Immediately ' || lower(
      left (anchor, 1)) || substr(anchor, 2)
    end as after,
    case when (tiny >= 3
      or pressure >= 3)
      and normal_version <> minimum_version then
      tiny || ' tiny completions and ' || pressure || ' skips linked to time or energy. Try a smaller regular target.'
    else
      forgot || ' explicit skips due to forgetting. Try acting immediately after your existing cue.'
    end as evidence
  from
    counts
  where
    records >= 3
    and (((tiny >= 3
          or pressure >= 3)
        and normal_version <> minimum_version)
      or (forgot >= 3
        and anchor not like 'Immediately %'))
)
insert into public.routine_proposals (user_id, habit_id, week_start, field, before, after, evidence)
select
  p.user_id,
  id,
  week,
  field,
  before,
  after,
  evidence
from
  candidates
where
  length(trim(after)) between 1 and 500
on conflict (user_id,
  habit_id,
  week_start)
  do nothing;
    if exists (
      select
        1
      from
        public.habits
      where
        user_id = p.user_id
        and is_active
        and (created_at at time zone p.time_zone)::date < week) then
    insert into public.routine_reminders (user_id, kind, period_start, created_at, expires_at)
      values (p.user_id, 'weekly', week, run_at, (week + 7)::timestamp at time zone p.time_zone)
    on conflict (user_id, kind, period_start)
      do nothing;
end if;
    update
      public.routine_preferences
    set
      weekly_prepared_for = week
    where
      user_id = p.user_id;
end if;
    if p.daily_enabled and local_now::time >= p.daily_time and exists (
      select
        1
      from
        public.habits h
      where
        h.user_id = p.user_id and h.is_active and (h.created_at at time zone p.time_zone)::date <= today and (coalesce(h.frequency, 'Daily') <> 'Weekdays' or extract(isodow from today) <= 5) and not exists (
    select
      1
    from
      public.habit_logs l
    where
      l.habit_id = h.id and l.user_id = p.user_id and l.log_date = today)) then
      insert into public.routine_reminders (user_id, kind, period_start, created_at, expires_at)
      values (p.user_id, 'daily', today, run_at, (today + 1)::timestamp at time zone p.time_zone)
    on conflict (user_id, kind, period_start)
      do nothing;
    end if;
    update
      public.routine_preferences
    set
      last_checked_at = run_at,
      last_error = null
    where
      user_id = p.user_id;
      exception
        when others then
          -- Isolate an account failure, retain a diagnostic code, and retry on a later tick.
          update
            public.routine_preferences
          set
            last_checked_at = run_at,
            last_error = sqlstate
          where
            user_id = p.user_id;
      end;
      handled := handled + 1;
end loop;
return handled;
end;
$$;
revoke all on function public.process_routine_schedule (timestamptz, integer) from public, anon, authenticated;
commit;

