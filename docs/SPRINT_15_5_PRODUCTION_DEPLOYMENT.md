# Sprint 15.5 production deployment and verification

Deploy these changes in order. Keep a database backup and do not mark the release complete if any verification step fails.

## 1. Supabase SQL Editor

Copy and run the complete contents of `supabase/migrations/202608020001_repair_dashboard_authorization_rpcs.sql` in the production project's SQL Editor. This is the required production repair because environments that already recorded `202608010003_executive_authorization_compatibility.sql` will not rerun that older file. The repair recreates all dashboard RPCs, preserves office-specific permissions, and ends with a transaction-failing signature check.

After it succeeds, use the included Banna query. Confirm her member is active, `active_office` is `ipro`, and both communications results (`can_manage_announcements` and `can_moderate_village`) are `true`. Then sign in as Banna and confirm the Executive Portal contains **Communications** and **Community safety**, without member, finance, or other unrelated administration tools.

For a normal active member with no active `executive_roles` row, set the SQL Editor JWT subject as documented in the migration and confirm `active_executive_office()` returns `null` and every `can_manage_*`/`can_moderate_village` call returns `false`. Sign in as that member and confirm the Executive Portal is absent. Never add an `admin` office or modify a member merely to make this test pass.

## 2. Edge Function

Redeploy only `supabase/functions/member-assistant` as the **member-assistant** Edge Function. It authenticates the bearer token itself, uses `member_assistant_context()`, and remains rule based; it has no paid or external AI dependency. Set `ENVIRONMENT=production` so client responses do not expose database or deployment details. Retain Function logs for diagnosis.

From an active member session, ask each of: “What events are coming up?”, “Do I have outstanding dues?”, “Summarise recent announcements”, and “Find a volunteer opportunity”. Confirm a rule-based response and that one conversation plus user/assistant message rows are created. Confirm `member_assistant_context()` returns an object when called with that member's JWT subject. A user without an active `Members.auth_user_id = auth.uid()` link must receive the safe “Member context unavailable” response. Also confirm RLS is enabled on `assistant_conversations`, `assistant_messages`, and `assistant_automation_preferences`, and that one member cannot select another member's rows.

## 3. Hostinger frontend

Deploy the frontend commit associated with this document (the head commit of the Sprint 15.5 pull request) through Hostinger. Record the exact commit SHA in the Hostinger release log before deployment; do not deploy an uncommitted workspace or an older PR preview.

After deployment, sign in as an active member and open **Connection Hub**. Confirm these eight categories are visible: Business & entrepreneurship, Skills learning & exchange, Family support, Marriage support, Parenting, Mentorship, Professional networking, and Community opportunities. Empty categories must show their honest empty states rather than sample activity. At desktop and mobile widths, confirm headings and cards remain readable.

Finally, use two real test-member accounts to send and accept a private connection request, exchange a message, and verify a third account cannot read it. This confirms the existing consent and RLS-protected connection flow remains intact.

## Release sign-off

- Required RPC signature check completed without exception.
- Banna has only her IPRO-authorized tools.
- A normal member has no executive portal or administrative access.
- All eight Connection Hub categories and honest empty states are visible.
- Private request, acceptance, messaging, and isolation checks pass.
- Rule-based assistant, member context, tables, and RLS checks pass.
- Hostinger release log identifies the deployed frontend commit SHA.
