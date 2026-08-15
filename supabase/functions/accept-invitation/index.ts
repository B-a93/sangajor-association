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

  // Link an existing Association record when possible; otherwise the invitation
  // is the authority to create exactly one member record.
  let memberQuery = admin.from('Members').select('id, auth_user_id, email, phone, membership_number');
  memberQuery = invitation.membership_number
    ? memberQuery.eq('membership_number', invitation.membership_number)
    : invitation.email ? memberQuery.ilike('email', invitation.email) : memberQuery.eq('phone', invitation.phone);
  const { data: existingMember, error: memberError } = await memberQuery.maybeSingle();
  if (memberError) return json({ error: 'The Association member record could not be checked.' }, 409);
  if (existingMember?.auth_user_id) return json({ error: 'This member already has an account. Please sign in instead.' }, 409);

  const identity = invitation.email
    ? { email: invitation.email, email_confirm: true }
    : { phone: invitation.phone, phone_confirm: true };
  const { data: created, error: createError } = await admin.auth.admin.createUser({ ...identity, password, user_metadata: { full_name: invitation.full_name, membership_number: invitation.membership_number ?? '' } });
  if (createError || !created.user) return json({ error: createError?.message ?? 'Account could not be created.' }, 400);

  const names = invitation.full_name.trim().split(/\s+/);
  const memberValues = { first_name: names.shift(), last_name: names.join(' ') || '-', email: invitation.email, phone: invitation.phone, membership_number: invitation.membership_number, role: invitation.executive_office ?? 'member', status: 'active', auth_user_id: created.user.id };
  let member: { id: string } | null = null;
  let createdMember = false;
  if (existingMember) {
    const { data, error } = await admin.from('Members').update({ auth_user_id: created.user.id, email: invitation.email ?? existingMember.email, phone: invitation.phone ?? existingMember.phone, role: invitation.executive_office ?? 'member', status: 'active' }).eq('id', existingMember.id).is('auth_user_id', null).select('id').maybeSingle();
    if (error || !data) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: 'The member account could not be linked.' }, 409); }
    member = data;
  } else {
    const { data, error } = await admin.from('Members').insert(memberValues).select('id').single();
    if (error || !data) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: error?.message ?? 'The member record could not be created.' }, 409); }
    member = data; createdMember = true;
  }

  let executiveRoleId: string | null = null;
  if (invitation.executive_office) {
    const { data, error } = await admin.from('executive_roles').insert({ member_id: member.id, office: invitation.executive_office, position: invitation.executive_position }).select('id').single();
    if (error || !data) {
      if (createdMember) await admin.from('Members').delete().eq('id', member.id); else await admin.from('Members').update({ auth_user_id: null }).eq('id', member.id).eq('auth_user_id', created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: error?.message ?? 'The executive office could not be assigned.' }, 409);
    }
    executiveRoleId = data.id;
  }

  const acceptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin.from('invitations').update({ status: 'accepted', accepted_at: acceptedAt, accepted_user_id: created.user.id }).eq('id', invitation.id).eq('status', 'pending').select('id').maybeSingle();
  if (claimError || !claimed) {
    if (executiveRoleId) await admin.from('executive_roles').delete().eq('id', executiveRoleId);
    if (createdMember) await admin.from('Members').delete().eq('id', member.id); else await admin.from('Members').update({ auth_user_id: null }).eq('id', member.id).eq('auth_user_id', created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'This invitation is no longer available.' }, 409);
  }
  const loginIdentity = invitation.email ? { email: invitation.email } : { phone: invitation.phone };
  const { data: session, error: loginError } = await admin.auth.signInWithPassword({ ...loginIdentity, password });
  if (loginError || !session.session) return json({ activated: true, requires_sign_in: true });
  return json({ access_token: session.session.access_token, refresh_token: session.session.refresh_token });
});
