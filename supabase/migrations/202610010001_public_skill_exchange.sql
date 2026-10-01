-- Open the Skill Exchange to verified members of the public while preserving the
-- member Teacher Network and its existing moderation workflow.
create table if not exists public.public_skill_teaching_applications (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (char_length(btrim(email)) between 5 and 254),
  telephone text not null check (char_length(btrim(telephone)) between 7 and 40),
  location text not null check (char_length(btrim(location)) between 2 and 160),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  description text not null check (char_length(btrim(description)) between 20 and 3000),
  experience text not null check (char_length(btrim(experience)) between 2 and 2000),
  intended_audience text not null check (char_length(btrim(intended_audience)) between 2 and 500),
  preferred_format text not null check (preferred_format in ('online','in_person','hybrid')),
  availability text not null check (char_length(btrim(availability)) between 2 and 500),
  required_resources text not null check (char_length(btrim(required_resources)) between 2 and 1500),
  supporting_link text check (supporting_link is null or supporting_link ~* '^https://'),
  voluntary_unpaid_consent boolean not null check (voluntary_unpaid_consent),
  verification_channel text not null check (verification_channel in ('email','telephone')),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  information_request text,
  information_requested_at timestamptz,
  decision_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'pending' or (reviewed_at is not null and nullif(btrim(decision_reason), '') is not null))
);

create table if not exists public.public_skill_learner_registrations (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null,
  telephone text not null,
  location text not null,
  course_slug text not null,
  verification_channel text not null check (verification_channel in ('email','telephone')),
  created_at timestamptz not null default now()
);

create table if not exists public.skill_exchange_notifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.public_skill_teaching_applications(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('new_application','information_requested','approved','declined')),
  message text not null,
  href text not null default '#/dashboard/teaching-requests',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(application_id, recipient_id, kind)
);

create table if not exists public.public_skill_verification_attempts (
  id bigint generated always as identity primary key,
  client_key text not null,
  destination_hint text not null,
  created_at timestamptz not null default now()
);

create index if not exists public_skill_applications_status_created_idx on public.public_skill_teaching_applications(status, created_at desc);
create index if not exists public_skill_applications_user_idx on public.public_skill_teaching_applications(applicant_user_id, created_at desc);
create index if not exists public_skill_learners_user_idx on public.public_skill_learner_registrations(learner_user_id, created_at desc);
create index if not exists skill_exchange_notifications_recipient_idx on public.skill_exchange_notifications(recipient_id, read_at, created_at desc);

alter table public.public_skill_teaching_applications enable row level security;
alter table public.public_skill_learner_registrations enable row level security;
alter table public.skill_exchange_notifications enable row level security;
alter table public.public_skill_verification_attempts enable row level security;

create or replace function public.can_review_skill_exchange(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_active_chairman(user_id) or
    replace(coalesce(public.active_executive_office(user_id), ''), '-', '_') in ('programme_officer','assistant_programme_officer')
$$;

drop policy if exists "Reviewers read skill exchange notifications" on public.skill_exchange_notifications;
create policy "Reviewers read skill exchange notifications" on public.skill_exchange_notifications for select to authenticated
using (recipient_id = auth.uid() and public.can_review_skill_exchange(auth.uid()));

create or replace function public.new_skill_exchange_reference(prefix text)
returns text language sql volatile security definer set search_path=public
as $$ select upper(prefix || '-' || to_char(current_date, 'YYYY') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)) $$;

create or replace function public.verified_public_contact(email_value text, telephone_value text, channel text)
returns boolean language sql stable security definer set search_path=public,auth
as $$
  select exists(select 1 from auth.users u where u.id=auth.uid() and case channel
    when 'email' then lower(btrim(coalesce(u.email,'')))=lower(btrim(email_value)) and u.email_confirmed_at is not null
    when 'telephone' then btrim(coalesce(u.phone,''))=btrim(telephone_value) and u.phone_confirmed_at is not null
    else false end)
$$;

