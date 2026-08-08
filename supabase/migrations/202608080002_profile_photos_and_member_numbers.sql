-- Member-owned profile photographs and executive membership-number assignment.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-profile-photos', 'member-profile-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload their profile photograph" on storage.objects;
create policy "Members upload their profile photograph" on storage.objects
for insert to authenticated with check (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_member()
);

drop policy if exists "Members update their profile photograph" on storage.objects;
create policy "Members update their profile photograph" on storage.objects
for update to authenticated using (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public profile photographs are readable" on storage.objects;
create policy "Public profile photographs are readable" on storage.objects
for select to public using (bucket_id = 'member-profile-photos');

drop policy if exists "Members delete their profile photograph" on storage.objects;
create policy "Members delete their profile photograph" on storage.objects
for delete to authenticated using (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create table if not exists public.member_registry_log (
  id bigint generated always as identity primary key,
  member_id uuid not null references public."Members"(id) on delete cascade,
  administrator_auth_user_id uuid not null,
  previous_membership_number text,
  new_membership_number text,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.member_registry_log enable row level security;
drop policy if exists "Member managers view registry history" on public.member_registry_log;
create policy "Member managers view registry history" on public.member_registry_log
for select to authenticated using (public.can_manage_members());
revoke insert, update, delete on public.member_registry_log from authenticated, anon;

create or replace function public.update_member_registry(
  target_member_id uuid,
  target_membership_number text,
  target_active boolean,
  change_note text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare current_member public."Members"%rowtype;
declare normalized_number text := nullif(upper(trim(target_membership_number)), '');
declare next_status text := case when target_active then 'active' else 'inactive' end;
begin
  if not public.can_manage_members() then
    raise exception 'Only authorized member managers can assign membership numbers' using errcode = '42501';
  end if;
  if normalized_number is not null and normalized_number !~ '^[A-Z0-9][A-Z0-9-]{2,39}$' then
    raise exception 'Use 3 to 40 letters, numbers or hyphens for the membership number' using errcode = '22023';
  end if;

  select * into current_member from public."Members" where id = target_member_id for update;
  if not found then raise exception 'Member not found' using errcode = 'P0002'; end if;
  if current_member.auth_user_id = auth.uid() and not target_active then
    raise exception 'You cannot deactivate your own account' using errcode = '22023';
  end if;

  update public."Members" set membership_number = normalized_number,
    status = next_status, updated_at = now()
  where id = target_member_id;

  if current_member.membership_number is distinct from normalized_number
     or lower(coalesce(current_member.status, '')) is distinct from next_status then
    insert into public.member_registry_log (
      member_id, administrator_auth_user_id,
      previous_membership_number, new_membership_number,
      previous_status, new_status, note
    ) values (
      target_member_id, auth.uid(), current_member.membership_number,
      normalized_number, current_member.status, next_status,
      nullif(trim(change_note), '')
    );
  end if;
end;
$$;

revoke all on function public.update_member_registry(uuid, text, boolean, text) from public;
grant execute on function public.update_member_registry(uuid, text, boolean, text) to authenticated;

comment on function public.update_member_registry(uuid, text, boolean, text) is
  'Assigns official membership numbers and account status through an audited executive workflow.';
