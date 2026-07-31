-- Sprint 10: committee membership and volunteer service management.
create type public.committee_status as enum ('active', 'inactive');
create type public.committee_role as enum ('chair', 'secretary', 'member');
create type public.volunteer_opportunity_status as enum ('draft', 'open', 'closed', 'completed');
create type public.volunteer_application_status as enum ('pending', 'approved', 'declined', 'withdrawn');

create table public.committees (
  id uuid primary key default gen_random_uuid(), name text not null unique check (char_length(trim(name)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 10 and 1000), status public.committee_status not null default 'active',
  created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.committee_memberships (
  id uuid primary key default gen_random_uuid(), committee_id uuid not null references public.committees(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade, role public.committee_role not null default 'member', joined_at timestamptz not null default now(),
  unique (committee_id, member_id)
);
create unique index one_committee_chair on public.committee_memberships (committee_id) where role = 'chair';
create table public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(), committee_id uuid references public.committees(id) on delete set null,
  title text not null check (char_length(trim(title)) between 3 and 180), description text not null check (char_length(trim(description)) between 10 and 1500),
  location text, starts_at timestamptz not null, ends_at timestamptz not null, capacity integer check (capacity is null or capacity > 0),
  status public.volunteer_opportunity_status not null default 'draft', created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table public.volunteer_applications (
  id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade, note text check (note is null or char_length(note) <= 500),
  status public.volunteer_application_status not null default 'pending', hours_served numeric(7,2) not null default 0 check (hours_served >= 0),
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (opportunity_id, member_id)
);
create index volunteer_opportunities_status_date on public.volunteer_opportunities(status, starts_at);
create index volunteer_applications_member on public.volunteer_applications(member_id, status);
create trigger committees_set_updated_at before update on public.committees for each row execute function public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.volunteer_opportunities for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.volunteer_applications for each row execute function public.set_updated_at();

create or replace function public.can_manage_volunteers(user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public
as $$ select coalesce((select is_active and role in ('chairman','vice_chairperson','secretary_general','programme_officer','admin') from public.profiles where id=user_id),false); $$;
create or replace function public.apply_to_volunteer(target_opportunity_id uuid, application_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare target public.volunteer_opportunities%rowtype; approved_count integer;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'Only active members can volunteer' using errcode='42501'; end if;
  select * into target from public.volunteer_opportunities where id=target_opportunity_id and status='open' for update;
  if not found then raise exception 'This opportunity is not open'; end if;
  select count(*) into approved_count from public.volunteer_applications where opportunity_id=target_opportunity_id and status='approved';
  if target.capacity is not null and approved_count >= target.capacity then raise exception 'This opportunity is full'; end if;
  insert into public.volunteer_applications(opportunity_id,member_id,note) values(target_opportunity_id,auth.uid(),nullif(trim(application_note),''))
  on conflict (opportunity_id,member_id) do update set note=excluded.note,status='pending',reviewed_by=null,reviewed_at=null;
end; $$;
create or replace function public.withdraw_volunteer_application(target_opportunity_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin update public.volunteer_applications set status='withdrawn' where opportunity_id=target_opportunity_id and member_id=auth.uid() and status in ('pending','declined'); if not found then raise exception 'This application cannot be withdrawn'; end if; end; $$;
create or replace function public.set_volunteer_opportunity_status(target_opportunity_id uuid,new_status public.volunteer_opportunity_status) returns void language plpgsql security definer set search_path=public as $$
begin if not public.can_manage_volunteers() then raise exception 'Not authorized' using errcode='42501'; end if; update public.volunteer_opportunities set status=new_status where id=target_opportunity_id; if not found then raise exception 'Opportunity not found'; end if; end; $$;
create or replace function public.review_volunteer_application(target_application_id uuid,new_status public.volunteer_application_status) returns void language plpgsql security definer set search_path=public as $$
declare target public.volunteer_applications%rowtype; limit_value integer; approved_count integer;
begin if not public.can_manage_volunteers() or new_status not in ('approved','declined') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into target from public.volunteer_applications where id=target_application_id for update; if not found then raise exception 'Application not found'; end if;
 if new_status='approved' then select capacity into limit_value from public.volunteer_opportunities where id=target.opportunity_id; select count(*) into approved_count from public.volunteer_applications where opportunity_id=target.opportunity_id and status='approved' and id<>target.id; if limit_value is not null and approved_count>=limit_value then raise exception 'This opportunity is full'; end if; end if;
 update public.volunteer_applications set status=new_status,reviewed_by=auth.uid(),reviewed_at=now() where id=target_application_id; end; $$;
create or replace function public.record_volunteer_hours(target_application_id uuid,total_hours numeric) returns void language plpgsql security definer set search_path=public as $$
begin if not public.can_manage_volunteers() then raise exception 'Not authorized' using errcode='42501'; end if; if total_hours<0 then raise exception 'Hours cannot be negative'; end if; update public.volunteer_applications set hours_served=total_hours where id=target_application_id and status='approved'; if not found then raise exception 'Approved application not found'; end if; end; $$;

alter table public.committees enable row level security; alter table public.committee_memberships enable row level security; alter table public.volunteer_opportunities enable row level security; alter table public.volunteer_applications enable row level security;
create policy "Active members can view committees" on public.committees for select to authenticated using (status='active' or public.can_manage_volunteers());
create policy "Managers administer committees" on public.committees for all to authenticated using (public.can_manage_volunteers()) with check (public.can_manage_volunteers());
create policy "Active members can view committee rosters" on public.committee_memberships for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid() and is_active));
create policy "Managers administer committee rosters" on public.committee_memberships for all to authenticated using (public.can_manage_volunteers()) with check (public.can_manage_volunteers());
create policy "Members view open opportunities" on public.volunteer_opportunities for select to authenticated using (status='open' or public.can_manage_volunteers());
create policy "Managers administer opportunities" on public.volunteer_opportunities for all to authenticated using (public.can_manage_volunteers()) with check (public.can_manage_volunteers());
create policy "Members view own volunteer applications" on public.volunteer_applications for select to authenticated using (member_id=auth.uid() or public.can_manage_volunteers());
create policy "Managers view all volunteer applications" on public.volunteer_applications for select to authenticated using (public.can_manage_volunteers());
revoke all on function public.can_manage_volunteers(uuid), public.apply_to_volunteer(uuid,text), public.withdraw_volunteer_application(uuid), public.set_volunteer_opportunity_status(uuid,public.volunteer_opportunity_status), public.review_volunteer_application(uuid,public.volunteer_application_status), public.record_volunteer_hours(uuid,numeric) from public;
grant execute on function public.can_manage_volunteers(uuid), public.apply_to_volunteer(uuid,text), public.withdraw_volunteer_application(uuid), public.set_volunteer_opportunity_status(uuid,public.volunteer_opportunity_status), public.review_volunteer_application(uuid,public.volunteer_application_status), public.record_volunteer_hours(uuid,numeric) to authenticated;
comment on table public.volunteer_applications is 'Member applications and verified service hours for Association volunteer opportunities.';
