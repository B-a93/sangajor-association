-- Digital Income persistence repair.
-- Learning ownership is the Supabase Auth UUID.  Members remains the
-- authoritative membership record and must contain an active auth_user_id link.

create or replace function public.is_active_learning_member(user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public."Members" m
    where m.auth_user_id = user_id
      and lower(btrim(coalesce(m.status, ''))) = 'active'
  );
$$;

revoke all on function public.is_active_learning_member(uuid) from public;
grant execute on function public.is_active_learning_member(uuid) to authenticated;

-- Remove only the obsolete member_id foreign keys. Existing UUID values are
-- preserved: profiles.id was itself an auth.users UUID, so no data copy or
-- destructive table rebuild is necessary.
do $repair_member_foreign_keys$
declare item record;
begin
  for item in
    select c.conrelid::regclass as table_name, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.conrelid in (
        'public.lesson_progress'::regclass,
        'public.course_enrolments'::regclass,
        'public.course_assessments'::regclass,
        'public.course_assignments'::regclass,
        'public.learning_certificates'::regclass
      )
      and a.attname = 'member_id'
  loop
    execute format('alter table %s drop constraint %I', item.table_name, item.conname);
  end loop;
end $repair_member_foreign_keys$;

alter table public.lesson_progress
  add constraint lesson_progress_member_id_auth_fkey foreign key (member_id) references auth.users(id) on delete cascade;
alter table public.course_enrolments
  add constraint course_enrolments_member_id_auth_fkey foreign key (member_id) references auth.users(id) on delete cascade;
alter table public.course_assessments
  add constraint course_assessments_member_id_auth_fkey foreign key (member_id) references auth.users(id) on delete cascade;
alter table public.course_assignments
  add constraint course_assignments_member_id_auth_fkey foreign key (member_id) references auth.users(id) on delete cascade;
alter table public.learning_certificates
  add constraint learning_certificates_member_id_auth_fkey foreign key (member_id) references auth.users(id) on delete cascade;

-- Idempotently replace every policy on these tables, avoiding stale policies
-- that still assume a profiles identity.
do $drop_learning_policies$
declare item record;
begin
  for item in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'lesson_progress', 'course_enrolments', 'course_assessments',
      'course_assignments', 'learning_certificates'
    )
  loop
    execute format('drop policy %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
end $drop_learning_policies$;

alter table public.lesson_progress enable row level security;
alter table public.course_enrolments enable row level security;
alter table public.course_assessments enable row level security;
alter table public.course_assignments enable row level security;
alter table public.learning_certificates enable row level security;

create policy "Active members insert own lesson progress" on public.lesson_progress for insert to authenticated
  with check (member_id = auth.uid() and public.is_active_learning_member());
create policy "Active members select own lesson progress" on public.lesson_progress for select to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member());
create policy "Active members update own lesson progress" on public.lesson_progress for update to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member())
  with check (member_id = auth.uid() and public.is_active_learning_member());

create policy "Active members insert own enrolments" on public.course_enrolments for insert to authenticated
  with check (member_id = auth.uid() and public.is_active_learning_member());
create policy "Active members select own enrolments" on public.course_enrolments for select to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member());
create policy "Active members update own enrolments" on public.course_enrolments for update to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member())
  with check (member_id = auth.uid() and public.is_active_learning_member());

create policy "Active members select own assessments" on public.course_assessments for select to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member());
create policy "Active members select own assignments" on public.course_assignments for select to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member());
create policy "Active members insert own assignments" on public.course_assignments for insert to authenticated
  with check (member_id = auth.uid() and public.is_active_learning_member() and status = 'submitted' and reviewed_by is null);
create policy "Active members update own assignments" on public.course_assignments for update to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member() and status <> 'approved')
  with check (member_id = auth.uid() and public.is_active_learning_member() and status = 'submitted' and reviewed_by is null and reviewed_at is null);
create policy "Authorized reviewers select assignments" on public.course_assignments for select to authenticated
  using (public.is_executive(auth.uid()) or exists (
    select 1 from public.member_teacher_network t where t.member_id = auth.uid() and t.status = 'approved'
  ));
create policy "Authorized reviewers update assignments" on public.course_assignments for update to authenticated
  using (public.is_executive(auth.uid()) or exists (
    select 1 from public.member_teacher_network t where t.member_id = auth.uid() and t.status = 'approved'
  ))
  with check (public.is_executive(auth.uid()) or exists (
    select 1 from public.member_teacher_network t where t.member_id = auth.uid() and t.status = 'approved'
  ));
create policy "Active members select own certificates" on public.learning_certificates for select to authenticated
  using (member_id = auth.uid() and public.is_active_learning_member());

-- Completion is atomic, tied to auth.uid(), and succeeds only for a currently
-- active linked member. Re-running it keeps the original completion timestamp.
create or replace function public.complete_digital_income_lesson_one(pathway_responses jsonb, section_ids jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare
  required_sections constant text[] := array['digital-income','getting-ready','freelancing','remote-employment','content-creation','digital-products','online-business','affiliate-marketing','dropshipping','drop-servicing','scam-awareness'];
  required_pathway constant text[] := array['goal','strengths','pathway','customer','resources','safety'];
  computed_score integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_active_learning_member(auth.uid()) then raise exception 'An active linked member account is required'; end if;
  if jsonb_typeof(section_ids) <> 'array' or not (select bool_and(section_ids ? section_id) from unnest(required_sections) section_id) then
    raise exception 'Every lesson section must be read';
  end if;
  if jsonb_typeof(pathway_responses) <> 'object' or not (select bool_and(length(trim(coalesce(pathway_responses ->> question_id, ''))) > 0) from unnest(required_pathway) question_id) then
    raise exception 'Every pathway response is required';
  end if;

  select round(100.0 * ((knowledge_answers->>'meaning'='1')::integer + (knowledge_answers->>'freelance'='0')::integer +
    (knowledge_answers->>'remote'='2')::integer + (knowledge_answers->>'affiliate'='1')::integer +
    (knowledge_answers->>'delivery'='0')::integer + (knowledge_answers->>'scam'='2')::integer) / 6)::integer
  into computed_score from public.lesson_progress
  where member_id = auth.uid() and lesson_slug = 'digital-income-lesson-1';

  if coalesce(computed_score, 0) < 70 then raise exception 'A verified score of at least 70 percent is required'; end if;
  update public.lesson_progress set knowledge_score = computed_score, read_sections = section_ids,
    pathway_answers = pathway_responses, completed_at = coalesce(completed_at, now()), updated_at = now()
  where member_id = auth.uid() and lesson_slug = 'digital-income-lesson-1' and knowledge_submitted;
  if not found then raise exception 'A submitted score of at least 70 percent is required'; end if;
end;
$$;

revoke all on function public.complete_digital_income_lesson_one(jsonb,jsonb) from public;
grant execute on function public.complete_digital_income_lesson_one(jsonb,jsonb) to authenticated;
