begin;

-- Guardian management is self-declared, not government identity/age verification.
-- New columns retain the declaration at registration; clients cannot update them.
alter table public.profiles add column account_kind text check(account_kind in ('adult','guardian','minor'));
alter table public.profiles add column guardian_name text check(guardian_name is null or char_length(guardian_name) between 2 and 80);
alter table public.profiles add column guardian_consent_at timestamptz;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare person_name text=btrim(coalesce(new.raw_user_meta_data->>'full_name',''));
begin
 if coalesce(new.raw_user_meta_data->>'account_kind','') not in ('adult','guardian','minor')
    or coalesce(new.raw_user_meta_data->>'terms_version','')not in ('2026-10-15','2026-11-20')
    or char_length(person_name) not between 2 and 80
    or coalesce(new.raw_user_meta_data->>'phone','') !~ '^\+989[0-9]{9}$' then
   raise exception 'Valid name, phone, adult or guardian account and accepted terms required';
 end if;
 if new.raw_user_meta_data->>'account_kind'='minor' and (coalesce(new.raw_user_meta_data->>'guardian_consent','')<>'true' or char_length(btrim(coalesce(new.raw_user_meta_data->>'guardian_name',''))) not between 2 and 80) then
   raise exception 'Guardian declaration required';
 end if;
 insert into public.profiles(id,email,phone,display_name,full_name,account_kind,guardian_name,guardian_consent_at)
 values(new.id,lower(new.email),new.raw_user_meta_data->>'phone',left(person_name,40),person_name,new.raw_user_meta_data->>'account_kind',
 case when new.raw_user_meta_data->>'account_kind'='minor' then btrim(new.raw_user_meta_data->>'guardian_name') end,
 case when new.raw_user_meta_data->>'account_kind'='minor' then now() end);
 return new;
end;
$$;

commit;
