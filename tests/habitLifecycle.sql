set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

do $$
declare
  old_version timestamptz;
  affected integer;
begin
  select
    updated_at
  into
    old_version
  from
    public.habits
  where
    name = 'Read';
  update
    public.habits
  set
    anchor = 'After tea',
    minimum_version = 'One sentence'
  where
    name = 'Read'
    and updated_at = old_version;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Edit failed';
  end if;
  update
    public.habits
  set
    anchor = 'Stale edit'
  where
    name = 'Read'
    and updated_at = old_version - interval '1 second';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Stale edit overwrote habit';
  end if;
  update
    public.habits
  set
    name = 'Not mine'
  where
    user_id = '00000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Cross-user edit succeeded';
  end if;
end
$$;

insert into public.habit_logs (habit_id, user_id, log_date, status, completion_method)
  values ('10000000-0000-0000-0000-000000000001', auth.uid (), current_date, 'done', 'normal');

do $$
declare
  affected integer;
begin
  delete from public.habit_logs
  where habit_id = '10000000-0000-0000-0000-000000000001'
    and log_date = current_date
    and status = 'skipped';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Stale undo removed changed log';
  end if;
  delete from public.habit_logs
  where habit_id = '10000000-0000-0000-0000-000000000001'
    and log_date = current_date
    and status = 'done';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Undo completion failed';
  end if;
end
$$;

insert into public.habit_logs (habit_id, user_id, log_date, status, completion_method, skip_reason)
  values ('10000000-0000-0000-0000-000000000001', auth.uid (), current_date, 'skipped', 'normal', 'forgot');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$
declare
  affected integer;
begin
  delete from public.habit_logs
  where habit_id = '10000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Cross-user undo succeeded';
  end if;
end
$$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

do $$
declare
  affected integer;
begin
  delete from public.habit_logs
  where habit_id = '10000000-0000-0000-0000-000000000001'
    and log_date = current_date
    and status = 'skipped';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Undo skip failed';
  end if;
  if not exists (
    select
      1
    from
      public.habits
    where
      name = 'Read') then
  raise exception 'Undo deleted habit';
end if;
  if not public.reserve_habit_draft () then
    raise exception 'First draft denied';
  end if;
  if public.reserve_habit_draft () then
    raise exception 'Cooldown bypassed';
  end if;
  begin
    update
      public.ai_draft_usage
    set
      requests = 0;
    raise exception 'Client changed AI quota';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;

update
  public.ai_draft_usage
set
  requests = 10,
  last_request = now() - interval '16 seconds';

set role authenticated;

do $$
begin
  if public.reserve_habit_draft () then
    raise exception 'Daily cap bypassed';
  end if;
end
$$;

reset role;

update
  public.ai_draft_usage
set
  day = day - 1;

set role authenticated;

do $$
begin
  if not public.reserve_habit_draft () then
    raise exception 'New day did not reset quota';
  end if;
end
$$;

reset role;

select
  'Habit editing, undo, isolation, and AI quota checks passed' as result;

