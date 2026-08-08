-- Certificate issuance is a two-person control: tutors verify learning, while the
-- current active Chairman is the only person who can make the final decision.
alter table public.learning_certificates drop constraint if exists learning_certificates_status_check;
alter table public.learning_certificates alter column status drop default;
alter table public.learning_certificates alter column approved_by drop not null;
alter table public.learning_certificates alter column approved_at drop not null;
alter table public.learning_certificates alter column approved_at drop default;
alter table public.learning_certificates alter column certificate_number drop not null;
alter table public.learning_certificates alter column certificate_number drop default;
alter table public.learning_certificates add column if not exists completed_lessons integer not null default 0;
alter table public.learning_certificates add column if not exists quiz_score integer;
alter table public.learning_certificates add column if not exists final_assessment_score integer;
alter table public.learning_certificates add column if not exists practical_assignment text;
alter table public.learning_certificates add column if not exists attendance_verified boolean not null default false;
alter table public.learning_certificates add column if not exists tutor_verified_by uuid references public.profiles(id);
alter table public.learning_certificates add column if not exists tutor_verified_at timestamptz;
alter table public.learning_certificates add column if not exists completion_date timestamptz;
alter table public.learning_certificates add column if not exists rejection_reason text;
alter table public.learning_certificates add constraint learning_certificates_status_check check (status in
  ('In Progress','Requirements Completed','Awaiting Tutor Verification','Pending Chairman Approval','Approved','Rejected')) not valid;
update public.learning_certificates set status = 'Approved' where lower(status) = 'approved';
alter table public.learning_certificates validate constraint learning_certificates_status_check;

create table public.certificate_approval_audit_log (
  id uuid primary key default gen_random_uuid(), certificate_id uuid not null references public.learning_certificates(id) on delete restrict,
  action text not null check (action in ('Approved','Rejected')), actor_id uuid not null references public.profiles(id),
  actor_name text not null, reason text, occurred_at timestamptz not null default now()
);
alter table public.certificate_approval_audit_log enable row level security;

create or replace function public.is_active_chairman(user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public
as $$ select public.active_executive_office(user_id) = 'chairman' $$;

-- Executives and administrators may inspect records, but no table write policy is
-- granted. All decisions must pass through the locked security-definer function.
drop policy if exists "Reviewers review assignments" on public.course_assignments;
drop policy if exists "Executives view certificates" on public.learning_certificates;
create policy "Executives view certificates" on public.learning_certificates for select to authenticated
using (public.is_executive(auth.uid()) or public.active_executive_office(auth.uid()) = 'admin');
create policy "Chairman views certificate audit" on public.certificate_approval_audit_log for select to authenticated
using (public.is_active_chairman(auth.uid()));

create or replace function public.approve_digital_income_assignment(assignment_id uuid, feedback text default null) returns void
language plpgsql security definer set search_path=public as $$
declare learner uuid; assessment_score integer; lesson_count integer; assignment_text text;
begin
  if not exists(select 1 from member_teacher_network where member_id=auth.uid() and status='approved') then
    raise exception 'Only an approved tutor may verify course requirements';
  end if;
  update course_assignments set status='approved', reviewed_at=now(), reviewed_by=auth.uid(), reviewer_feedback=feedback
    where id=assignment_id and course_slug='digital-income-online-work'
    returning member_id, submission_text into learner, assignment_text;
  if learner is null then raise exception 'Assignment not found'; end if;
  select score into assessment_score from course_assessments where member_id=learner and course_slug='digital-income-online-work';
  select count(*) into lesson_count from lesson_progress where member_id=learner and lesson_slug like 'digital-income-lesson-%' and completed_at is not null;
  if coalesce(assessment_score,0)<70 or lesson_count<>6 then raise exception 'Learner has not met course requirements'; end if;
  insert into learning_certificates(member_id,course_slug,status,completed_lessons,final_assessment_score,practical_assignment,
    attendance_verified,tutor_verified_by,tutor_verified_at,completion_date)
  values(learner,'digital-income-online-work','Pending Chairman Approval',lesson_count,assessment_score,assignment_text,true,auth.uid(),now(),now())
  on conflict(member_id,course_slug) do update set status='Pending Chairman Approval', completed_lessons=excluded.completed_lessons,
    final_assessment_score=excluded.final_assessment_score, practical_assignment=excluded.practical_assignment,
    attendance_verified=true, tutor_verified_by=auth.uid(), tutor_verified_at=now(), completion_date=now(), rejection_reason=null;
  update course_enrolments set completed_at=now() where member_id=learner and course_slug='digital-income-online-work';
end $$;

create or replace function public.decide_certificate(certificate_id uuid, decision text, rejection_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actor_name text; next_number text;
begin
  if not public.is_active_chairman(auth.uid()) then raise exception 'Only the current active Chairman may approve or reject certificates'; end if;
  if decision not in ('Approved','Rejected') then raise exception 'Decision must be Approved or Rejected'; end if;
  if decision='Rejected' and nullif(btrim(rejection_reason),'') is null then raise exception 'A rejection reason is required'; end if;
  select full_name into actor_name from profiles where id=auth.uid();
  if decision='Approved' then next_number := 'SA-DI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)); end if;
  update learning_certificates set status=decision, approved_by=case when decision='Approved' then auth.uid() end,
    approved_at=case when decision='Approved' then now() end, certificate_number=case when decision='Approved' then next_number end,
    rejection_reason=case when decision='Rejected' then btrim(rejection_reason) end
  where id=certificate_id and status='Pending Chairman Approval';
  if not found then raise exception 'Certificate is not pending Chairman approval'; end if;
  insert into certificate_approval_audit_log(certificate_id,action,actor_id,actor_name,reason)
    values(certificate_id,decision,auth.uid(),coalesce(actor_name,'Chairman'),case when decision='Rejected' then btrim(rejection_reason) end);
end $$;

create or replace function public.chairman_certificate_queue()
returns table(id uuid, member_name text, course_title text, completed_lessons integer, quiz_score integer,
  final_assessment_score integer, practical_assignment text, tutor_name text, attendance_verified boolean,
  completion_date timestamptz, status text, rejection_reason text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not (public.is_executive(auth.uid()) or public.active_executive_office(auth.uid())='admin') then raise exception 'Executive access required'; end if;
  return query select c.id,p.full_name,case c.course_slug when 'digital-income-online-work' then 'Digital Income & Online Work' else c.course_slug end,
    c.completed_lessons,c.quiz_score,c.final_assessment_score,c.practical_assignment,t.full_name,c.attendance_verified,c.completion_date,c.status,c.rejection_reason
  from learning_certificates c join profiles p on p.id=c.member_id left join profiles t on t.id=c.tutor_verified_by
  order by c.completion_date desc nulls last;
end $$;

revoke all on function public.is_active_chairman(uuid), public.decide_certificate(uuid,text,text), public.chairman_certificate_queue() from public;
grant execute on function public.is_active_chairman(uuid), public.decide_certificate(uuid,text,text), public.chairman_certificate_queue() to authenticated;
revoke insert, update, delete on public.learning_certificates, public.certificate_approval_audit_log from authenticated;
