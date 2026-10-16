begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text check (phone is null or phone ~ '^\+989[0-9]{9}$'),
  display_name text not null default 'بازی‌ساز' check (char_length(display_name) between 1 and 40),
  avatar_url text,
  role text not null default 'student' check (role in ('student','admin')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_unique on public.profiles(lower(email));
create unique index profiles_phone_unique on public.profiles(phone) where phone is not null;

create table public.lessons (
  id text primary key,
  title text not null,
  description text not null,
  order_index integer not null unique,
  difficulty text not null,
  prerequisite_id text references public.lessons(id),
  is_published boolean not null default false,
  xp integer not null default 0 check (xp between 0 and 1000)
);
insert into public.lessons values
 ('first-star','اولین ستاره','ستاره را بگیر و به پرچم برس.',1,'آسان',null,true,50),
 ('careful-jump','پرش دقیق','از روی مانع بپر و ستاره را پیدا کن.',2,'متوسط','first-star',true,75),
 ('world-builder','دنیای من','نمونه توسعه؛ هنوز قابل اجرا نیست.',3,'متوسط','careful-jump',false,0);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  project_data jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (octet_length(project_data::text) <= 64000)
);
create index projects_owner on public.projects(user_id, updated_at desc);
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.lessons(id),
  status text not null check (status in ('in_progress','completed')),
  score integer not null default 0 check (score between 0 and 100),
  best_time numeric check (best_time > 0 and best_time <= 180),
  xp integer not null default 0 check (xp between 0 and 1000),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,lesson_id)
);
create index progress_owner on public.progress(user_id);
create table public.deletion_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now()
);

-- Fixed search_path and qualified relations protect SECURITY DEFINER functions.
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if coalesce(new.raw_user_meta_data->>'account_kind','') not in ('adult','guardian')
    or coalesce(new.raw_user_meta_data->>'terms_version','') <> '2026-10-09' then
   raise exception 'Adult or guardian account and accepted terms required';
 end if;
 insert into public.profiles(id,email,phone,display_name)
 values(new.id,lower(new.email),nullif(new.raw_user_meta_data->>'phone',''),
        coalesce(nullif(left(new.raw_user_meta_data->>'display_name',40),''),'بازی‌ساز'));
 return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.sync_profile_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.email is distinct from old.email then
  update public.profiles set email=lower(new.email), updated_at=now() where id=new.id;
 end if;
 return new;
end;
$$;
revoke all on function public.sync_profile_email() from public, anon, authenticated;
create trigger on_auth_email_changed after update of email on auth.users for each row execute function public.sync_profile_email();

create function public.touch_profile() returns trigger language plpgsql set search_path = '' as $$
begin
 if auth.role() in ('authenticated','anon') and
 (new.id is distinct from old.id or new.role is distinct from old.role or new.phone is distinct from old.phone or new.created_at is distinct from old.created_at) then
  raise exception 'Protected profile fields cannot be changed by client';
 end if;
 new.updated_at=now();return new;
end;
$$;
create trigger profile_updated before update on public.profiles for each row execute function public.touch_profile();

create function public.validate_project() returns trigger language plpgsql set search_path = '' as $$
declare settings jsonb; item text; val numeric;
begin
 if tg_op='UPDATE' then
   if new.user_id <> old.user_id or new.id <> old.id then raise exception 'Owner is immutable'; end if;
   new.created_at=old.created_at;new.version=old.version+1;
 else new.version=1;
 end if;
 if jsonb_typeof(new.project_data) <> 'object' or
    not exists(select 1 from public.lessons where id=new.project_data->>'lesson_id' and is_published) then
  raise exception 'Invalid project lesson';
 end if;
 settings=new.project_data->'settings';
 if settings is null or jsonb_typeof(settings)<>'object' then raise exception 'Invalid settings';end if;
 foreach item in array array['speed','jump','starScore'] loop
  if settings->>item is null or jsonb_typeof(settings->item)<>'number' then raise exception 'Invalid setting';end if;
  val=(settings->>item)::numeric;
  if val<>trunc(val) or val<1 or val>(case when item='starScore' then 100 else 9 end) then raise exception 'Setting outside range';end if;
 end loop;
 -- Keep only supported data, preventing unexpected payloads in stored projects.
 new.project_data=jsonb_build_object('lesson_id',new.project_data->>'lesson_id','settings',jsonb_build_object('speed',settings->'speed','jump',settings->'jump','starScore',settings->'starScore'));
 new.updated_at=now();return new;
end;
$$;
create trigger project_validated before insert or update on public.projects for each row execute function public.validate_project();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.progress enable row level security;
alter table public.lessons enable row level security;
alter table public.deletion_requests enable row level security;
revoke all on public.profiles,public.projects,public.progress,public.lessons,public.deletion_requests from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_url,onboarding_completed) on public.profiles to authenticated;
grant select,insert,update,delete on public.projects to authenticated;
grant select on public.progress to authenticated;
grant select on public.lessons to anon,authenticated;
grant insert,update,delete on public.lessons to authenticated;
grant select,insert on public.deletion_requests to authenticated;
grant update(user_id) on public.deletion_requests to authenticated;