create or replace function public.submit_public_skill_application(application jsonb)
returns table(reference_number text, status text)
language plpgsql security definer set search_path=public
as $$
declare new_reference text; channel text := application->>'verification_channel';
begin
  if auth.uid() is null or not public.verified_public_contact(application->>'email', application->>'telephone', channel) then
    raise exception 'Verify the selected email address or telephone number before submitting';
  end if;
  if nullif(btrim(coalesce(application->>'website','')), '') is not null then raise exception 'Submission rejected'; end if;
  if (select count(*) from public.public_skill_teaching_applications where applicant_user_id=auth.uid() and created_at > now()-interval '24 hours') >= 3 then
    raise exception 'Submission limit reached. Please try again later';
  end if;
  new_reference := public.new_skill_exchange_reference('SXT');
  insert into public.public_skill_teaching_applications(reference_number,applicant_user_id,full_name,email,telephone,location,title,description,experience,intended_audience,preferred_format,availability,required_resources,supporting_link,voluntary_unpaid_consent,verification_channel)
  values(new_reference,auth.uid(),btrim(application->>'full_name'),lower(btrim(application->>'email')),btrim(application->>'telephone'),btrim(application->>'location'),btrim(application->>'title'),btrim(application->>'description'),btrim(application->>'experience'),btrim(application->>'intended_audience'),application->>'preferred_format',btrim(application->>'availability'),btrim(application->>'required_resources'),nullif(btrim(application->>'supporting_link'),''),(application->>'voluntary_unpaid_consent')::boolean,channel);
  return query select new_reference, 'pending'::text;
end $$;

create or replace function public.register_public_skill_learner(registration jsonb)
returns table(reference_number text)
language plpgsql security definer set search_path=public
as $$
declare new_reference text; channel text := registration->>'verification_channel';
begin
  if auth.uid() is null or not public.verified_public_contact(registration->>'email', registration->>'telephone', channel) then raise exception 'Verify your contact before registering'; end if;
  if nullif(btrim(coalesce(registration->>'website','')), '') is not null then raise exception 'Submission rejected'; end if;
  if (select count(*) from public.public_skill_learner_registrations where learner_user_id=auth.uid() and created_at > now()-interval '24 hours') >= 5 then raise exception 'Registration limit reached. Please try again later'; end if;
  new_reference := public.new_skill_exchange_reference('SXL');
  insert into public.public_skill_learner_registrations(reference_number,learner_user_id,full_name,email,telephone,location,course_slug,verification_channel)
  values(new_reference,auth.uid(),btrim(registration->>'full_name'),lower(btrim(registration->>'email')),btrim(registration->>'telephone'),btrim(registration->>'location'),btrim(registration->>'course_slug'),channel);
  return query select new_reference;
end $$;

create or replace function public.notify_reviewers_of_public_skill_application()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.skill_exchange_notifications(application_id,recipient_id,kind,message)
  select new.id,m.auth_user_id,'new_application','Public teaching proposal '||new.reference_number||': '||new.title
  from public."Members" m where m.auth_user_id is not null and lower(coalesce(m.status,''))='active'
    and public.can_review_skill_exchange(m.auth_user_id)
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists notify_reviewers_public_skill_application on public.public_skill_teaching_applications;
create trigger notify_reviewers_public_skill_application after insert on public.public_skill_teaching_applications
for each row execute function public.notify_reviewers_of_public_skill_application();

create or replace function public.public_skill_application_status(reference text)
returns table(reference_number text,title text,status text,information_request text,decision_reason text,updated_at timestamptz,instructions text)
language sql stable security definer set search_path=public as $$
 select a.reference_number,a.title,a.status,a.information_request,a.decision_reason,a.updated_at,
   case when a.status='approved' then 'Before scheduling, complete SANGAJOR safeguarding and conduct orientation, agree dates with the programme team, and submit your course or workshop preparation plan.' end
 from public.public_skill_teaching_applications a where a.applicant_user_id=auth.uid() and upper(a.reference_number)=upper(btrim(reference))
$$;

