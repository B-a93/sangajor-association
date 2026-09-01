-- Two separate practical courses using the existing learning infrastructure.
begin;

alter table public.lesson_progress drop constraint if exists lesson_progress_valid_completion;
alter table public.lesson_progress drop constraint if exists lesson_one_valid_completion;
alter table public.lesson_progress add constraint lesson_progress_valid_completion check (
  completed_at is null or (
    knowledge_submitted and knowledge_score >= 70 and (
      lesson_slug like 'digital-income-lesson-%' or
      lesson_slug like 'everyday-digital-technology-skills-lesson-%' or
      lesson_slug like 'everyday-cooking-skills-lesson-%' or
      lesson_slug like 'practical-baking-skills-lesson-%'
    )
  )
);

create or replace function public.is_supported_practical_course(target_course text)
returns boolean language sql immutable set search_path=public as $$
  select target_course in ('everyday-cooking-skills','practical-baking-skills')
$$;

create or replace function public.submit_practical_course_knowledge_check(
  target_course text, lesson_number integer, submitted_answers jsonb
) returns integer language plpgsql security definer set search_path=public as $$
declare result integer;
begin
  if auth.uid() is null or not public.is_active_learning_member(auth.uid()) then raise exception 'An active member account is required'; end if;
  if not public.is_supported_practical_course(target_course) or lesson_number not between 1 and 6 then raise exception 'Invalid course or lesson'; end if;
  if jsonb_typeof(submitted_answers)<>'object' or not (select bool_and(submitted_answers ? ('q'||n)) from generate_series(1,6)n) then raise exception 'Answer all six questions'; end if;
  if lesson_number>1 and not exists(select 1 from lesson_progress where member_id=auth.uid() and lesson_slug=target_course||'-lesson-'||(lesson_number-1) and completed_at is not null) then raise exception 'Previous lesson must be completed'; end if;
  select round(100.0*count(*) filter(where submitted_answers->>('q'||n)='0')/6)::integer into result from generate_series(1,6)n;
  insert into lesson_progress(member_id,lesson_slug,knowledge_answers,knowledge_score,knowledge_submitted)
  values(auth.uid(),target_course||'-lesson-'||lesson_number,submitted_answers,result,true)
  on conflict(member_id,lesson_slug) do update set knowledge_answers=excluded.knowledge_answers,knowledge_score=excluded.knowledge_score,knowledge_submitted=true,updated_at=now();
  return result;
end $$;

create or replace function public.complete_practical_course_lesson(
  target_course text, lesson_number integer, section_ids jsonb, activity_response text
) returns void language plpgsql security definer set search_path=public as $$
declare distinct_sections integer;
begin
  if auth.uid() is null or not public.is_active_learning_member(auth.uid()) then raise exception 'An active member account is required'; end if;
  if not public.is_supported_practical_course(target_course) or lesson_number not between 1 and 6 then raise exception 'Invalid course or lesson'; end if;
  if lesson_number>1 and not exists(select 1 from lesson_progress where member_id=auth.uid() and lesson_slug=target_course||'-lesson-'||(lesson_number-1) and completed_at is not null) then raise exception 'Previous lesson must be completed'; end if;
  if jsonb_typeof(section_ids)<>'array' then raise exception 'Every lesson section must be read'; end if;
  select count(distinct value) into distinct_sections from jsonb_array_elements_text(section_ids);
  if distinct_sections<>4 or char_length(btrim(coalesce(activity_response,'')))<40 then raise exception 'Read every section and complete the practical activity'; end if;
  update lesson_progress set read_sections=section_ids,pathway_answers=jsonb_build_object('assignment',btrim(activity_response)),completed_at=coalesce(completed_at,now()),updated_at=now()
  where member_id=auth.uid() and lesson_slug=target_course||'-lesson-'||lesson_number and knowledge_submitted and knowledge_score>=70;
  if not found then raise exception 'A verified score of at least 70 percent is required'; end if;
end $$;

