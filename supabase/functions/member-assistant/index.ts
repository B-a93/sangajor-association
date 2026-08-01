import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const links = { events: { label: 'Member events', href: '#/dashboard/events' }, dues: { label: 'My dues', href: '#/dashboard/dues' }, announcements: { label: 'Communication Centre', href: '#/dashboard/communications' }, volunteering: { label: 'Volunteer opportunities', href: '#/dashboard/volunteering' } };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authenticationError } = await client.auth.getUser();
    if (authenticationError || !user) return json({ error: 'Authentication required', details: authenticationError?.message }, 401);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'A JSON request body is required' }, 400);
    const message = String(body.message ?? '').trim().slice(0, 500);
    if (!message) return json({ error: 'A message is required' }, 400);
    const { data: context, error: contextError } = await client.rpc('member_assistant_context');
    if (contextError || !context) return json({ error: 'Member context unavailable', details: contextError?.message ?? 'No active Members row is linked to this Authentication user.' }, 403);
    let conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
    if (conversationId) {
      const { data: conversation } = await client.from('assistant_conversations').select('id').eq('id', conversationId).eq('member_id', user.id).maybeSingle();
      if (!conversation) return json({ error: 'Conversation not found' }, 404);
    } else {
      const { data, error } = await client.from('assistant_conversations').insert({ member_id: user.id, title: message.slice(0, 120) }).select('id').single();
      if (error) throw error; conversationId = data.id;
    }
    const { error: writeError } = await client.from('assistant_messages').insert({ conversation_id: conversationId, member_id: user.id, role: 'user', content: message });
    if (writeError) throw writeError;
    const reply = answerFromContext(message, context);
    const { error: replyWriteError } = await client.from('assistant_messages').insert({ conversation_id: conversationId, member_id: user.id, role: 'assistant', content: reply.answer, citations: reply.citations });
    if (replyWriteError) throw replyWriteError;
    return json({ ...reply, conversationId });
  } catch (error) { console.error('member-assistant', error); return json({ error: 'Assistant request failed', details: error instanceof Error ? error.message : String(error) }, 500); }
});

function answerFromContext(question: string, context: Record<string, Array<Record<string, unknown>>>) {
  const query = question.toLowerCase();
  if (/\b(due|dues|payment|contribution|owe|balance)\b/.test(query)) return list('dues', context.outstandingDues, 'You have no outstanding dues recorded.', (x) => `${x.name}: ${x.currency} ${x.amount}, due ${date(x.dueDate)}`);
  if (/\b(volunteer|volunteering|service|opportunit(?:y|ies))\b/.test(query)) return list('volunteering', context.volunteering, 'There are no open volunteer opportunities right now.', (x) => `${x.title} — ${date(x.startsAt)}${x.location ? ` at ${x.location}` : ''}`);
  if (/\b(announcement|announcements|news|notice|notices|summary|summarise|summarize)\b/.test(query)) return list('announcements', context.announcements, 'There are no current published announcements.', (x) => `${x.title} (${date(x.publishedAt)})`);
  if (/\b(event|events|meeting|meetings|calendar|coming|upcoming)\b/.test(query)) return list('events', context.upcomingEvents, 'There are no published upcoming events right now.', (x) => `${x.title} — ${date(x.startsAt)}${x.venue ? ` at ${x.venue}` : ''}`);
  return { intent: 'help', answer: 'I can check upcoming events, outstanding dues, recent announcements and open volunteer opportunities. Try one of the suggested questions below.', citations: [], suggestedActions: ['What events are coming up?', 'Do I have outstanding dues?', 'Summarise recent announcements'] };
}
function list(key: keyof typeof links, items: Array<Record<string, unknown>> = [], empty: string, format: (item: Record<string, unknown>) => string) { return { intent: key, answer: items.length ? items.map((item) => `• ${format(item)}`).join('\n') : empty, citations: [links[key]], suggestedActions: followUps(key) }; }
function followUps(intent: keyof typeof links) { return ({ events: ['Do I have outstanding dues?', 'Find a volunteer opportunity'], dues: ['What events are coming up?', 'Summarise recent announcements'], announcements: ['What events are coming up?', 'Find a volunteer opportunity'], volunteering: ['What events are coming up?', 'Do I have outstanding dues?'] })[intent]; }
function date(value: unknown) { const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? 'date to be confirmed' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed); }
function json(body: unknown, status=200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
