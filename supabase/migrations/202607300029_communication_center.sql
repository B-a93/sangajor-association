-- Sprint 8: targeted internal announcements and member read tracking.
create type public.announcement_status as enum ('draft', 'published', 'archived');
create type public.announcement_audience as enum ('all_members', 'executives');
create type public.announcement_priority as enum ('normal', 'important', 'urgent');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  body text not null check (char_length(trim(body)) between 3 and 8000),
  audience public.announcement_audience not null default 'all_members',
  priority public.announcement_priority not null default 'normal',
  status public.announcement_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > created_at),
  check ((status = 'draft' and published_at is null) or (status <> 'draft' and published_at is not null))
);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, member_id)
);

create index announcements_feed_idx on public.announcements (status, published_at desc);
create index announcement_reads_member_idx on public.announcement_reads (member_id, read_at desc);
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create or replace function public.can_manage_announcements(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select is_active and role in
    ('ipro', 'assistant_ipro', 'secretary_general', 'chairman', 'admin')
    from public.profiles where id = user_id), false);
$$;

create or replace function public.can_view_announcement(item public.announcements, user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select is_active
    and item.status = 'published'
    and item.published_at <= now()
    and (item.expires_at is null or item.expires_at > now())
    and (item.audience = 'all_members' or role <> 'member')
    from public.profiles where id = user_id), false);
$$;

create or replace function public.set_announcement_status(target_announcement_id uuid, new_status public.announcement_status)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_announcements() then
    raise exception 'Only communication officers can publish announcements' using errcode = '42501';
  end if;
  update public.announcements
  set status = new_status,
      published_at = case when new_status = 'published' then coalesce(published_at, now()) else published_at end
  where id = target_announcement_id;
  if not found then raise exception 'Announcement not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.mark_announcement_read(target_announcement_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare item public.announcements%rowtype;
begin
  select * into item from public.announcements where id = target_announcement_id;
  if not found or not public.can_view_announcement(item) then
    raise exception 'Announcement is not available' using errcode = '42501';
  end if;
  insert into public.announcement_reads (announcement_id, member_id)
  values (target_announcement_id, auth.uid()) on conflict do nothing;
end;
$$;

revoke all on function public.can_manage_announcements(uuid) from public;
grant execute on function public.can_manage_announcements(uuid) to authenticated;
revoke all on function public.can_view_announcement(public.announcements, uuid) from public;
grant execute on function public.can_view_announcement(public.announcements, uuid) to authenticated;
revoke all on function public.set_announcement_status(uuid, public.announcement_status) from public;
grant execute on function public.set_announcement_status(uuid, public.announcement_status) to authenticated;
revoke all on function public.mark_announcement_read(uuid) from public;
grant execute on function public.mark_announcement_read(uuid) to authenticated;

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
create policy "Members can view relevant announcements" on public.announcements for select to authenticated
using (public.can_view_announcement(announcements.*) or public.can_manage_announcements());
create policy "Communication officers can create announcements" on public.announcements for insert to authenticated
with check (public.can_manage_announcements() and created_by = auth.uid() and status = 'draft');
create policy "Communication officers can edit announcements" on public.announcements for update to authenticated
using (public.can_manage_announcements()) with check (public.can_manage_announcements());
create policy "Members can view their read receipts" on public.announcement_reads for select to authenticated
using (member_id = auth.uid());
create policy "Communication officers can report on readership" on public.announcement_reads for select to authenticated
using (public.can_manage_announcements());
revoke insert, update, delete on public.announcement_reads from authenticated, anon;

comment on table public.announcements is 'Audience-targeted internal Association communications.';
comment on table public.announcement_reads is 'Immutable member read receipts created through mark_announcement_read.';
