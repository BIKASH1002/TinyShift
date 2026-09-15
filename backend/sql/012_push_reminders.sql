begin;
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_owner on public.push_subscriptions(user_id);
create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid not null references public.routine_reminders(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease uuid,
  last_code integer,
  created_at timestamptz not null default now(),
  unique(reminder_id, subscription_id)
);
create index if not exists push_deliveries_due on public.push_deliveries(next_attempt_at)
  where status in ('pending','sending');
alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_subscriptions, public.push_deliveries from public, anon, authenticated;
grant all on public.push_subscriptions, public.push_deliveries to service_role;

create or replace function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  -- Known browser push services only. Never turn this into an arbitrary URL fetcher.
  if p_endpoint is null or length(p_endpoint) > 2048 or p_endpoint !~
    '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#]+$'
    or p_p256dh is null or p_p256dh !~ '^B[A-Za-z0-9_-]{86}$'
    or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{22}$' then
    raise exception 'This browser returned an unsupported push subscription.';
  end if;
  perform 1 from auth.users where id = auth.uid() for update;
  if exists(select 1 from public.push_subscriptions where endpoint=p_endpoint and user_id<>auth.uid()) then
    raise exception 'Turn off notifications on this device before using another account.';
  end if;
  if not exists(select 1 from public.push_subscriptions where endpoint=p_endpoint)
     and (select count(*) from public.push_subscriptions where user_id=auth.uid()) >= 10 then
    raise exception 'Ten devices are already enabled. Turn off push on all devices and enable the devices you use.';
  end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_key)
    values(auth.uid(),p_endpoint,p_p256dh,p_auth)
    on conflict(endpoint) do update set p256dh=excluded.p256dh,auth_key=excluded.auth_key
      where push_subscriptions.user_id=auth.uid();
end;
$$;
create or replace function public.has_push_subscription(p_endpoint text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid());
$$;
create or replace function public.remove_push_subscription(p_endpoint text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  delete from public.push_subscriptions where user_id=auth.uid() and (p_endpoint is null or endpoint=p_endpoint);
end;
$$;
revoke all on function public.register_push_subscription(text,text,text), public.has_push_subscription(text),
  public.remove_push_subscription(text) from public, anon;
grant execute on function public.register_push_subscription(text,text,text), public.has_push_subscription(text),
  public.remove_push_subscription(text) to authenticated;

create or replace function public.queue_push_reminder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.push_deliveries(user_id,reminder_id,subscription_id)
    select new.user_id,new.id,s.id from public.push_subscriptions s where s.user_id=new.user_id
    on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.queue_push_reminder() from public,anon,authenticated;
drop trigger if exists queue_push_reminder on public.routine_reminders;
create trigger queue_push_reminder after insert on public.routine_reminders
  for each row execute function public.queue_push_reminder();

-- Worker-only leased queue. Recheck opt-out, expiry and today's activity on every attempt.
create or replace function public.claim_push_deliveries(p_limit integer default 20)
returns table(delivery_id uuid, lease_token uuid, endpoint text, p256dh text, auth_key text,
  kind text, expires_at timestamptz, reminder_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  if p_limit is null or p_limit not between 1 and 50 then raise exception 'Invalid batch size'; end if;
  -- Bound retained delivery history and discard ineligible work without a network call.
  delete from public.push_deliveries where created_at < now()-interval '30 days';
  update public.push_deliveries d set status='failed', lease=null
  where d.status in ('pending','sending') and (
    d.attempts>=3 and d.next_attempt_at<=now()
    or not exists(
      select 1 from public.routine_reminders r join public.routine_preferences p on p.user_id=r.user_id
      join pg_timezone_names z on z.name=p.time_zone
      where r.id=d.reminder_id and r.expires_at>now() and r.dismissed_at is null
      and ((r.kind='daily' and p.daily_enabled and r.period_start=(now() at time zone z.name)::date
        and exists(select 1 from public.habits h where h.user_id=r.user_id and h.is_active
          and (h.created_at at time zone z.name)::date<=r.period_start
          and (coalesce(h.frequency,'Daily')<>'Weekdays' or extract(isodow from r.period_start)<=5)
          and not exists(select 1 from public.habit_logs l where l.habit_id=h.id
            and l.user_id=r.user_id and l.log_date=r.period_start)))
        or (r.kind='weekly' and p.weekly_enabled
          and r.period_start=date_trunc('week',now() at time zone z.name)::date)))
  );
  return query
    with due as (
      select d.id from public.push_deliveries d
      where d.status in ('pending','sending') and d.next_attempt_at<=now() and d.attempts<3
      order by d.next_attempt_at,d.id limit p_limit for update skip locked
    ), claimed as (
      update public.push_deliveries d set status='sending', attempts=d.attempts+1,
        lease=gen_random_uuid(),next_attempt_at=now()+interval '2 minutes'
      from due where d.id=due.id returning d.*
    )
    select c.id,c.lease,s.endpoint,s.p256dh,s.auth_key,r.kind,r.expires_at,r.id
    from claimed c join public.push_subscriptions s on s.id=c.subscription_id
    join public.routine_reminders r on r.id=c.reminder_id;
end;
$$;
create or replace function public.finish_push_delivery(p_id uuid,p_lease uuid,p_code integer)
returns void language plpgsql security definer set search_path = public as $$
declare d public.push_deliveries;
begin
  select * into d from public.push_deliveries where id=p_id and lease=p_lease and status='sending' for update;
  if not found then return; end if;
  if p_code in (404,410) then
    delete from public.push_subscriptions where id=d.subscription_id;
    return;
  end if;
  update public.push_deliveries set
    status=case when p_code between 200 and 299 then 'sent'
      when (p_code=0 or p_code=429 or p_code>=500) and attempts<3 then 'pending' else 'failed' end,
    next_attempt_at=now()+interval '5 minutes',last_code=p_code,lease=null where id=d.id;
end;
$$;
revoke all on function public.claim_push_deliveries(integer),public.finish_push_delivery(uuid,uuid,integer)
  from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(integer),public.finish_push_delivery(uuid,uuid,integer)
  to service_role;
create or replace function public.export_my_account ()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
  as $$
declare
  uid uuid := auth.uid ();
  result jsonb;
  records jsonb;
  table_name text;
  owner_column text;
begin
  if uid is null or not exists (
    select
      1
    from
      auth.users
    where
      id = uid) then
    raise exception 'Please sign in.';
  end if;
  result := jsonb_build_object('format_version', 1, 'exported_at', now(), 'account', (
    select
      jsonb_build_object('id', id, 'email', email)
    from auth.users
    where
      id = uid));
  foreach table_name in array array['profiles', 'habits', 'habit_logs', 'ai_suggestions', 'weekly_reflections', 'daily_contexts', 'routine_proposals', 'ai_draft_usage', 'ai_habit_adjustments', 'routine_preferences', 'routine_reminders', 'account_deletion_attempts'] loop
    owner_column := case when table_name = 'profiles' then
      'id'
    else
      'user_id'
    end;
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where %I=$1', table_name, owner_column) into records
    using uid;
    result := result || jsonb_build_object(table_name, records);
  end loop;
    result := result || jsonb_build_object(
      'push_subscriptions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id',id,'created_at',created_at)), '[]'::jsonb) from public.push_subscriptions where user_id=uid),
      'push_deliveries', (select coalesce(jsonb_agg(to_jsonb(d)-'lease'),'[]'::jsonb)
        from public.push_deliveries d where user_id=uid));
    return result;
end;
$$;

commit;
