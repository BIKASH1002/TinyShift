begin;
create table if not exists public.account_deletion_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null,
  last_request timestamptz not null
);
alter table public.account_deletion_attempts enable row level security;
revoke all on public.account_deletion_attempts from public, anon, authenticated;
create or replace function public.reserve_account_deletion ()
  returns boolean
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  changed integer;
begin
  if auth.uid () is null then
    raise exception 'Please sign in.';
  end if;
  insert into public.account_deletion_attempts
  values
    (auth.uid (),
      (now() at time zone 'UTC')::date, 1, now())
  on conflict (user_id)
    do update set
      day = excluded.day,
      requests = case when account_deletion_attempts.day = excluded.day then
        account_deletion_attempts.requests + 1
      else
        1
      end,
      last_request = now()
    where (account_deletion_attempts.day <> excluded.day
      or account_deletion_attempts.requests < 5)
    and account_deletion_attempts.last_request <= now() - interval '15 seconds';
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.reserve_account_deletion () from public;
grant execute on function public.reserve_account_deletion () to authenticated;
-- STABLE gives all table reads the caller statement's snapshot. No client-supplied user ID.
create or replace function public.export_my_account ()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
  as $$
declare
  uid uuid := auth.uid ();
  result jsonb;
  records jsonb;
  table_name text;
  owner_column text;
begin
  if uid is null or not exists (
    select
      1
    from
      auth.users
    where
      id = uid) then
    raise exception 'Please sign in.';
  end if;
  result := jsonb_build_object('format_version', 1, 'exported_at', now(), 'account', (
    select
      jsonb_build_object('id', id, 'email', email)
    from auth.users
    where
      id = uid));
  foreach table_name in array array['profiles', 'habits', 'habit_logs', 'ai_suggestions', 'weekly_reflections', 'daily_contexts', 'routine_proposals', 'ai_draft_usage', 'ai_habit_adjustments', 'routine_preferences', 'routine_reminders', 'account_deletion_attempts'] loop
    owner_column := case when table_name = 'profiles' then
      'id'
    else
      'user_id'
    end;
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where %I=$1', table_name, owner_column) into records
    using uid;
    result := result || jsonb_build_object(table_name, records);
  end loop;
    return result;
end;
$$;
revoke all on function public.export_my_account () from public;
grant execute on function public.export_my_account () to authenticated;
commit;

