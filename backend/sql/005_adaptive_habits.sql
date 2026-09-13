-- TinyShift adaptive-routine migration.
alter table public.habits
  add column if not exists anchor text;

alter table public.habits
  add column if not exists normal_version text;

alter table public.habits
  add column if not exists minimum_version text;

alter table public.habits
  add column if not exists motivation text;

update
  public.habits
set
  anchor = coalesce(anchor, 'After an existing daily routine'),
  normal_version = coalesce(normal_version, name),
  minimum_version = coalesce(minimum_version, 'Do one tiny step toward ' || name)
where
  anchor is null
  or normal_version is null
  or minimum_version is null;

alter table public.habit_logs
  add column if not exists skip_reason text;

alter table public.habit_logs
  drop constraint if exists habit_logs_completion_method_check;

update
  public.habit_logs
set
  completion_method = 'normal'
where
  completion_method not in ('normal', 'minimum');

alter table public.habit_logs
  add constraint habit_logs_completion_method_check check (completion_method in ('normal', 'minimum'));

alter table public.habit_logs
  drop constraint if exists habit_logs_skip_reason_check;

alter table public.habit_logs
  add constraint habit_logs_skip_reason_check check (skip_reason is null or skip_reason in ('low_energy', 'no_time', 'away', 'forgot', 'routine_changed'));

