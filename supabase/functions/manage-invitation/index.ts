import { adminClient, corsHeaders, deliverInvitation, invitationManagerFromRequest, json, secureToken, sha256 } from '../_shared/invitations.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const executive = await invitationManagerFromRequest(request);
  if (!executive) return json({ error: 'You are not authorized to manage invitations.' }, 403);

  const body = await request.json();
  const admin = adminClient();
  if (body.action === 'cancel') {
    const { error } = await admin.from('invitations').update({ status: 'cancelled' }).eq('id', body.invitationId).eq('status', 'pending');
    return error ? json({ error: error.message }, 400) : json({ success: true });
  }

  const token = secureToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let invitation;
  if (body.action === 'resend') {
    const { data, error } = await admin.from('invitations').update({ token_hash: tokenHash, expires_at: expiresAt, status: 'pending', accepted_at: null, accepted_user_id: null }).eq('id', body.invitationId).in('status', ['pending', 'expired']).select().single();
    if (error) return json({ error: error.message }, 400);
    invitation = data;
  } else if (body.action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'A valid full name and email are required.' }, 400);
    const { data: inviter } = await admin.from('Members').select('auth_user_id').eq('auth_user_id', executive.id).single();
    const { data, error } = await admin.from('invitations').insert({ full_name: fullName, email, membership_number: String(body.membershipNumber ?? '').trim() || null, role: body.role ?? 'member', token_hash: tokenHash, expires_at: expiresAt, inviter_id: inviter!.auth_user_id }).select().single();
    if (error) return json({ error: error.code === '23505' ? 'A pending invitation already exists for this email.' : error.message }, 400);
    invitation = data;
  } else return json({ error: 'Unsupported action.' }, 400);

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://sangajorbcs8.org').replace(/\/$/, '');
  const invitationUrl = `${siteUrl}/#/accept-invitation?token=${encodeURIComponent(token)}`;
  const emailSent = await deliverInvitation(invitation.email, invitation.full_name, invitationUrl);
  return json({ success: true, email_sent: emailSent, invitation_url: invitationUrl });
});
