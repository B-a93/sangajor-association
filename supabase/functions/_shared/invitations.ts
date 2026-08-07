import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

export const adminClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function secureToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** Resolve the caller, then delegate authorization to the database's canonical RPC. */
export async function invitationManagerFromRequest(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(authorization.replace(/^Bearer /, ''));
  if (!user) return null;
  const { data: allowed, error } = await admin.rpc('can_manage_invitations', { user_id: user.id });
  if (error || !allowed) return null;
  const { data: member } = await admin.from('Members').select('id, auth_user_id')
    .eq('auth_user_id', user.id).maybeSingle();
  return member ? { user, member } : null;
}

export async function deliverInvitation(email: string | null, fullName: string, url: string) {
  if (!email) return false;
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return false;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
    from: Deno.env.get('INVITATION_FROM_EMAIL') ?? 'SANGAJOR Association <info@sangajorbcs8.org>',
    to: [email], subject: 'Your SANGAJOR member invitation',
    html: `<p>Hello ${fullName.replaceAll('<', '&lt;')},</p><p>An Association executive invited you to MySANGAJOR Digital Village.</p><p><a href="${url}">Accept your invitation</a></p><p>This single-use link expires in 7 days.</p><p>Visit the Association at <a href="https://sangajorbcs8.org">sangajorbcs8.org</a>.</p>`,
  }) });
  return response.ok;
}
