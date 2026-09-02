-- Keep the practical-course answer key on the server. The browser submits only
-- the option index explicitly selected by the learner.
create or replace function public.submit_practical_course_knowledge_check(
  target_course text, lesson_number integer, submitted_answers jsonb
) returns integer language plpgsql security definer set search_path=public as $$
declare result integer;
begin
  if auth.uid() is null or not public.is_active_learning_member(auth.uid()) then raise exception 'An active member account is required'; end if;
  if not public.is_supported_practical_course(target_course) or lesson_number not between 1 and 6 then raise exception 'Invalid course or lesson'; end if;
  if jsonb_typeof(submitted_answers)<>'object' or not (select bool_and(submitted_answers ? ('q'||n)) from generate_series(1,6)n) then raise exception 'Answer all six questions'; end if;
  if lesson_number>1 and not exists(select 1 from lesson_progress where member_id=auth.uid() and lesson_slug=target_course||'-lesson-'||(lesson_number-1) and completed_at is not null) then raise exception 'Previous lesson must be completed'; end if;
  select round(100.0*count(*) filter(where submitted_answers->>('q'||n)=((n+1)%4)::text)/6)::integer into result from generate_series(1,6)n;
  insert into lesson_progress(member_id,lesson_slug,knowledge_answers,knowledge_score,knowledge_submitted)
  values(auth.uid(),target_course||'-lesson-'||lesson_number,submitted_answers,result,true)
  on conflict(member_id,lesson_slug) do update set knowledge_answers=excluded.knowledge_answers,knowledge_score=excluded.knowledge_score,knowledge_submitted=true,updated_at=now();
  return result;
end $$;

create or replace function public.submit_practical_course_final_assessment(target_course text,submitted_answers jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare result integer;
begin
  if auth.uid() is null or not public.is_active_learning_member(auth.uid()) then raise exception 'An active member account is required'; end if;
  if not public.is_supported_practical_course(target_course) then raise exception 'Invalid course'; end if;
  if (select count(*) from lesson_progress where member_id=auth.uid() and lesson_slug like target_course||'-lesson-%' and completed_at is not null)<>6 then raise exception 'Complete all lessons first'; end if;
  if jsonb_typeof(submitted_answers)<>'object' or not (select bool_and(submitted_answers ? ('f'||n)) from generate_series(1,6)n) then raise exception 'Answer all six questions'; end if;
  select round(100.0*count(*) filter(where submitted_answers->>('f'||n)=((n+2)%4)::text)/6)::integer into result from generate_series(1,6)n;
  insert into course_assessments(member_id,course_slug,answers,score) values(auth.uid(),target_course,submitted_answers,result)
  on conflict(member_id,course_slug) do update set answers=excluded.answers,score=excluded.score,submitted_at=now();
  return result;
end $$;
