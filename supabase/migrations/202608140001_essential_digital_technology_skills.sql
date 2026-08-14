-- Add a second course to the existing learning tables. No parallel progress,
-- assessment, assignment, or certificate store is introduced.
alter table public.lesson_progress drop constraint if exists lesson_progress_valid_completion;
alter table public.lesson_progress add constraint lesson_progress_valid_completion check
  (completed_at is null or (knowledge_submitted and knowledge_score >= 70 and
   (lesson_slug like 'digital-income-lesson-%' or lesson_slug like 'essential-digital-skills-lesson-%')));

create or replace function public.essential_digital_correct_answers(lesson_number integer) returns jsonb
language sql immutable set search_path=public as $$
  select case when lesson_number between 1 and 6 then '{"q1":"0","q2":"0","q3":"0","q4":"0","q5":"0","q6":"0"}'::jsonb
  else null end
$$;

create or replace function public.submit_essential_digital_knowledge_check(lesson_number integer, submitted_answers jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare correct jsonb; result integer;
begin
  if auth.uid() is null or lesson_number not between 1 and 6 then raise exception 'Invalid lesson'; end if;
  if lesson_number > 1 and not exists(select 1 from lesson_progress where member_id=auth.uid()
    and lesson_slug='essential-digital-skills-lesson-'||(lesson_number-1) and completed_at is not null)
  then raise exception 'Previous lesson must be completed'; end if;
  correct:=public.essential_digital_correct_answers(lesson_number);
  select round(100.0*count(*) filter(where submitted_answers->>key=value)/6) into result from jsonb_each_text(correct);
  insert into lesson_progress(member_id,lesson_slug,knowledge_answers,knowledge_score,knowledge_submitted)
  values(auth.uid(),'essential-digital-skills-lesson-'||lesson_number,submitted_answers,result,true)
  on conflict(member_id,lesson_slug) do update set knowledge_answers=excluded.knowledge_answers,
    knowledge_score=excluded.knowledge_score,knowledge_submitted=true,updated_at=now();
  return result;
end $$;

create or replace function public.complete_essential_digital_lesson(lesson_number integer, section_ids jsonb, activity_response text)
returns void language plpgsql security definer set search_path=public as $$
declare required text[];
begin
  if auth.uid() is null or lesson_number not between 1 and 6 then raise exception 'Invalid lesson'; end if;
  if lesson_number > 1 and not exists(select 1 from lesson_progress where member_id=auth.uid()
    and lesson_slug='essential-digital-skills-lesson-'||(lesson_number-1) and completed_at is not null)
  then raise exception 'Previous lesson must be completed'; end if;
  required:=case lesson_number when 1 then array['devices','controls','care','troubleshoot']
    when 2 then array['browse','search','email','organise'] when 3 then array['files','documents','cloud','sharing']
    when 4 then array['channels','meetings','collaboration','respect'] when 5 then array['accounts','scams','privacy','responsibility']
    else array['productivity','ai','prompts','safe-ai'] end;
  if not(select bool_and(section_ids ? item) from unnest(required)item) or char_length(trim(activity_response))<40
    then raise exception 'Read every section and complete the practical activity'; end if;
  update lesson_progress set read_sections=section_ids,pathway_answers=jsonb_build_object('assignment',activity_response),
    completed_at=coalesce(completed_at,now()),updated_at=now() where member_id=auth.uid()
    and lesson_slug='essential-digital-skills-lesson-'||lesson_number and knowledge_submitted and knowledge_score>=70;
  if not found then raise exception 'A verified score of at least 70 percent is required'; end if;
end $$;

create or replace function public.submit_essential_digital_final_assessment(submitted_answers jsonb) returns integer
language plpgsql security definer set search_path=public as $$
declare correct constant jsonb:='{"f1":"0","f2":"0","f3":"0","f4":"0","f5":"0","f6":"0"}'; result integer;
begin
  if (select count(*) from lesson_progress where member_id=auth.uid() and lesson_slug like 'essential-digital-skills-lesson-%' and completed_at is not null)<>6
    then raise exception 'Complete all lessons first'; end if;
  select round(100.0*count(*) filter(where submitted_answers->>key=value)/6) into result from jsonb_each_text(correct);
  insert into course_assessments(member_id,course_slug,answers,score) values(auth.uid(),'essential-digital-technology-skills',submitted_answers,result)
  on conflict(member_id,course_slug) do update set answers=excluded.answers,score=excluded.score,submitted_at=now();
  return result;
end $$;

-- Approved tutors are the only actors who can verify the assignment. Verification
-- creates/updates the existing certificate record directly in the Chairman queue.
create or replace function public.approve_essential_digital_assignment(assignment_id uuid, feedback text default null) returns void
language plpgsql security definer set search_path=public as $$
declare learner uuid; assessment_score integer; lesson_count integer; assignment_text text;
begin
  if not exists(select 1 from member_teacher_network where member_id=auth.uid() and status='approved')
    then raise exception 'Only an approved tutor may verify course requirements'; end if;
  update course_assignments set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),reviewer_feedback=feedback
    where id=assignment_id and course_slug='essential-digital-technology-skills'
    returning member_id,submission_text into learner,assignment_text;
  if learner is null then raise exception 'Assignment not found'; end if;
  select score into assessment_score from course_assessments where member_id=learner and course_slug='essential-digital-technology-skills';
  select count(*) into lesson_count from lesson_progress where member_id=learner and lesson_slug like 'essential-digital-skills-lesson-%' and completed_at is not null;
  if coalesce(assessment_score,0)<70 or lesson_count<>6 then raise exception 'Learner has not met course requirements'; end if;
  insert into learning_certificates(member_id,course_slug,status,completed_lessons,final_assessment_score,practical_assignment,
    attendance_verified,tutor_verified_by,tutor_verified_at,completion_date)
  values(learner,'essential-digital-technology-skills','Pending Chairman Approval',6,assessment_score,assignment_text,true,auth.uid(),now(),now())
  on conflict(member_id,course_slug) do update set status='Pending Chairman Approval',completed_lessons=6,
    final_assessment_score=excluded.final_assessment_score,practical_assignment=excluded.practical_assignment,
    attendance_verified=true,tutor_verified_by=auth.uid(),tutor_verified_at=now(),completion_date=now(),rejection_reason=null;
  update course_enrolments set completed_at=now() where member_id=learner and course_slug='essential-digital-technology-skills';
