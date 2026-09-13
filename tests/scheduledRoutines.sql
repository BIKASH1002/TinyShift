\i backend/sql/009_scheduled_reminders.sql
\i backend/sql/009_scheduled_reminders.sql
insert into auth.users (id)
values
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');

insert into public.habits (id, user_id, name, anchor, normal_version, minimum_version, frequency, created_at)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Scheduled Read', 'After tea', '20 pages', 'One page', 'Daily', '2026-08-01Z'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Scheduled Stretch', 'After lunch', '20 minutes', 'One minute', 'Weekdays', '2026-08-01Z'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'LA weekdays', 'After tea', '20 pages', 'One page', 'Weekdays', '2026-08-01Z');

insert into public.habit_logs (habit_id, user_id, log_date, status, completion_method, skip_reason)
select
  '70000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  '2026-08-31'::date + i,
  'done',
  'minimum',
  null
from
  generate_series(0, 2) i;

insert into public.habit_logs (habit_id, user_id, log_date, status, completion_method, skip_reason)
select
  '70000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '2026-08-31'::date + i,
  'skipped',
  'normal',
  'forgot'
from
  generate_series(0, 2) i;

set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

select
  public.save_routine_preferences ('Asia/Kolkata', true, '20:00', true, '09:00');

do $$
begin
  begin
    perform
      public.save_routine_preferences ('Invalid/Zone', true, '20:00', true, '09:00');
    raise exception 'Invalid timezone accepted';
  exception
    when others then
      if sqlerrm not like 'Choose a valid%' then
        raise;
        end if;
  end;
  begin
    perform
      public.process_routine_schedule ();
      raise exception 'Client ran cross-user job';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    update
      public.routine_preferences
    set
      weekly_prepared_for = '2030-01-01';
      raise exception 'Client overwrote scheduler state';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';

select
  public.save_routine_preferences ('America/Los_Angeles', true, '20:00', false, '09:00');

reset role;

select
  public.process_routine_schedule ('2026-09-07 03:25Z');

do $$
begin
  if exists (
    select
      1
    from
      public.routine_reminders) then
  raise exception 'Early or weekend reminder generated';
end if;
end
$$;

select
  public.process_routine_schedule ('2026-09-07 03:30Z');

do $$
begin
  if exists (
    select
      1
    from
      public.routine_preferences
    where
      last_error is not null) then
  raise exception 'Scheduler failed';
end if;
  if (
    select
      count(*)
    from
      public.routine_proposals
    where
      user_id = '00000000-0000-0000-0000-000000000003') <> 2 then
    raise exception 'Background proposals missing';
  end if;
  if (
    select
      after
    from
      public.routine_proposals
    where
      habit_id = '70000000-0000-0000-0000-000000000001') <> 'One page' then
    raise exception 'Target rule mismatch';
  end if;
  if (
    select
      after
    from
      public.routine_proposals
    where
      habit_id = '70000000-0000-0000-0000-000000000002') <> 'Immediately after lunch' then
    raise exception 'Cue rule mismatch';
  end if;
  if (
    select
      normal_version
    from
      public.habits
    where
      id = '70000000-0000-0000-0000-000000000001') <> '20 pages' then
    raise exception 'Background job changed habit';
  end if;
  if (
    select
      count(*)
    from
      public.routine_reminders) <> 1 then
    raise exception 'Weekly reminder missing';
  end if;
end
$$;

select
  public.process_routine_schedule ('2026-09-07 14:30Z');

select
  public.process_routine_schedule ('2026-09-07 14:35Z');

do $$
begin
  if (
    select
      count(*)
    from
      public.routine_reminders
    where
      user_id = '00000000-0000-0000-0000-000000000003') <> 2 then
    raise exception 'Daily reminder missing or duplicate';
  end if;
  if (
    select
      count(*)
    from
      public.routine_proposals
    where
      user_id = '00000000-0000-0000-0000-000000000003') <> 2 then
    raise exception 'Proposal duplicated';
  end if;
  if (
    select
      expires_at
    from
      public.routine_reminders
    where
      kind = 'daily' and user_id = '00000000-0000-0000-0000-000000000003') <> '2026-09-07 18:30Z'::timestamptz then
    raise exception 'Local midnight expiry wrong';
  end if;
end
$$;

set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

select
  public.dismiss_routine_reminder (id)
from
  public.routine_reminders
where
  kind = 'daily';

select
  public.dismiss_routine_reminder (id)
from
  public.routine_reminders
where
  kind = 'daily';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';

do $$
begin
  if exists (
    select
      1
    from
      public.routine_reminders) then
  raise exception 'Cross-account reminder leak';
