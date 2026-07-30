import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import './MemberAdministration.css';

type AppRole = 'member' | 'chairman' | 'vice_chairperson' | 'secretary_general' | 'assistant_secretary_general' | 'treasurer' | 'assistant_treasurer' | 'auditor_general' | 'assistant_auditor_general' | 'ipro' | 'assistant_ipro' | 'programme_officer' | 'assistant_programme_officer' | 'adviser' | 'admin';
type ManagedMember = { id: string; full_name: string; email: string | null; phone: string | null; membership_number: string | null; role: AppRole; is_active: boolean; created_at: string };

const roles: AppRole[] = ['member', 'chairman', 'vice_chairperson', 'secretary_general', 'assistant_secretary_general', 'treasurer', 'assistant_treasurer', 'auditor_general', 'assistant_auditor_general', 'ipro', 'assistant_ipro', 'programme_officer', 'assistant_programme_officer', 'adviser', 'admin'];
const roleLabel = (role: string) => role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function MemberAdministration() {
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<ManagedMember | null>(null);
  const [draft, setDraft] = useState<{ role: AppRole; active: boolean; note: string }>({ role: 'member', active: true, note: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data: authorized } = await supabase.rpc('can_manage_members');
    setAllowed(Boolean(authorized));
    if (!authorized) return;
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone, membership_number, role, is_active, created_at').order('full_name');
    if (error) setMessage(error.message); else setMembers((data ?? []) as ManagedMember[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => members.filter((member) => {
    const matchesStatus = status === 'all' || member.is_active === (status === 'active');
    const haystack = `${member.full_name} ${member.email ?? ''} ${member.membership_number ?? ''} ${member.role}`.toLowerCase();
    return matchesStatus && haystack.includes(search.trim().toLowerCase());
  }), [members, search, status]);

  function openEditor(member: ManagedMember) {
    setEditing(member); setDraft({ role: member.role, active: member.is_active, note: '' }); setMessage('');
  }
  async function save() {
    if (!editing) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.rpc('update_member_administration', { target_member_id: editing.id, target_role: draft.role, target_active: draft.active, change_note: draft.note });
    setBusy(false);
    if (error) return setMessage(error.message);
    setEditing(null); setMessage(`${editing.full_name}'s account was updated.`); void load();
  }

  if (allowed === null) return <section className="admin-state">Checking administration access…</section>;
  if (!allowed) return <section className="admin-state"><div><h1>Access denied</h1><p>Member administration is restricted to the Chairman, Secretary General and administrators.</p><a href="#/dashboard">Return to dashboard</a></div></section>;

  return <section className="member-admin-page">
    <header className="member-admin-header"><div><p className="eyebrow">Executive administration</p><h1>Member Management</h1><p>Review accounts, manage access and assign Association roles.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    <div className="admin-summary"><div><strong>{members.length}</strong><span>Total members</span></div><div><strong>{members.filter((m) => m.is_active).length}</strong><span>Active</span></div><div><strong>{members.filter((m) => m.role !== 'member').length}</strong><span>Executives</span></div></div>
    <div className="admin-toolbar"><label>Search members<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, number or role" /></label><label>Account status<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><span>{visible.length} result{visible.length === 1 ? '' : 's'}</span></div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Member</th><th>Membership no.</th><th>Role</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map((member) => <tr key={member.id}><td><strong>{member.full_name}</strong><small>{member.email || member.phone || 'No contact details'}</small></td><td>{member.membership_number || 'Pending'}</td><td>{roleLabel(member.role)}</td><td><span className={`admin-badge ${member.is_active ? 'active' : 'inactive'}`}>{member.is_active ? 'Active' : 'Inactive'}</span></td><td><button onClick={() => openEditor(member)}>Manage</button></td></tr>)}</tbody></table>{visible.length === 0 && <p className="admin-empty">No members match these filters.</p>}</div>
    {editing && <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => !busy && setEditing(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="manage-member-title" onMouseDown={(e) => e.stopPropagation()}><h2 id="manage-member-title">Manage {editing.full_name}</h2><p>{editing.email || editing.membership_number || 'Association member'}</p><label>Association role<select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as AppRole })}>{roles.map((role) => <option value={role} key={role}>{roleLabel(role)}</option>)}</select></label><label className="admin-toggle"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Account is active</label><label>Change note (optional)<textarea rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Reason for this change" /></label><div><button className="secondary-button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save changes'}</button></div></section></div>}
  </section>;
}
