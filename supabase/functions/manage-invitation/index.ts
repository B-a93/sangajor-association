const executivePositions: Record<string, string> = { chairman: 'Chairman', vice_chairlady: 'Vice Chairlady', secretary_general: 'Secretary General', assistant_secretary_general: 'Assistant Secretary General', treasurer: 'Treasurer', assistant_treasurer: 'Assistant Treasurer', auditor_general: 'Auditor General', assistant_auditor_general: 'Assistant Auditor General', assistant_auditor: 'Assistant Auditor', ipro: 'IPRO', assistant_ipro: 'Assistant IPRO', programme_officer: 'Programme Officer', assistant_programme_officer: 'Assistant Programme Officer', adviser_1: 'Adviser 1', adviser_2: 'Adviser 2', adviser_3: 'Adviser 3', adviser_4: 'Adviser 4' };

import { adminClient, corsHeaders, deliverInvitation, invitationManagerFromRequest, json, membershipLoginEmail, secureToken, sha256 } from '../_shared/invitations.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const manager = await invitationManagerFromRequest(request);
  if (!manager) return json({ error: 'You are not authorized to manage invitations.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'A valid JSON request body is required.' }, 400); }
  const admin = adminClient();
  if (body.action === 'cancel') {
    const { error } = await admin.from('invitations').update({ status: 'cancelled' }).eq('id', body.invitationId).eq('status', 'pending');
    return error ? json({ error: error.message }, 400) : json({ success: true });
  }

  if (body.action === 'convert-membership-login') {
    const { data: invitation, error: invitationError } = await admin.from('invitations')
      .select('id, email, phone, status, accepted_user_id')
      .eq('id', body.invitationId).eq('status', 'accepted').maybeSingle();
    if (invitationError || !invitation?.accepted_user_id || invitation.email || !invitation.phone) {
      return json({ error: 'This is not an accepted phone-only invitation.' }, 400);
    }
    const { data: member, error: memberError } = await admin.from('Members')
      .select('membership_number, status').eq('auth_user_id', invitation.accepted_user_id).maybeSingle();
    if (memberError || !member?.membership_number || String(member.status).toLowerCase() !== 'active') {
      return json({ error: 'The active member or membership number could not be found.' }, 409);
    }
    const { error } = await admin.auth.admin.updateUserById(invitation.accepted_user_id, {
      email: membershipLoginEmail(member.membership_number),
      email_confirm: true,
    });
    return error ? json({ error: 'The existing account could not be converted.' }, 409) : json({ success: true, membership_number: member.membership_number });
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
    const email = String(body.email ?? '').trim().toLowerCase() || null;
    const phone = String(body.phone ?? '').replace(/[\s().-]/g, '') || null;
    const fullName = String(body.fullName ?? '').trim();
    if (!fullName) return json({ error: 'Full name is required.' }, 400);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) return json({ error: 'Enter the phone number in international format, for example +2201234567.' }, 400);
    if (!email && !phone) return json({ error: 'A valid email or phone/WhatsApp number is required.' }, 400);
    const executiveOffice = String(body.executiveOffice ?? '').trim() || null;
    if (executiveOffice && !executivePositions[executiveOffice]) return json({ error: 'Select a valid executive office.' }, 400);
    const { data, error } = await admin.from('invitations').insert({ full_name: fullName, email, phone, membership_number: String(body.membershipNumber ?? '').trim() || null, role: 'member', executive_office: executiveOffice, executive_position: executiveOffice ? executivePositions[executiveOffice] : null, token_hash: tokenHash, expires_at: expiresAt, inviter_member_id: manager.member.id }).select().single();
    if (error) return json({ error: error.code === '23505' ? 'A pending invitation already exists for this contact.' : error.message }, 400);
    invitation = data;
  } else return json({ error: 'Unsupported action.' }, 400);

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://sangajorbcs8.org').replace(/\/$/, '');
  const invitationUrl = `${siteUrl}/#/accept-invitation?token=${encodeURIComponent(token)}`;
  const emailSent = await deliverInvitation(invitation.email, invitation.full_name, invitationUrl);
  return json({ success: true, invitation_id: invitation.id, email_sent: emailSent, invitation_url: invitationUrl });
});
