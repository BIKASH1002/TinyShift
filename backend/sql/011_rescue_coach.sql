begin;
alter table public.habit_logs add column if not exists rescue_action text;
alter table public.habit_logs drop constraint if exists habit_logs_rescue_action_check;
alter table public.habit_logs add constraint habit_logs_rescue_action_check check (
  rescue_action is null or (
    status = 'done' and completion_method = 'minimum'
    and length(trim(rescue_action)) between 1 and 500
  )
);
-- Only the confirmed action is saved. The user's free-text context is never stored here.
create or replace function public.complete_rescue_step(
  p_habit_id uuid, p_action text, p_day date, p_time_zone text, p_habit_updated_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  h public.habits;
  saved public.habit_logs;
  today date;
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  if p_time_zone is null or not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'Use a valid device time zone.';
  end if;
  today := (now() at time zone p_time_zone)::date;
  if p_day is distinct from today then
    raise exception 'The day changed. Reopen Rescue before completing this step.';
  end if;
  if p_action is null or length(trim(p_action)) not between 1 and 500 then
    raise exception 'Choose a valid rescue step.';
  end if;
  select * into h from public.habits
    where id = p_habit_id and user_id = auth.uid() and is_active for update;
  if not found then raise exception 'This habit is no longer available.'; end if;
  if h.updated_at is distinct from p_habit_updated_at then
    raise exception 'This habit changed. Reopen Rescue for a fresh suggestion.';
  end if;
  if (h.created_at at time zone p_time_zone)::date > today or
      (h.frequency = 'Weekdays' and extract(isodow from today) > 5) then
    raise exception 'This habit is not scheduled today.';
  end if;
  insert into public.habit_logs as existing (
    habit_id, user_id, log_date, status, completed_at, completion_method, skip_reason, rescue_action
  ) values (h.id, auth.uid(), today, 'done', now(), 'minimum', null, trim(p_action))
  on conflict (habit_id, log_date) do update
    set status = 'done', completed_at = excluded.completed_at, completion_method = 'minimum',
        skip_reason = null, rescue_action = excluded.rescue_action
    where existing.user_id = auth.uid() and existing.status = 'skipped'
  returning * into saved;
  if not found then
    select * into saved from public.habit_logs
      where habit_id = h.id and user_id = auth.uid() and log_date = today;
    -- A retry of the same confirmed action is idempotent. Never replace another completion.
    if saved.status is distinct from 'done' or saved.rescue_action is distinct from trim(p_action) then
      raise exception 'This habit already has a completion today. Reopen Today to review it.';
    end if;
  end if;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.complete_rescue_step(uuid, text, date, text, timestamptz) from public, anon;
grant execute on function public.complete_rescue_step(uuid, text, date, text, timestamptz) to authenticated;
commit;
