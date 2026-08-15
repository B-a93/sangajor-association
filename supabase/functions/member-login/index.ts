import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminClient, corsHeaders, json, membershipLoginEmail, membershipNumberPattern } from '../_shared/invitations.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'A valid request is required.' }, 400); }
  const identifier = String(body.identifier ?? '').trim();
  const password = String(body.password ?? '');
  if (!identifier || password.length < 8) return json({ error: 'Enter your email or membership number and password.' }, 400);

  let email = identifier.toLowerCase();
  const membershipNumber = identifier.toUpperCase();
  if (membershipNumberPattern.test(membershipNumber)) {
    const admin = adminClient();
    const { data: member } = await admin.from('Members')
      .select('auth_user_id, email, status')
      .eq('membership_number', membershipNumber)
      .maybeSingle();
    if (!member?.auth_user_id || String(member.status).toLowerCase() !== 'active') {
      return json({ error: 'The login details are incorrect.' }, 401);
    }
    email = member.email?.trim().toLowerCase() || membershipLoginEmail(membershipNumber);
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'Enter an email address or membership number such as SBC-2026-00010.' }, 400);
  }

  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return json({ error: 'The login details are incorrect.' }, 401);
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
