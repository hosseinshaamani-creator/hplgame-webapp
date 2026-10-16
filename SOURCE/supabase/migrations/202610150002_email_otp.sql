begin;

alter table public.profiles add column if not exists full_name text;
update public.profiles set full_name=display_name where full_name is null;
alter table public.profiles add constraint profile_full_name_length check(char_length(full_name) between 1 and 80);

-- Confirmation comes from Auth, never from client metadata.
create function public.has_verified_account() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null);
$$;
revoke all on function public.has_verified_account() from public,anon;
grant execute on function public.has_verified_account() to authenticated;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.has_verified_account() and exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare person_name text=btrim(coalesce(new.raw_user_meta_data->>'full_name',''));
begin
 if coalesce(new.raw_user_meta_data->>'account_kind','') not in ('adult','guardian')
    or coalesce(new.raw_user_meta_data->>'terms_version','')<>'2026-10-15'
    or char_length(person_name) not between 2 and 80
    or coalesce(new.raw_user_meta_data->>'phone','') !~ '^\+989[0-9]{9}$' then
   raise exception 'Valid name, phone, adult or guardian account and accepted terms required';
 end if;
 insert into public.profiles(id,email,phone,display_name,full_name)
 values(new.id,lower(new.email),new.raw_user_meta_data->>'phone',left(person_name,40),person_name);
 return new;
end;
$$;

create or replace function public.touch_profile() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.role() in ('authenticated','anon') and
 (new.id is distinct from old.id or new.role is distinct from old.role or new.phone is distinct from old.phone
  or new.full_name is distinct from old.full_name or new.created_at is distinct from old.created_at) then
   raise exception 'Protected profile fields cannot be changed by client';
 end if;
 new.updated_at=now();return new;
end;
$$;

-- These restrictive policies also apply when Confirm email was configured incorrectly.
create policy profile_verified on public.profiles as restrictive for all to authenticated
 using(public.has_verified_account()) with check(public.has_verified_account());
create policy project_verified on public.projects as restrictive for all to authenticated
 using(public.has_verified_account()) with check(public.has_verified_account());
create policy progress_verified on public.progress as restrictive for all to authenticated
 using(public.has_verified_account()) with check(public.has_verified_account());
create policy deletion_verified on public.deletion_requests as restrictive for all to authenticated
 using(public.has_verified_account()) with check(public.has_verified_account());

-- A SECURITY DEFINER RPC must check confirmation itself, since it bypasses RLS.
create function public.require_verified_progress() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.role() in ('authenticated','anon') and not public.has_verified_account() then
   raise exception 'Verified email required' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function public.require_verified_progress() from public,anon,authenticated;
create trigger progress_requires_verification before insert or update on public.progress
 for each row execute function public.require_verified_progress();

create or replace function public.admin_users(p_search text default '',p_role text default null,p_limit integer default 50,p_offset integer default 0)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if char_length(p_search)>80 or p_limit not between 1 and 50 or p_offset<0 or
   (p_role is not null and p_role not in ('student','admin')) then raise exception 'Invalid query';end if;
 with matched as (
  select p.*,u.email_confirmed_at,
   (select max(updated_at) from public.progress where user_id=p.id) as last_activity,
   (select count(*) from public.progress where user_id=p.id and status='completed') as completed_count,
   (select l.title from public.progress r join public.lessons l on l.id=r.lesson_id where r.user_id=p.id order by r.updated_at desc limit 1) as current_lesson
  from public.profiles p join auth.users u on u.id=p.id
  where (p_role is null or p.role=p_role)
   and (p.full_name ilike '%'||p_search||'%' or p.email ilike '%'||p_search||'%' or p.phone ilike '%'||p_search||'%')
 ), page as (
  select id,full_name,display_name,email,phone,role,created_at,email_confirmed_at,last_activity,current_lesson,
   round(100.0*completed_count/greatest((select count(*) from public.lessons where is_published),1)) as progress_percent
  from matched order by created_at desc,id limit p_limit offset p_offset
 ) select jsonb_build_object('total',(select count(*) from matched),'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 return result;
end;
$$;
revoke all on function public.admin_users(text,text,integer,integer) from public,anon;
grant execute on function public.admin_users(text,text,integer,integer) to authenticated;

commit;
