# Executive invitation repair: production deployment

1. In Supabase SQL Editor, run the new repair migration
   `supabase/migrations/202608070001_repair_executive_invitation_access.sql` by
   itself. Do not replay historical migrations.
2. Run `supabase/verification/executive_invitation_bootstrap.sql`. Confirm each
   active office and Auth email is correct, existing links remain `LINKED`, and
   `can_manage_invitations` is true only for chairman, secretary general, and
   IPRO. Investigate every ambiguous or broken result rather than guessing.
3. For an approved executive shown as `UNLINKED`, confirm their Members email
   out-of-band, then have an already-authorized invitation manager send an
   invitation to that exact existing Members record. If no manager can sign in,
   a Supabase administrator should use the Admin API/Dashboard to invite that
   verified email, rerun the repair SQL to perform the unique link, and then
   issue password recovery if needed. Never enable public signup and never
   insert into `auth.users` with SQL.
4. Redeploy only `manage-invitation` (and deploy the migration before it). The
   public `accept-invitation` function does not require a code redeploy for this
   authorization repair.
5. Before testing invitations, verify Auth signup remains disabled, the three
   manager offices have linked active Members rows, other executives return
   false from `can_manage_invitations`, and invitation rows store only
   `token_hash`. Then test create, view, resend, cancel, acceptance, and login.
