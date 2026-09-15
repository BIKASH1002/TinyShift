-- Run separately after 012_push_reminders.sql, enabling pg_net, Cron and Vault.
-- Create Vault secrets named tinyshift_push_worker_url and tinyshift_push_worker_secret
-- in the dashboard. The URL is https://PROJECT.supabase.co/functions/v1/send-push-reminders.
-- The secret must match the Edge Function's PUSH_WORKER_SECRET (32+ random characters).
-- Keep the existing tinyshift-routine-schedule job: it creates the reminders.
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='tinyshift_push_worker_url')
    or not exists(select 1 from vault.decrypted_secrets where name='tinyshift_push_worker_secret') then
    raise exception 'Create the two push worker secrets in Vault first.';
  end if;
end;
$$;
select cron.schedule('tinyshift-push-delivery', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='tinyshift_push_worker_url'),
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='tinyshift_push_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
