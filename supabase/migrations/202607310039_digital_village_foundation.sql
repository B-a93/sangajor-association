-- Sprint 12A: a safe, members-only foundation for the Digital Village community feed.
create table public.village_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index village_posts_created_at_idx on public.village_posts(created_at desc);

create table public.village_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.village_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index village_comments_post_idx on public.village_comments(post_id, created_at);

create table public.village_reactions (
  post_id uuid not null references public.village_posts(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create trigger village_posts_set_updated_at before update on public.village_posts
for each row execute function public.set_updated_at();
alter table public.village_posts enable row level security;
alter table public.village_comments enable row level security;
alter table public.village_reactions enable row level security;

create policy "Active members can read village posts" on public.village_posts for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Active members can publish village posts" on public.village_posts for insert to authenticated
with check (author_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Authors can update village posts" on public.village_posts for update to authenticated
using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors can delete village posts" on public.village_posts for delete to authenticated using (author_id = auth.uid());

create policy "Active members can read village comments" on public.village_comments for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Active members can comment" on public.village_comments for insert to authenticated
with check (author_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Authors can delete village comments" on public.village_comments for delete to authenticated using (author_id = auth.uid());

create policy "Active members can read village reactions" on public.village_reactions for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Members can add their reaction" on public.village_reactions for insert to authenticated
with check (member_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Members can remove their reaction" on public.village_reactions for delete to authenticated using (member_id = auth.uid());

comment on table public.village_posts is 'Member-authored updates in the MySANGAJOR Digital Village.';
comment on table public.village_comments is 'Respectful member discussion attached to Village Square posts.';
