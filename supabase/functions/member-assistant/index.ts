import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { answerFromContext } from '../_shared/assistant-replies.mjs';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authenticationError } = await client.auth.getUser();
    if (authenticationError || !user) return problem('Authentication required', 401, authenticationError);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'A JSON request body is required' }, 400);
    const message = String(body.message ?? '').trim().slice(0, 500);
    if (!message) return json({ error: 'A message is required' }, 400);
    const { data: context, error: contextError } = await client.rpc('member_assistant_context');
    if (contextError || !context) return problem('Member context unavailable', 403, contextError ?? new Error('No active Members row is linked to this Authentication user.'));
    let conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
    if (conversationId) {
      const { data: conversation } = await client.from('assistant_conversations').select('id').eq('id', conversationId).eq('member_id', user.id).maybeSingle();
      if (!conversation) return json({ error: 'Conversation not found' }, 404);
    } else {
      const { data, error } = await client.from('assistant_conversations').insert({ member_id: user.id, title: message.slice(0, 120) }).select('id').single();
      if (error) throw error; conversationId = String(data.id);
    }
    const { error: writeError } = await client.from('assistant_messages').insert({ conversation_id: conversationId, member_id: user.id, role: 'user', content: message });
    if (writeError) throw writeError;
    const reply = answerFromContext(message, context);
    const { error: replyWriteError } = await client.from('assistant_messages').insert({ conversation_id: conversationId, member_id: user.id, role: 'assistant', content: reply.answer, citations: reply.citations });
    if (replyWriteError) throw replyWriteError;
    return json({ ...reply, conversationId: String(conversationId) });
  } catch (error) { console.error('member-assistant', error); return problem('Assistant request failed', 500, error); }
});

function json(body: unknown, status=200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }

function problem(message: string, status: number, cause?: unknown) {
  const body: { error: string; details?: string } = { error: message };
  if (Deno.env.get('ENVIRONMENT') !== 'production' && cause) body.details = cause instanceof Error ? cause.message : String(cause);
  return json(body, status);
}