create or replace function public.submit_practical_course_final_assessment(target_course text,submitted_answers jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare result integer;
begin
  if auth.uid() is null or not public.is_active_learning_member(auth.uid()) then raise exception 'An active member account is required'; end if;
  if not public.is_supported_practical_course(target_course) then raise exception 'Invalid course'; end if;
  if (select count(*) from lesson_progress where member_id=auth.uid() and lesson_slug like target_course||'-lesson-%' and completed_at is not null)<>6 then raise exception 'Complete all lessons first'; end if;
  if jsonb_typeof(submitted_answers)<>'object' or not (select bool_and(submitted_answers ? ('f'||n)) from generate_series(1,6)n) then raise exception 'Answer all six questions'; end if;
  select round(100.0*count(*) filter(where submitted_answers->>('f'||n)='0')/6)::integer into result from generate_series(1,6)n;
  insert into course_assessments(member_id,course_slug,answers,score) values(auth.uid(),target_course,submitted_answers,result)
  on conflict(member_id,course_slug) do update set answers=excluded.answers,score=excluded.score,submitted_at=now();
  return result;
end $$;

create or replace function public.approve_practical_course_assignment(assignment_id uuid,feedback text default null)
returns void language plpgsql security definer set search_path=public as $$
declare learner uuid; target_course text; assessment_score integer; lesson_count integer; assignment_text text;
begin
  if not exists(select 1 from member_teacher_network where member_id=auth.uid() and status='approved') then raise exception 'Only an approved tutor may verify course requirements'; end if;
  update course_assignments set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),reviewer_feedback=feedback
  where id=assignment_id and public.is_supported_practical_course(course_slug)
  returning member_id,course_slug,submission_text into learner,target_course,assignment_text;
  if learner is null then raise exception 'Assignment not found'; end if;
  select score into assessment_score from course_assessments where member_id=learner and course_slug=target_course;
  select count(*) into lesson_count from lesson_progress where member_id=learner and lesson_slug like target_course||'-lesson-%' and completed_at is not null;
  if coalesce(assessment_score,0)<70 or lesson_count<>6 then raise exception 'Learner has not met course requirements'; end if;
  insert into learning_certificates(member_id,course_slug,status,completed_lessons,final_assessment_score,practical_assignment,attendance_verified,tutor_verified_by,tutor_verified_at,completion_date)
  values(learner,target_course,'Pending Chairman Approval',6,assessment_score,assignment_text,true,auth.uid(),now(),now())
  on conflict(member_id,course_slug) do update set status='Pending Chairman Approval',completed_lessons=6,final_assessment_score=excluded.final_assessment_score,practical_assignment=excluded.practical_assignment,attendance_verified=true,tutor_verified_by=auth.uid(),tutor_verified_at=now(),completion_date=now(),rejection_reason=null;
  update course_enrolments set completed_at=now() where member_id=learner and course_slug=target_course;
end $$;

create or replace function public.chairman_certificate_queue()
returns table(id uuid,member_name text,course_title text,completed_lessons integer,quiz_score integer,final_assessment_score integer,practical_assignment text,tutor_name text,attendance_verified boolean,completion_date timestamptz,status text,rejection_reason text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not (public.is_executive(auth.uid()) or public.active_executive_office(auth.uid())='admin') then raise exception 'Executive access required'; end if;
 return query select c.id,p.full_name,case c.course_slug when 'digital-income-online-work' then 'Digital Income & Online Work' when 'everyday-digital-technology-skills' then 'Everyday Digital & Technology Skills' when 'everyday-cooking-skills' then 'Everyday Cooking Skills' when 'practical-baking-skills' then 'Practical Baking Skills' else c.course_slug end,c.completed_lessons,c.quiz_score,c.final_assessment_score,c.practical_assignment,t.full_name,c.attendance_verified,c.completion_date,c.status,c.rejection_reason
 from learning_certificates c join profiles p on p.id=c.member_id left join profiles t on t.id=c.tutor_verified_by order by c.completion_date desc nulls last;
end $$;

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
 if decision='Approved' then next_number:=(case target_course when 'everyday-digital-technology-skills' then 'SA-EDT-' when 'everyday-cooking-skills' then 'SA-ECS-' when 'practical-baking-skills' then 'SA-PBS-' else 'SA-DI-' end)||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)); end if;
 update learning_certificates set status=decision,approved_by=case when decision='Approved' then auth.uid() end,approved_at=case when decision='Approved' then now() end,certificate_number=case when decision='Approved' then next_number end,rejection_reason=case when decision='Rejected' then btrim(rejection_reason) end where id=certificate_id and status='Pending Chairman Approval';
 insert into certificate_approval_audit_log(certificate_id,action,actor_id,actor_name,reason) values(certificate_id,decision,auth.uid(),coalesce(actor_name,'Chairman'),case when decision='Rejected' then btrim(rejection_reason) end);
end $$;

revoke all on function public.is_supported_practical_course(text),public.submit_practical_course_knowledge_check(text,integer,jsonb),public.complete_practical_course_lesson(text,integer,jsonb,text),public.submit_practical_course_final_assessment(text,jsonb),public.approve_practical_course_assignment(uuid,text) from public;
grant execute on function public.submit_practical_course_knowledge_check(text,integer,jsonb),public.complete_practical_course_lesson(text,integer,jsonb,text),public.submit_practical_course_final_assessment(text,jsonb),public.approve_practical_course_assignment(uuid,text) to authenticated;

commit;

select to_regprocedure('public.submit_practical_course_knowledge_check(text,integer,jsonb)') as knowledge_check_function,to_regprocedure('public.complete_practical_course_lesson(text,integer,jsonb,text)') as completion_function,to_regprocedure('public.submit_practical_course_final_assessment(text,jsonb)') as final_assessment_function,to_regprocedure('public.approve_practical_course_assignment(uuid,text)') as tutor_verification_function;
