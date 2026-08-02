export const leadership = Object.freeze({
  chairman: [{ name: 'Omar Bah', role: 'Chairman' }],
  chairperson: [{ name: 'Omar Bah', role: 'Chairman' }],
  'secretary general': [{ name: 'Landing Bojang', role: 'Secretary General' }],
  treasurer: [{ name: 'Mbaye Manga', role: 'Treasurer' }],
  ipro: [{ name: 'Banna Bojang', role: 'Information & Public Relations Officer (IPRO)' }],
  adviser: [
    { name: 'Ismaila Manga', role: 'Adviser' },
    { name: 'Yusupha Badjie', role: 'Adviser' },
    { name: 'Mariama Sibo Bojang', role: 'Adviser' },
  ],
});

export const assistantLinks = Object.freeze({
  events: { label: 'Member events', href: '#/dashboard/events' },
  dues: { label: 'My dues', href: '#/dashboard/dues' },
  announcements: { label: 'Communication Centre', href: '#/dashboard/communications' },
  volunteering: { label: 'Volunteer opportunities', href: '#/dashboard/volunteering' },
  leadership: { label: 'Leadership', href: '#/leadership' },
});

export function answerFromContext(question, context = {}) {
  const query = String(question).toLowerCase();
  const role = Object.keys(leadership).find((key) => query.includes(key));
  if (role) return leadershipReply(leadership[role]);
  if (/\b(leadership|executive|governance)\b/.test(query)) {
    const officers = ['chairman', 'secretary general', 'treasurer', 'ipro']
      .flatMap((key) => leadership[key]);
    return leadershipReply(officers);
  }
  if (/\b(due|dues|payment|contribution|owe|balance)\b/.test(query)) return list('dues', context.outstandingDues, 'You have no outstanding dues recorded.', (x) => `${x.name}: ${x.currency} ${x.amount}, due ${date(x.dueDate)}`);
  if (/\b(volunteer|volunteering|service|opportunit(?:y|ies))\b/.test(query)) return list('volunteering', context.volunteering, 'There are no open volunteer opportunities right now.', (x) => `${x.title} — ${date(x.startsAt)}${x.location ? ` at ${x.location}` : ''}`);
  if (/\b(announcement|announcements|news|notice|notices|summary|summarise|summarize)\b/.test(query)) return list('announcements', context.announcements, 'There are no current published announcements.', (x) => `${x.title} (${date(x.publishedAt)})`);
  if (/\b(event|events|meeting|meetings|calendar|coming|upcoming)\b/.test(query)) return list('events', context.upcomingEvents, 'There are no published upcoming events right now.', (x) => `${x.title} — ${date(x.startsAt)}${x.venue ? ` at ${x.venue}` : ''}`);
  return reply('help', 'I can answer questions about Association leadership, upcoming events, outstanding dues, recent announcements and open volunteer opportunities. Try one of the suggested questions below.', [], ['Who is the chairman?', 'What events are coming up?', 'Do I have outstanding dues?']);
}

function leadershipReply(officers) {
  return reply('leadership', officers.map(({ name, role }) => `${name} — ${role}`).join('\n'), [assistantLinks.leadership], ['Who is the Secretary General?', 'Who is the IPRO?', 'Who is the treasurer?']);
}

function list(key, items = [], empty, format) {
  const safeItems = Array.isArray(items) ? items : [];
  return reply(key, safeItems.length ? safeItems.map((item) => `• ${format(item)}`).join('\n') : empty, [assistantLinks[key]], followUps(key));
}

function reply(intent, answer, citations, suggestedActions) {
  return { intent, answer: String(answer), citations: Array.isArray(citations) ? citations : [], suggestedActions: Array.isArray(suggestedActions) ? suggestedActions : [] };
}

function followUps(intent) {
  return ({ events: ['Do I have outstanding dues?', 'Find a volunteer opportunity'], dues: ['What events are coming up?', 'Summarise recent announcements'], announcements: ['What events are coming up?', 'Find a volunteer opportunity'], volunteering: ['What events are coming up?', 'Do I have outstanding dues?'] })[intent] ?? [];
}

function date(value) {
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? 'date to be confirmed' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed);
}