create or replace function public.skill_exchange_teaching_request_queue()
returns table(id uuid,source text,reference_number text,applicant_name text,email text,telephone text,location text,title text,description text,experience text,intended_audience text,teaching_format text,availability text,resources text,supporting_link text,status text,submitted_at timestamptz,reviewed_at timestamptz,decision_reason text,information_request text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.can_review_skill_exchange(auth.uid()) then raise exception 'Only the active Chairman or an authorised programme officer may review teaching requests'; end if;
 return query
 select r.id,'member'::text,null::text,coalesce(p.full_name,'Association member'),null::text,null::text,null::text,r.skill,null::text,r.experience,null::text,r.format,r.availability,r.resources,null::text,r.status,r.created_at,r.reviewed_at,r.decline_reason,null::text
 from public.skill_teaching_submissions r left join public.profiles p on p.id=r.member_id
 union all
 select a.id,'public',a.reference_number,a.full_name,a.email,a.telephone,a.location,a.title,a.description,a.experience,a.intended_audience,replace(a.preferred_format,'_',' '),a.availability,a.required_resources,a.supporting_link,a.status,a.created_at,a.reviewed_at,a.decision_reason,a.information_request
 from public.public_skill_teaching_applications a
 order by case status when 'pending' then 0 else 1 end, submitted_at desc;
end $$;

create or replace function public.review_skill_exchange_application(request_id uuid,request_source text,action text,reason text)
returns void language plpgsql security definer set search_path=public as $$
declare applicant uuid; changed integer;
begin
 if not public.can_review_skill_exchange(auth.uid()) then raise exception 'Reviewer access required'; end if;
 if action not in ('request_information','approved','declined') then raise exception 'Invalid review action'; end if;
 if nullif(btrim(coalesce(reason,'')),'') is null then raise exception 'A reason or message is required'; end if;
 if request_source='member' then
   if action='request_information' then raise exception 'Further-information requests are available for public applications'; end if;
   update public.skill_teaching_submissions set status=action,reviewed_at=now(),reviewed_by=auth.uid(),decline_reason=btrim(reason) where id=request_id and status='pending';
   get diagnostics changed = row_count;
 else
   update public.public_skill_teaching_applications set status=case when action='request_information' then 'pending' else action end,
     information_request=case when action='request_information' then btrim(reason) else information_request end,
     information_requested_at=case when action='request_information' then now() else information_requested_at end,
     decision_reason=case when action in ('approved','declined') then btrim(reason) else decision_reason end,
     reviewed_by=auth.uid(),reviewed_at=case when action in ('approved','declined') then now() else reviewed_at end,updated_at=now()
   where id=request_id and status='pending' returning applicant_user_id into applicant;
   get diagnostics changed = row_count;
   if applicant is not null then insert into public.skill_exchange_notifications(application_id,recipient_id,kind,message,href)
     values(request_id,applicant,case when action='request_information' then 'information_requested' else action end,case action when 'approved' then 'Your volunteer teaching application was approved. Open status for next steps.' when 'declined' then 'Your volunteer teaching application was declined. Open status for the reason.' else 'The programme team requested further information.' end,'#/skill-exchange') on conflict do nothing; end if;
 end if;
 if coalesce(changed,0)=0 then raise exception 'Teaching request is not pending'; end if;
end $$;

create or replace function public.unread_teaching_request_count()
returns bigint language sql stable security definer set search_path=public as $$
 select case when public.can_review_skill_exchange(auth.uid()) then
   (select count(*) from public.skill_teaching_submissions where status='pending') + (select count(*) from public.public_skill_teaching_applications where status='pending') else 0 end
$$;

revoke all on table public.public_skill_teaching_applications,public.public_skill_learner_registrations,public.skill_exchange_notifications,public.public_skill_verification_attempts from anon,authenticated;
revoke all on function public.new_skill_exchange_reference(text),public.verified_public_contact(text,text,text),public.notify_reviewers_of_public_skill_application() from public;
revoke all on function public.submit_public_skill_application(jsonb),public.register_public_skill_learner(jsonb),public.public_skill_application_status(text),public.skill_exchange_teaching_request_queue(),public.review_skill_exchange_application(uuid,text,text,text),public.can_review_skill_exchange(uuid),public.unread_teaching_request_count() from public;
grant execute on function public.submit_public_skill_application(jsonb),public.register_public_skill_learner(jsonb),public.public_skill_application_status(text),public.can_review_skill_exchange(uuid) to authenticated;
grant execute on function public.skill_exchange_teaching_request_queue(),public.review_skill_exchange_application(uuid,text,text,text),public.unread_teaching_request_count() to authenticated;

comment on table public.public_skill_teaching_applications is 'Verified public volunteer proposals, kept separate from member Teacher Network profiles and never auto-published.';
