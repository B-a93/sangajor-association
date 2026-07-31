import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Bot, CalendarClock, ExternalLink, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AssistantMessage, AssistantReply, AutomationPreference } from '../types/assistant';
import './SmartAssistant.css';

const starters = ['What events are coming up?', 'Do I have outstanding dues?', 'Find a volunteer opportunity', 'Summarise recent announcements'];
const defaultPreferences: AutomationPreference = { event_reminders: true, dues_reminders: true, announcement_digest: false, volunteer_matches: true };

export function SmartAssistant() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>(starters);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void supabase.auth.getSession().then(async ({ data }) => {
    setSession(data.session);
    if (!data.session) { window.location.hash = '/login'; return; }
    const { data: saved } = await supabase.from('assistant_automation_preferences').select('event_reminders, dues_reminders, announcement_digest, volunteer_matches').maybeSingle();
    if (saved) setPreferences(saved as AutomationPreference);
  }); }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  async function ask(question: string) {
    const clean = question.trim();
    if (!clean || busy) return;
    setInput(''); setBusy(true); setStatus('');
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'user', content: clean }]);
    const { data, error } = await supabase.functions.invoke<AssistantReply>('member-assistant', {
      body: { message: clean, conversationId },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error || !data) {
      const response = error && 'context' in error && error.context instanceof Response ? error.context : undefined;
      setStatus(response?.status === 401
        ? 'Your session has expired. Please sign in again before asking Sanga.'
        : 'The assistant is unavailable right now. Your request was not lost—please try again.');
    }
    else {
      setConversationId(data.conversationId);
      setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', content: data.answer, citations: data.citations }]);
      setSuggestedActions(data.suggestedActions);
    }
    setBusy(false);
  }

  async function submit(event: FormEvent) { event.preventDefault(); await ask(input); }

  async function togglePreference(key: keyof AutomationPreference) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next); setStatus('Saving automation preferences…');
    const { error } = await supabase.from('assistant_automation_preferences').upsert({ user_id: session?.user.id, ...next });
    setStatus(error ? 'Preferences could not be saved. Please try again.' : 'Automation preferences saved.');
  }

  if (!session) return <section className="assistant-loading">Preparing your private assistant…</section>;
  return <section className="assistant-page">
    <header className="assistant-hero"><div><p className="eyebrow">Rule-based member support</p><h1>Your Association assistant</h1><p>Get quick, predictable answers drawn only from your authorised MySANGAJOR records—no external AI service is used.</p></div><div className="assistant-trust"><ShieldCheck size={22}/><span><strong>Private by design</strong>Your conversation is visible only to you.</span></div></header>
    <div className="assistant-layout">
      <article className="assistant-chat" aria-label="Assistant conversation">
        <div className="chat-heading"><span><Bot size={22}/></span><div><strong>Sanga</strong><small>Association guide · Responses may need verification</small></div></div>
        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 && <div className="assistant-welcome"><Sparkles/><h2>How can I help today?</h2><p>I can explain Association information, find member resources and help you stay on top of events, dues and volunteering.</p><div className="starter-grid">{starters.map((starter) => <button type="button" onClick={() => void ask(starter)} key={starter}>{starter}</button>)}</div></div>}
          {messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? 'Sanga' : 'You'}</span><p>{message.content}</p>{message.citations && message.citations.length > 0 && <div className="assistant-sources"><strong>Sources</strong>{message.citations.map((citation) => <a href={citation.href} key={citation.href}>{citation.label}<ExternalLink size={13}/></a>)}</div>}</div>)}
          {busy && <div className="assistant-thinking" role="status"><i/><i/><i/><span>Sanga is checking your Association records…</span></div>}
          {!busy && messages.length > 0 && suggestedActions.length > 0 && <div className="assistant-followups" aria-label="Suggested questions">{suggestedActions.map((action) => <button type="button" onClick={() => void ask(action)} key={action}>{action}</button>)}</div>}
          <div ref={endRef}/>
        </div>
        {status && <p className="assistant-status" role="status">{status}</p>}
        <form className="chat-composer" onSubmit={submit}><label htmlFor="assistant-question" className="sr-only">Ask the Association assistant</label><textarea id="assistant-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about events, dues, announcements or volunteering…" maxLength={500} rows={2}/><button type="submit" disabled={busy || !input.trim()} aria-label="Send question"><Send size={20}/></button></form>
        <p className="assistant-disclaimer">Sanga matches keywords to a small set of supported topics; it does not generate advice. Verify important financial or governance information with an executive.</p>
      </article>
      <aside className="automation-panel"><div className="automation-heading"><span><CalendarClock/></span><div><p className="eyebrow">Smart automation</p><h2>Stay one step ahead</h2></div></div><p>Choose the helpful nudges you want. You remain in control and can change them anytime.</p>
        <div className="automation-list">
          {([['event_reminders','Event reminders','A reminder 24 hours before events you joined.'],['dues_reminders','Dues reminders','A private nudge before a contribution is due.'],['announcement_digest','Weekly digest','One summary of unread official announcements.'],['volunteer_matches','Volunteer matches','Suggestions based on your interests and availability.']] as const).map(([key,title,description]) => <label key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={() => void togglePreference(key)}/><i aria-hidden="true"/></label>)}
        </div><div className="automation-note"><ShieldCheck size={18}/><p>Automations never publish, pay or RSVP on your behalf. They only notify and recommend.</p></div>
      </aside>
    </div>
  </section>;
}
