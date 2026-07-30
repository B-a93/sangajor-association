-- Sprint 7: Association event publishing, member RSVPs and attendance reporting.
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.attendance_response as enum ('going', 'not_going');

create table public.association_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null check (char_length(trim(description)) between 3 and 4000),
  category text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  capacity integer check (capacity is null or capacity > 0),
  status public.event_status not null default 'draft',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.event_attendance (
  event_id uuid not null references public.association_events(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  response public.attendance_response not null,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (event_id, member_id),
  check ((checked_in_at is null) = (checked_in_by is null))
);

create index association_events_schedule_idx on public.association_events (starts_at, status);
create index event_attendance_event_idx on public.event_attendance (event_id, response);
create trigger association_events_set_updated_at before update on public.association_events
for each row execute function public.set_updated_at();
create trigger event_attendance_set_updated_at before update on public.event_attendance
for each row execute function public.set_updated_at();

create or replace function public.can_manage_events(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select is_active and role in
    ('programme_officer', 'assistant_programme_officer', 'secretary_general', 'chairman', 'admin')
    from public.profiles where id = user_id), false);
$$;

revoke all on function public.can_manage_events(uuid) from public;
grant execute on function public.can_manage_events(uuid) to authenticated;

-- RSVP changes are serialized so a capacity cannot be overbooked by concurrent requests.
create or replace function public.respond_to_event(target_event_id uuid, new_response public.attendance_response)
returns void language plpgsql security definer set search_path = public
as $$
declare selected_event public.association_events%rowtype; current_response public.attendance_response;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Only active members can respond to events' using errcode = '42501';
  end if;
  select * into selected_event from public.association_events where id = target_event_id for update;
  if not found or selected_event.status <> 'published' then raise exception 'Event is not available' using errcode = 'P0002'; end if;
  if selected_event.starts_at <= now() then raise exception 'Responses are closed for this event' using errcode = '22023'; end if;
  select response into current_response from public.event_attendance where event_id = target_event_id and member_id = auth.uid();
  if new_response = 'going' and current_response is distinct from 'going' and selected_event.capacity is not null
     and (select count(*) from public.event_attendance where event_id = target_event_id and response = 'going') >= selected_event.capacity then
    raise exception 'This event has reached capacity' using errcode = '22023';
  end if;
  insert into public.event_attendance (event_id, member_id, response)
  values (target_event_id, auth.uid(), new_response)
  on conflict (event_id, member_id) do update set response = excluded.response, checked_in_at = null, checked_in_by = null;
end;
$$;

create or replace function public.set_event_check_in(target_event_id uuid, target_member_id uuid, attended boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_events() then raise exception 'Only event managers can record attendance' using errcode = '42501'; end if;
  if attended then
    insert into public.event_attendance (event_id, member_id, response, checked_in_at, checked_in_by)
    values (target_event_id, target_member_id, 'going', now(), auth.uid())
    on conflict (event_id, member_id) do update set response = 'going', checked_in_at = now(), checked_in_by = auth.uid();
  else
    update public.event_attendance set checked_in_at = null, checked_in_by = null
    where event_id = target_event_id and member_id = target_member_id;
  end if;
end;
$$;

revoke all on function public.respond_to_event(uuid, public.attendance_response) from public;
grant execute on function public.respond_to_event(uuid, public.attendance_response) to authenticated;
revoke all on function public.set_event_check_in(uuid, uuid, boolean) from public;
grant execute on function public.set_event_check_in(uuid, uuid, boolean) to authenticated;

alter table public.association_events enable row level security;
alter table public.event_attendance enable row level security;
create policy "Everyone can view published events" on public.association_events for select using (status = 'published');
create policy "Event managers can view every event" on public.association_events for select to authenticated using (public.can_manage_events());
create policy "Event managers can create events" on public.association_events for insert to authenticated with check (public.can_manage_events() and created_by = auth.uid());
create policy "Event managers can update events" on public.association_events for update to authenticated using (public.can_manage_events()) with check (public.can_manage_events());
create policy "Members can view their event responses" on public.event_attendance for select to authenticated using (member_id = auth.uid());
create policy "Event managers can view attendance" on public.event_attendance for select to authenticated using (public.can_manage_events());
revoke insert, update, delete on public.event_attendance from authenticated, anon;

comment on table public.event_attendance is 'Member RSVP and verified check-in records for Association events.';
