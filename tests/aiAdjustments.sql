\i backend/sql/008_ai_habit_adjustments.sql
\i backend/sql/008_ai_habit_adjustments.sql
set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

insert into public.ai_habit_adjustments (id, user_id, habit_id, week_start, habit_updated_at, field, before, after, rationale, evidence)
select
  '30000000-0000-0000-0000-000000000001',
  auth.uid (),
  id,
  '2026-08-31',
  updated_at,
  'normal_version',
  normal_version,
  'Read one sentence',
  'A smaller action may fit.',
  '{"normal":0,"minimum":3,"skipped":0,"reasons":{}}'
from
  public.habits
where
  id = '10000000-0000-0000-0000-000000000001';

do $$
begin
  if public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000001', true) <> 'accepted' then
    raise exception 'Acceptance failed';
  end if;
  if (
    select
      normal_version
    from
      public.habits
    where
      id = '10000000-0000-0000-0000-000000000001') <> 'Read one sentence' then
    raise exception 'Habit not updated';
  end if;
  if (
    select
      anchor
    from
      public.habits
    where
      id = '10000000-0000-0000-0000-000000000001') <> 'After tea' then
    raise exception 'Unpreviewed field changed';
  end if;
  if public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000001', false) <> 'accepted' then
    raise exception 'Decision flipped';
  end if;
  begin
    update
      public.ai_habit_adjustments
    set
      status = 'rejected';
    raise exception 'Direct decision update succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    insert into public.ai_habit_adjustments (user_id, habit_id, week_start, habit_updated_at, field, before, after, rationale, evidence)
    select
      auth.uid (),
      id,
      '2026-08-31',
      updated_at,
      'anchor',
      anchor,
      'Immediately after tea',
      'A clearer cue',
      '{}'
    from
      public.habits
    where
      id = '10000000-0000-0000-0000-000000000001';
      raise exception 'Duplicate weekly suggestion saved';
  exception
    when unique_violation then
      null;
  end;
end
$$;

insert into public.ai_habit_adjustments (id, user_id, habit_id, week_start, habit_updated_at, field, before, after, rationale, evidence)
select
  '30000000-0000-0000-0000-000000000002',
  auth.uid (),
  id,
  '2026-09-07',
  updated_at,
  'anchor',
  anchor,
  'Immediately after tea',
  'A clearer cue',
  '{}'
from
  public.habits
where
  id = '10000000-0000-0000-0000-000000000001';

do $$
begin
  if public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000002', false) <> 'rejected' then
    raise exception 'Rejection failed';
  end if;
  if public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000002', true) <> 'rejected' then
    raise exception 'Rejected proposal applied';
  end if;
  if (
    select
      anchor
    from
      public.habits
    where
      id = '10000000-0000-0000-0000-000000000001') <> 'After tea' then
    raise exception 'Rejected habit changed';
  end if;
end
$$;

insert into public.ai_habit_adjustments (id, user_id, habit_id, week_start, habit_updated_at, field, before, after, rationale, evidence)
select
  '30000000-0000-0000-0000-000000000003',
  auth.uid (),
  id,
  '2026-09-14',
  updated_at,
  'anchor',
  anchor,
  'Immediately after tea',
  'A clearer cue',
  '{}'
from
  public.habits
where
  id = '10000000-0000-0000-0000-000000000001';

-- An unrelated edit also invalidates the whole habit snapshot.
update
  public.habits
set
  motivation = 'Changed my reason'
where
  id = '10000000-0000-0000-0000-000000000001';

do $$
begin
  begin
    perform
      public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000003', true);
    raise exception 'Stale suggestion applied';
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
      public.ai_habit_adjustments
    where
      id = '30000000-0000-0000-0000-000000000003') <> 'pending' then
    raise exception 'Stale decision not rolled back';
    end if;
end
$$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$
begin
  if exists (
    select
      1
    from
      public.ai_habit_adjustments) then
  raise exception 'Cross-user proposal leak';
end if;
  begin
    perform
      public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000003', true);
    raise exception 'Cross-user acceptance succeeded';
  exception
    when others then
      if sqlerrm <> 'Proposal not found.' then
        raise;
        end if;
  end;
  begin
    insert into public.ai_habit_adjustments (user_id, habit_id, week_start, habit_updated_at, field, before, after, rationale, evidence)
      values (auth.uid (), '10000000-0000-0000-0000-000000000001', '2026-09-21', now(), 'anchor', 'After tea', 'New cue', 'Not mine', '{}');
      raise exception 'Cross-user proposal insert succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

insert into public.ai_habit_adjustments (id, user_id, habit_id, week_start, habit_updated_at, field, before, after, rationale, evidence)
select
  '30000000-0000-0000-0000-000000000004',
  auth.uid (),
  id,
  '2026-09-21',
  updated_at,
  'anchor',
  anchor,
  'Immediately after tea',
  'A clearer cue',
  '{}'
from
  public.habits
where
  id = '10000000-0000-0000-0000-000000000001';

update
  public.habits
set
  is_active = false
where
  id = '10000000-0000-0000-0000-000000000001';

do $$
begin
  begin
    perform
      public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000004', true);
    raise exception 'Deleted habit changed';
  exception
    when others then
      if sqlerrm <> 'Habit is no longer active.' then
        raise;
        end if;
  end;
  if public.decide_ai_habit_adjustment ('30000000-0000-0000-0000-000000000004', false) <> 'rejected' then
    raise exception 'Deleted proposal cannot be dismissed';
    end if;
end
$$;

reset role;

select
  'AI adjustment storage, acceptance, rejection, stale snapshots, uniqueness, deletion and isolation passed' as result;

