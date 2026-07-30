import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Announcement, AnnouncementRead } from '../types/announcement';
import './CommunicationCenter.css';

const publishedDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';

export function CommunicationCenter() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { window.location.hash = '/login'; return; }
    const [feed, receipts] = await Promise.all([
      supabase.from('announcements').select('*').eq('status', 'published').order('published_at', { ascending: false }),
      supabase.from('announcement_reads').select('announcement_id, member_id, read_at'),
    ]);
    if (feed.error || receipts.error) setMessage('Announcements could not be loaded. Please try again.');
    else {
      setAnnouncements((feed.data ?? []) as Announcement[]);
      setReads(new Set(((receipts.data ?? []) as AnnouncementRead[]).map((item) => item.announcement_id)));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel('member-announcement-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);
  const visible = useMemo(() => filter === 'unread' ? announcements.filter((item) => !reads.has(item.id)) : announcements, [announcements, filter, reads]);
  async function markRead(id: string) {
    const { error } = await supabase.rpc('mark_announcement_read', { target_announcement_id: id });
    if (error) setMessage(error.message); else setReads((current) => new Set(current).add(id));
  }
  async function markAllRead() {
    const { error } = await supabase.rpc('mark_all_announcements_read');
    if (error) setMessage(error.message);
    else {
      setReads(new Set(announcements.map((item) => item.id)));
      setMessage('All current announcements have been marked as read.');
    }
  }
  if (loading) return <section className="communication-state">Loading your communication centre…</section>;
  return <section className="communication-page"><header className="communication-header"><div><p className="eyebrow">Member portal</p><h1>Communication Centre</h1><p>Official news and notices for the SANGAJOR community.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    <div className="communication-toolbar"><div><strong>{announcements.filter((item) => !reads.has(item.id)).length}</strong><span> unread announcement(s)</span></div><div className="communication-toolbar-actions"><div role="group" aria-label="Filter announcements"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread</button></div>{announcements.some((item) => !reads.has(item.id)) && <button className="mark-all-read" onClick={markAllRead}><Check size={16}/> Mark all read</button>}</div></div>
    {message && <p className="communication-message" role="alert">{message}</p>}
    <div className="announcement-list">{visible.map((item) => { const read = reads.has(item.id); return <article className={`announcement-card priority-${item.priority} ${read ? 'is-read' : ''}`} key={item.id}><div className="announcement-icon">{read ? <Check /> : <Bell />}</div><div><div className="announcement-meta"><span className="priority-label">{item.priority}</span><span>{item.audience === 'executives' ? 'Executive notice' : 'All members'}</span><time>{publishedDate(item.published_at)}</time></div><h2>{item.title}</h2><p>{item.body}</p>{!read && <button className="mark-read" onClick={() => markRead(item.id)}><Check size={16}/> Mark as read</button>}</div></article>; })}</div>
    {!visible.length && <div className="communication-empty"><Megaphone size={34}/><h2>{filter === 'unread' ? 'You are all caught up' : 'No announcements yet'}</h2><p>{filter === 'unread' ? 'Every current announcement has been read.' : 'Official member notices will appear here.'}</p></div>}
  </section>;
}
