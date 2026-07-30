import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Invitation, InvitationStatus } from '../types/invitation';
import './MemberInvitations.css';

const groups: Array<{ status: InvitationStatus; title: string }> = [
  { status: 'pending', title: 'Pending Invitations' },
  { status: 'accepted', title: 'Accepted Invitations' },
  { status: 'expired', title: 'Expired Invitations' },
];

export function MemberInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', membershipNumber: '', role: 'member' });

  const load = useCallback(async () => {
    const { data: allowed } = await supabase.rpc('is_executive');
    setAuthorized(Boolean(allowed));
    if (!allowed) return;
    await supabase.rpc('expire_invitations');
    const { data, error } = await supabase.from('invitations').select('id, full_name, email, membership_number, role, status, expires_at, accepted_at, created_at').order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else setInvitations((data ?? []) as Invitation[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('manage-invitation', { body: { action: 'create', ...form } });
    setBusy(false);
    if (error || data?.error) return setMessage(data?.error ?? error?.message ?? 'Invitation could not be sent.');
    setMessage(data.email_sent ? 'Invitation sent.' : `Invitation created. Email delivery is not configured; copy this link: ${data.invitation_url}`);
    setForm({ fullName: '', email: '', membershipNumber: '', role: 'member' }); setShowForm(false); void load();
  }

  async function action(actionName: 'cancel' | 'resend', id: string) {
    setBusy(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('manage-invitation', { body: { action: actionName, invitationId: id } });
    setBusy(false);
    setMessage(data?.error ?? error?.message ?? (actionName === 'cancel' ? 'Invitation cancelled.' : data.email_sent ? 'Invitation resent.' : `New invitation link: ${data.invitation_url}`));
    if (!error && !data?.error) void load();
  }

  if (authorized === null) return <section className="invitations-page">Checking permissions…</section>;
  if (!authorized) return <section className="invitations-page"><div className="invitation-empty"><h1>Access denied</h1><p>Only authorized executives can manage invitations.</p><a href="#/dashboard">Return to dashboard</a></div></section>;

  return <section className="invitations-page">
    <header className="invitations-header"><div><p className="eyebrow">Executive administration</p><h1>Member Invitations</h1><p>Invite new members and monitor their account activation.</p></div><button className="primary-button" onClick={() => setShowForm((value) => !value)}>Invite Member</button></header>
    {showForm && <form className="invitation-form" onSubmit={invite}>
      <label>Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
      <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Membership number (optional)<input value={form.membershipNumber} onChange={(e) => setForm({ ...form, membershipNumber: e.target.value })} /></label>
      <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="member">Member</option><option value="admin">Admin</option><option value="secretary_general">Secretary General</option><option value="chairman">Chairman</option></select></label>
      <button className="primary-button" disabled={busy}>Send invitation</button>
    </form>}
    {message && <p className="invitation-message" role="status">{message}</p>}
    {groups.map(({ status, title }) => { const items = invitations.filter((item) => item.status === status); return <section className="invitation-section" key={status}><h2>{title} <span>{items.length}</span></h2>
      {items.length === 0 ? <p className="invitation-empty">No {status} invitations.</p> : <div className="invitation-list">{items.map((item) => <article key={item.id}><div><strong>{item.full_name}</strong><a href={`mailto:${item.email}`}>{item.email}</a><small>{item.membership_number || 'No membership number'} · {item.role.replaceAll('_', ' ')}</small></div><div className="invitation-meta"><span className={`invitation-status ${item.status}`}>{item.status}</span><small>{status === 'accepted' ? `Accepted ${new Date(item.accepted_at!).toLocaleDateString()}` : `Expires ${new Date(item.expires_at).toLocaleDateString()}`}</small>{status !== 'accepted' && <div><button disabled={busy} onClick={() => void action('resend', item.id)}>Resend</button>{status === 'pending' && <button disabled={busy} onClick={() => void action('cancel', item.id)}>Cancel</button>}</div>}</div></article>)}</div>}
    </section>; })}
  </section>;
}
