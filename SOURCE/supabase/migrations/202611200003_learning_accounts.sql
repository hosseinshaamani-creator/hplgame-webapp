begin;

-- Separate from the earlier block-editor projects; existing data is preserved.
create table public.learning_projects (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  idea text not null check (char_length(btrim(idea)) between 2 and 600),
  step integer not null default 0 check (step between 0 and 3),
  won boolean not null default false,
  messages jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(messages)='array' and jsonb_array_length(messages)<=40 and octet_length(messages::text)<=128000)
);
create index learning_projects_owner on public.learning_projects(user_id,updated_at desc);
create table public.learning_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  max_projects integer not null default 1 check(max_projects between 1 and 100)
);
alter table public.learning_projects enable row level security;
alter table public.learning_entitlements enable row level security;
revoke all on public.learning_projects,public.learning_entitlements from anon,authenticated;
grant select on public.learning_projects,public.learning_entitlements to authenticated;
create policy learning_owner on public.learning_projects for select to authenticated
  using(user_id=auth.uid() and public.has_verified_account());
create policy entitlement_owner on public.learning_entitlements for select to authenticated
  using(user_id=auth.uid() and public.has_verified_account());

create function public.save_learning_project(p_id uuid,p_idea text,p_step integer,p_won boolean,p_messages jsonb,p_version integer)
returns public.learning_projects language plpgsql security definer set search_path='' as $$
declare owner uuid=auth.uid(); current_row public.learning_projects; result public.learning_projects; item jsonb; quota integer;
begin
  if owner is null or not public.has_verified_account() then raise exception 'Verified account required' using errcode='42501'; end if;
  if p_id is null or p_idea is null or char_length(btrim(p_idea)) not between 2 and 600
    or p_step is null or p_step not between 0 and 3 or p_won is null or p_version is null or p_version<0
    or p_messages is null or jsonb_typeof(p_messages)<>'array' then raise exception 'Invalid learning project'; end if;
  if jsonb_array_length(p_messages)>40 or octet_length(p_messages::text)>128000 then raise exception 'Message limit'; end if;
  for item in select * from jsonb_array_elements(p_messages) loop
    if jsonb_typeof(item)<>'object' or coalesce(item->>'role','') not in ('user','coach')
      or jsonb_typeof(item->'text') is distinct from 'string' or char_length(item->>'text')>3000 then raise exception 'Invalid message'; end if;
  end loop;
  -- Serialize per owner: concurrent first-game requests cannot bypass quota.
  perform 1 from public.profiles where id=owner for update;
  select * into current_row from public.learning_projects where id=p_id;
  if found then
    if current_row.user_id<>owner then raise exception 'Access denied' using errcode='42501'; end if;
    if current_row.version<>p_version then raise exception 'version_conflict'; end if;
    update public.learning_projects set idea=btrim(p_idea),step=p_step,won=p_won,messages=p_messages,
      version=version+1,updated_at=now() where id=p_id returning * into result;
  else
    if p_version<>0 then raise exception 'version_conflict'; end if;
    select max_projects into quota from public.learning_entitlements where user_id=owner;
    if (select count(*) from public.learning_projects where user_id=owner)>=coalesce(quota,1) then raise exception 'project_limit'; end if;
    insert into public.learning_projects(id,user_id,idea,step,won,messages)
      values(p_id,owner,btrim(p_idea),p_step,p_won,p_messages) returning * into result;
  end if;
  return result;
end;
$$;
revoke all on function public.save_learning_project(uuid,text,integer,boolean,jsonb,integer) from public,anon;
grant execute on function public.save_learning_project(uuid,text,integer,boolean,jsonb,integer) to authenticated;
commit;
