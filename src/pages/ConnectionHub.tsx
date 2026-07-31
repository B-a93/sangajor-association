import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MessageCircle, Search, UserCheck, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ConnectionMessage, ConnectionProfile, MemberConnection } from '../types/connection';
import './ConnectionHub.css';

export function ConnectionHub() {
  const [me, setMe] = useState('');
  const [members, setMembers] = useState<ConnectionProfile[]>([]);
  const [connections, setConnections] = useState<MemberConnection[]>([]);
  const [messages, setMessages] = useState<ConnectionMessage[]>([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user.id;
    if (!userId) { window.location.hash = '/login'; return; }
    setMe(userId);
    const [profiles, links] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url, role').eq('is_active', true).neq('id', userId).order('full_name'),
      supabase.from('member_connections').select('id, requester_id, recipient_id, status, created_at, requester:profiles!member_connections_requester_id_fkey(id, full_name, avatar_url, role), recipient:profiles!member_connections_recipient_id_fkey(id, full_name, avatar_url, role)').order('created_at', { ascending: false }),
    ]);
    if (profiles.error || links.error) setNotice('The Connection Hub could not be loaded. Please try again.');
    else { setMembers((profiles.data ?? []) as ConnectionProfile[]); setConnections((links.data ?? []) as unknown as MemberConnection[]); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    void supabase.from('connection_messages').select('*').eq('connection_id', selected).order('created_at').then(({ data, error }) => {
      if (error) setNotice('Messages could not be loaded.'); else setMessages((data ?? []) as ConnectionMessage[]);
      if (!error) void supabase.rpc('mark_connection_messages_read', { target_connection_id: selected });
    });
  }, [selected]);

  const connectedIds = new Set(connections.filter((item) => item.status !== 'declined').flatMap((item) => [item.requester_id, item.recipient_id]));
  const discover = useMemo(() => members.filter((member) => !connectedIds.has(member.id) && member.full_name.toLowerCase().includes(search.toLowerCase())), [members, connections, search]);
  const accepted = connections.filter((item) => item.status === 'accepted');
  const requests = connections.filter((item) => item.status === 'pending' && item.recipient_id === me);
  const other = (connection: MemberConnection) => connection.requester_id === me ? connection.recipient : connection.requester;

  async function connect(memberId: string) {
    const { error } = await supabase.from('member_connections').insert({ requester_id: me, recipient_id: memberId });
    setNotice(error ? error.message : 'Connection request sent.'); if (!error) await load();
  }
  async function respond(id: string, response: 'accepted' | 'declined') {
    const { error } = await supabase.rpc('respond_to_connection', { target_connection_id: id, response });
    setNotice(error ? error.message : `Request ${response}.`); if (!error) await load();
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (!draft.trim() || !selected) return;
    const { error } = await supabase.from('connection_messages').insert({ connection_id: selected, sender_id: me, body: draft.trim() });
    if (error) setNotice(error.message); else { setDraft(''); const { data } = await supabase.from('connection_messages').select('*').eq('connection_id', selected).order('created_at'); setMessages((data ?? []) as ConnectionMessage[]); }
  }

  if (loading) return <section className="connection-state">Opening the Connection Hub…</section>;
  return <section className="connection-page">
    <header className="connection-header"><div><p className="eyebrow">MySANGAJOR Digital Village</p><h1>SANGAJOR Connection Hub</h1><p>Reconnect safely, grow your network and have private conversations with fellow members.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {notice && <p className="connection-notice" role="status">{notice}</p>}
    {requests.length > 0 && <section><h2><UserPlus size={21}/> Connection requests</h2><div className="connection-cards">{requests.map((item) => <article key={item.id}><Avatar profile={item.requester}/><div><strong>{item.requester.full_name}</strong><span>{item.requester.role.replaceAll('_', ' ')}</span></div><div className="connection-actions"><button onClick={() => respond(item.id, 'accepted')}>Accept</button><button onClick={() => respond(item.id, 'declined')}>Decline</button></div></article>)}</div></section>}
    <div className="connection-layout"><section><h2><UserCheck size={21}/> My connections</h2>{accepted.length ? <div className="connection-cards">{accepted.map((item) => <article className={selected === item.id ? 'selected' : ''} key={item.id}><Avatar profile={other(item)}/><div><strong>{other(item).full_name}</strong><span>{other(item).role.replaceAll('_', ' ')}</span></div><button aria-label={`Message ${other(item).full_name}`} onClick={() => setSelected(item.id)}><MessageCircle size={19}/></button></article>)}</div> : <p className="connection-empty">Accepted connections will appear here.</p>}</section>
      <section className="conversation"><h2>Private conversation</h2>{selected ? <><div className="message-list" aria-live="polite">{messages.length ? messages.map((message) => <p className={message.sender_id === me ? 'mine' : ''} key={message.id}>{message.body}<time>{new Date(message.created_at).toLocaleString()}</time></p>) : <span>Start the conversation with a friendly hello.</span>}</div><form onSubmit={send}><label htmlFor="connection-message">Message</label><textarea id="connection-message" maxLength={2000} required value={draft} onChange={(event) => setDraft(event.target.value)}/><button className="primary-button">Send message</button></form></> : <p className="connection-empty">Choose a connection to view your conversation.</p>}</section></div>
    <section><h2><Search size={21}/> Discover members</h2><label className="member-search"><span>Search by name</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a classmate"/></label><div className="connection-cards discover">{discover.map((member) => <article key={member.id}><Avatar profile={member}/><div><strong>{member.full_name}</strong><span>{member.role.replaceAll('_', ' ')}</span></div><button onClick={() => connect(member.id)}>Connect</button></article>)}</div>{!discover.length && <p className="connection-empty">No new members match your search.</p>}</section>
  </section>;
}

function Avatar({ profile }: { profile: ConnectionProfile }) {
  return profile.avatar_url ? <img className="connection-avatar" src={profile.avatar_url} alt="" loading="lazy" decoding="async"/> : <span className="connection-avatar fallback" aria-hidden="true">{profile.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>;
}
