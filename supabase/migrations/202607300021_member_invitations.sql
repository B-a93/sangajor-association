-- Sprint 4: executive-managed, expiring member invitations.
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) > 0),
  email text not null check (email = lower(email)),
  membership_number text,
  role public.app_role not null default 'member',
  status public.invitation_status not null default 'pending',
  token_hash text not null unique,
  inviter_id uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitation_expiry_after_creation check (expires_at > created_at),
  constraint accepted_invitation_complete check (
    (status = 'accepted' and accepted_at is not null and accepted_user_id is not null)
    or (status <> 'accepted' and accepted_at is null and accepted_user_id is null)
  )
);

create unique index one_open_invitation_per_email
  on public.invitations (email) where status = 'pending';
create index invitations_status_created_idx on public.invitations (status, created_at desc);

create trigger invitations_set_updated_at before update on public.invitations
for each row execute function public.set_updated_at();

create or replace function public.is_executive(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select is_active and role <> 'member'::public.app_role
    from public.profiles where id = user_id), false);
$$;

revoke all on function public.is_executive(uuid) from public;
grant execute on function public.is_executive(uuid) to authenticated;

create or replace function public.expire_invitations()
returns void language sql security definer set search_path = public
as $$
  update public.invitations set status = 'expired'
  where status = 'pending' and expires_at <= now();
$$;

revoke all on function public.expire_invitations() from public;
grant execute on function public.expire_invitations() to authenticated;

alter table public.invitations enable row level security;
create policy "Executives can view invitations" on public.invitations
for select to authenticated using (public.is_executive());

-- Mutations are deliberately service-role only, through the validated Edge Functions.
revoke insert, update, delete on public.invitations from authenticated, anon;

comment on table public.invitations is 'Single-use, expiring invitations managed by active executives.';
comment on column public.invitations.token_hash is 'SHA-256 digest; raw invitation tokens are never persisted.';

-- Preserve the invitation-assigned profile data when the acceptance function creates the Auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, membership_number)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'SANGAJOR Member'),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'member'),
    nullif(new.raw_user_meta_data ->> 'membership_number', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;
