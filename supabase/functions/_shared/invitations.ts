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

export async function executiveFromRequest(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  const admin = adminClient();
  const { data: { user } } = await admin.auth.getUser(authorization.replace(/^Bearer /, ''));
  if (!user) return null;
  const { data: profile } = await admin.from('profiles').select('id, role, is_active').eq('id', user.id).single();
  return profile?.is_active && profile.role !== 'member' ? user : null;
}

export async function deliverInvitation(email: string, fullName: string, url: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return false;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
    from: Deno.env.get('INVITATION_FROM_EMAIL') ?? 'SANGAJOR Association <info@sangajorbcs8.org>',
    to: [email], subject: 'Your SANGAJOR member invitation',
    html: `<p>Hello ${fullName.replaceAll('<', '&lt;')},</p><p>An Association executive invited you to MySANGAJOR Digital Village.</p><p><a href="${url}">Accept your invitation</a></p><p>This single-use link expires in 7 days.</p>`,
  }) });
  return response.ok;
}
