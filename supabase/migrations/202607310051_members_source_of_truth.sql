-- Production compatibility repair: public."Members" predates the Digital Village
-- and remains the sole member record.  Auth accounts are linked, never copied.
alter table public."Members" add column if not exists auth_user_id uuid;
alter table public."Members" add column if not exists role text not null default 'member';

create unique index if not exists members_one_auth_account_idx
  on public."Members" (auth_user_id) where auth_user_id is not null;

comment on column public."Members".auth_user_id is
  'Supabase Auth identity linked to this pre-existing Association member record.';
comment on column public."Members".role is
  'Authorization role/Association office. Auth user metadata is not authoritative.';

-- Auth creation must not create a parallel profile/member row. Invitation
-- acceptance performs a guarded link to the pre-existing Members row instead.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin return new; end; $$;

create or replace function public.is_active_member(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public."Members" m
    where m.auth_user_id = user_id and lower(coalesce(m.status, '')) = 'active'
  );
$$;

create or replace function public.member_has_role(user_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public."Members" m
    where m.auth_user_id = user_id
      and lower(coalesce(m.status, '')) = 'active'
      and lower(coalesce(m.role, 'member')) = any(allowed_roles)
  );
$$;

create or replace function public.is_executive(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select public.member_has_role(user_id, array[
    'chairman','vice_chairperson','secretary_general','assistant_secretary_general',
    'treasurer','assistant_treasurer','auditor_general','assistant_auditor_general',
    'ipro','assistant_ipro','programme_officer','assistant_programme_officer','adviser','admin'
  ]);
$$;

create or replace function public.can_manage_members(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['chairman','secretary_general','admin']); $$;

create or replace function public.can_manage_finances(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['treasurer','assistant_treasurer','chairman','admin']); $$;

create or replace function public.can_manage_events(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['programme_officer','assistant_programme_officer','secretary_general','chairman','admin']); $$;

create or replace function public.can_manage_announcements(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['ipro','assistant_ipro','secretary_general','chairman','admin']); $$;

create or replace function public.can_manage_documents(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['secretary_general','assistant_secretary_general','chairman','admin']); $$;

create or replace function public.can_manage_volunteers(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['chairman','vice_chairperson','secretary_general','programme_officer','admin']); $$;

create or replace function public.can_view_executive_analytics(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['chairman','vice_chairperson','secretary_general','treasurer','auditor_general','admin']); $$;

create or replace function public.can_moderate_village(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.member_has_role(user_id, array['chairman','secretary_general','ipro','assistant_ipro','admin']); $$;

revoke all on function public.is_active_member(uuid), public.member_has_role(uuid, text[]) from public;
grant execute on function public.is_active_member(uuid), public.member_has_role(uuid, text[]) to authenticated;

-- Preserve Banna's known office on her existing row; no row is inserted and no
-- Auth identity is guessed. Access begins only after auth_user_id is explicitly linked.
update public."Members"
set role = 'ipro'
where lower(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) = 'banna bojang'
  and lower(coalesce(role, 'member')) = 'member';

alter table public."Members" enable row level security;
drop policy if exists "Members can view their own member record" on public."Members";
create policy "Members can view their own member record" on public."Members"
for select to authenticated using (auth_user_id = auth.uid());
drop policy if exists "Active members can view the member directory" on public."Members";
create policy "Active members can view the member directory" on public."Members"
for select to authenticated using (public.is_active_member() and lower(coalesce(status, '')) = 'active');
drop policy if exists "Executives can view member records" on public."Members";
create policy "Executives can view member records" on public."Members"
for select to authenticated using (public.can_manage_members());
drop policy if exists "Members can update their own member record" on public."Members";
create policy "Members can update their own member record" on public."Members"
for update to authenticated using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());
revoke update on public."Members" from authenticated;
grant update (first_name, last_name, gender, date_of_birth, phone, email, address,
  country, occupation, profile_photo, auth_user_id, updated_at) on public."Members" to authenticated;

-- Replace active-member checks on deployed feature tables without assuming every
-- optional feature migration has been installed.
do $repair$
declare target record;
begin
  for target in select * from (values
    ('dues_periods','Active members can view dues periods'),
    ('village_posts','Active members can view village posts'),
    ('village_comments','Active members can view village comments'),
    ('village_reactions','Active members can view village reactions')
  ) as policies(table_name, policy_name)
  loop
    if to_regclass('public.' || target.table_name) is not null then
      execute format('drop policy if exists %I on public.%I', target.policy_name, target.table_name);
      execute format('create policy %I on public.%I for select to authenticated using (public.is_active_member())', target.policy_name, target.table_name);
    end if;
  end loop;
end $repair$;
