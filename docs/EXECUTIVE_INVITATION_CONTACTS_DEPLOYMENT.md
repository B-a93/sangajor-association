# Email or WhatsApp invitation production repair

Production migration history is inconsistent, so **do not replay older migrations**.

1. Back up `public.invitations` and `public."Members"`.
2. In Supabase SQL Editor, run only
   `supabase/migrations/202608070002_repair_invitation_contacts_and_ownership.sql`.
   It retains the legacy `inviter_id`, maps ownership where safe, and does not
   delete invitations. Review unmapped historical rows rather than guessing.
3. Run `supabase/verification/invitation_contacts_and_ownership.sql`. Confirm the
   new FK targets `Members`, every current row has a token digest/contact, and
   only chairman, secretary general, and IPRO return `may_manage = true`.
4. Redeploy both Edge Functions: `manage-invitation` and `accept-invitation`.
5. Keep public Auth signup disabled. Enable the Supabase **Phone** provider only
   if phone-only activation will be used; configure its supported SMS provider.
   Acceptance uses a verified invitation token and Admin API phone creation—it
   does not invent an email address or send an invitation SMS/WhatsApp message.
6. Smoke-test email-only, E.164 phone-only, and combined invitations. Verify that
   email failure still returns a copyable URL and WhatsApp opens only as a manual
   share action. Accept each URL once, then confirm reuse is rejected.

The raw 256-bit token exists only in the returned URL. The database stores its
SHA-256 `token_hash`; links cannot be recovered after the create/resend response.
