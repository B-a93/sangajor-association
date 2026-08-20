-- Public contact enquiries for the Association website.
-- Visitors may submit a message, but only privileged backend/database access can read it.
begin;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint contact_messages_full_name_check
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint contact_messages_email_check
    check (
      email is null
      or (
        char_length(btrim(email)) between 5 and 254
        and position('@' in email) > 1
      )
    ),
  constraint contact_messages_phone_check
    check (phone is null or char_length(btrim(phone)) between 7 and 40),
  constraint contact_messages_contact_required_check
    check (email is not null or phone is not null),
  constraint contact_messages_subject_check
    check (char_length(btrim(subject)) between 3 and 160),
  constraint contact_messages_message_check
    check (char_length(btrim(message)) between 10 and 3000),
  constraint contact_messages_status_check
    check (status in ('new', 'in_progress', 'resolved', 'spam'))
);

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "Visitors submit contact enquiries"
  on public.contact_messages;

create policy "Visitors submit contact enquiries"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and reviewed_at is null
    and char_length(btrim(full_name)) between 2 and 120
    and char_length(btrim(subject)) between 3 and 160
    and char_length(btrim(message)) between 10 and 3000
    and (email is not null or phone is not null)
  );

revoke all on public.contact_messages from anon, authenticated;

grant insert (full_name, email, phone, subject, message)
  on public.contact_messages
  to anon, authenticated;

comment on table public.contact_messages is
  'Enquiries submitted through the public Association contact page. Public visitors can submit but cannot read messages.';

commit;
