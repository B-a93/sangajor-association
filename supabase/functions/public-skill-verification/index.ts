import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  try {
    const { channel, destination, website } = await request.json();
    if (website || !['email', 'telephone'].includes(channel) || typeof destination !== 'string') throw new Error('Invalid verification request');
    const normalized = destination.trim().toLowerCase();
    if (normalized.length < 5 || normalized.length > 254) throw new Error('Invalid verification contact');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from('public_skill_verification_attempts').select('*', { count: 'exact', head: true }).eq('client_key', ip).gte('created_at', since);
    if ((count ?? 0) >= 8) return new Response(JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
    await admin.from('public_skill_verification_attempts').insert({ client_key: ip, destination_hint: normalized.slice(-4) });

    // This creates only a Supabase verification identity, never a Members row
    // or Association membership account. Duplicate-user errors are expected.
    const attributes = channel === 'email'
      ? { email: normalized, email_confirm: true }
      : { phone: destination.trim(), phone_confirm: true };
    const created = await admin.auth.admin.createUser(attributes);
    if (created.error && !/already|registered|exists/i.test(created.error.message)) throw created.error;
    return new Response(JSON.stringify({ ready: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Verification unavailable' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