end if;
  if (
    select
      count(*)
    from
      public.routine_preferences) <> 1 then
    raise exception 'Preferences leak';
  end if;
  begin
    perform
      public.dismiss_routine_reminder ('99999999-0000-0000-0000-000000000000');
    raise exception 'Foreign reminder dismissed';
  exception
    when others then
      if sqlerrm <> 'Reminder not found.' then
        raise;
        end if;
  end;
end
$$;

reset role;

select
  public.process_routine_schedule ('2026-09-07 14:40Z');

do $$
begin
  if (
    select
      count(*)
    from
      public.routine_reminders
    where
      kind = 'daily' and dismissed_at is null) <> 0 then
    raise exception 'Dismissed reminder regenerated';
  end if;
end
$$;

-- Both done and skipped count as a recorded check-in and suppress next day's reminder.
insert into public.habit_logs (habit_id, user_id, log_date, status, completion_method)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '2026-09-08', 'done', 'normal'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '2026-09-08', 'skipped', 'normal');

select
  public.process_routine_schedule ('2026-09-08 14:30Z');

do $$
begin
  if exists (
    select
      1
    from
      public.routine_reminders
    where
      user_id = '00000000-0000-0000-0000-000000000003'
      and period_start = '2026-09-08') then
  raise exception 'Already logged reminder generated';
end if;
end
$$;

set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

select
  public.save_routine_preferences ('Asia/Kolkata', false, '20:00', false, '09:00');

do $$
begin
  if exists (
    select
      1
    from
      public.routine_reminders
    where
      dismissed_at is null) then
  raise exception 'Opt-out left visible reminders';
end if;
end
$$;

reset role;

select
  public.process_routine_schedule ('2026-09-09 14:30Z');

do $$
begin
  if exists (
    select
      1
    from
      public.routine_reminders
    where
      user_id = '00000000-0000-0000-0000-000000000003'
      and period_start = '2026-09-09') then
  raise exception 'Opt-out ignored';
end if;
end
$$;

-- Catch-up on Tuesday prepares only the current week, not a backlog.
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

select
  public.save_routine_preferences ('Asia/Kolkata', false, '20:00', true, '09:00');

reset role;

select
  public.process_routine_schedule ('2026-09-15 00:00Z');

do $$
begin
  if not exists (
    select
      1
    from
      public.routine_reminders
    where
      kind = 'weekly'
      and period_start = '2026-09-14') then
  raise exception 'Weekly catch-up failed';
end if;
end
$$;

-- Bounded batches make forward progress; invalid account data cannot block another account.
update
  public.routine_preferences
set
  last_checked_at = null;

select
  public.process_routine_schedule ('2026-09-16 04:00Z', 1);

select
  public.process_routine_schedule ('2026-09-16 04:00Z', 1);

do $$
begin
  if (
    select
      count(*)
    from
      public.routine_preferences
    where
      last_checked_at = '2026-09-16 04:00Z') <> 2 then
    raise exception 'Batch fairness failed';
  end if;
end
$$;

update
  public.routine_preferences
set
  time_zone = 'Invalid/Zone'
where
  user_id = '00000000-0000-0000-0000-000000000003';

select
  public.process_routine_schedule ('2026-09-17 04:00Z');

do $$
begin
  if (
    select
      last_error
    from
      public.routine_preferences
    where
      user_id = '00000000-0000-0000-0000-000000000003') is null then
    raise exception 'Account failure not recorded';
  end if;
  if (
    select
      last_checked_at
    from
      public.routine_preferences
    where
      user_id = '00000000-0000-0000-0000-000000000004') <> '2026-09-17 04:00Z'::timestamptz then
    raise exception 'Account failure blocked other users';
  end if;
end
$$;

-- DST fall-back: a reminder at the repeated local hour still has a single daily identity.
update
  public.routine_preferences
set
  daily_time = '01:00',
  last_checked_at = null
where
  user_id = '00000000-0000-0000-0000-000000000004';

update
  public.habits
set
  frequency = 'Daily'
where
  id = '70000000-0000-0000-0000-000000000003';

select
  public.process_routine_schedule ('2026-11-01 08:05Z');

select
  public.process_routine_schedule ('2026-11-01 09:05Z');

do $$
begin
  if (
    select
      count(*)
    from
      public.routine_reminders
    where
      user_id = '00000000-0000-0000-0000-000000000004' and kind = 'daily' and period_start = '2026-11-01') <> 1 then
    raise exception 'DST duplicate reminder';
  end if;
  if (
    select
      expires_at
    from
      public.routine_reminders
    where
      user_id = '00000000-0000-0000-0000-000000000004' and kind = 'daily' and period_start = '2026-11-01') <> '2026-11-02 08:00Z'::timestamptz then
    raise exception 'DST expiry incorrect';
  end if;
end
$$;

select
  'Scheduling, proposal parity, opt-in/out, timezone/DST, deduplication, expiry, catch-up, isolation and batch checks passed' as result;

