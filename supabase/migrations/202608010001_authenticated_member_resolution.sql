-- Unify authenticated feature resolution on the production Members table.
-- Link only unambiguous, case-insensitive email matches; no identity is guessed.
with unique_auth_email as (
  select lower(email) email, min(id::text)::uuid auth_user_id
  from auth.users where email is not null
  group by lower(email) having count(*) = 1
), unique_member_email as (
  select lower(email) email
  from public."Members" where email is not null
  group by lower(email) having count(*) = 1
)
update public."Members" m
set auth_user_id = a.auth_user_id
from unique_auth_email a join unique_member_email me using (email)
where m.auth_user_id is null and lower(m.email) = a.email
  and not exists (select 1 from public."Members" linked where linked.auth_user_id = a.auth_user_id);

-- Assistant records are owned by the Auth identity. Requiring a legacy profiles
-- row made valid, linked Members fail before their context could be loaded.
alter table public.assistant_messages drop constraint if exists assistant_messages_member_id_fkey;
alter table public.assistant_conversations drop constraint if exists assistant_conversations_member_id_fkey;
alter table public.assistant_automation_preferences drop constraint if exists assistant_automation_preferences_user_id_fkey;
alter table public.assistant_conversations add constraint assistant_conversations_member_id_fkey foreign key (member_id) references auth.users(id) on delete cascade;
alter table public.assistant_messages add constraint assistant_messages_member_id_fkey foreign key (member_id) references auth.users(id) on delete cascade;
alter table public.assistant_automation_preferences add constraint assistant_automation_preferences_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

create or replace function public.member_assistant_context()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'upcomingEvents', coalesce((select jsonb_agg(jsonb_build_object('title',title,'startsAt',starts_at,'venue',venue) order by starts_at) from (select title,starts_at,venue from public.association_events where status='published' and starts_at>=now() order by starts_at limit 5) e),'[]'::jsonb),
    'outstandingDues', coalesce((select jsonb_agg(jsonb_build_object('name',d.name,'amount',d.amount,'currency',d.currency,'dueDate',d.due_date)) from public.dues_periods d where d.is_active and not exists(select 1 from public.dues_payments p where p.period_id=d.id and p.member_id=auth.uid())),'[]'::jsonb),
    'announcements', coalesce((select jsonb_agg(jsonb_build_object('title',title,'publishedAt',published_at) order by published_at desc) from (select title,published_at from public.announcements where status='published' and (expires_at is null or expires_at>now()) order by published_at desc limit 5) a),'[]'::jsonb),
    'volunteering', coalesce((select jsonb_agg(jsonb_build_object('title',title,'startsAt',starts_at,'location',location) order by starts_at) from (select title,starts_at,location from public.volunteer_opportunities where status='open' and starts_at>=now() order by starts_at limit 5) v),'[]'::jsonb)
  ) where exists (
    select 1 from public."Members" m
    where m.auth_user_id=auth.uid() and lower(coalesce(m.status,''))='active'
  );
$$;
revoke all on function public.member_assistant_context() from public;
grant execute on function public.member_assistant_context() to authenticated;
comment on function public.member_assistant_context is 'Minimal context for the active Members row linked to the current Auth identity.';
