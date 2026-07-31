-- Restore the canonical office assignment for the existing Banna Bojang profile.
-- public.profiles.role is the canonical executive-position field; it must remain
-- separate from Auth user metadata and is_active must also be true for access.
update public.profiles
set role = 'ipro'::public.app_role,
    is_active = true,
    updated_at = now()
where lower(trim(full_name)) = 'banna bojang';

-- Village moderation belongs to the communications office as well as the senior
-- officers. Keeping this check in the database protects direct route access.
create or replace function public.can_moderate_village(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_active and role in ('chairman', 'secretary_general', 'ipro', 'admin')
    from public.profiles where id = user_id), false);
$$;
revoke all on function public.can_moderate_village(uuid) from public;
grant execute on function public.can_moderate_village(uuid) to authenticated;

comment on function public.can_moderate_village(uuid) is 'Active officers authorized to moderate Village Square reports.';
