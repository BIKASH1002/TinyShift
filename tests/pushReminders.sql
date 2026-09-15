do $$
begin
  if not exists (
    select
      1
    from
      pg_roles
    where
      rolname = 'service_role') then
    create role service_role;
  end if;
end
$$;
\i backend/sql/012_push_reminders.sql
\i backend/sql/012_push_reminders.sql
begin;
create function pg_temp.check_push(ok boolean, message text)
returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', message; end if; end $$;
create function pg_temp.reject_push(command text, expected text)
returns void language plpgsql as $$
begin
  begin execute command;
  exception when others then
    if position(expected in sqlerrm)=0 then raise; end if;
    return;
  end;
  raise exception 'Expected rejection: %', expected;
end $$;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000005'),
 ('00000000-0000-0000-0000-000000000006');
insert into public.habits(id,user_id,name,normal_version,minimum_version,anchor,created_at)
values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005',
 'Push test read','10 pages','1 page','After tea',now()-interval '10 days');
insert into public.routine_preferences(user_id,time_zone,daily_enabled,weekly_enabled)
values ('00000000-0000-0000-0000-000000000005','UTC',true,true);
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
select public.register_push_subscription('https://fcm.googleapis.com/push/test', 'B'||repeat('a',86),repeat('b',22));
select public.register_push_subscription('https://fcm.googleapis.com/push/test', 'B'||repeat('a',86),repeat('b',22));
select pg_temp.check_push(public.has_push_subscription('https://fcm.googleapis.com/push/test'),'Registration failed');
select pg_temp.reject_push($q$select * from public.push_subscriptions$q$,'permission denied');
select pg_temp.reject_push($q$select * from public.push_deliveries$q$,'permission denied');
select pg_temp.reject_push($q$select * from public.claim_push_deliveries(20)$q$,'permission denied');
select pg_temp.reject_push($q$select public.register_push_subscription('https://127.0.0.1/private','B'||repeat('a',86),repeat('b',22))$q$,'unsupported');
select pg_temp.reject_push($q$select public.register_push_subscription('https://fcm.googleapis.com.evil.test/push','B'||repeat('a',86),repeat('b',22))$q$,'unsupported');
select pg_temp.reject_push($q$select public.register_push_subscription('https://fcm.googleapis.com/push/other','bad',repeat('b',22))$q$,'unsupported');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000006';
select pg_temp.check_push(not public.has_push_subscription('https://fcm.googleapis.com/push/test'),'Other owner leaked');
select pg_temp.reject_push($q$select public.register_push_subscription('https://fcm.googleapis.com/push/test','B'||repeat('a',86),repeat('b',22))$q$,'another account');
select public.remove_push_subscription(null);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
select pg_temp.check_push(public.has_push_subscription('https://fcm.googleapis.com/push/test'),'Other user removed device');
do $$ begin
  for i in 2..10 loop
    perform public.register_push_subscription('https://fcm.googleapis.com/push/device-'||i,'B'||repeat('a',86),repeat('b',22));
  end loop;
end $$;
select pg_temp.reject_push($q$select public.register_push_subscription('https://fcm.googleapis.com/push/device-11','B'||repeat('a',86),repeat('b',22))$q$,'Ten devices');
select public.remove_push_subscription(null);
select public.register_push_subscription('https://fcm.googleapis.com/push/test','B'||repeat('a',86),repeat('b',22));
set request.jwt.claim.sub='';
select pg_temp.reject_push($q$select public.register_push_subscription('https://fcm.googleapis.com/push/test','B'||repeat('a',86),repeat('b',22))$q$,'Please sign in');
reset role;

insert into public.routine_reminders(user_id,kind,period_start,expires_at)
values ('00000000-0000-0000-0000-000000000005','daily',(now() at time zone 'UTC')::date,now()+interval '1 hour')
on conflict do nothing;
insert into public.routine_reminders(user_id,kind,period_start,expires_at)
values ('00000000-0000-0000-0000-000000000005','daily',(now() at time zone 'UTC')::date,now()+interval '1 hour')
on conflict do nothing;
select pg_temp.check_push((select count(*)=1 from public.push_deliveries),'Duplicate delivery queued');
create temp table claimed as select * from public.claim_push_deliveries(20);
select pg_temp.check_push((select count(*)=1 from claimed),'Eligible daily reminder not claimed');
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Live lease reclaimed');
select public.finish_push_delivery(delivery_id,gen_random_uuid(),201) from claimed;
select pg_temp.check_push((select status='sending' from public.push_deliveries),'Stale acknowledgement changed job');
select public.finish_push_delivery(delivery_id,lease_token,503) from claimed;
select pg_temp.check_push((select status='pending' and attempts=1 from public.push_deliveries),'Transient failure not retried');
update public.push_deliveries set next_attempt_at=now()-interval '1 second';
truncate claimed;
insert into claimed select * from public.claim_push_deliveries(20);
select pg_temp.check_push((select count(*)=1 from claimed),'Retry did not claim');
-- Simulate an interrupted worker's expired lease.
update public.push_deliveries set next_attempt_at=now()-interval '1 second';
select pg_temp.check_push((select count(*)=1 from public.claim_push_deliveries(20)),'Expired lease not recovered');
select public.finish_push_delivery(delivery_id,lease_token,201) from claimed;
select pg_temp.check_push((select status='sending' and attempts=3 from public.push_deliveries),'Old lease acknowledged a newer attempt');
update public.push_deliveries set next_attempt_at=now()-interval '1 second';
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Retry cap bypassed');
select pg_temp.check_push((select status='failed' from public.push_deliveries),'Exhausted job not terminal');

