-- Production compatibility: executive authority belongs to active office assignments,
-- never to Members.role, profiles, or Auth metadata.
-- Keep this migration self-contained: production may not have run the migration that
-- originally introduced this helper.
create or replace function public.is_active_member(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public."Members" m
    where m.auth_user_id = user_id
      and lower(btrim(coalesce(m.status, ''))) = 'active'
  );
$$;

create or replace function public.normalize_executive_office(office text)
returns text language sql immutable parallel safe set search_path = public
as $$
  select case regexp_replace(lower(btrim(coalesce(office, ''))), '[^a-z0-9]+', '_', 'g')
    when 'chairperson' then 'chairman'
    when 'chairwoman' then 'chairman'
    when 'general_secretary' then 'secretary_general'
    when 'public_relations_officer' then 'ipro'
    when 'information_public_relations_officer' then 'ipro'
    when 'assistant_public_relations_officer' then 'assistant_ipro'
    when 'assistant_information_public_relations_officer' then 'assistant_ipro'
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
    and lower(coalesce(to_jsonb(er)->>'is_active', 'true')) in ('true', 't', '1')
    and lower(coalesce(to_jsonb(er)->>'status', 'active')) = 'active'
    and (to_jsonb(er)->>'ends_at' is null or (to_jsonb(er)->>'ends_at')::timestamptz > now())
  order by coalesce((to_jsonb(er)->>'starts_at')::timestamptz, '-infinity'::timestamptz) desc
  limit 1;
$$;

create or replace function public.office_has_permission(user_id uuid, allowed_offices text[])
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.active_executive_office(user_id) = any(allowed_offices), false); $$;

create or replace function public.is_executive(user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public
as $$ select public.active_executive_office(user_id) in ('chairman','vice_chairperson','secretary_general','assistant_secretary_general','treasurer','assistant_treasurer','auditor_general','assistant_auditor_general','ipro','assistant_ipro','programme_officer','assistant_programme_officer','adviser'); $$;

create or replace function public.can_manage_members(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['chairman','secretary_general']); $$;
create or replace function public.can_manage_finances(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['treasurer','assistant_treasurer','chairman']); $$;
create or replace function public.can_manage_events(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['programme_officer','assistant_programme_officer','secretary_general','chairman']); $$;
create or replace function public.can_manage_announcements(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['ipro','assistant_ipro','secretary_general','chairman']); $$;
create or replace function public.can_manage_documents(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['secretary_general','assistant_secretary_general','chairman']); $$;
create or replace function public.can_manage_volunteers(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['chairman','vice_chairperson','secretary_general','programme_officer']); $$;
create or replace function public.can_view_executive_analytics(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['chairman','vice_chairperson','secretary_general','treasurer','auditor_general']); $$;
create or replace function public.can_moderate_village(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select public.office_has_permission(user_id,array['chairman','secretary_general','ipro','assistant_ipro']); $$;

-- Notifications are optional in production. Avoid making the authorization repair
-- depend on communication-center tables that may not be installed there.
do $optional_notifications$
begin
  if to_regclass('public.announcements') is not null
     and to_regclass('public.announcement_reads') is not null then
    execute $definition$
      create or replace function public.unread_announcement_count()
      returns bigint language sql stable security definer set search_path = public
      as $function$
        select case when not public.is_active_member(auth.uid()) then 0 else count(*) end
        from public.announcements item
        where item.status = 'published' and item.published_at <= now()
          and (item.expires_at is null or item.expires_at > now())
          and (item.audience = 'all_members' or public.is_executive(auth.uid()))
          and not exists (select 1 from public.announcement_reads receipt
            where receipt.announcement_id = item.id and receipt.member_id = auth.uid())
      $function$
    $definition$;
  end if;
end
$optional_notifications$;

revoke all on function public.is_active_member(uuid), public.normalize_executive_office(text), public.active_executive_office(uuid), public.office_has_permission(uuid,text[]) from public;
grant execute on function public.is_active_member(uuid), public.normalize_executive_office(text), public.active_executive_office(uuid), public.office_has_permission(uuid,text[]) to authenticated;
revoke all on function public.is_executive(uuid), public.can_manage_members(uuid), public.can_manage_finances(uuid), public.can_manage_events(uuid), public.can_manage_announcements(uuid), public.can_manage_documents(uuid), public.can_manage_volunteers(uuid), public.can_view_executive_analytics(uuid), public.can_moderate_village(uuid) from public;
grant execute on function public.is_executive(uuid), public.can_manage_members(uuid), public.can_manage_finances(uuid), public.can_manage_events(uuid), public.can_manage_announcements(uuid), public.can_manage_documents(uuid), public.can_manage_volunteers(uuid), public.can_view_executive_analytics(uuid), public.can_moderate_village(uuid) to authenticated;

do $optional_notifications_permissions$
begin
  if to_regprocedure('public.unread_announcement_count()') is not null then
    revoke all on function public.unread_announcement_count() from public;
    grant execute on function public.unread_announcement_count() to authenticated;
  end if;
end
$optional_notifications_permissions$;

-- Verification (SQL Editor): resolve Banna's Auth UID explicitly because auth.uid()
-- is null outside an authenticated request. Expected: active, ipro, true, true.
select m.id, m.auth_user_id, lower(btrim(m.status)) = 'active' as active_member,
       public.active_executive_office(m.auth_user_id) as active_office,
       public.can_manage_announcements(m.auth_user_id) as can_manage_announcements,
       public.can_moderate_village(m.auth_user_id) as can_moderate_village
from public."Members" m
where lower(btrim(coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,''))) = 'banna bojang';
