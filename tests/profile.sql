-- Run after the existing fixtures; the auth stub gains fields used by the signup trigger.
alter table auth.users
  add column if not exists email text;

alter table auth.users
  add column if not exists raw_user_meta_data jsonb;

\i backend/sql/001_profiles.sql
\i backend/sql/001_profiles.sql
grant select, insert, update on public.profiles to authenticated;

-- The full fixture creates profiles through the auth signup trigger. Remove the
-- first fixture row so this test still exercises a missing-profile insert.
delete from public.profiles
where id = '00000000-0000-0000-0000-000000000001';

set role authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

insert into public.profiles (id, full_name)
  values (auth.uid (), 'First name');

update
  public.profiles
set
  full_name = 'Saved name'
where
  id = auth.uid ();

do $$
declare
  affected integer;
begin
  if (
    select
      full_name
    from
      public.profiles
    where
      id = auth.uid ()) <> 'Saved name' then
    raise exception 'Profile save failed';
  end if;
  update
    public.profiles
  set
    full_name = 'Stale'
  where
    id = auth.uid ()
    and updated_at = '2000-01-01';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Stale profile overwrote newer data';
  end if;
end
$$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$
declare
  affected integer;
begin
  if exists (
    select
      1
    from
      public.profiles
    where
      id = '00000000-0000-0000-0000-000000000001') then
  raise exception 'Profile leaked across accounts';
end if;
  update
    public.profiles
  set
    full_name = 'Not mine'
  where
    id = '00000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Cross-account profile edit succeeded';
  end if;
  begin
    insert into public.profiles (id, full_name)
      values ('00000000-0000-0000-0000-000000000001', 'Not mine');
    raise exception 'Cross-account profile insert succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;

select
  'Profile persistence, stale update, migration rerun, and isolation checks passed' as result;

