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

  // An invitation activates an existing Association member; it must never manufacture a duplicate.
  let memberQuery = admin.from('Members').select('id, auth_user_id, email, phone, membership_number');
  memberQuery = invitation.membership_number
    ? memberQuery.eq('membership_number', invitation.membership_number)
    : invitation.email ? memberQuery.ilike('email', invitation.email) : memberQuery.eq('phone', invitation.phone);
  const { data: member, error: memberError } = await memberQuery.maybeSingle();
  if (memberError || !member) return json({ error: 'No matching Association member record was found. Please contact an executive.' }, 409);
  if (member.auth_user_id) return json({ error: 'This member already has an account. Please sign in instead.' }, 409);

  const identity = invitation.email
    ? { email: invitation.email, email_confirm: true }
    : { phone: invitation.phone, phone_confirm: true };
  const { data: created, error: createError } = await admin.auth.admin.createUser({ ...identity, password, user_metadata: { full_name: invitation.full_name, membership_number: invitation.membership_number ?? '' } });
  if (createError || !created.user) return json({ error: createError?.message ?? 'Account could not be created.' }, 400);
  const contactUpdate = invitation.email ? { email: invitation.email } : { phone: invitation.phone };
  const { data: linked, error: linkError } = await admin.from('Members').update({ auth_user_id: created.user.id, ...contactUpdate }).eq('id', member.id).is('auth_user_id', null).select('id').maybeSingle();
  if (linkError || !linked) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: 'The member account could not be linked.' }, 409); }
  const acceptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin.from('invitations').update({ status: 'accepted', accepted_at: acceptedAt, accepted_user_id: created.user.id }).eq('id', invitation.id).eq('status', 'pending').select('id').maybeSingle();
  if (claimError || !claimed) {
    await admin.from('Members').update({ auth_user_id: null }).eq('id', member.id).eq('auth_user_id', created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'This invitation is no longer available.' }, 409);
  }
  const loginIdentity = invitation.email ? { email: invitation.email } : { phone: invitation.phone };
  const { data: session, error: loginError } = await admin.auth.signInWithPassword({ ...loginIdentity, password });
  if (loginError || !session.session) return json({ error: 'Account activated. Please sign in.' }, 500);
  return json({ access_token: session.session.access_token, refresh_token: session.session.refresh_token });
});
