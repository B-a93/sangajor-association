import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const links = { events: { label: 'Member events', href: '#/dashboard/events' }, dues: { label: 'My dues', href: '#/dashboard/dues' }, announcements: { label: 'Communication Centre', href: '#/dashboard/communications' }, volunteering: { label: 'Volunteer opportunities', href: '#/dashboard/volunteering' } };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: 'Authentication required' }, 401);
    const body = await request.json();
    const message = String(body.message ?? '').trim().slice(0, 500);
    if (!message) return json({ error: 'A message is required' }, 400);
    const { data: context, error: contextError } = await client.rpc('member_assistant_context');
    if (contextError || !context) return json({ error: 'Member context unavailable' }, 403);
    let conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
    if (!conversationId) {
      const { data, error } = await client.from('assistant_conversations').insert({ member_id: user.id, title: message.slice(0, 120) }).select('id').single();
      if (error) throw error; conversationId = data.id;
    }
    const { error: writeError } = await client.from('assistant_messages').insert({ conversation_id: conversationId, member_id: user.id, role: 'user', content: message });
    if (writeError) throw writeError;
    const reply = answerFromContext(message, context);
    await client.from('assistant_messages').insert({ conversation_id: conversationId, member_id: user.id, role: 'assistant', content: reply.answer, citations: reply.citations });
    return json({ ...reply, conversationId });
  } catch (error) { console.error('member-assistant', error); return json({ error: 'Assistant request failed' }, 500); }
});

function answerFromContext(question: string, context: Record<string, Array<Record<string, unknown>>>) {
  const query = question.toLowerCase();
  if (/due|payment|contribution|owe/.test(query)) return list('outstandingDues', context.outstandingDues, 'You have no outstanding dues recorded.', (x) => `${x.name}: ${x.currency} ${x.amount}, due ${date(x.dueDate)}`);
  if (/volunteer|service|help/.test(query)) return list('volunteering', context.volunteering, 'There are no open volunteer opportunities right now.', (x) => `${x.title} — ${date(x.startsAt)}${x.location ? ` at ${x.location}` : ''}`);
  if (/announcement|news|notice|summar/.test(query)) return list('announcements', context.announcements, 'There are no current published announcements.', (x) => `${x.title} (${date(x.publishedAt)})`);
  if (/event|meeting|calendar|coming/.test(query)) return list('events', context.upcomingEvents, 'There are no published upcoming events right now.', (x) => `${x.title} — ${date(x.startsAt)} at ${x.venue}`);
  return { answer: 'I can help with upcoming events, outstanding dues, recent announcements and open volunteer opportunities. Choose one of those topics so I can check the relevant Association record.', citations: Object.values(links), suggestedActions: [] };
}
function list(key: keyof typeof links, items: Array<Record<string, unknown>> = [], empty: string, format: (item: Record<string, unknown>) => string) { return { answer: items.length ? items.map((item) => `• ${format(item)}`).join('\n') : empty, citations: [links[key]], suggestedActions: [] }; }
function date(value: unknown) { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(String(value))); }
function json(body: unknown, status=200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
