-- Restore the table privileges required by the Skills Exchange Programme.
-- Row Level Security remains authoritative: active sessions may only see
-- approved listings or their own submission, while executives may moderate.
begin;

alter table public.member_teacher_network enable row level security;

grant select, insert, update
on table public.member_teacher_network
to authenticated;

revoke all
on table public.member_teacher_network
from anon;

drop policy if exists "Members can submit their teacher profile"
on public.member_teacher_network;

create policy "Members can submit their teacher profile"
on public.member_teacher_network
for insert
to authenticated
with check (
  auth.uid() = member_id
  and status = 'pending'
  and approved_at is null
);

drop policy if exists "Members can view their own teacher profile"
on public.member_teacher_network;

create policy "Members can view their own teacher profile"
on public.member_teacher_network
for select
to authenticated
using (auth.uid() = member_id);

drop policy if exists "Members can view approved teacher profiles"
on public.member_teacher_network;

create policy "Members can view approved teacher profiles"
on public.member_teacher_network
for select
to authenticated
using (status = 'approved');

drop policy if exists "Executives can review teacher profiles"
on public.member_teacher_network;

create policy "Executives can review teacher profiles"
on public.member_teacher_network
for select
to authenticated
using (public.is_executive(auth.uid()));

drop policy if exists "Executives can moderate teacher profiles"
on public.member_teacher_network;

create policy "Executives can moderate teacher profiles"
on public.member_teacher_network
for update
to authenticated
using (public.is_executive(auth.uid()))
with check (public.is_executive(auth.uid()));

commit;
