-- Make public learning immediate after verified email registration.
-- Teaching applications keep their existing approval workflow.
begin;

alter table public.public_skill_learner_registrations
  drop constraint if exists public_skill_learner_final_decision_check;

alter table public.public_skill_learner_registrations
  alter column status set default 'approved';

update public.public_skill_learner_registrations
set status = 'approved',
    decision_reason = null,
    reviewed_by = null,
    reviewer_office = 'automatic_registration',
    reviewed_at = coalesce(reviewed_at, created_at),
    updated_at = now()
where status = 'pending';

alter table public.public_skill_learner_registrations
  add constraint public_skill_learner_final_decision_check
  check (
    status = 'pending'
    or (
      reviewed_at is not null
      and (
        reviewed_by is not null
        or reviewer_office = 'automatic_registration'
      )
    )
  ) not valid;

alter table public.public_skill_learner_registrations
  validate constraint public_skill_learner_final_decision_check;

create or replace function public.is_active_learning_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    target_member_id is not null
    and (
      exists (
        select 1
        from public."Members" member
        where member.auth_user_id = target_member_id
          and lower(btrim(coalesce(member.status, ''))) = 'active'
      )
      or exists (
        select 1
        from public.public_skill_learner_registrations learner
        where learner.learner_user_id = target_member_id
          and learner.status = 'approved'
      )
    ),
    false
  )
$$;

create or replace function public.can_access_learning_course(
  target_user_id uuid,
  target_course_slug text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    target_user_id is not null
    and (
      exists (
        select 1
        from public."Members" member
        where member.auth_user_id = target_user_id
          and lower(btrim(coalesce(member.status, ''))) = 'active'
      )
      or exists (
        select 1
        from public.public_skill_learner_registrations learner
        where learner.learner_user_id = target_user_id
          and learner.course_slug = btrim(target_course_slug)
          and learner.status = 'approved'
      )
    ),
    false
  )
$$;

create or replace function public.register_public_skill_learner(registration jsonb)
returns table(reference_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_reference text;
  channel text := registration->>'verification_channel';
  selected_course text := btrim(coalesce(registration->>'course_slug', ''));
begin
  if auth.uid() is null
     or not public.verified_public_contact(
       registration->>'email',
       coalesce(registration->>'telephone', ''),
       channel
     )
  then
    raise exception 'Verify your email before registering';
  end if;

  if nullif(btrim(coalesce(registration->>'website', '')), '') is not null then
    raise exception 'Submission rejected';
  end if;

  if selected_course not in (
    'everyday-digital-technology-skills',
    'digital-income-online-work',
    'everyday-cooking-skills',
    'practical-baking-skills'
  ) then
    raise exception 'Select a valid course';
  end if;

  select learner.reference_number
  into new_reference
  from public.public_skill_learner_registrations learner
  where learner.learner_user_id = auth.uid()
    and learner.course_slug = selected_course
  order by learner.created_at desc
  limit 1;

  if new_reference is null then
    new_reference := public.new_skill_exchange_reference('SXL');

    insert into public.public_skill_learner_registrations (
      reference_number,
      learner_user_id,
      full_name,
      email,
      telephone,
      location,
      course_slug,
      verification_channel,
      status,
      reviewed_by,
      reviewer_office,
      reviewed_at,
      updated_at
    )
    values (
      new_reference,
      auth.uid(),
      btrim(registration->>'full_name'),
      lower(btrim(registration->>'email')),
      null,
      btrim(registration->>'location'),
      selected_course,
      'email',
      'approved',
      null,
      'automatic_registration',
      now(),
      now()
    );
  end if;

  return query select new_reference;
end
$$;

create or replace function public.public_skill_learner_status(reference text)
returns table(
  reference_number text,
  title text,
  status text,
  information_request text,
  decision_reason text,
  updated_at timestamptz,
  instructions text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    learner.reference_number,
    initcap(replace(learner.course_slug, '-', ' ')),
    'approved'::text,
    null::text,
    null::text,
    learner.updated_at,
    'Registration complete. You can start the course now.'::text
  from public.public_skill_learner_registrations learner
  where learner.learner_user_id = auth.uid()
    and upper(learner.reference_number) = upper(btrim(reference))
$$;

create or replace function public.unread_learner_request_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.can_review_learning_requests(auth.uid()) then (
      select count(*)
      from public.skill_exchange_notifications notification
      where notification.recipient_id = auth.uid()
        and notification.learner_registration_id is not null
        and notification.read_at is null
    )
    else 0
  end
$$;

revoke all on function public.is_active_learning_member(uuid) from public;
revoke all on function public.can_access_learning_course(uuid,text) from public;
revoke all on function public.register_public_skill_learner(jsonb) from public;

grant execute on function public.is_active_learning_member(uuid) to authenticated;
grant execute on function public.can_access_learning_course(uuid,text) to authenticated;
grant execute on function public.register_public_skill_learner(jsonb) to authenticated;

comment on function public.can_access_learning_course(uuid,text) is
  'Allows an active Association member or an approved public learner registered for the selected course.';
comment on function public.register_public_skill_learner(jsonb) is
  'Registers a verified public learner immediately without an approval step. Repeated registration for the same course is idempotent.';


create or replace function public.chairman_certificate_queue()
returns table(
  id uuid,
  member_name text,
  course_title text,
  completed_lessons integer,
  quiz_score integer,
  final_assessment_score integer,
  practical_assignment text,
  tutor_name text,
  attendance_verified boolean,
  completion_date timestamptz,
  status text,
  rejection_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $
begin
  if not (
    public.is_executive(auth.uid())
    or public.active_executive_office(auth.uid()) = 'admin'
  ) then
    raise exception 'Executive access required';
  end if;

  return query
  select
    certificate.id,
    coalesce(
      member_profile.full_name,
      public_learner.full_name,
      'Registered learner'
    ),
    case certificate.course_slug
      when 'digital-income-online-work' then 'Digital Income & Online Work'
      when 'everyday-digital-technology-skills' then 'Everyday Digital & Technology Skills'
      when 'everyday-cooking-skills' then 'Everyday Cooking Skills'
      when 'practical-baking-skills' then 'Practical Baking Skills'
      else certificate.course_slug
    end,
    certificate.completed_lessons,
    certificate.quiz_score,
    certificate.final_assessment_score,
    certificate.practical_assignment,
    tutor_profile.full_name,
    certificate.attendance_verified,
    certificate.completion_date,
    certificate.status,
    certificate.rejection_reason
  from public.learning_certificates certificate
  left join public.profiles member_profile
    on member_profile.id = certificate.member_id
  left join lateral (
    select learner.full_name
    from public.public_skill_learner_registrations learner
    where learner.learner_user_id = certificate.member_id
      and learner.course_slug = certificate.course_slug
    order by learner.created_at desc
    limit 1
  ) public_learner on true
  left join public.profiles tutor_profile
    on tutor_profile.id = certificate.tutor_verified_by
  order by certificate.completion_date desc nulls last;
end
$;

commit;

select
  to_regprocedure('public.register_public_skill_learner(jsonb)') as registration_function,
  to_regprocedure('public.can_access_learning_course(uuid,text)') as course_access_function,
  count(*) filter (where status = 'pending') as pending_learners,
  count(*) filter (where status = 'approved') as active_learners
from public.public_skill_learner_registrations;