-- Each eligibility condition is checked again immediately before claiming.
update public.push_deliveries set status='pending',attempts=0,next_attempt_at=now();
update public.routine_preferences set daily_enabled=false where user_id='00000000-0000-0000-0000-000000000005';
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Opt-out ignored');
update public.routine_preferences set daily_enabled=true where user_id='00000000-0000-0000-0000-000000000005';
update public.push_deliveries set status='pending',attempts=0,next_attempt_at=now();
update public.routine_reminders set dismissed_at=now() where user_id='00000000-0000-0000-0000-000000000005';
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Dismissed reminder delivered');
update public.routine_reminders set dismissed_at=null,expires_at=now()-interval '1 second' where user_id='00000000-0000-0000-0000-000000000005';
update public.push_deliveries set status='pending',attempts=0,next_attempt_at=now();
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Expired reminder delivered');
update public.routine_reminders set expires_at=now()+interval '1 hour' where user_id='00000000-0000-0000-0000-000000000005';
insert into public.habit_logs(user_id,habit_id,log_date,status,completion_method)
values ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000005',
 (now() at time zone 'UTC')::date,'done','minimum');
update public.push_deliveries set status='pending',attempts=0,next_attempt_at=now();
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Completed day delivered');
delete from public.habit_logs where user_id='00000000-0000-0000-0000-000000000005';
update public.habits set is_active=false where user_id='00000000-0000-0000-0000-000000000005';
update public.push_deliveries set status='pending',attempts=0,next_attempt_at=now();
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Archived habit delivered');
update public.habits set is_active=true where user_id='00000000-0000-0000-0000-000000000005';
update public.push_deliveries set status='pending',attempts=0,next_attempt_at=now();
truncate claimed;
insert into claimed select * from public.claim_push_deliveries(20);
select public.finish_push_delivery(delivery_id,lease_token,201) from claimed;
select pg_temp.check_push((select status='sent' from public.push_deliveries),'Success not recorded');
select pg_temp.check_push((select count(*)=0 from public.claim_push_deliveries(20)),'Sent job repeated');

insert into public.routine_reminders(user_id,kind,period_start,expires_at)
values ('00000000-0000-0000-0000-000000000005','weekly',date_trunc('week',now() at time zone 'UTC')::date,now()+interval '1 hour');
truncate claimed;
insert into claimed select * from public.claim_push_deliveries(20);
select pg_temp.check_push((select count(*)=1 and min(kind)='weekly' from claimed),'Weekly reminder not claimed');
select public.finish_push_delivery(delivery_id,lease_token,410) from claimed;
select pg_temp.check_push((select count(*)=0 from public.push_subscriptions),'Gone endpoint retained');
select pg_temp.check_push((select count(*)=0 from public.push_deliveries),'Gone endpoint jobs retained');

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
select public.register_push_subscription('https://fcm.googleapis.com/push/export-device','B'||repeat('a',86),repeat('b',22));
select pg_temp.check_push(jsonb_array_length(public.export_my_account()->'push_subscriptions')=1,'Export omitted subscription');
select pg_temp.check_push(public.export_my_account()::text not like '%fcm.googleapis.com%' and public.export_my_account()::text not like '%auth_key%','Export leaked device credentials');
reset role;
select pg_temp.check_push((select count(*)=0 from public.push_deliveries),'New device received stale backlog');
delete from public.routine_reminders where user_id='00000000-0000-0000-0000-000000000005';
insert into public.routine_reminders(user_id,kind,period_start,expires_at)
values ('00000000-0000-0000-0000-000000000005','weekly',date_trunc('week',now() at time zone 'UTC')::date,now()+interval '1 hour');
delete from auth.users where id='00000000-0000-0000-0000-000000000005';
select pg_temp.check_push((select count(*)=0 from public.push_subscriptions),'Account deletion retained subscription');
select pg_temp.check_push((select count(*)=0 from public.push_deliveries),'Account deletion retained delivery');
rollback;
select 'Push: isolation, limits, idempotency, leases, retries, eligibility, export and cascade passed' as result;
