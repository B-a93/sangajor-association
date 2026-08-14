-- Allow an active member to remove only a group message they sent.
-- The function returns the private voice-note path so the client can remove
-- the associated Storage object after the database row is deleted.
create or replace function public.delete_own_connection_group_message(
  target_message_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  removed_voice_path text;
begin
  if not public.is_active_member() then
    raise exception 'Only active members can delete group messages'
      using errcode = '42501';
  end if;

  select message.voice_path
    into removed_voice_path
  from public.connection_group_messages message
  where message.id = target_message_id
    and message.sender_id = auth.uid()
    and message.deleted_at is null
  for update;

  if not found then
    raise exception 'Message not found or you are not its sender'
      using errcode = '42501';
  end if;

  delete from public.connection_group_messages
  where id = target_message_id
    and sender_id = auth.uid();

  return removed_voice_path;
end;
$function$;

revoke all on function public.delete_own_connection_group_message(uuid)
from public;

grant execute on function public.delete_own_connection_group_message(uuid)
to authenticated;

comment on function public.delete_own_connection_group_message(uuid) is
'Deletes a group message only when the signed-in active member is its sender and returns its private voice-note path for cleanup.';
