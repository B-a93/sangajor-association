-- Production-only compatibility bridge for the member assistant.
-- public."Members" remains the sole member identity source. This migration never
-- creates, reads, or writes a parallel member table and never replaces production tables.

-- Link an Auth identity only when both sides of a normalized email match are
-- unique. Existing links are retained and conflicting identities are skipped.
with unique_auth_email as (
  select lower(btrim(email)) as email, min(id::text)::uuid as auth_user_id
  from auth.users
  where nullif(btrim(email), '') is not null
  group by lower(btrim(email))
  having count(*) = 1
), unique_member_email as (
  select lower(btrim(email)) as email
  from public."Members"
  where nullif(btrim(email), '') is not null
  group by lower(btrim(email))
  having count(*) = 1
)
update public."Members" as m
set auth_user_id = a.auth_user_id
from unique_auth_email as a
join unique_member_email as me using (email)
where m.auth_user_id is null
  and lower(btrim(m.email)) = a.email
  and not exists (
    select 1 from public."Members" as linked
    where linked.auth_user_id = a.auth_user_id
  );

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_automation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  event_reminders boolean not null default true,
  dues_reminders boolean not null default true,
  announcement_digest boolean not null default false,
  volunteer_matches boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Repair only legacy assistant foreign keys that point somewhere other than Auth.
-- NOT VALID avoids a table scan/lock for a partially deployed table; new writes
-- are still checked and the constraint is validated when all retained rows fit.
do $assistant_foreign_keys$
declare
  target record;
  fk record;
begin
  for target in
    select * from (values
      ('assistant_conversations', 'member_id', 'assistant_conversations_member_id_fkey'),
      ('assistant_messages', 'member_id', 'assistant_messages_member_id_fkey'),
      ('assistant_automation_preferences', 'user_id', 'assistant_automation_preferences_user_id_fkey')
    ) as wanted(table_name, column_name, constraint_name)
  loop
    for fk in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = target.table_name
        and c.contype = 'f'
        and c.conkey = array[(select attnum from pg_attribute
          where attrelid = t.oid and attname = target.column_name)]::smallint[]
        and c.confrelid <> 'auth.users'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', target.table_name, fk.conname);
    end loop;

    if not exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = target.table_name
        and c.contype = 'f' and c.confrelid = 'auth.users'::regclass
        and c.conkey = array[(select attnum from pg_attribute
          where attrelid = t.oid and attname = target.column_name)]::smallint[]
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references auth.users(id) on delete cascade not valid',
        target.table_name, target.constraint_name, target.column_name
      );
    end if;
  end loop;
end $assistant_foreign_keys$;

create index if not exists assistant_conversations_member_idx
  on public.assistant_conversations(member_id, updated_at desc);
create index if not exists assistant_messages_conversation_idx
  on public.assistant_messages(conversation_id, created_at);

create or replace function public.assistant_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assistant_conversations_updated on public.assistant_conversations;
create trigger assistant_conversations_updated before update on public.assistant_conversations
for each row execute function public.assistant_set_updated_at();
drop trigger if exists assistant_preferences_updated on public.assistant_automation_preferences;
create trigger assistant_preferences_updated before update on public.assistant_automation_preferences
for each row execute function public.assistant_set_updated_at();

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_automation_preferences enable row level security;

drop policy if exists "Members own assistant conversations" on public.assistant_conversations;
create policy "Members own assistant conversations" on public.assistant_conversations
for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists "Members own assistant messages" on public.assistant_messages;
create policy "Members own assistant messages" on public.assistant_messages
for all to authenticated
using (member_id = auth.uid() and exists (
  select 1 from public.assistant_conversations c
  where c.id = conversation_id and c.member_id = auth.uid()
))
with check (member_id = auth.uid() and exists (
  select 1 from public.assistant_conversations c
  where c.id = conversation_id and c.member_id = auth.uid()
));

drop policy if exists "Members own automation preferences" on public.assistant_automation_preferences;
create policy "Members own automation preferences" on public.assistant_automation_preferences
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.assistant_conversations, public.assistant_messages,
  public.assistant_automation_preferences from anon;
