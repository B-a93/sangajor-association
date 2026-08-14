-- Repair Storage RLS evaluation for Connection Hub voice notes.
-- Storage policies call this security-definer helper instead of nesting a
-- row-level-secured group-room query inside storage.objects policies.
create or replace function public.can_access_connection_group_room(
  target_room_id text,
  user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_member(user_id)
    and exists (
      select 1
      from public.connection_group_rooms room
      where room.id::text = target_room_id
        and room.is_active = true
    );
$$;

revoke all on function public.can_access_connection_group_room(text, uuid) from public;
grant execute on function public.can_access_connection_group_room(text, uuid) to authenticated;

drop policy if exists "Active members upload group voice notes" on storage.objects;
create policy "Active members upload group voice notes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'connection-voice-notes'
  and split_part(name, '/', 2) = auth.uid()::text
  and public.can_access_connection_group_room(
    split_part(name, '/', 1),
    auth.uid()
  )
);

drop policy if exists "Active members play group voice notes" on storage.objects;
create policy "Active members play group voice notes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'connection-voice-notes'
  and public.can_access_connection_group_room(
    split_part(name, '/', 1),
    auth.uid()
  )
);

drop policy if exists "Members remove their group voice notes" on storage.objects;
create policy "Members remove their group voice notes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'connection-voice-notes'
  and split_part(name, '/', 2) = auth.uid()::text
  and public.is_active_member(auth.uid())
);

notify pgrst, 'reload schema';
