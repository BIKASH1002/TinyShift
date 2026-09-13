-- OPTIONAL: use a dedicated test account. Run after 006_weekly_planning.sql.
-- Replace the UUID below with that account's ID from Authentication > Users.
-- When running as authenticated, select/impersonate that test user in the editor.
-- Its auth.uid() is used automatically if no explicit test_user is supplied.
-- No SELECT access to auth.users is needed.
-- Adds four named test habits and nine historical logs, without modifying existing habits.
-- Re-running is intentionally blocked to avoid duplicates or resetting accepted proposals.
do $$
declare
  test_user uuid := coalesce(nullif (current_setting('tinyshift.test_user', true), '')::uuid, auth.uid (), '00000000-0000-0000-0000-000000000000'::uuid);
  test_today date := (now() at time zone 'Asia/Kolkata')::date;
  last_monday date;
  small_id uuid := gen_random_uuid ();
  forget_id uuid := gen_random_uuid ();
  steady_id uuid := gen_random_uuid ();
  new_id uuid := gen_random_uuid ();
  i integer;
begin
  if test_user = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Select a test user when running as authenticated, or supply the test account UUID when running as postgres.';
  end if;
  if auth.uid () is not null and auth.uid () <> test_user then
    raise exception 'The selected user differs from test_user. Select the matching test account.';
  end if;
  -- The habits.user_id foreign key validates account existence during insertion.
  if exists (
    select
      1
    from
      public.habits
    where
      user_id = test_user
      and name like '[TEST] %') then
  raise exception 'Test habits already exist. Use them or a fresh test account.';
end if;
  last_monday := date_trunc('week', test_today)::date - 7;
  insert into public.habits (id, user_id, name, category, frequency, anchor, normal_version, minimum_version, motivation, created_at)
  values
    (small_id, test_user, '[TEST] Read', 'Learning', 'Daily', 'After breakfast', 'Read 20 pages', 'Read one page', 'Test smaller target', last_monday::timestamptz),
    (forget_id, test_user, '[TEST] Stretch', 'Movement', 'Daily', 'After lunch', 'Stretch 10 minutes', 'One gentle stretch', 'Test cue adjustment', last_monday::timestamptz),
    (steady_id, test_user, '[TEST] Journal', 'Mood', 'Daily', 'After dinner', 'Write three sentences', 'Write one word', 'Test no adjustment', last_monday::timestamptz),
    (new_id, test_user, '[TEST] New habit', 'Focus', 'Daily', 'After coffee', 'Review notes', 'Read one line', 'Test insufficient history', test_today::timestamptz);
  for i in 0..2 loop
    insert into public.habit_logs (habit_id, user_id, log_date, status, completion_method, skip_reason, completed_at)
    values
      (small_id, test_user, last_monday + i, 'done', 'minimum', null, (last_monday + i)::timestamptz),
      (forget_id, test_user, last_monday + i, 'skipped', 'normal', 'forgot', null),
      (steady_id, test_user, last_monday + i, 'done', 'normal', null, (last_monday + i)::timestamptz);
  end loop;
end
$$;

