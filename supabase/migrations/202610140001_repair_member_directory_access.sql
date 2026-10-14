-- Repair legacy member logins that authenticate correctly but are not linked to
-- their unique Members row. The directory remains unavailable to anonymous,
-- inactive and ambiguous accounts.

with unique_auth_email as (
  select lower(trim(email)) email, min(id::text)::uuid auth_user_id
  from auth.users
  where nullif(trim(email), '') is not null
  group by lower(trim(email))
  having count(*) = 1
), unique_member_email as (
  select lower(trim(email)) email
  from public."Members"
  where nullif(trim(email), '') is not null
  group by lower(trim(email))
  having count(*) = 1
)
update public."Members" m
set auth_user_id = a.auth_user_id,
    updated_at = now()
from unique_auth_email a
join unique_member_email me using (email)
where m.auth_user_id is null
  and lower(trim(m.email)) = a.email
  and not exists (
    select 1 from public."Members" linked
    where linked.auth_user_id = a.auth_user_id
  );

create or replace function public.is_active_member(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public."Members" m
    left join auth.users u on u.id = user_id
    where trim(lower(coalesce(m.status, ''))) = 'active'
      and (
        m.auth_user_id = user_id
        or (
          m.auth_user_id is null
          and nullif(trim(u.email), '') is not null
          and lower(trim(m.email)) = lower(trim(u.email))
          and 1 = (
            select count(*)
            from public."Members" duplicate
            where lower(trim(duplicate.email)) = lower(trim(u.email))
          )
        )
      )
  );
$$;

create or replace function public.current_member_directory_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_active_member(auth.uid()), false);
$$;

revoke all on function public.current_member_directory_access() from public;
grant execute on function public.current_member_directory_access() to authenticated;

drop policy if exists "Active members can view the member directory" on public."Members";
create policy "Active members can view the member directory" on public."Members"
for select to authenticated
using (
  public.current_member_directory_access()
  and trim(lower(coalesce(status, ''))) = 'active'
);

comment on function public.current_member_directory_access() is
  'Returns true only when the current Auth identity resolves unambiguously to an active Members row.';
