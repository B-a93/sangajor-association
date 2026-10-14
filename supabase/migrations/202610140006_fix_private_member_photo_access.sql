-- Align private member-photo access with the invitation-only directory boundary.

begin;

update storage.buckets
set public = false
where id = 'member-profile-photos';

drop policy if exists "Public profile photographs are readable" on storage.objects;
drop policy if exists "Active members read profile photographs" on storage.objects;
drop policy if exists "Authenticated members read profile photographs" on storage.objects;

create policy "Authenticated members read profile photographs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-profile-photos'
  and auth.uid() is not null
);

commit;