create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy project_read on public.projects for select to authenticated using(user_id=auth.uid());
create policy project_insert on public.projects for insert to authenticated with check(user_id=auth.uid());
create policy project_update on public.projects for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy project_delete on public.projects for delete to authenticated using(user_id=auth.uid());
create policy progress_read on public.progress for select to authenticated using(user_id=auth.uid());
create policy published_lesson_read on public.lessons for select to anon,authenticated using(is_published);
create policy admin_lesson_read on public.lessons for select to authenticated using(public.is_admin());
create policy admin_lesson_change on public.lessons for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy deletion_read on public.deletion_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy deletion_insert on public.deletion_requests for insert to authenticated with check(user_id=auth.uid());
create policy deletion_update on public.deletion_requests for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- XP is taken from trusted lesson data, never supplied by the browser.
create function public.record_progress(p_lesson text,p_status text,p_score integer default 0,p_time numeric default null)
 returns public.progress language plpgsql security definer set search_path = '' as $$
declare lesson public.lessons; result public.progress; owner uuid=auth.uid();
begin
 if owner is null then raise exception 'Authentication required';end if;
 if p_status not in ('in_progress','completed') or p_score not between 0 and 100 then raise exception 'Invalid progress';end if;
 select * into lesson from public.lessons where id=p_lesson and is_published;
 if not found then raise exception 'Lesson unavailable';end if;
 -- Serialize a user's progress updates; prevents racing prerequisite checks.
 perform 1 from public.profiles where id=owner for update;
 if lesson.prerequisite_id is not null and not exists(select 1 from public.progress where user_id=owner and lesson_id=lesson.prerequisite_id and status='completed') then raise exception 'Prerequisite incomplete';end if;
 if p_status='completed' and (p_time is null or p_time<=0 or p_time>180) then raise exception 'Invalid elapsed time';end if;
 if exists(select 1 from public.progress where user_id=owner and lesson_id=p_lesson and updated_at>now()-interval '1 second') then
  -- Identical retries are allowed, mutations are throttled.
  select * into result from public.progress where user_id=owner and lesson_id=p_lesson;
  if result.status=p_status and result.score>=p_score then return result;end if;
  raise exception 'Too many requests';
 end if;
 insert into public.progress(user_id,lesson_id,status,score,best_time,xp,completed_at)
 values(owner,p_lesson,p_status,case when p_status='completed' then p_score else 0 end,
 case when p_status='completed' then p_time else null end,
 case when p_status='completed' then lesson.xp else 0 end,
 case when p_status='completed' then now() else null end)
 on conflict(user_id,lesson_id) do update set
 status=case when progress.status='completed' then 'completed' else excluded.status end,
 score=greatest(progress.score,excluded.score),
 best_time=least(progress.best_time,excluded.best_time),
 xp=greatest(progress.xp,excluded.xp),
 completed_at=coalesce(progress.completed_at,excluded.completed_at),updated_at=now()
 returning * into result;return result;
end;
$$;
revoke all on function public.record_progress(text,text,integer,numeric) from public,anon;
grant execute on function public.record_progress(text,text,integer,numeric) to authenticated;

create function public.admin_users(p_search text default '',p_role text default null,p_limit integer default 50,p_offset integer default 0)
 returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if char_length(p_search)>80 or p_limit not between 1 and 50 or p_offset<0 or p_role is not null and p_role not in ('student','admin') then raise exception 'Invalid filter';end if;
 with filtered as (
 select p.id,p.email,p.phone,p.display_name,p.role,p.created_at,
  (select max(updated_at) from public.progress where user_id=p.id) last_activity,
  (select l.title from public.lessons l left join public.progress g on g.lesson_id=l.id and g.user_id=p.id where l.is_published and coalesce(g.status,'')<>'completed' order by l.order_index limit 1) current_lesson,
  (select count(*)*100/nullif((select count(*) from public.lessons where is_published),0) from public.progress where user_id=p.id and status='completed' and lesson_id in(select id from public.lessons where is_published)) progress_percent
 from public.profiles p
 where (p_role is null or p.role=p_role) and (p_search='' or strpos(lower(p.display_name||' '||p.email||' '||coalesce(p.phone,'')),lower(p_search))>0)
 ), page as (select * from filtered order by created_at,id limit p_limit offset p_offset)
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 return result;
end;
$$;
revoke all on function public.admin_users(text,text,integer,integer) from public,anon;
grant execute on function public.admin_users(text,text,integer,integer) to authenticated;
revoke all on function public.touch_profile(),public.validate_project() from public,anon,authenticated;

-- No frontend role elevation. Promote a verified UUID only from trusted SQL.
commit;
