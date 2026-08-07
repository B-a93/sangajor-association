-- Production-safe executive identity and invitation authorization repair.
-- Members is the identity source; executive_roles is the office source. This
-- migration never inserts auth.users and never assigns an office from Members.role.

alter table public."Members" add column if not exists auth_user_id uuid;
create unique index if not exists members_one_auth_account_idx
  on public."Members" (auth_user_id) where auth_user_id is not null;

-- Preserve existing links. Link an unlinked executive only when exactly one
-- Members row and exactly one Auth user share the normalized email. Restricting
-- the candidates through executive_roles prevents ordinary-member bootstrap.
with active_executive_members as (
  select distinct m.id, lower(btrim(m.email)) as email
  from public."Members" m
  join public.executive_roles er on er.member_id = m.id
  where m.auth_user_id is null
    and nullif(btrim(m.email), '') is not null
    and lower(coalesce(to_jsonb(er)->>'is_active', 'true')) in ('true','t','1')
    and lower(coalesce(to_jsonb(er)->>'status', 'active')) = 'active'
    and (to_jsonb(er)->>'ends_at' is null or (to_jsonb(er)->>'ends_at')::timestamptz > now())
), unique_member_email as (
  select lower(btrim(m.email)) as email, min(m.id::text)::uuid as member_id
  from public."Members" m
  where nullif(btrim(m.email), '') is not null
    and exists (select 1 from active_executive_members candidate where candidate.id = m.id)
    and (select count(*) from public."Members" duplicate
         where lower(btrim(duplicate.email)) = lower(btrim(m.email))) = 1
  group by lower(btrim(m.email)) having count(*) = 1
), unique_auth_email as (
  select lower(btrim(email)) as email, min(id::text)::uuid as auth_user_id
  from auth.users where nullif(btrim(email), '') is not null
  group by lower(btrim(email)) having count(*) = 1
)
update public."Members" m
set auth_user_id = a.auth_user_id
from unique_member_email e join unique_auth_email a using (email)
where m.id = e.member_id and m.auth_user_id is null
  and not exists (select 1 from public."Members" used where used.auth_user_id = a.auth_user_id);

-- Recreate the complete authority resolution path because production migration
-- history is inconsistent. JSON extraction tolerates optional role lifecycle
-- columns while executive_roles.member_id and office remain authoritative.
create or replace function public.normalize_executive_office(office text)
returns text language sql immutable parallel safe set search_path = public
as $$
  select case regexp_replace(lower(btrim(coalesce(office, ''))), '[^a-z0-9]+', '_', 'g')
    when 'chairperson' then 'chairman'
    when 'chairwoman' then 'chairman'
    when 'general_secretary' then 'secretary_general'
    when 'public_relations_officer' then 'ipro'
    when 'information_public_relations_officer' then 'ipro'
    else regexp_replace(lower(btrim(coalesce(office, ''))), '[^a-z0-9]+', '_', 'g')
  end;
$$;

create or replace function public.active_executive_office(user_id uuid default auth.uid())
returns text language sql stable security definer set search_path = public
as $$
  select public.normalize_executive_office(er.office)
  from public."Members" m
  join public.executive_roles er on er.member_id = m.id
  where m.auth_user_id = user_id
    and lower(btrim(coalesce(m.status, ''))) = 'active'
    and lower(coalesce(to_jsonb(er)->>'is_active', 'true')) in ('true','t','1')
    and lower(coalesce(to_jsonb(er)->>'status', 'active')) = 'active'
    and (to_jsonb(er)->>'ends_at' is null or (to_jsonb(er)->>'ends_at')::timestamptz > now())
  order by coalesce((to_jsonb(er)->>'starts_at')::timestamptz, '-infinity'::timestamptz) desc
  limit 1;
$$;

create or replace function public.office_has_permission(user_id uuid, allowed_offices text[])
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.active_executive_office(user_id) = any(allowed_offices), false); $$;

create or replace function public.can_manage_invitations(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select public.office_has_permission(
    user_id,
    array['chairman','secretary_general','ipro']
  );
$$;

revoke all on function public.can_manage_invitations(uuid) from public;
grant execute on function public.can_manage_invitations(uuid) to authenticated;
revoke all on function public.normalize_executive_office(text), public.active_executive_office(uuid), public.office_has_permission(uuid,text[]) from public;
grant execute on function public.normalize_executive_office(text), public.active_executive_office(uuid), public.office_has_permission(uuid,text[]) to authenticated;

-- Invitation visibility follows the same permission used by UI and Edge Function.
alter table public.invitations enable row level security;
drop policy if exists "Executives can view invitations" on public.invitations;
drop policy if exists "Invitation managers can view invitations" on public.invitations;
create policy "Invitation managers can view invitations" on public.invitations
for select to authenticated using (public.can_manage_invitations());

comment on function public.can_manage_invitations(uuid) is
  'True only for active chairman, secretary_general, or ipro office assignments.';

do $required$
begin
  if to_regprocedure('public.can_manage_invitations(uuid)') is null then
    raise exception 'Invitation authorization repair incomplete';
  end if;
end $required$;
