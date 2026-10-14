-- Authentication is invitation-only, so a valid signed-in session is the
-- internal-member boundary. Public/anonymous visitors remain unable to read
-- any directory record, while legacy account-link inconsistencies no longer
-- lock invited members out of the directory.

alter table public."Members" enable row level security;

drop policy if exists "Active members can view the member directory"
  on public."Members";

create policy "Active members can view the member directory"
on public."Members"
for select to authenticated
using (trim(lower(coalesce(status, ''))) = 'active');

revoke select on public."Members" from anon;
grant select on public."Members" to authenticated;

comment on policy "Active members can view the member directory"
on public."Members" is
  'Invitation-only authenticated accounts may read active directory entries; anonymous visitors remain blocked.';
