# Membership-number login deployment

This release replaces phone/password sign-in with email-or-membership-number sign-in. It does not require an SMS provider.

## Deployment order

1. Apply `supabase/migrations/202608150005_automatic_membership_numbers.sql`.
2. Deploy `accept-invitation`, `manage-invitation`, and `member-login`:

   ```bash
   npx supabase functions deploy accept-invitation --project-ref asdhaqogomuebvoyhavk --no-verify-jwt
   npx supabase functions deploy manage-invitation --project-ref asdhaqogomuebvoyhavk
   npx supabase functions deploy member-login --project-ref asdhaqogomuebvoyhavk --no-verify-jwt
   ```

3. Deploy the website build.
4. In **Member Invitations → Accepted Invitations**, select **Enable Membership Login** for each previously accepted phone-only account. This preserves the Auth user, member record, password, role and membership number.
5. Test that member with their `SBC-YYYY-NNNNN` number and existing password.
6. Cancel the old pending phone invitations, create fresh invitations and share their secure links through WhatsApp.

New phone-only invitations create an internal Auth identifier. The member only sees and uses the automatically assigned membership number. Members without email require an executive-assisted password reset.
