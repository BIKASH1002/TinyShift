-- Routine Intelligence: daily context and habit change proposals
begin;
create table if not exists public.daily_contexts (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  energy text not null check (energy in ('low', 'steady', 'high')),
  minutes integer not null check (minutes between 1 and 240),
  primary key (user_id, day)
);
create table if not exists public.routine_proposals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  week_start date not null,
  field text not null check (field in ('normal_version', 'anchor')),
  before text not null,
  after text not null check (length(trim(after)) between 1 and 500),
  evidence text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, habit_id, week_start)
);
alter table public.daily_contexts enable row level security;
alter table public.routine_proposals enable row level security;
grant select, insert, update, delete on public.daily_contexts to authenticated;
grant select, insert on public.routine_proposals to authenticated;
drop policy if exists own_context on public.daily_contexts;
create policy own_context on public.daily_contexts
  for all to authenticated
  using (user_id = auth.uid ())
  with check (user_id = auth.uid ());
drop policy if exists read_proposals on public.routine_proposals;
create policy read_proposals on public.routine_proposals
  for select to authenticated
  using (user_id = auth.uid ());
drop policy if exists insert_proposals on public.routine_proposals;
create policy insert_proposals on public.routine_proposals
  for insert to authenticated
  with check (user_id = auth.uid ()
  and status = 'pending'
  and exists (
    select
      1
    from
      public.habits h
    where
      h.id = habit_id
      and h.user_id = auth.uid ()
      and h.is_active));
-- Apply the habit change and decision together. A stale preview cannot overwrite a newer change.
create or replace function public.decide_routine_proposal (proposal_id uuid, accept_change boolean)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  p public.routine_proposals;
  h public.habits;
begin
  if auth.uid () is null then
    raise exception 'Please sign in.';
  end if;
  select
    *
  into
    p
  from
    public.routine_proposals
  where
    id = proposal_id
    and user_id = auth.uid ()
  for update;
  if not found then
    raise exception 'Proposal not found.';
  end if;
  if p.status <> 'pending' then
    return;
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
    if (p.field = 'normal_version' and h.normal_version is distinct from p.before) or (p.field = 'anchor' and h.anchor is distinct from p.before) then
      raise exception 'Habit changed since this proposal. Reject it and review next week.';
    end if;
    if p.field = 'normal_version' then
      update
        public.habits
      set
        normal_version = p.after
      where
        id = h.id;
    else
      update
        public.habits
      set
        anchor = p.after
      where
        id = h.id;
    end if;
  end if;
  update
    public.routine_proposals
  set
    status = case when accept_change then
      'accepted'
    else
      'rejected'
    end,
    decided_at = now()
  where
    id = p.id;
end;
$$;
revoke all on function public.decide_routine_proposal (uuid, boolean) from public;
grant execute on function public.decide_routine_proposal (uuid, boolean) to authenticated;
commit;

