-- Run after 202608070001_repair_executive_invitation_access.sql in SQL Editor.
-- auth.uid() is null in SQL Editor, so permissions are evaluated explicitly.
select
  concat_ws(' ', m.first_name, m.last_name) as executive_member,
  m.auth_user_id,
  au.email as auth_email,
  public.normalize_executive_office(er.office) as active_office,
  public.can_manage_invitations(m.auth_user_id) as can_manage_invitations,
  case
    when m.auth_user_id is null then 'UNLINKED - controlled invitation required'
    when au.id is null then 'BROKEN LINK - investigate'
    else 'LINKED'
  end as account_linkage_status
from public."Members" m
join public.executive_roles er on er.member_id = m.id
left join auth.users au on au.id = m.auth_user_id
where lower(coalesce(to_jsonb(er)->>'is_active', 'true')) in ('true','t','1')
  and lower(coalesce(to_jsonb(er)->>'status', 'active')) = 'active'
  and (to_jsonb(er)->>'ends_at' is null or (to_jsonb(er)->>'ends_at')::timestamptz > now())
order by active_office, executive_member;

-- Ambiguous emails are deliberately not linked and must be investigated.
select lower(btrim(m.email)) as email, count(distinct m.id) as member_rows,
       count(distinct au.id) as auth_rows
from public."Members" m
join public.executive_roles er on er.member_id = m.id
left join auth.users au on lower(btrim(au.email)) = lower(btrim(m.email))
where m.auth_user_id is null
group by lower(btrim(m.email))
having count(distinct m.id) <> 1 or count(distinct au.id) <> 1;
