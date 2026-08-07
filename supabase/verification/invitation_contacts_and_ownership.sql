-- Run after 202608070002_repair_invitation_contacts_and_ownership.sql.
select conname, pg_get_constraintdef(oid) definition
from pg_constraint
where conrelid = 'public.invitations'::regclass
  and conname in ('invitations_inviter_member_id_fkey', 'invitations_contact_required');

select count(*) as historical_total,
       count(*) filter (where inviter_member_id is not null) as authoritative_owner_mapped,
       count(*) filter (where inviter_member_id is null) as historical_owner_unmapped,
       count(*) filter (where token_hash is null) as missing_token_hash,
       count(*) filter (where email is null and phone is null) as missing_contact
from public.invitations;

select i.id, i.created_at, i.inviter_member_id, m.auth_user_id as inviter_auth_user_id,
       i.accepted_user_id as accepted_auth_user_id, i.status,
       (i.token_hash is not null) as stores_token_digest
from public.invitations i
left join public."Members" m on m.id = i.inviter_member_id
order by i.created_at desc limit 25;

select office, public.can_manage_invitations(m.auth_user_id) as may_manage
from public."Members" m
join public.executive_roles er on er.member_id = m.id
where m.auth_user_id is not null
order by office;

select current_setting('app.settings.enable_signup', true) as optional_signup_setting;
-- Also confirm Dashboard > Authentication > Providers > Email/Phone has public
-- registration disabled. supabase/config.toml remains the source-controlled check.
