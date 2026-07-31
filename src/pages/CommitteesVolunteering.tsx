import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Committee, CommitteeMembership, VolunteerApplication, VolunteerOpportunity } from '../types/committee';
import './CommitteesVolunteering.css';

const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function CommitteesVolunteering() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [memberships, setMemberships] = useState<CommitteeMembership[]>([]);
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { window.location.hash = '/login'; return; }
    const [committeeResult, membershipResult, opportunityResult, applicationResult] = await Promise.all([
      supabase.from('committees').select('*').eq('status', 'active').order('name'),
      supabase.from('committee_memberships').select('*, profiles(full_name, membership_number)').order('joined_at'),
      supabase.from('volunteer_opportunities').select('*, committees(name)').eq('status', 'open').order('starts_at'),
      supabase.from('volunteer_applications').select('*'),
    ]);
    if ([committeeResult, membershipResult, opportunityResult, applicationResult].some((result) => result.error)) setMessage('Committee and volunteer information could not be loaded.');
    else {
      setCommittees((committeeResult.data ?? []) as Committee[]);
      setMemberships((membershipResult.data ?? []) as CommitteeMembership[]);
      setOpportunities((opportunityResult.data ?? []) as VolunteerOpportunity[]);
      setApplications((applicationResult.data ?? []) as VolunteerApplication[]);
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const applicationByOpportunity = useMemo(() => Object.fromEntries(applications.filter((item) => item.status !== 'withdrawn').map((item) => [item.opportunity_id, item])), [applications]);
  async function volunteer(opportunityId: string) {
    setBusy(opportunityId); setMessage('');
    const current = applicationByOpportunity[opportunityId];
    const { error } = current
      ? await supabase.rpc('withdraw_volunteer_application', { target_opportunity_id: opportunityId })
      : await supabase.rpc('apply_to_volunteer', { target_opportunity_id: opportunityId, application_note: null });
    setMessage(error ? error.message : current ? 'Your volunteer application was withdrawn.' : 'Thank you for volunteering. Your application is awaiting review.');
    if (!error) await load();
    setBusy('');
  }
  if (loading) return <section className="volunteer-state">Loading committees and opportunities…</section>;
  return <section className="volunteer-page">
    <header className="volunteer-header"><div><p className="eyebrow">Member portal</p><h1>Committees &amp; Volunteering</h1><p>Meet the teams advancing our mission and find meaningful ways to contribute.</p></div><a className="secondary-button" href="#/dashboard">Back to dashboard</a></header>
    {message && <p className="volunteer-message" role="status">{message}</p>}
    <h2>Association committees</h2>
    {committees.length ? <div className="committee-grid">{committees.map((committee) => {
      const team = memberships.filter((item) => item.committee_id === committee.id);
      return <article key={committee.id}><span className="committee-count"><Users size={16}/>{team.length} members</span><h3>{committee.name}</h3><p>{committee.description}</p>{team.length > 0 && <ul>{team.map((member) => <li key={member.id}><strong>{member.profiles?.full_name ?? 'Association member'}</strong><span>{member.role}</span></li>)}</ul>}</article>;
    })}</div> : <div className="volunteer-empty">Committee details will appear here.</div>}
    <h2>Open volunteer opportunities</h2>
    {opportunities.length ? <div className="opportunity-grid">{opportunities.map((item) => {
      const application = applicationByOpportunity[item.id];
      return <article key={item.id}><span className="opportunity-owner">{item.committees?.name ?? 'Association-wide'}</span><h3>{item.title}</h3><p>{item.description}</p><div className="opportunity-meta"><span><CalendarDays size={16}/>{formatDate(item.starts_at)}</span>{item.location && <span><MapPin size={16}/>{item.location}</span>}{item.capacity && <span><Users size={16}/>{item.capacity} places</span>}</div>{application && <p className={`application-status ${application.status}`}>Application: {application.status}</p>}<button className={application ? 'secondary-button' : 'primary-button'} disabled={busy === item.id || application?.status === 'approved'} onClick={() => volunteer(item.id)}>{busy === item.id ? 'Working…' : application ? application.status === 'approved' ? 'Application approved' : 'Withdraw application' : 'Volunteer now'}</button></article>;
    })}</div> : <div className="volunteer-empty">There are no open volunteer opportunities right now.</div>}
  </section>;
}
