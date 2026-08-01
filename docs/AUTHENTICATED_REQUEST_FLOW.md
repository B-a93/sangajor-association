# Authenticated request flow investigation

## Root cause

The application had two competing member sources. Production uses the pre-existing
`public."Members"` row linked by `auth_user_id`, while the assistant migration still
required and queried `public.profiles`. Migration `202607310051` intentionally stopped
the Auth trigger from creating `profiles` rows. Consequently, a valid invited user
could log in and have a linked `Members` row, but `member_assistant_context()` returned
no row and assistant inserts also failed their foreign keys to `profiles`.

Some older Authentication users were never linked to `Members.auth_user_id`. The
dashboard's `maybeSingle()` therefore returned `data: null, error: null`; line 36 used
to replace that useful distinction with “Your Association profile could not be
loaded.” The repair links only one-to-one normalized email matches and never guesses
an ambiguous identity.

There is no `executive_roles` table in this schema. The canonical executive office is
`Members.role`; `member_has_role()` resolves it using the current JWT's `auth.uid()` and
requires an active `Members` row.

## Request and query trace

1. **Login / Auth** — `signInWithPassword({ email, password })` queries Supabase Auth.
   A success returns a session containing an access-token JWT and Auth user UUID; an
   Auth error is shown directly by the login page.
2. **Current session** — the dashboard calls `auth.getSession()` (local persisted
   session plus refresh when required). It returns `session` or an Auth error. The
   dashboard now reports that error in development rather than continuing.
3. **Member lookup** — table `Members`; projection `id, first_name, last_name, email,
   membership_number, role, status`; filter `auth_user_id = session.user.id`;
   cardinality `maybeSingle`. A linked row is returned through the self-read RLS
   policy. A missing link returns `data: null, error: null`; PostgREST/schema/RLS
   failures return `result.error`. Both are now distinguished in development.
4. **Executive authorization** — RPCs `can_manage_members`, `can_manage_finances`,
   `can_manage_events`, `can_manage_announcements`, `can_manage_documents`,
   `can_manage_volunteers`, `can_view_executive_analytics`, and
   `can_moderate_village` filter `Members.auth_user_id = auth.uid()`, normalized
   `status = active`, and `role = any(allowed_roles)`. Each returns boolean or an RPC
   error. The dashboard previously ignored every RPC error; it now exposes the first
   one in development. `unread_announcement_count` returns a number or RPC error.
5. **Assistant preferences** — table `assistant_automation_preferences`; RLS filter
   `user_id = auth.uid()`; `maybeSingle()` returns saved preferences, no row, or a
   PostgREST error. Loading and saving errors are now visible in development.
6. **Edge authentication** — `member-assistant` receives the access-token JWT and
   calls `auth.getUser()`, which verifies it with Supabase Auth and returns the user or
   an authentication error. Function gateway legacy verification remains disabled so
   asymmetric project JWTs reach this explicit check.
7. **Assistant context** — RPC `member_assistant_context`; filter
   `Members.auth_user_id = auth.uid()` and normalized `Members.status = active`.
   It returns published upcoming events, unpaid dues (payments filtered by
   `member_id = auth.uid()`), published announcements, and open volunteer work. It
   returns no row for an unlinked/inactive member or an RPC error. The Edge Function
   now returns the actual RPC detail.
8. **Conversation lookup/write** — table `assistant_conversations`, filters
   `id = conversationId` and `member_id = user.id`, returning one conversation, no
   row, or a PostgREST error. New conversations and `assistant_messages` use the Auth
   UUID and now reference `auth.users`, matching their RLS policies. Insert failures
   are returned with their real error detail and displayed during development.
9. **Dashboard recognition** — the returned `Members.status` is compared
   case-insensitively and `Members.role` is passed to `isActiveExecutive`; the portal
   appears only for an active recognized office. Tool visibility additionally uses
   the database RPC results above.

The two former generic-message sites were `src/pages/MemberDashboard.tsx` in the
member `maybeSingle()` failure branch and `src/pages/SmartAssistant.tsx` in the Edge
Function invocation failure branch. Both retain safe production wording while adding
the underlying stage and database/Auth error in Vite development builds.
