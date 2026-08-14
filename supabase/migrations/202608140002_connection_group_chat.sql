-- Secure member group rooms with text and short voice messages.
create table if not exists public.connection_group_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 3 and 80),
  description text check (description is null or char_length(btrim(description)) <= 300),
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connection_group_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.connection_group_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text check (body is null or char_length(btrim(body)) between 1 and 2000),
  voice_path text check (voice_path is null or char_length(voice_path) <= 500),
  voice_duration_seconds integer check (voice_duration_seconds is null or voice_duration_seconds between 1 and 120),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint connection_group_messages_content_required check (
    body is not null or (voice_path is not null and voice_duration_seconds is not null)
  )
);

create index if not exists connection_group_messages_room_created_idx
  on public.connection_group_messages(room_id, created_at);

alter table public.connection_group_rooms enable row level security;
alter table public.connection_group_messages enable row level security;

drop policy if exists "Active members view group rooms" on public.connection_group_rooms;
create policy "Active members view group rooms" on public.connection_group_rooms
for select to authenticated using (public.is_active_member() and is_active);

drop policy if exists "Authorized executives create group rooms" on public.connection_group_rooms;
create policy "Authorized executives create group rooms" on public.connection_group_rooms
for insert to authenticated with check (
  public.can_moderate_village(auth.uid()) and created_by = auth.uid()
);

drop policy if exists "Authorized executives manage group rooms" on public.connection_group_rooms;
create policy "Authorized executives manage group rooms" on public.connection_group_rooms
for update to authenticated using (public.can_moderate_village(auth.uid()))
with check (public.can_moderate_village(auth.uid()));

drop policy if exists "Active members view group messages" on public.connection_group_messages;
create policy "Active members view group messages" on public.connection_group_messages
for select to authenticated using (
  public.is_active_member()
  and deleted_at is null
  and exists (select 1 from public.connection_group_rooms room where room.id = room_id and room.is_active)
);

drop policy if exists "Active members send group messages" on public.connection_group_messages;
create policy "Active members send group messages" on public.connection_group_messages
for insert to authenticated with check (
  public.is_active_member()
  and sender_id = auth.uid()
  and deleted_at is null
  and exists (select 1 from public.connection_group_rooms room where room.id = room_id and room.is_active)
);

drop policy if exists "Authorized executives moderate group messages" on public.connection_group_messages;
create policy "Authorized executives moderate group messages" on public.connection_group_messages
for update to authenticated using (public.can_moderate_village(auth.uid()))
with check (public.can_moderate_village(auth.uid()));

grant select, insert, update on public.connection_group_rooms to authenticated;
grant select, insert, update on public.connection_group_messages to authenticated;
revoke all on public.connection_group_rooms, public.connection_group_messages from anon;

insert into public.connection_group_rooms (name, description)
values ('General Members Room', 'A respectful space for active SANGAJOR members to communicate and support one another.')
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'connection-voice-notes',
  'connection-voice-notes',
  false,
  5242880,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active members upload group voice notes" on storage.objects;
create policy "Active members upload group voice notes" on storage.objects
for insert to authenticated with check (
  bucket_id = 'connection-voice-notes'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_active_member()
  and exists (
    select 1 from public.connection_group_rooms room
    where room.id::text = (storage.foldername(name))[1] and room.is_active
  )
);

drop policy if exists "Active members play group voice notes" on storage.objects;
create policy "Active members play group voice notes" on storage.objects
for select to authenticated using (
  bucket_id = 'connection-voice-notes'
  and public.is_active_member()
  and exists (
    select 1 from public.connection_group_rooms room
    where room.id::text = (storage.foldername(name))[1] and room.is_active
  )
);

drop policy if exists "Members remove their group voice notes" on storage.objects;
create policy "Members remove their group voice notes" on storage.objects
for delete to authenticated using (
  bucket_id = 'connection-voice-notes'
  and (storage.foldername(name))[2] = auth.uid()::text
);

comment on table public.connection_group_rooms is
  'Executive-approved communication rooms visible to active Association members.';
comment on table public.connection_group_messages is
  'Text and short private-bucket voice messages for active Association group rooms.';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'connection_group_messages'
  ) then
    alter publication supabase_realtime add table public.connection_group_messages;
  end if;
end;
$$;