grant select, insert, update, delete on public.assistant_conversations,
  public.assistant_messages, public.assistant_automation_preferences to authenticated;

-- Dynamic fixed-name lookups let this bridge run whether optional feature
-- migrations were deployed or production retained its original table names.
-- Every lookup returns a bounded JSON array and does not alter a domain table.
create or replace function public.assistant_context_rows(
  candidate_tables text[], context_kind text, auth_id uuid, member_record_id uuid,
  row_limit integer default 5
)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  candidate text;
  relation regclass;
  result jsonb;
  predicate text;
begin
  foreach candidate in array candidate_tables loop
    relation := to_regclass(format('public.%I', candidate));
    if relation is not null then
      -- Work against to_jsonb so this migration does not assume the deployed
      -- domain tables' column layout. Dues/contributions remain member-scoped;
      -- community content must be published/open when it has such a field.
      predicate := case context_kind
        when 'member' then format(
          'coalesce(to_jsonb(source)->>''auth_user_id'', to_jsonb(source)->>''user_id'') = %L or to_jsonb(source)->>''member_id'' in (%L, %L)',
          auth_id::text, auth_id::text, member_record_id::text
        )
        when 'published' then
          'coalesce(lower(to_jsonb(source)->>''status''), ''published'') in (''published'', ''open'')'
        else 'false'
      end;
      execute format(
        'select coalesce(jsonb_agg(to_jsonb(filtered)), ''[]''::jsonb) from (select * from %s source where %s limit %s) filtered',
        relation, predicate, least(greatest(row_limit, 0), 10)
      ) into result;
      return result;
    end if;
  end loop;
  return '[]'::jsonb;
end;
$$;

create or replace function public.member_assistant_context()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  member_record_id uuid;
begin
  select m.id into member_record_id
  from public."Members" m
  where m.auth_user_id = auth.uid()
    and lower(coalesce(m.status, '')) = 'active'
  limit 1;

  if member_record_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'upcomingEvents', public.assistant_context_rows(array['association_events', 'events'], 'published', auth.uid(), member_record_id, 5),
    'outstandingDues', public.assistant_context_rows(array['dues_periods', 'contributions'], 'member', auth.uid(), member_record_id, 5),
    'announcements', public.assistant_context_rows(array['announcements'], 'published', auth.uid(), member_record_id, 5),
    'volunteering', public.assistant_context_rows(array['volunteer_opportunities'], 'published', auth.uid(), member_record_id, 5)
  );
end;
$$;

revoke all on function public.assistant_context_rows(text[], text, uuid, uuid, integer) from public;
revoke all on function public.member_assistant_context() from public;
grant execute on function public.member_assistant_context() to authenticated;
comment on function public.member_assistant_context() is
  'Assistant context is available only to an active Members row linked by auth_user_id to auth.uid().';

-- Verification (read-only): run after the migration in the same SQL Editor tab.
-- 1. Banna's member/Auth link (auth_user_id and auth_email should both be non-null).
select m.id, m.membership_number, m.first_name, m.last_name, m.email,
       m.auth_user_id, u.email as auth_email, m.status
from public."Members" m
left join auth.users u on u.id = m.auth_user_id
where lower(btrim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, ''))) = 'banna bojang';

-- 2. Banna's deployed executive authorization rows without assuming role columns.
select m.id as member_id, m.auth_user_id, to_jsonb(er) as executive_authorization
from public."Members" m
left join public.executive_roles er
  on to_jsonb(er)->>'member_id' = m.id::text
  or to_jsonb(er)->>'auth_user_id' = m.auth_user_id::text
where lower(btrim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, ''))) = 'banna bojang';

-- 3. In SQL Editor auth.uid() is normally null. Set the JWT user before calling:
-- select set_config('request.jwt.claim.sub', '<BANNAS_AUTH_USER_ID>', true);
select auth.uid() as authenticated_user_id,
       exists (select 1 from public."Members" m where m.auth_user_id = auth.uid()) as has_member_link,
       public.member_assistant_context() as assistant_context;
