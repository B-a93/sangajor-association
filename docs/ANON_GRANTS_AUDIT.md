# Anonymous Data API grants audit

## Scope and safety decision

This audit reviewed the SQL migrations and every frontend `supabase.from`,
`supabase.rpc`, `supabase.storage`, and `supabase.functions` call. It does **not**
change production privileges. Repository migrations do not prove the complete
effective state of a long-lived Supabase database (including dashboard changes,
default privileges, extension objects, or migrations applied out of order), so a
broad `REVOKE` would be unsafe until the production catalog results below have
been matched to the application-query inventory and every applicable RLS policy.

## Intended anonymous surface

The public site needs no direct anonymous course-table access. Course names and
descriptions are bundled frontend data. After OTP verification the visitor has
an `authenticated` Supabase session, and the Skill Exchange permits only these
four RPCs for that role:

- `submit_public_skill_application(jsonb)`
- `register_public_skill_learner(jsonb)`
- `public_skill_application_status(text)`
- `can_review_skill_exchange(uuid)` (used by authorised UI checks)

The underlying application, registration, notification, and verification tables
are explicitly revoked from both `anon` and `authenticated`. Security-definer
RPCs are the only write/status boundary. Reviewer RPCs are granted only to
`authenticated` and enforce office authorization internally.

Two deliberate public facilities were found elsewhere:

1. `contact_messages` allows a column-limited insert for `anon, authenticated`,
   constrained by its visitor-insert RLS policy. No select/update/delete is
   granted.
2. Objects in the `member-profile-photos` bucket have a public select policy.
   Confirm with the Association that public member portraits are intentional;
   the site currently displays portraits publicly.

No other migration contains an affirmative grant directly to `anon`. Several
migrations revoke dangerous operations from `anon`, but many older table
definitions rely on RLS and Supabase default privileges instead of explicitly
revoking `anon`. That inconsistency is the principal audit finding. RLS can
prevent row access, but least privilege should also remove unused table and
routine privileges after effective production grants and policies are verified.

## Production catalog review (read-only)

Run these queries in production and save the output before proposing a focused
permission migration:

```sql
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
order by table_schema, table_name, privilege_type;

select routine_schema, routine_name, privilege_type
from information_schema.role_routine_grants
where grantee = 'anon'
order by routine_schema, routine_name, privilege_type;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname in ('public', 'storage')
order by schemaname, tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select defaclrole::regrole as owner, defaclnamespace::regnamespace as schema,
       defaclobjtype, defaclacl
from pg_default_acl
order by 1, 2, 3;
```

## Required follow-up before permission changes

1. Export the effective results above from the deployed project, not only the
   local migrations.
2. For every anonymous privilege, identify the exact frontend or Edge Function
   query that requires it and the matching restrictive RLS policy.
3. Exercise that query with a real anonymous JWT and verify allowed columns,
   rows, and operations; also test denial of adjacent operations.
4. Revoke each unused grant individually. Preserve the column-limited contact
   insert and explicitly approved public storage reads only if their tests pass.
5. Re-run anonymous/public-user browser journeys and database authorization tests
   before deployment. Do not use a schema-wide revoke as a shortcut.
