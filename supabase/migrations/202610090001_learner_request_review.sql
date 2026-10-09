-- Secure review workflow for public Skill Exchange learner registrations.
-- Active members of the Chairman's, Secretary's and IPRO offices may make one final decision.
begin;

alter table public.public_skill_learner_registrations
  add column if not exists status text not null default 'pending',
  add column if not exists decision_reason text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewer_office text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.public_skill_learner_registrations set status='pending' where status is null or status not in ('pending','approved','declined');

do $constraints$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.public_skill_learner_registrations'::regclass and conname='public_skill_learner_status_check') then
    alter table public.public_skill_learner_registrations add constraint public_skill_learner_status_check check(status in ('pending','approved','declined')) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.public_skill_learner_registrations'::regclass and conname='public_skill_learner_final_decision_check') then
    alter table public.public_skill_learner_registrations add constraint public_skill_learner_final_decision_check check(status='pending' or (reviewed_at is not null and reviewed_by is not null)) not valid;
  end if;
end $constraints$;
alter table public.public_skill_learner_registrations validate constraint public_skill_learner_status_check;
alter table public.public_skill_learner_registrations validate constraint public_skill_learner_final_decision_check;
create index if not exists public_skill_learners_status_created_idx on public.public_skill_learner_registrations(status,created_at desc);

