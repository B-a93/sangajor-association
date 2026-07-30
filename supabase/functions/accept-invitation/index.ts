import { adminClient, corsHeaders, json, sha256 } from '../_shared/invitations.ts';
import { validateAcceptance } from '../_shared/invitation-policy.mjs';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const { token, password } = await request.json();
  if (typeof token !== 'string' || token.length < 32) return json({ error: 'This invitation link is invalid.' }, 400);
  const admin = adminClient();
  const tokenHash = await sha256(token);
  const { data: invitation } = await admin.from('invitations').select('*').eq('token_hash', tokenHash).maybeSingle();
  const rejection = validateAcceptance({ invitation, password });
  if (rejection) {
    if (rejection.shouldExpire && invitation) await admin.from('invitations').update({ status: 'expired' }).eq('id', invitation.id).eq('status', 'pending');
    return json({ error: rejection.error }, rejection.status);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email: invitation.email, password, email_confirm: true, user_metadata: { full_name: invitation.full_name, role: invitation.role, membership_number: invitation.membership_number ?? '' } });
  if (createError || !created.user) return json({ error: createError?.message ?? 'Account could not be created.' }, 400);
  const acceptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin.from('invitations').update({ status: 'accepted', accepted_at: acceptedAt, accepted_user_id: created.user.id }).eq('id', invitation.id).eq('status', 'pending').select('id').maybeSingle();
  if (claimError || !claimed) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: 'This invitation is no longer available.' }, 409); }
  const { data: session, error: loginError } = await admin.auth.signInWithPassword({ email: invitation.email, password });
  if (loginError || !session.session) return json({ error: 'Account activated. Please sign in.' }, 500);
  return json({ access_token: session.session.access_token, refresh_token: session.session.refresh_token });
});
