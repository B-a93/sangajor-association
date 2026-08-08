-- Approved educators may publish a concise teaching profile to authenticated members.
create table public.member_teacher_network (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.profiles(id) on delete cascade,
  subjects text not null check (char_length(trim(subjects)) between 2 and 300),
  learner_levels text not null check (char_length(trim(learner_levels)) between 2 and 300),
  languages text not null check (char_length(trim(languages)) between 2 and 300),
  availability text not null check (char_length(trim(availability)) between 2 and 300),
  teaching_format text not null check (char_length(trim(teaching_format)) between 2 and 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  check (status <> 'approved' or approved_at is not null)
);
alter table public.member_teacher_network enable row level security;
create policy "Members can submit their teacher profile" on public.member_teacher_network for insert to authenticated
with check (auth.uid() = member_id and status = 'pending' and approved_at is null);
create policy "Members can view their own teacher profile" on public.member_teacher_network for select to authenticated using (auth.uid() = member_id);
create policy "Members can view approved teacher profiles" on public.member_teacher_network for select to authenticated using (status = 'approved');
comment on table public.member_teacher_network is
  'Moderated member teacher profiles. Learner descriptions must use respectful levels or learning goals and must not label people by interrupted schooling history.';
create policy "Executives can review teacher profiles"
on public.member_teacher_network for select to authenticated
using (public.is_executive(auth.uid()));
create policy "Executives can moderate teacher profiles"
on public.member_teacher_network for update to authenticated
using (public.is_executive(auth.uid()))
with check (public.is_executive(auth.uid()));