create or replace function public.can_review_learning_requests(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$ select public.office_has_permission(user_id,array['chairman','vice_chairperson','secretary_general','assistant_secretary_general','ipro','assistant_ipro']) $$;

alter table public.skill_exchange_notifications alter column application_id drop not null;
alter table public.skill_exchange_notifications add column if not exists learner_registration_id uuid references public.public_skill_learner_registrations(id) on delete cascade;
alter table public.skill_exchange_notifications drop constraint if exists skill_exchange_notifications_kind_check;
alter table public.skill_exchange_notifications add constraint skill_exchange_notifications_kind_check
  check(kind in ('new_application','new_learner_request','information_requested','approved','declined'));
do $notification_subject$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.skill_exchange_notifications'::regclass and conname='skill_exchange_notification_subject_check') then
    alter table public.skill_exchange_notifications add constraint skill_exchange_notification_subject_check
      check((application_id is not null)::integer+(learner_registration_id is not null)::integer=1) not valid;
  end if;
end $notification_subject$;
alter table public.skill_exchange_notifications validate constraint skill_exchange_notification_subject_check;
create unique index if not exists skill_exchange_learner_notification_unique
  on public.skill_exchange_notifications(learner_registration_id,recipient_id,kind) where learner_registration_id is not null;

drop policy if exists "Reviewers read skill exchange notifications" on public.skill_exchange_notifications;
create policy "Reviewers read skill exchange notifications" on public.skill_exchange_notifications for select to authenticated
using(recipient_id=auth.uid() and (public.can_review_skill_exchange(auth.uid()) or public.can_review_learning_requests(auth.uid())));

create or replace function public.notify_reviewers_of_learner_request()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.skill_exchange_notifications(application_id,learner_registration_id,recipient_id,kind,message,href)
  select null,new.id,m.auth_user_id,'new_learner_request','Learning request '||new.reference_number||' from '||new.full_name,'#/dashboard/learner-requests'
  from public."Members" m
  where m.auth_user_id is not null and lower(btrim(coalesce(m.status,'')))='active'
    and public.can_review_learning_requests(m.auth_user_id)
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists notify_reviewers_learner_request on public.public_skill_learner_registrations;
create trigger notify_reviewers_learner_request after insert on public.public_skill_learner_registrations
for each row execute function public.notify_reviewers_of_learner_request();

insert into public.skill_exchange_notifications(application_id,learner_registration_id,recipient_id,kind,message,href)
select null,l.id,m.auth_user_id,'new_learner_request','Learning request '||l.reference_number||' from '||l.full_name,'#/dashboard/learner-requests'
from public.public_skill_learner_registrations l cross join public."Members" m
where l.status='pending' and m.auth_user_id is not null and lower(btrim(coalesce(m.status,'')))='active'
  and public.can_review_learning_requests(m.auth_user_id)
on conflict do nothing;

create or replace function public.skill_exchange_learner_request_queue()
returns table(id uuid,reference_number text,learner_name text,email text,location text,course_slug text,verification_channel text,status text,submitted_at timestamptz,reviewed_at timestamptz,decision_reason text,reviewer_name text,reviewer_office text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.can_review_learning_requests(auth.uid()) then
    raise exception 'Only the active Chairman, Secretary or IPRO office may review learning requests';
  end if;
  return query
  select l.id,l.reference_number,l.full_name,l.email,l.location,l.course_slug,l.verification_channel,l.status,l.created_at,l.reviewed_at,l.decision_reason,
    nullif(btrim(concat_ws(' ',m.first_name,m.last_name)),'') as reviewer_name,l.reviewer_office
  from public.public_skill_learner_registrations l
  left join public."Members" m on m.auth_user_id=l.reviewed_by
  order by case l.status when 'pending' then 0 when 'approved' then 1 else 2 end,l.created_at desc;
end $$;

create or replace function public.review_skill_exchange_learner_request(request_id uuid,decision text,reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare learner uuid; changed integer; office text;
begin
  if not public.can_review_learning_requests(auth.uid()) then raise exception 'Learner-review access required'; end if;
  if decision not in ('approved','declined') then raise exception 'Decision must be approved or declined'; end if;
  if decision='declined' and nullif(btrim(coalesce(reason,'')),'') is null then raise exception 'A decline reason is required'; end if;
  office:=public.active_executive_office(auth.uid());
  update public.public_skill_learner_registrations l set status=decision,decision_reason=nullif(btrim(coalesce(reason,'')),''),
    reviewed_by=auth.uid(),reviewer_office=office,reviewed_at=now(),updated_at=now()
  where l.id=request_id and l.status='pending' returning l.learner_user_id into learner;
  get diagnostics changed=row_count;
  if coalesce(changed,0)=0 then raise exception 'Learning request is not pending'; end if;
  insert into public.skill_exchange_notifications(application_id,learner_registration_id,recipient_id,kind,message,href)
  values(null,request_id,learner,decision,case when decision='approved' then 'Your Skill Exchange learning request was approved. Open status for the next steps.' else 'Your Skill Exchange learning request was declined. Open status for the reason.' end,'#/skill-exchange')
  on conflict do nothing;
end $$;

create or replace function public.public_skill_learner_status(reference text)
returns table(reference_number text,title text,status text,information_request text,decision_reason text,updated_at timestamptz,instructions text)
language sql stable security definer set search_path=public as $$
  select l.reference_number,initcap(replace(l.course_slug,'-',' ')),l.status,null::text,l.decision_reason,l.updated_at,
    case when l.status='approved' then 'Your place has been approved. The programme team will contact you with the class date or access instructions.' end
  from public.public_skill_learner_registrations l
  where l.learner_user_id=auth.uid() and upper(l.reference_number)=upper(btrim(reference))
$$;

create or replace function public.unread_learner_request_count()
returns bigint language sql stable security definer set search_path=public as $$
  select case when public.can_review_learning_requests(auth.uid()) then
    (select count(*) from public.public_skill_learner_registrations where status='pending') else 0 end
$$;

create or replace function public.mark_learner_request_notifications_read()
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
  if not public.can_review_learning_requests(auth.uid()) then raise exception 'Learner-review access required'; end if;
  update public.skill_exchange_notifications set read_at=now()
  where recipient_id=auth.uid() and learner_registration_id is not null and read_at is null;
  get diagnostics changed=row_count;
  return changed;
end $$;

revoke all on function public.can_review_learning_requests(uuid),public.notify_reviewers_of_learner_request(),public.skill_exchange_learner_request_queue(),public.review_skill_exchange_learner_request(uuid,text,text),public.public_skill_learner_status(text),public.unread_learner_request_count(),public.mark_learner_request_notifications_read() from public;
grant execute on function public.can_review_learning_requests(uuid),public.skill_exchange_learner_request_queue(),public.review_skill_exchange_learner_request(uuid,text,text),public.public_skill_learner_status(text),public.unread_learner_request_count(),public.mark_learner_request_notifications_read() to authenticated;

comment on function public.can_review_learning_requests(uuid) is 'True only for active Chairman, Secretary and IPRO officeholders, including their active assistants.';
commit;
