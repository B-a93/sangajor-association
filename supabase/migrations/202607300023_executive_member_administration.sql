-- Sprint 5: secure executive member administration and change history.
create table public.member_administration_log (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.profiles(id) on delete cascade,
  administrator_id uuid not null references public.profiles(id),
  previous_role public.app_role not null,
  new_role public.app_role not null,
  previous_active boolean not null,
  new_active boolean not null,
  note text,
  created_at timestamptz not null default now()
);

create index member_administration_log_member_idx
  on public.member_administration_log (member_id, created_at desc);

create or replace function public.can_manage_members(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select is_active and role in ('chairman', 'secretary_general', 'admin')
    from public.profiles where id = user_id), false);
$$;

revoke all on function public.can_manage_members(uuid) from public;
grant execute on function public.can_manage_members(uuid) to authenticated;

create policy "Administrators can view every member profile" on public.profiles
for select to authenticated using (public.can_manage_members());

create or replace function public.update_member_administration(
  target_member_id uuid,
  target_role public.app_role,
  target_active boolean,
  change_note text default null
) returns void language plpgsql security definer set search_path = public
as $$
declare current_profile public.profiles%rowtype;
begin
  if not public.can_manage_members() then
    raise exception 'Only authorized administrators can manage members' using errcode = '42501';
  end if;

  select * into current_profile from public.profiles where id = target_member_id for update;
  if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;
  if target_member_id = auth.uid() and not target_active then
    raise exception 'You cannot deactivate your own account' using errcode = '22023';
  end if;

  update public.profiles set role = target_role, is_active = target_active
  where id = target_member_id;

  if current_profile.role is distinct from target_role
     or current_profile.is_active is distinct from target_active then
    insert into public.member_administration_log
      (member_id, administrator_id, previous_role, new_role, previous_active, new_active, note)
    values
      (target_member_id, auth.uid(), current_profile.role, target_role,
       current_profile.is_active, target_active, nullif(trim(change_note), ''));
  end if;
end;
$$;

revoke all on function public.update_member_administration(uuid, public.app_role, boolean, text) from public;
grant execute on function public.update_member_administration(uuid, public.app_role, boolean, text) to authenticated;

alter table public.member_administration_log enable row level security;
create policy "Administrators can view member administration history"
on public.member_administration_log for select to authenticated
using (public.can_manage_members());
revoke insert, update, delete on public.member_administration_log from authenticated, anon;

comment on table public.member_administration_log is 'Immutable audit history for executive member role and access changes.';
