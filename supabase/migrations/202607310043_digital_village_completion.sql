-- Sprint 12C: complete the Digital Village with notifications and accountable moderation.
alter table public.village_reports
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column reviewed_at timestamptz,
  add column resolution_note text check (resolution_note is null or char_length(trim(resolution_note)) between 1 and 500);

create table public.village_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.village_posts(id) on delete cascade,
  kind text not null check (kind in ('reaction', 'comment', 'moderation')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (actor_id is null or actor_id <> recipient_id)
);

create index village_notifications_recipient_idx
  on public.village_notifications(recipient_id, created_at desc);

alter table public.village_notifications enable row level security;
create policy "Members read their village notifications" on public.village_notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy "Members update their village notifications" on public.village_notifications
  for update to authenticated using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create or replace function public.notify_village_post_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.village_posts where id = new.post_id;
  if owner_id is not null and owner_id <> auth.uid() then
    insert into public.village_notifications(recipient_id, actor_id, post_id, kind)
    values (owner_id, auth.uid(), new.post_id,
      case when tg_table_name = 'village_comments' then 'comment' else 'reaction' end);
  end if;
  return new;
end;
$$;

create trigger village_comment_notification after insert on public.village_comments
  for each row execute function public.notify_village_post_owner();
create trigger village_reaction_notification after insert on public.village_reactions
  for each row execute function public.notify_village_post_owner();

create or replace function public.mark_village_notifications_read()
returns void language sql security definer set search_path = public as $$
  update public.village_notifications set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
$$;

create or replace function public.resolve_village_report(target_report_id uuid, target_status text, note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target_status not in ('reviewed', 'resolved') or not exists (
    select 1 from public.profiles where id = auth.uid() and is_active
      and role in ('chairman', 'secretary_general', 'ipro', 'admin')
  ) then raise exception 'Not authorised to resolve village reports'; end if;
  update public.village_reports set status = target_status, resolution_note = nullif(trim(note), ''),
    reviewed_by = auth.uid(), reviewed_at = now() where id = target_report_id;
end;
$$;

comment on table public.village_notifications is 'Private activity updates connecting members across the Digital Village.';
