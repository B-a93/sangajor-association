import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, MapPin, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AssociationEvent, Attendance, AttendanceResponse } from '../types/event';
import './EventsManagement.css';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function MemberEvents() {
  const [events, setEvents] = useState<AssociationEvent[]>([]);
  const [responses, setResponses] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { window.location.hash = '/login'; return; }
    const [eventResult, attendanceResult] = await Promise.all([
      supabase.from('association_events').select('*').eq('status', 'published').order('starts_at'),
      supabase.from('event_attendance').select('event_id, member_id, response, checked_in_at'),
    ]);
    if (eventResult.error || attendanceResult.error) setMessage('Events could not be loaded. Please try again.');
    else {
      setEvents((eventResult.data ?? []) as AssociationEvent[]);
      setResponses(Object.fromEntries(((attendanceResult.data ?? []) as Attendance[]).map((item) => [item.event_id, item])));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const upcoming = useMemo(() => events.filter((item) => new Date(item.ends_at) >= new Date()), [events]);
  const past = useMemo(() => events.filter((item) => new Date(item.ends_at) < new Date()).reverse(), [events]);
  async function respond(eventId: string, response: AttendanceResponse) {
    setBusy(eventId); setMessage('');
    const { error } = await supabase.rpc('respond_to_event', { target_event_id: eventId, new_response: response });
    if (error) setMessage(error.message); else { setMessage(response === 'going' ? 'Your place is confirmed.' : 'Your response has been saved.'); await load(); }
    setBusy('');
  }
  if (loading) return <section className="event-state">Loading member events…</section>;
  const card = (item: AssociationEvent, canRespond: boolean) => {
    const response = responses[item.id];
    return <article className="member-event-card" key={item.id}>
      <div className="member-event-date"><CalendarDays size={20} />{dateTime(item.starts_at)}</div>
      <span className="content-category">{item.category}</span><h2>{item.title}</h2><p>{item.description}</p>
      <div className="member-event-meta"><span><Clock3 size={16} />Ends {dateTime(item.ends_at)}</span><span><MapPin size={16} />{item.venue}</span>{item.capacity && <span><Users size={16} />Capacity {item.capacity}</span>}</div>
      {response?.checked_in_at && <p className="attendance-confirmed"><CheckCircle2 size={17} /> Attendance recorded</p>}
      {canRespond && <div className="rsvp-actions" aria-label={`RSVP for ${item.title}`}><button disabled={busy === item.id} className={response?.response === 'going' ? 'selected' : ''} onClick={() => respond(item.id, 'going')}>Going</button><button disabled={busy === item.id} className={response?.response === 'not_going' ? 'selected decline' : ''} onClick={() => respond(item.id, 'not_going')}>Can't attend</button></div>}
    </article>;
  };
  return <section className="member-events-page"><header className="event-page-header"><div><p className="eyebrow">Member portal</p><h1>Events & Attendance</h1><p>Reserve your place and review your Association attendance.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message && <p className="event-message" role="status">{message}</p>}
    <h2 className="event-section-title">Upcoming events</h2>{upcoming.length ? <div className="member-events-grid">{upcoming.map((item) => card(item, true))}</div> : <div className="event-empty">No upcoming events have been published.</div>}
    <h2 className="event-section-title">Past events</h2>{past.length ? <div className="member-events-grid">{past.map((item) => card(item, false))}</div> : <div className="event-empty">Your event history will appear here.</div>}
  </section>;
}
