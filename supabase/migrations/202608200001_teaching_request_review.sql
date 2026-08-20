-- Secure Chairman review workflow for existing skill teaching submissions.
-- This migration only extends skill_teaching_submissions; no submission is moved
-- or replaced, and every DDL operation is safe to run again.
alter table public.skill_teaching_submissions
  add column if not exists decline_reason text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists skill_teaching_submissions_status_created_idx
  on public.skill_teaching_submissions(status, created_at desc);

create table if not exists public.teaching_request_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.skill_teaching_submissions(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New teaching request',
  message text not null,
  href text not null default '#/dashboard/teaching-requests',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(request_id, recipient_id)
);
create index if not exists teaching_request_notifications_recipient_idx
  on public.teaching_request_notifications(recipient_id, read_at, created_at desc);
alter table public.teaching_request_notifications enable row level security;

drop policy if exists "Chairman reads teaching request notifications" on public.teaching_request_notifications;
create policy "Chairman reads teaching request notifications"
on public.teaching_request_notifications for select to authenticated
using (recipient_id = auth.uid() and public.is_active_chairman(auth.uid()));

-- Preserve member ownership while also making every request visible to the active Chairman.
drop policy if exists "Members can view their teaching offers" on public.skill_teaching_submissions;
create policy "Members can view own teaching requests and Chairman reviews all"
on public.skill_teaching_submissions for select to authenticated
using (auth.uid() = member_id or public.is_active_chairman(auth.uid()));

create or replace function public.notify_chairman_of_teaching_request()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.teaching_request_notifications(request_id, recipient_id, message)
  select new.id, m.auth_user_id, 'A member proposed "' || new.skill || '" for review.'
  from public."Members" m
  join public.executive_roles er on er.member_id = m.id
  where m.auth_user_id is not null
    and lower(btrim(coalesce(m.status, ''))) = 'active'
    and public.normalize_executive_office(er.office) = 'chairman'
    and lower(coalesce(to_jsonb(er)->>'is_active', 'true')) in ('true','t','1')
    and lower(coalesce(to_jsonb(er)->>'status', 'active')) = 'active'
    and (to_jsonb(er)->>'ends_at' is null or (to_jsonb(er)->>'ends_at')::timestamptz > now())
  on conflict (request_id, recipient_id) do nothing;
  return new;
end;
$$;
drop trigger if exists notify_chairman_teaching_request on public.skill_teaching_submissions;
create trigger notify_chairman_teaching_request
after insert on public.skill_teaching_submissions for each row
execute function public.notify_chairman_of_teaching_request();

create or replace function public.chairman_teaching_request_queue()
returns table(id uuid, member_name text, skill text, experience text, teaching_format text,
  availability text, resources text, status text, submitted_at timestamptz,
  reviewed_at timestamptz, decline_reason text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_active_chairman(auth.uid()) then
    raise exception 'Only the current active Chairman may view teaching requests';
  end if;
  return query
  select r.id, coalesce(p.full_name, 'Association member'), r.skill, r.experience,
    r.format, r.availability, r.resources, r.status, r.created_at,
    r.reviewed_at, r.decline_reason
  from public.skill_teaching_submissions r
  left join public.profiles p on p.id = r.member_id
  order by case r.status when 'pending' then 0 else 1 end, r.created_at desc;
end;
$$;

create or replace function public.decide_teaching_request(request_id uuid, decision text, reason text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_active_chairman(auth.uid()) then
    raise exception 'Only the current active Chairman may approve or decline teaching requests';
  end if;
  if decision not in ('approved', 'declined') then
    raise exception 'Decision must be approved or declined';
  end if;
  if decision = 'declined' and nullif(btrim(coalesce(reason, '')), '') is null then
    raise exception 'A decline reason is required';
  end if;
  update public.skill_teaching_submissions
  set status = decision, reviewed_at = now(), reviewed_by = auth.uid(),
      decline_reason = case when decision = 'declined' then btrim(reason) else null end
  where id = request_id and status = 'pending';
  if not found then raise exception 'Teaching request is not pending'; end if;
  update public.teaching_request_notifications
  set read_at = coalesce(read_at, now())
  where teaching_request_notifications.request_id = decide_teaching_request.request_id
    and recipient_id = auth.uid();
end;
$$;

create or replace function public.unread_teaching_request_count()
returns bigint language sql stable security definer set search_path = public
as $$
  select case when public.is_active_chairman(auth.uid()) then count(*) else 0 end
  from public.skill_teaching_submissions where status = 'pending';
$$;

create or replace function public.mark_teaching_request_notifications_read()
returns integer language plpgsql security definer set search_path = public
as $$
declare changed integer;
begin
  if not public.is_active_chairman(auth.uid()) then
    raise exception 'Only the current active Chairman may update teaching request notifications';
  end if;
  update public.teaching_request_notifications set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.notify_chairman_of_teaching_request() from public;
revoke all on function public.chairman_teaching_request_queue() from public;
revoke all on function public.decide_teaching_request(uuid,text,text) from public;
revoke all on function public.unread_teaching_request_count() from public;
revoke all on function public.mark_teaching_request_notifications_read() from public;
grant execute on function public.chairman_teaching_request_queue(), public.decide_teaching_request(uuid,text,text),
  public.unread_teaching_request_count(), public.mark_teaching_request_notifications_read() to authenticated;

comment on function public.decide_teaching_request(uuid,text,text) is
  'Atomic final decision restricted to the current active Chairman; declines require a reason.';
