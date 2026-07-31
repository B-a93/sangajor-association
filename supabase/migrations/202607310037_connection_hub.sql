-- Sprint 11: private, member-controlled connections and direct messages.
create type public.connection_status as enum ('pending', 'accepted', 'declined', 'blocked');

create table public.member_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status public.connection_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index member_connections_pair_unique on public.member_connections
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index member_connections_recipient_idx on public.member_connections(recipient_id, status);

create table public.connection_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.member_connections(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index connection_messages_thread_idx on public.connection_messages(connection_id, created_at);

create trigger member_connections_set_updated_at before update on public.member_connections
for each row execute function public.set_updated_at();
alter table public.member_connections enable row level security;
alter table public.connection_messages enable row level security;

create policy "Participants can view connections" on public.member_connections for select to authenticated
using (auth.uid() in (requester_id, recipient_id));
create policy "Members can request connections" on public.member_connections for insert to authenticated
with check (auth.uid() = requester_id and status = 'pending' and exists (
  select 1 from public.profiles p where p.id = recipient_id and p.is_active
));
create policy "Participants can view messages" on public.connection_messages for select to authenticated
using (exists (select 1 from public.member_connections c where c.id = connection_id
  and c.status = 'accepted' and auth.uid() in (c.requester_id, c.recipient_id)));
create policy "Participants can send messages" on public.connection_messages for insert to authenticated
with check (auth.uid() = sender_id and exists (select 1 from public.member_connections c
  where c.id = connection_id and c.status = 'accepted'
  and auth.uid() in (c.requester_id, c.recipient_id)));

create or replace function public.respond_to_connection(target_connection_id uuid, response public.connection_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if response not in ('accepted', 'declined', 'blocked') then raise exception 'Invalid response'; end if;
  update public.member_connections set status = response, responded_at = now()
  where id = target_connection_id and recipient_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Connection request not found or cannot be changed' using errcode = '42501'; end if;
end; $$;
revoke all on function public.respond_to_connection(uuid, public.connection_status) from public;
grant execute on function public.respond_to_connection(uuid, public.connection_status) to authenticated;

create or replace function public.mark_connection_messages_read(target_connection_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  if not exists (select 1 from public.member_connections where id = target_connection_id
    and status = 'accepted' and auth.uid() in (requester_id, recipient_id)) then
    raise exception 'Connection not found' using errcode = '42501';
  end if;
  update public.connection_messages set read_at = now() where connection_id = target_connection_id
    and sender_id <> auth.uid() and read_at is null;
  get diagnostics affected = row_count; return affected;
end; $$;
revoke all on function public.mark_connection_messages_read(uuid) from public;
grant execute on function public.mark_connection_messages_read(uuid) to authenticated;

comment on table public.member_connections is 'Consent-based relationships between active Association members.';
comment on table public.connection_messages is 'Private messages available only to accepted connection participants.';
