-- Skill Exchange identity verification is email-only. OAuth identities and email
-- OTP identities use the same confirmed auth.users email; neither creates membership.
alter table public.public_skill_teaching_applications alter column telephone drop not null;
alter table public.public_skill_learner_registrations alter column telephone drop not null;
do $$
declare item record;
begin
  for item in
    select conrelid::regclass as relation_name, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.public_skill_teaching_applications'::regclass, 'public.public_skill_learner_registrations'::regclass)
      and pg_get_constraintdef(oid) like '%verification_channel%'
  loop
    execute format('alter table %s drop constraint %I', item.relation_name, item.conname);
  end loop;
end $$;
alter table public.public_skill_teaching_applications add constraint public_skill_teaching_applications_email_channel_check check (verification_channel = 'email');
alter table public.public_skill_learner_registrations add constraint public_skill_learner_registrations_email_channel_check check (verification_channel = 'email');

create or replace function public.verified_public_contact(email_value text, telephone_value text, channel text)
returns boolean language sql stable security definer set search_path=public,auth
as $$
  select channel = 'email' and exists(
    select 1 from auth.users u
    where u.id = auth.uid()
      and lower(btrim(coalesce(u.email,''))) = lower(btrim(email_value))
      and u.email_confirmed_at is not null
  )
$$;

create or replace function public.submit_public_skill_application(application jsonb)
returns table(reference_number text, status text)
language plpgsql security definer set search_path=public
as $$
declare new_reference text;
begin
  if auth.uid() is null or not public.verified_public_contact(application->>'email', null, 'email') then raise exception 'Verify your email address before submitting'; end if;
  if nullif(btrim(coalesce(application->>'website','')), '') is not null then raise exception 'Submission rejected'; end if;
  if (select count(*) from public.public_skill_teaching_applications where applicant_user_id=auth.uid() and created_at > now()-interval '24 hours') >= 3 then raise exception 'Submission limit reached. Please try again later'; end if;
  new_reference := public.new_skill_exchange_reference('SXT');
  insert into public.public_skill_teaching_applications(reference_number,applicant_user_id,full_name,email,telephone,location,title,description,experience,intended_audience,preferred_format,availability,required_resources,supporting_link,voluntary_unpaid_consent,verification_channel)
  values(new_reference,auth.uid(),btrim(application->>'full_name'),lower(btrim(application->>'email')),null,btrim(application->>'location'),btrim(application->>'title'),btrim(application->>'description'),btrim(application->>'experience'),btrim(application->>'intended_audience'),application->>'preferred_format',btrim(application->>'availability'),btrim(application->>'required_resources'),nullif(btrim(application->>'supporting_link'),''),(application->>'voluntary_unpaid_consent')::boolean,'email');
  return query select new_reference, 'pending'::text;
end $$;

create or replace function public.register_public_skill_learner(registration jsonb)
returns table(reference_number text)
language plpgsql security definer set search_path=public
as $$
declare new_reference text;
begin
  if auth.uid() is null or not public.verified_public_contact(registration->>'email', null, 'email') then raise exception 'Verify your email before registering'; end if;
  if nullif(btrim(coalesce(registration->>'website','')), '') is not null then raise exception 'Submission rejected'; end if;
  if (select count(*) from public.public_skill_learner_registrations where learner_user_id=auth.uid() and created_at > now()-interval '24 hours') >= 5 then raise exception 'Registration limit reached. Please try again later'; end if;
  new_reference := public.new_skill_exchange_reference('SXL');
  insert into public.public_skill_learner_registrations(reference_number,learner_user_id,full_name,email,telephone,location,course_slug,verification_channel)
  values(new_reference,auth.uid(),btrim(registration->>'full_name'),lower(btrim(registration->>'email')),null,btrim(registration->>'location'),btrim(registration->>'course_slug'),'email');
  return query select new_reference;
end $$;
