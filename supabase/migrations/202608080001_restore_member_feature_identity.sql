-- Restore the Auth-identity compatibility rows required by older member features.
-- public."Members" remains authoritative; public.profiles is a derived projection
-- used by legacy foreign keys, display joins, and RLS policies.

create or replace function public.compatible_profile_role(member_role text)
returns public.app_role
language sql immutable set search_path = public
as $$
  select case lower(coalesce(member_role, 'member'))
    when 'chairman' then 'chairman'::public.app_role
    when 'vice_chairperson' then 'vice_chairperson'::public.app_role
    when 'vice_chairlady' then 'vice_chairperson'::public.app_role
    when 'secretary_general' then 'secretary_general'::public.app_role
    when 'assistant_secretary_general' then 'assistant_secretary_general'::public.app_role
    when 'treasurer' then 'treasurer'::public.app_role
    when 'assistant_treasurer' then 'assistant_treasurer'::public.app_role
    when 'auditor_general' then 'auditor_general'::public.app_role
    when 'assistant_auditor_general' then 'assistant_auditor_general'::public.app_role
    when 'ipro' then 'ipro'::public.app_role
    when 'assistant_ipro' then 'assistant_ipro'::public.app_role
    when 'programme_officer' then 'programme_officer'::public.app_role
    when 'assistant_programme_officer' then 'assistant_programme_officer'::public.app_role
    when 'adviser' then 'adviser'::public.app_role
    when 'adviser_1' then 'adviser'::public.app_role
    when 'adviser_2' then 'adviser'::public.app_role
    when 'adviser_3' then 'adviser'::public.app_role
    when 'adviser_4' then 'adviser'::public.app_role
    when 'admin' then 'admin'::public.app_role
    else 'member'::public.app_role
  end;
$$;

create or replace function public.sync_member_feature_identity()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.auth_user_id is null then return new; end if;
  insert into public.profiles (
    id, full_name, phone, email, role, membership_number, avatar_url,
    is_active, updated_at
  ) values (
    new.auth_user_id,
    coalesce(nullif(trim(concat_ws(' ', new.first_name, new.last_name)), ''), 'SANGAJOR Member'),
    new.phone, new.email, public.compatible_profile_role(new.role),
    new.membership_number, new.profile_photo,
    lower(coalesce(new.status, '')) = 'active', now()
  ) on conflict (id) do update set
    full_name = excluded.full_name, phone = excluded.phone,
    email = excluded.email, role = excluded.role,
    membership_number = excluded.membership_number,
    avatar_url = excluded.avatar_url, is_active = excluded.is_active,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_sync_feature_identity on public."Members";
create trigger members_sync_feature_identity
after insert or update of auth_user_id, first_name, last_name, phone, email,
  role, membership_number, profile_photo, status
on public."Members"
for each row execute function public.sync_member_feature_identity();

insert into public.profiles (
  id, full_name, phone, email, role, membership_number, avatar_url,
  is_active, updated_at
)
select m.auth_user_id,
  coalesce(nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''), 'SANGAJOR Member'),
  m.phone, m.email, public.compatible_profile_role(m.role),
  m.membership_number, m.profile_photo,
  lower(coalesce(m.status, '')) = 'active', now()
from public."Members" m where m.auth_user_id is not null
on conflict (id) do update set
  full_name = excluded.full_name, phone = excluded.phone,
  email = excluded.email, role = excluded.role,
  membership_number = excluded.membership_number,
  avatar_url = excluded.avatar_url, is_active = excluded.is_active,
  updated_at = now();

revoke all on function public.compatible_profile_role(text) from public;
revoke all on function public.sync_member_feature_identity() from public;
comment on function public.sync_member_feature_identity() is
  'Synchronizes the legacy feature identity projection from authoritative Members rows.';
