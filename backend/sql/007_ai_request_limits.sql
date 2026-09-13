begin;
create table if not exists public.ai_draft_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null,
  last_request timestamptz not null
);
alter table public.ai_draft_usage enable row level security;
revoke all on public.ai_draft_usage from public, anon, authenticated;
-- The caller can only reserve its own quota; concurrent calls serialize on the row.
create or replace function public.reserve_habit_draft ()
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
  insert into public.ai_draft_usage (user_id, day, requests, last_request)
  values
    (auth.uid (),
      (now() at time zone 'UTC')::date, 1, now())
  on conflict (user_id)
    do update set
      day = excluded.day,
      requests = case when ai_draft_usage.day = excluded.day then
        ai_draft_usage.requests + 1
      else
        1
      end,
      last_request = now()
    where (ai_draft_usage.day <> excluded.day
      or ai_draft_usage.requests < 10)
    and ai_draft_usage.last_request <= now() - interval '15 seconds';
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.reserve_habit_draft () from public;
grant execute on function public.reserve_habit_draft () to authenticated;
commit;

