-- Member teaching offers are moderated before they are visible to the community.
create table public.skill_teaching_submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null check (char_length(trim(skill)) between 2 and 120),
  experience text not null check (char_length(trim(experience)) between 2 and 1000),
  format text not null check (char_length(trim(format)) between 2 and 120),
  availability text not null check (char_length(trim(availability)) between 2 and 200),
  resources text not null check (char_length(trim(resources)) between 2 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (status = 'pending' or reviewed_at is not null)
);

alter table public.skill_teaching_submissions enable row level security;

create policy "Members can submit teaching offers"
on public.skill_teaching_submissions for insert to authenticated
with check (auth.uid() = member_id and status = 'pending');

create policy "Members can view their teaching offers"
on public.skill_teaching_submissions for select to authenticated
using (auth.uid() = member_id);

comment on table public.skill_teaching_submissions is
  'Member offers to teach a skill; every offer requires approval before publication.';
