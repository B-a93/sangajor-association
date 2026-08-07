-- Self-contained production repair for invitation contacts and ownership.
-- Safe to run after inconsistent historical migration sets: no rows are deleted.

alter table public.invitations add column if not exists phone text;
alter table public.invitations add column if not exists inviter_member_id uuid;

-- Recover ownership where the legacy profiles/Auth id can be unambiguously mapped
-- either to Members.id or Members.auth_user_id. Unmatched history remains intact.
update public.invitations i
set inviter_member_id = m.id
from public."Members" m
where i.inviter_member_id is null
  and (m.id = i.inviter_id or m.auth_user_id = i.inviter_id)
  and not exists (
    select 1 from public."Members" duplicate
    where duplicate.id <> m.id
      and (duplicate.id = i.inviter_id or duplicate.auth_user_id = i.inviter_id)
  );

-- Remove only the obsolete ownership FK; retain inviter_id as nullable legacy
-- evidence so historical rows that cannot be mapped are never discarded.
alter table public.invitations drop constraint if exists invitations_inviter_id_fkey;
alter table public.invitations alter column inviter_id drop not null;

do $repair$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.invitations'::regclass
      and conname = 'invitations_inviter_member_id_fkey'
  ) then
    alter table public.invitations
      add constraint invitations_inviter_member_id_fkey
      foreign key (inviter_member_id) references public."Members"(id) on delete restrict;
  end if;
end $repair$;

alter table public.invitations alter column email drop not null;

-- Existing email invitations satisfy this constraint; new invitations may use a
-- phone Auth identity. Phone values are E.164 so Supabase Auth can use them.
alter table public.invitations drop constraint if exists invitations_contact_required;
alter table public.invitations add constraint invitations_contact_required check (
  (email is not null and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or (phone is not null and phone ~ '^\+[1-9][0-9]{7,14}$')
) not valid;

create unique index if not exists one_open_invitation_per_phone
  on public.invitations (phone) where status = 'pending' and phone is not null;

comment on column public.invitations.inviter_member_id is
  'Authoritative invitation manager identity: public."Members".id. Nullable only for unmappable historical rows.';
comment on column public.invitations.inviter_id is
  'Legacy profiles/Auth identifier retained only to preserve historical invitation provenance.';
comment on column public.invitations.accepted_user_id is
  'Supabase Auth user identity created when this single-use invitation is accepted.';
comment on column public.invitations.phone is
  'Optional E.164 phone/WhatsApp contact and Supabase Auth phone identity for phone-only invitations.';

-- Mutations stay service-role-only. Visibility continues to use the one authority.
alter table public.invitations enable row level security;
drop policy if exists "Executives can view invitations" on public.invitations;
drop policy if exists "Invitation managers can view invitations" on public.invitations;
create policy "Invitation managers can view invitations" on public.invitations
for select to authenticated using (public.can_manage_invitations());
revoke insert, update, delete on public.invitations from authenticated, anon;
