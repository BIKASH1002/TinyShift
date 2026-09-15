-- Dedicated fixtures, rolled back so the remaining account/privacy suite is unaffected.
begin;
insert into public.habits(id,user_id,name,frequency,anchor,normal_version,minimum_version,created_at)
values ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',
'Rescue fixture','Daily','After tea','Read 10 pages','Read one page','2020-01-01');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare h public.habits; first_log public.habit_logs; retry_log public.habit_logs;
begin
  select * into h from public.habits where name = 'Rescue fixture';
  first_log := jsonb_populate_record(null::public.habit_logs, public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'UTC',h.updated_at));
  retry_log := jsonb_populate_record(null::public.habit_logs, public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'UTC',h.updated_at));
  if first_log.id <> retry_log.id or first_log.completed_at <> retry_log.completed_at or
     first_log.completion_method <> 'minimum' or first_log.rescue_action <> 'Recall one idea.' then
    raise exception 'Rescue persistence or idempotency failed';
  end if;
  begin
    perform public.complete_rescue_step(h.id,'Different action.',(now() at time zone 'UTC')::date,'UTC',h.updated_at);
    raise exception 'Another completion was overwritten';
  exception when others then
    if sqlerrm not like 'This habit already%' then raise; end if;
  end;
  begin
    perform public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date-1,'UTC',h.updated_at);
    raise exception 'Old day saved';
  exception when others then
    if sqlerrm not like 'The day changed%' then raise; end if;
  end;
  begin
    perform public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'UTC',h.updated_at-interval '1 second');
    raise exception 'Stale habit saved';
  exception when others then
    if sqlerrm not like 'This habit changed%' then raise; end if;
  end;
  begin
    perform public.complete_rescue_step(h.id,' ',(now() at time zone 'UTC')::date,'UTC',h.updated_at);
    raise exception 'Empty action saved';
  exception when others then
    if sqlerrm <> 'Choose a valid rescue step.' then raise; end if;
  end;
  begin
    perform public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'invalid-zone',h.updated_at);
    raise exception 'Invalid zone saved';
  exception when others then
    if sqlerrm <> 'Use a valid device time zone.' then raise; end if;
  end;
  delete from public.habit_logs where id = first_log.id;
  insert into public.habit_logs(habit_id,user_id,log_date,status,completion_method,skip_reason)
    values(h.id,auth.uid(),(now() at time zone 'UTC')::date,'skipped','normal','away');
  retry_log := jsonb_populate_record(null::public.habit_logs, public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'UTC',h.updated_at));
  if retry_log.status <> 'done' or retry_log.skip_reason is not null then raise exception 'Skip not rescued'; end if;
  update public.habit_logs set completion_method='normal', rescue_action=null where id=retry_log.id;
  begin
    perform public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'UTC',h.updated_at);
    raise exception 'Normal completion overwritten';
  exception when others then
    if sqlerrm not like 'This habit already%' then raise; end if;
  end;
  update public.habits set is_active=false where id=h.id;
  begin
    perform public.complete_rescue_step(h.id,'Recall one idea.',(now() at time zone 'UTC')::date,'UTC',h.updated_at);
    raise exception 'Archived habit completed';
  exception when others then
    if sqlerrm <> 'This habit is no longer available.' then raise; end if;
  end;
  update public.habits set is_active=true where id=h.id;
end;
$$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.complete_rescue_step('90000000-0000-0000-0000-000000000001','Read.',(now() at time zone 'UTC')::date,'UTC',now());
    raise exception 'Cross-account rescue succeeded';
  exception when others then
    if sqlerrm <> 'This habit is no longer available.' then raise; end if;
  end;
end;
$$;
set local request.jwt.claim.sub = '';
do $$
begin
  begin
    perform public.complete_rescue_step('90000000-0000-0000-0000-000000000001','Read.',(now() at time zone 'UTC')::date,'UTC',now());
    raise exception 'Anonymous rescue succeeded';
  exception when others then
    if sqlerrm <> 'Please sign in.' then raise; end if;
  end;
end;
$$;
rollback;
select 'Rescue completion, retry, skip, stale day/habit, ownership and normal-completion protection passed' as result;
