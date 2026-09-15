begin;

-- A log must belong to the same account as its habit, even outside the API policies.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.habits'::regclass
      and conname = 'habits_id_user_unique'
  ) then
    alter table public.habits
      add constraint habits_id_user_unique unique (id, user_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.habit_logs'::regclass
      and conname = 'habit_logs_habit_owner_fkey'
  ) then
    alter table public.habit_logs
      add constraint habit_logs_habit_owner_fkey
      foreign key (habit_id, user_id)
      references public.habits (id, user_id)
      on delete cascade;
  end if;
end
$$;

alter table public.habit_logs
  drop constraint if exists habit_logs_state_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.habit_logs'::regclass
      and conname = 'habit_logs_state_check'
  ) then
    alter table public.habit_logs
      add constraint habit_logs_state_check check (
        (status = 'done' and skip_reason is null)
        or (status = 'skipped' and completed_at is null)
      );
  end if;
end
$$;

create or replace function public.protect_habit_log_identity ()
  returns trigger
  language plpgsql
  as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.habit_id is distinct from old.habit_id
    or new.log_date is distinct from old.log_date
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'A habit log identity cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_habit_log_identity on public.habit_logs;

create trigger protect_habit_log_identity
  before update on public.habit_logs
  for each row
  execute function public.protect_habit_log_identity ();

commit;
