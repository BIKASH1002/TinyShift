begin;
create table if not exists public.ai_habit_adjustments (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  habit_updated_at timestamptz not null,
  field text not null check (field in ('normal_version', 'anchor')),
  before text not null,
  after text not null check (length(trim(after)) between 1 and 500 and after <> before),
  rationale text not null check (length(trim(rationale)) between 1 and 700),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, habit_id, week_start)
);
alter table public.ai_habit_adjustments enable row level security;
revoke all on public.ai_habit_adjustments from public, anon, authenticated;
grant select, insert on public.ai_habit_adjustments to authenticated;
drop policy if exists read_own_ai_adjustment on public.ai_habit_adjustments;
create policy read_own_ai_adjustment on public.ai_habit_adjustments
  for select to authenticated
  using (user_id = auth.uid ());
drop policy if exists insert_own_ai_adjustment on public.ai_habit_adjustments;
create policy insert_own_ai_adjustment on public.ai_habit_adjustments
  for insert to authenticated
  with check (user_id = auth.uid ()
  and status = 'pending'
  and decided_at is null
  and exists (
    select
      1
    from
      public.habits h
    where
      h.id = habit_id
      and h.user_id = auth.uid ()
      and h.is_active
      and h.updated_at = habit_updated_at
      and (
        case when field = 'anchor' then
          h.anchor
        else
          h.normal_version
        end) = before));
-- Decision and habit mutation commit together; direct client decision updates are forbidden.
create or replace function public.decide_ai_habit_adjustment (proposal_id uuid, accept_change boolean)
  returns text
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  p public.ai_habit_adjustments;
  h public.habits;
begin
  if auth.uid () is null then
    raise exception 'Please sign in.';
  end if;
  if accept_change is null then
    raise exception 'Choose accept or reject.';
  end if;
  select
    *
  into
    p
  from
    public.ai_habit_adjustments
  where
    id = proposal_id
    and user_id = auth.uid ()
  for update;
  if not found then
    raise exception 'Proposal not found.';
  end if;
  if p.status <> 'pending' then
    return p.status;
  end if;
  if accept_change then
    select
      *
    into
      h
    from
      public.habits
    where
      id = p.habit_id
      and user_id = auth.uid ()
      and is_active
    for update;
    if not found then
      raise exception 'Habit is no longer active.';
    end if;
    if h.updated_at is distinct from p.habit_updated_at or (
      case when p.field = 'anchor' then
        h.anchor
      else
        h.normal_version
      end) is distinct from p.before then
    raise exception 'Habit changed since this suggestion. Keep current and review again next week.';
    end if;
    if p.field = 'anchor' then
      update
        public.habits
      set
        anchor = p.after
      where
        id = h.id;
    else
      update
        public.habits
      set
        normal_version = p.after
      where
        id = h.id;
    end if;
  end if;
  update
    public.ai_habit_adjustments
  set
    status = case when accept_change then
      'accepted'
    else
      'rejected'
    end,
    decided_at = now()
  where
    id = p.id
  returning
    status
  into
    p.status;
  return p.status;
end;
$$;
revoke all on function public.decide_ai_habit_adjustment (uuid, boolean) from public;
grant execute on function public.decide_ai_habit_adjustment (uuid, boolean) to authenticated;
commit;

