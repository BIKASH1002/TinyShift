-- Used only inside the isolated local test cluster.
create schema auth;

create role authenticated;

create role anon;

create table auth.users (
  id uuid primary key
);

create function auth.uid ()
  returns uuid
  language sql
  stable
  as $$
  select
    nullif (current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to authenticated;

grant execute on function auth.uid () to authenticated;

\i backend/sql/002_habits.sql
\i backend/sql/005_adaptive_habits.sql
\i backend/sql/006_weekly_planning.sql
\i backend/sql/006_weekly_planning.sql
\i backend/sql/007_ai_request_limits.sql
\i backend/sql/007_ai_request_limits.sql
grant select, insert, update, delete on public.habits, public.habit_logs to authenticated;

insert into auth.users
values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

insert into public.habits (id, user_id, name, normal_version, minimum_version, anchor)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Read', '20 pages', '1 page', 'After breakfast'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Walk', '20 minutes', '1 minute', 'After lunch');

set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

insert into public.daily_contexts
  values ('00000000-0000-0000-0000-000000000001', current_date, 'low', 5);

insert into public.routine_proposals (id, user_id, habit_id, week_start, field, before, after, evidence)
  values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 'normal_version', '20 pages', '1 page', 'Three tiny completions');

select
  public.decide_routine_proposal ('20000000-0000-0000-0000-000000000001', true);

select
  public.decide_routine_proposal ('20000000-0000-0000-0000-000000000001', true);

do $$
begin
  if (
    select
      normal_version
    from
      public.habits
    where
      name = 'Read') <> '1 page' then
    raise exception 'Acceptance failed';
  end if;
  if (
    select
      status
    from
      public.routine_proposals
    limit 1) <> 'accepted' then
    raise exception 'Decision failed';
  end if;
end
$$;

insert into public.routine_proposals (id, user_id, habit_id, week_start, field, before, after, evidence)
  values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date +7, 'anchor', 'After breakfast', 'Immediately after breakfast', 'Three forgets');

select
  public.decide_routine_proposal ('20000000-0000-0000-0000-000000000002', false);

do $$
begin
  if (
    select
      anchor
    from
      public.habits
    where
      name = 'Read') <> 'After breakfast' then
    raise exception 'Rejection changed habit';
  end if;
end
$$;

insert into public.routine_proposals (id, user_id, habit_id, week_start, field, before, after, evidence)
  values ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date +14, 'anchor', 'Old cue', 'New cue', 'Stale preview');

do $$
begin
  begin
    perform
      public.decide_routine_proposal ('20000000-0000-0000-0000-000000000003', true);
    raise exception 'Stale proposal incorrectly applied';
  exception
    when others then
      if sqlerrm not like 'Habit changed since%' then
        raise;
        end if;
  end;
  if (
    select
      status
    from
      public.routine_proposals
    where
      id = '20000000-0000-0000-0000-000000000003') <> 'pending' then
    raise exception 'Stale status changed';
    end if;
end
$$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$
begin
  if (
    select
      count(*)
    from
      public.routine_proposals) <> 0 then
    raise exception 'Proposal isolation failed';
  end if;
  if (
    select
      count(*)
    from
      public.daily_contexts) <> 0 then
    raise exception 'Context isolation failed';
  end if;
  begin
    perform
      public.decide_routine_proposal ('20000000-0000-0000-0000-000000000003', true);
    raise exception 'Cross-user acceptance succeeded';
  exception
    when others then
      if sqlerrm <> 'Proposal not found.' then
        raise;
        end if;
  end;
  begin
    insert into public.daily_contexts
      values ('00000000-0000-0000-0000-000000000001', current_date +1, 'low', 5);
      raise exception 'Cross-user context write succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;

set request.jwt.claim.sub = '';

set tinyshift.test_user = '00000000-0000-0000-0000-000000000001';

\i backend/sql/manual_test_history.sql
do $$
begin
  if (
    select
      count(*)
    from
      public.habits
    where
      name like '[TEST] %') <> 4 then
    raise exception 'Seed habits missing';
  end if;
  if (
    select
      count(*)
    from
      public.habit_logs) <> 9 then
    raise exception 'Seed logs missing';
  end if;
end
$$;

-- The fixture must also work without SELECT permission on auth.users.
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

set tinyshift.test_user = '';

\i backend/sql/manual_test_history.sql
do $$
begin
  if (
    select
      count(*)
    from
      public.habits
    where
      name like '[TEST] %') <> 4 then
    raise exception 'Authenticated seed habits missing';
  end if;
  if (
    select
      count(*)
    from
      public.habit_logs) <> 9 then
    raise exception 'Authenticated seed logs missing';
  end if;
end
$$;

reset role;

select
  'Database acceptance, rejection, stale updates, idempotency, and user isolation passed' as result;

\i tests/habitLifecycle.sql
\i tests/profile.sql
\i tests/aiAdjustments.sql
\i tests/scheduledRoutines.sql
\i backend/sql/011_rescue_coach.sql
\i backend/sql/011_rescue_coach.sql
\i tests/rescueCoach.sql
\i tests/accountControls.sql
\i tests/pushReminders.sql
