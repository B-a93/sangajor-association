-- Sprint 15: private, grounded member assistant and opt-in smart automation.
create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 120),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null check (char_length(content) between 1 and 4000),
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'), created_at timestamptz not null default now()
);
create table public.assistant_automation_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  event_reminders boolean not null default true, dues_reminders boolean not null default true,
  announcement_digest boolean not null default false, volunteer_matches boolean not null default true,
  updated_at timestamptz not null default now()
);
create index assistant_conversations_member_idx on public.assistant_conversations(member_id, updated_at desc);
create index assistant_messages_conversation_idx on public.assistant_messages(conversation_id, created_at);
create trigger assistant_conversations_updated before update on public.assistant_conversations for each row execute function public.set_updated_at();
create trigger assistant_preferences_updated before update on public.assistant_automation_preferences for each row execute function public.set_updated_at();

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_automation_preferences enable row level security;
create policy "Members own assistant conversations" on public.assistant_conversations for all to authenticated using (member_id=auth.uid()) with check (member_id=auth.uid());
create policy "Members own assistant messages" on public.assistant_messages for all to authenticated using (member_id=auth.uid() and exists(select 1 from public.assistant_conversations c where c.id=conversation_id and c.member_id=auth.uid())) with check (member_id=auth.uid() and exists(select 1 from public.assistant_conversations c where c.id=conversation_id and c.member_id=auth.uid()));
create policy "Members own automation preferences" on public.assistant_automation_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Only returns the signed-in member's records plus already-published community content.
create or replace function public.member_assistant_context()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'upcomingEvents', coalesce((select jsonb_agg(jsonb_build_object('title',title,'startsAt',starts_at,'venue',venue) order by starts_at) from (select title,starts_at,venue from public.association_events where status='published' and starts_at>=now() order by starts_at limit 5) e),'[]'::jsonb),
    'outstandingDues', coalesce((select jsonb_agg(jsonb_build_object('name',d.name,'amount',d.amount,'currency',d.currency,'dueDate',d.due_date)) from public.dues_periods d where d.is_active and not exists(select 1 from public.dues_payments p where p.period_id=d.id and p.member_id=auth.uid())),'[]'::jsonb),
    'announcements', coalesce((select jsonb_agg(jsonb_build_object('title',title,'publishedAt',published_at) order by published_at desc) from (select title,published_at from public.announcements where status='published' and (expires_at is null or expires_at>now()) order by published_at desc limit 5) a),'[]'::jsonb),
    'volunteering', coalesce((select jsonb_agg(jsonb_build_object('title',title,'startsAt',starts_at,'location',location) order by starts_at) from (select title,starts_at,location from public.volunteer_opportunities where status='open' and starts_at>=now() order by starts_at limit 5) v),'[]'::jsonb)
  ) where exists(select 1 from public.profiles where id=auth.uid() and is_active);
$$;
revoke all on function public.member_assistant_context() from public;
grant execute on function public.member_assistant_context() to authenticated;
comment on function public.member_assistant_context is 'Minimal, member-scoped and published context used to ground assistant answers.';
