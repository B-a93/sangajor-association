-- Sprint 12B: richer Village Square posts, personal saves and community safety.
alter table public.village_posts
  add column category text not null default 'update'
    check (category in ('update', 'celebration', 'opportunity', 'memory')),
  add column image_url text check (image_url is null or char_length(image_url) <= 2048);

create index village_posts_category_created_at_idx
  on public.village_posts(category, created_at desc);

create table public.village_bookmarks (
  post_id uuid not null references public.village_posts(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create table public.village_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.village_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('privacy', 'harassment', 'misinformation', 'other')),
  details text check (details is null or char_length(trim(details)) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.village_bookmarks enable row level security;
alter table public.village_reports enable row level security;

create policy "Members manage their village bookmarks" on public.village_bookmarks
  for all to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  ));

create policy "Members can report village posts" on public.village_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  ));
create policy "Members can see their village reports" on public.village_reports
  for select to authenticated using (reporter_id = auth.uid());
create policy "Executives can review village reports" on public.village_reports
  for all to authenticated using (exists (
    select 1 from public.profiles where id = auth.uid() and is_active
      and role in ('chairman', 'secretary_general', 'ipro', 'admin')
  )) with check (exists (
    select 1 from public.profiles where id = auth.uid() and is_active
      and role in ('chairman', 'secretary_general', 'ipro', 'admin')
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('village-media', 'village-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Active members can upload village images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'village-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and is_active)
  );
create policy "Active members can read village images" on storage.objects
  for select to authenticated using (
    bucket_id = 'village-media'
    and exists (select 1 from public.profiles where id = auth.uid() and is_active)
  );
create policy "Members can delete their village images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'village-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.village_bookmarks is 'Private member reading lists for Village Square posts.';
comment on table public.village_reports is 'Member-submitted Village Square safety concerns for executive review.';
