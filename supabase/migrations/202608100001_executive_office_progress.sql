-- Give the IPRO office access to privacy-conscious aggregate analytics and add
-- the shared executive work register requested by the Association.
create or replace function public.can_view_executive_analytics(user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.office_has_permission(user_id, array[
    'chairman','vice_chairperson','secretary_general','treasurer',
    'auditor_general','ipro','assistant_ipro'
  ]);
$$;

revoke all on function public.can_view_executive_analytics(uuid) from public;
grant execute on function public.can_view_executive_analytics(uuid) to authenticated;

create table if not exists public.executive_office_tasks (
  id uuid primary key default gen_random_uuid(),
  office text not null,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'ongoing', 'completed')),
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  due_date date,
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint executive_office_tasks_office_normalized
    check (office = public.normalize_executive_office(office))
);

alter table public.executive_office_tasks enable row level security;

create or replace function public.can_manage_executive_task(task_office text, user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_executive(user_id) and (
    public.active_executive_office(user_id) = public.normalize_executive_office(task_office)
    or public.active_executive_office(user_id) in ('chairman','vice_chairperson','secretary_general')
  );
$$;

revoke all on function public.can_manage_executive_task(text,uuid) from public;
grant execute on function public.can_manage_executive_task(text,uuid) to authenticated;

drop policy if exists "Executives view office progress" on public.executive_office_tasks;
create policy "Executives view office progress" on public.executive_office_tasks
for select to authenticated using (public.is_executive(auth.uid()));

drop policy if exists "Executives create office tasks" on public.executive_office_tasks;
create policy "Executives create office tasks" on public.executive_office_tasks
for insert to authenticated with check (
  public.can_manage_executive_task(office, auth.uid())
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "Executives update office tasks" on public.executive_office_tasks;
create policy "Executives update office tasks" on public.executive_office_tasks
for update to authenticated
using (public.can_manage_executive_task(office, auth.uid()))
with check (
  public.can_manage_executive_task(office, auth.uid())
  and updated_by = auth.uid()
);

drop policy if exists "Executive oversight deletes office tasks" on public.executive_office_tasks;
create policy "Executive oversight deletes office tasks" on public.executive_office_tasks
for delete to authenticated using (
  public.active_executive_office(auth.uid()) in ('chairman','vice_chairperson','secretary_general')
);

grant select, insert, update, delete on public.executive_office_tasks to authenticated;
revoke all on public.executive_office_tasks from anon;

create or replace function public.set_executive_task_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.office := public.normalize_executive_office(new.office);
  new.updated_by := auth.uid();
  new.updated_at := now();
  if new.status = 'completed' then
    new.progress_percent := 100;
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status = 'pending' then
    new.progress_percent := 0;
    new.completed_at := null;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists executive_office_tasks_audit on public.executive_office_tasks;
create trigger executive_office_tasks_audit
before insert or update on public.executive_office_tasks
for each row execute function public.set_executive_task_audit();

revoke all on function public.set_executive_task_audit() from public;

comment on table public.executive_office_tasks is
  'Shared executive work register. All active executives may view progress; offices manage their own tasks and authorised leadership has oversight.';
