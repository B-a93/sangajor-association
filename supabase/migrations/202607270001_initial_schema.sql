-- SANGAJOR Digital Village: initial authentication and role foundation

create type public.app_role as enum (
  'member',
  'chairman',
  'vice_chairperson',
  'secretary_general',
  'assistant_secretary_general',
  'treasurer',
  'assistant_treasurer',
  'auditor_general',
  'assistant_auditor_general',
  'ipro',
  'assistant_ipro',
  'programme_officer',
  'assistant_programme_officer',
  'adviser',
  'admin'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  role public.app_role not null default 'member',
  membership_number text unique,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_care_cases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  description text not null,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'declined', 'resolved')),
  confidentiality_level text not null default 'confidential' check (confidentiality_level in ('private', 'confidential')),
  assigned_to uuid references public.profiles(id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger member_care_cases_set_updated_at
before update on public.member_care_cases
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'SANGAJOR Member'),
    new.phone,
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.member_care_cases enable row level security;

create policy "Members can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Members can update their own basic profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Active members can view the member directory"
on public.profiles
for select
to authenticated
using (is_active = true);

create policy "Members can create their own care cases"
on public.member_care_cases
for insert
to authenticated
with check (auth.uid() = member_id);

create policy "Members can view their own care cases"
on public.member_care_cases
for select
to authenticated
using (auth.uid() = member_id);

create policy "Chairman and Secretary General can view all care cases"
on public.member_care_cases
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('chairman', 'secretary_general', 'admin')
      and profiles.is_active = true
  )
);

create policy "Chairman and Secretary General can manage care cases"
on public.member_care_cases
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('chairman', 'secretary_general', 'admin')
      and profiles.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('chairman', 'secretary_general', 'admin')
      and profiles.is_active = true
  )
);

comment on table public.profiles is 'Member and executive profiles linked to Supabase Auth users.';
comment on table public.member_care_cases is 'Confidential member assistance requests. Full access is restricted to the Chairman, Secretary General and administrators.';
