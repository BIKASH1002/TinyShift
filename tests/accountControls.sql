\i backend/sql/003_ai_suggestions.sql
\i backend/sql/004_weekly_reflections.sql
\i backend/sql/010_account_privacy.sql
\i backend/sql/010_account_privacy.sql
insert into public.ai_suggestions (user_id, suggestion_text)
values
  ('00000000-0000-0000-0000-000000000001', 'Private suggestion one'),
  ('00000000-0000-0000-0000-000000000002', 'Private suggestion two');

insert into public.weekly_reflections (user_id, week_start_date, week_end_date, reflection_text)
values
  ('00000000-0000-0000-0000-000000000001', '2026-08-31', '2026-09-06', 'Private reflection one'),
  ('00000000-0000-0000-0000-000000000002', '2026-08-31', '2026-09-06', 'Private reflection two');

set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

do $$
declare
  result jsonb;
  key text;
  row jsonb;
begin
  if not public.reserve_account_deletion () then
    raise exception 'First deletion attempt denied';
  end if;
  if public.reserve_account_deletion () then
    raise exception 'Deletion cooldown bypassed';
  end if;
  result := public.export_my_account ();
  if result ->> 'format_version' <> '1' then
    raise exception 'Export missing version';
  end if;
  if result::text like '%Private reflection two%' or result::text like '%00000000-0000-0000-0000-000000000002%' then
    raise exception 'Export leaked another account';
  end if;
  foreach key in array array['profiles', 'habits', 'habit_logs', 'ai_suggestions', 'weekly_reflections', 'daily_contexts', 'routine_proposals', 'ai_draft_usage', 'ai_habit_adjustments', 'routine_preferences', 'routine_reminders', 'account_deletion_attempts'] loop
    if jsonb_typeof(result -> key) <> 'array' then
      raise exception 'Export table missing: %', key;
    end if;
    for row in
    select
      value
    from
      jsonb_array_elements(result -> key)
      loop
        if row ->> (
          case when key = 'profiles' then
            'id'
          else
            'user_id'
          end) <> auth.uid ()::text then
  raise exception 'Export ownership failed';
        end if;
      end loop;
  end loop;
  if not exists (
    select
      1
    from
      jsonb_array_elements(result -> 'habits') h
    where
      h ->> 'is_active' = 'false') then
  raise exception 'Archived habits missing';
end if;
  begin
    update
      public.account_deletion_attempts
    set
      requests = 0;
    raise exception 'Client reset deletion quota';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;

update
  public.account_deletion_attempts
set
  requests = 5,
  last_request = now() - interval '16 seconds';

set role authenticated;

do $$
begin
  if public.reserve_account_deletion () then
    raise exception 'Deletion daily limit bypassed';
  end if;
end
$$;

reset role;

update
  public.account_deletion_attempts
set
  day = day - 1;

set role authenticated;

do $$
begin
  if not public.reserve_account_deletion () then
    raise exception 'Deletion quota did not reset';
  end if;
end
$$;

set request.jwt.claim.sub = '';

do $$
begin
  begin
    perform
      public.export_my_account ();
    raise exception 'Unauthenticated export succeeded';
  exception
    when others then
      if sqlerrm <> 'Please sign in.' then
        raise;
        end if;
  end;
end
$$;

reset role;

-- Isolated test-cluster account only; validates FKs used by Auth admin deletion.
delete from auth.users
where id = '00000000-0000-0000-0000-000000000001';

do $$
declare
  table_name text;
  remaining integer;
begin
  foreach table_name in array array['habits', 'habit_logs', 'ai_suggestions', 'weekly_reflections', 'daily_contexts', 'routine_proposals', 'ai_draft_usage', 'ai_habit_adjustments', 'routine_preferences', 'routine_reminders', 'account_deletion_attempts'] loop
    execute format('select count(*) from public.%I where user_id=$1', table_name) into remaining
    using '00000000-0000-0000-0000-000000000001'::uuid;
    if remaining <> 0 then
      raise exception 'Deletion left rows in %', table_name;
    end if;
  end loop;
    if exists (
      select
        1
      from
        public.profiles
      where
        id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'Deleted profile remained';
  end if;
  if not exists (
    select
      1
    from
      public.weekly_reflections
    where
      user_id = '00000000-0000-0000-0000-000000000002') then
  raise exception 'Other user lost data';
end if;
end
$$;

select
  'Account export isolation, complete table coverage, deletion quota and cascade checks passed' as result;

