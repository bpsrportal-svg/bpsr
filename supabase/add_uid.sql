alter table profiles
  add column if not exists uid text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_uid_digits'
  ) then
    alter table profiles
      add constraint profiles_uid_digits check (uid is null or uid ~ '^[0-9]+$');
  end if;
end $$;

create index if not exists idx_profiles_uid on profiles(uid);
