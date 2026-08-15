import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Invitation, InvitationStatus } from '../types/invitation';
import { executiveInvitationRoles } from '../lib/executiveInvitationRoles';
import './MemberInvitations.css';

const groups: Array<{ status: InvitationStatus; title: string }> = [
  { status: 'pending', title: 'Pending Invitations' },
  { status: 'accepted', title: 'Accepted Invitations' },
  { status: 'expired', title: 'Expired Invitations' },
  { status: 'cancelled', title: 'Cancelled Invitations' },
];
const emptyForm = { fullName: '', email: '', phone: '', membershipNumber: '', executiveOffice: '' };

export function whatsappShareUrl(phone: string, fullName: string, invitationUrl: string) {
  const number = phone.replace(/\D/g, '');
  const message = `Hello ${fullName}, you are invited to activate your SANGAJOR member account. This secure, single-use link expires in 7 days: ${invitationUrl}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function MemberInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const { data: allowed } = await supabase.rpc('can_manage_invitations');
    setAuthorized(Boolean(allowed));
    if (!allowed) return;
    await supabase.rpc('expire_invitations');
    const { data, error } = await supabase.from('invitations').select('id, full_name, email, phone, membership_number, role, executive_office, executive_position, status, expires_at, accepted_at, created_at').order('created_at', { ascending: false });
    if (error) setMessage(error.message); else setInvitations((data ?? []) as Invitation[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.email.trim() && !form.phone.trim()) return setMessage('Enter an email or WhatsApp / phone number.');
    setBusy(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('manage-invitation', { body: { action: 'create', ...form } });
    setBusy(false);
    if (error || data?.error) return setMessage(data?.error ?? error?.message ?? 'Invitation could not be created.');
    setLinks((current) => ({ ...current, [data.invitation_id]: data.invitation_url }));
    setMessage(data.email_sent ? 'Invitation email sent. The secure link is also available to copy below.' : 'Invitation created. No automated WhatsApp delivery occurred; copy or share the secure link below.');
    setForm(emptyForm); setShowForm(false); void load();
  }

  async function action(actionName: 'cancel' | 'resend' | 'convert-membership-login', id: string) {
    setBusy(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('manage-invitation', { body: { action: actionName, invitationId: id } });
    setBusy(false);
    if (!error && !data?.error && data?.invitation_url) setLinks((current) => ({ ...current, [id]: data.invitation_url }));
    setMessage(data?.error ?? error?.message ?? (actionName === 'cancel' ? 'Invitation cancelled.' : actionName === 'convert-membership-login' ? `Membership login enabled: ${data.membership_number}.` : data.email_sent ? 'Invitation email resent; a new secure link is available.' : 'A new secure link was created. Share it manually.'));
    if (!error && !data?.error) void load();
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage('Invitation link copied.');
  }

  if (authorized === null) return <section className="invitations-page">Checking permissions…</section>;
  if (!authorized) return <section className="invitations-page"><div className="invitation-empty"><h1>Access denied</h1><p>Only authorized executives can manage invitations.</p><a href="#/dashboard">Return to dashboard</a></div></section>;

  return <section className="invitations-page">
    <header className="invitations-header"><div><p className="eyebrow">Executive administration</p><h1>Member Invitations</h1><p>Invite by email or share a secure link through WhatsApp.</p></div><button className="primary-button" onClick={() => setShowForm((value) => !value)}>Invite Member</button></header>
    {showForm && <form className="invitation-form" onSubmit={invite}>
      <label>Full Name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
      <label>Email (optional)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>WhatsApp / Phone (optional)<input type="tel" placeholder="+2201234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><small>Use international format. Email or phone is required.</small></label>
      <label>Membership Number (optional)<input value={form.membershipNumber} onChange={(e) => setForm({ ...form, membershipNumber: e.target.value })} /></label>
      <label>Invitation Type<select value={form.executiveOffice} onChange={(e) => setForm({ ...form, executiveOffice: e.target.value })}><option value="">Member</option>{executiveInvitationRoles.map(([office, position]) => <option key={office} value={office}>{position}</option>)}</select><small>Select an office to grant executive dashboard access when accepted.</small></label>
      <button className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Send Invitation'}</button>
    </form>}
    {message && <p className="invitation-message" role="status">{message}</p>}
    {groups.map(({ status, title }) => { const items = invitations.filter((item) => item.status === status); return <section className="invitation-section" key={status}><h2>{title} <span>{items.length}</span></h2>
      {items.length === 0 ? <p className="invitation-empty">No {status} invitations.</p> : <div className="invitation-list">{items.map((item) => <article key={item.id}><div><strong>{item.full_name}</strong>{item.email && <a href={`mailto:${item.email}`}>{item.email}</a>}{item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}<small>{item.membership_number || 'Membership number assigned on activation'} · {item.executive_position ?? 'Member'}</small></div><div className="invitation-meta"><span className={`invitation-status ${item.status}`}>{item.status}</span><small>{status === 'accepted' ? `Accepted ${new Date(item.accepted_at!).toLocaleDateString()}` : `Expires ${new Date(item.expires_at).toLocaleDateString()}`}</small>{links[item.id] && <div className="share-actions"><button disabled={busy} onClick={() => void copyLink(links[item.id])}>Copy Invitation Link</button>{item.phone && <a target="_blank" rel="noreferrer" href={whatsappShareUrl(item.phone, item.full_name, links[item.id])}>Send via WhatsApp</a>}</div>}{status === 'accepted' && !item.email && <button disabled={busy} onClick={() => void action('convert-membership-login', item.id)}>Enable Membership Login</button>}{status !== 'accepted' && <div><button disabled={busy} onClick={() => void action('resend', item.id)}>Create New Link</button>{status === 'pending' && <button disabled={busy} onClick={() => void action('cancel', item.id)}>Cancel</button>}</div>}</div></article>)}</div>}
    </section>; })}
  </section>;
}
