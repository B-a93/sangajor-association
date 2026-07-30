create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  whatsapp text,
  occupation text,
  organisation text,
  country text,
  city text,
  biography text,
  membership_id text unique,
  membership_status text not null default 'pending' check (membership_status in ('pending', 'active', 'inactive', 'archived')),
  profile_visibility text not null default 'members' check (profile_visibility in ('public', 'members', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Members can view their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Members can create their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Members can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
