-- Run separately as database owner after enabling Supabase Cron / pg_cron.
-- A named schedule can be rerun to update the existing job.
select
  cron.schedule ('tinyshift-routine-schedule', '*/5 * * * *', 'select public.process_routine_schedule();');