end $$;

create or replace function public.chairman_certificate_queue()
returns table(id uuid,member_name text,course_title text,completed_lessons integer,quiz_score integer,
 final_assessment_score integer,practical_assignment text,tutor_name text,attendance_verified boolean,
 completion_date timestamptz,status text,rejection_reason text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not (public.is_executive(auth.uid()) or public.active_executive_office(auth.uid())='admin') then raise exception 'Executive access required'; end if;
 return query select c.id,p.full_name,case c.course_slug when 'digital-income-online-work' then 'Digital Income & Online Work'
   when 'essential-digital-technology-skills' then 'Essential Digital & Technology Skills' else c.course_slug end,
   c.completed_lessons,c.quiz_score,c.final_assessment_score,c.practical_assignment,t.full_name,c.attendance_verified,c.completion_date,c.status,c.rejection_reason
 from learning_certificates c join profiles p on p.id=c.member_id left join profiles t on t.id=c.tutor_verified_by
 order by c.completion_date desc nulls last;
end $$;

-- Preserve the existing active-Chairman gate while issuing a course-specific number.
create or replace function public.decide_certificate(certificate_id uuid,decision text,rejection_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actor_name text; next_number text; target_course text;
begin
 if not public.is_active_chairman(auth.uid()) then raise exception 'Only the current active Chairman may approve or reject certificates'; end if;
 if decision not in ('Approved','Rejected') then raise exception 'Decision must be Approved or Rejected'; end if;
 if decision='Rejected' and nullif(btrim(rejection_reason),'') is null then raise exception 'A rejection reason is required'; end if;
 select course_slug into target_course from learning_certificates where id=certificate_id and status='Pending Chairman Approval';
 if target_course is null then raise exception 'Certificate is not pending Chairman approval'; end if;
 select full_name into actor_name from profiles where id=auth.uid();
 if decision='Approved' then next_number:=(case when target_course='essential-digital-technology-skills' then 'SA-EDT-' else 'SA-DI-' end)||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)); end if;
 update learning_certificates set status=decision,approved_by=case when decision='Approved' then auth.uid() end,
  approved_at=case when decision='Approved' then now() end,certificate_number=case when decision='Approved' then next_number end,
  rejection_reason=case when decision='Rejected' then btrim(rejection_reason) end where id=certificate_id and status='Pending Chairman Approval';
 insert into certificate_approval_audit_log(certificate_id,action,actor_id,actor_name,reason)
 values(certificate_id,decision,auth.uid(),coalesce(actor_name,'Chairman'),case when decision='Rejected' then btrim(rejection_reason) end);
end $$;

revoke all on function public.essential_digital_correct_answers(integer),public.submit_essential_digital_knowledge_check(integer,jsonb),
 public.complete_essential_digital_lesson(integer,jsonb,text),public.submit_essential_digital_final_assessment(jsonb),
 public.approve_essential_digital_assignment(uuid,text) from public;
grant execute on function public.submit_essential_digital_knowledge_check(integer,jsonb),public.complete_essential_digital_lesson(integer,jsonb,text),
 public.submit_essential_digital_final_assessment(jsonb),public.approve_essential_digital_assignment(uuid,text) to authenticated;
