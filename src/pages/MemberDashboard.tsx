import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isActiveExecutive, roleLabel, type AuthenticatedProfile } from '../lib/executiveAccess';
import { supabase } from '../lib/supabase';
import './MemberDashboard.css';

type ExecutiveTool = { allowed: boolean; label: string; description: string; href: string; link: string };

export function MemberDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthenticatedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [canInvite, setCanInvite] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canManageFinances, setCanManageFinances] = useState(false);
  const [canManageEvents, setCanManageEvents] = useState(false);
  const [canManageCommunications, setCanManageCommunications] = useState(false);
  const [canManageDocuments, setCanManageDocuments] = useState(false);
  const [canManageVolunteers, setCanManageVolunteers] = useState(false);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);
  const [canModerateVillage, setCanModerateVillage] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        // The existing Members row is authoritative; Auth metadata is deliberately not used for authorization.
        const result = await supabase.from('Members')
          .select('id, first_name, last_name, email, membership_number, role, status')
          .eq('auth_user_id', data.session.user.id).maybeSingle();
        if (result.error || !result.data) {
          setProfileError('Your Association profile could not be loaded. Executive tools are unavailable until your profile is verified.');
        } else {
          const member = result.data;
          const currentProfile: AuthenticatedProfile = {
            id: String(member.id),
            full_name: [member.first_name, member.last_name].filter(Boolean).join(' ').trim(),
            email: member.email,
            membership_number: member.membership_number,
            role: member.role as AuthenticatedProfile['role'],
            is_active: member.status === 'active',
          };
          setProfile(currentProfile);
          setCanInvite(isActiveExecutive(currentProfile));
        }
        const checks = await Promise.all([
          supabase.rpc('can_manage_members'), supabase.rpc('can_manage_finances'),
          supabase.rpc('can_manage_events'), supabase.rpc('can_manage_announcements'),
          supabase.rpc('can_manage_documents'), supabase.rpc('can_manage_volunteers'),
          supabase.rpc('can_view_executive_analytics'), supabase.rpc('can_moderate_village'),
          supabase.rpc('unread_announcement_count'),
        ]);
        setCanManage(Boolean(checks[0].data)); setCanManageFinances(Boolean(checks[1].data));
        setCanManageEvents(Boolean(checks[2].data)); setCanManageCommunications(Boolean(checks[3].data));
        setCanManageDocuments(Boolean(checks[4].data)); setCanManageVolunteers(Boolean(checks[5].data));
        setCanViewAnalytics(Boolean(checks[6].data)); setCanModerateVillage(Boolean(checks[7].data));
        setUnreadAnnouncements(Number(checks[8].data ?? 0));
      }
      setLoading(false);
      if (!data.session) window.location.hash = '/login';
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession); if (!nextSession) window.location.hash = '/login';
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() { await supabase.auth.signOut(); window.location.hash = '/'; }
  if (loading || !session) return <section className="dashboard-loading">Loading your member portal…</section>;

  const displayName = profile?.full_name || session.user.user_metadata.full_name || session.user.email || 'Member';
  const isExecutive = isActiveExecutive(profile);
  const executiveTools: ExecutiveTool[] = [
    { allowed: canInvite, label: 'Invitations', description: 'Invite and manage Association members', href: '#/dashboard/invitations', link: 'Member invitations' },
    { allowed: canManage, label: 'Administration', description: 'Manage member access and executive roles', href: '#/dashboard/administration', link: 'Member management' },
    { allowed: canManageFinances, label: 'Finance', description: 'Manage dues periods, receipts and reporting', href: '#/dashboard/finance', link: 'Financial management' },
    { allowed: canManageEvents, label: 'Programme', description: 'Publish events and manage attendance', href: '#/dashboard/events/manage', link: 'Event management' },
    { allowed: canManageCommunications, label: 'Communications', description: 'Publish notices and monitor readership', href: '#/dashboard/communications/manage', link: 'Manage communications' },
    { allowed: canManageDocuments, label: 'Documents', description: 'Upload, version and publish Association files', href: '#/dashboard/documents/manage', link: 'Manage documents' },
    { allowed: canManageVolunteers, label: 'Volunteers', description: 'Manage committees, applications and service hours', href: '#/dashboard/volunteering/manage', link: 'Manage volunteers' },
    { allowed: canViewAnalytics, label: 'Intelligence', description: 'Monitor membership, finance and engagement trends', href: '#/dashboard/analytics', link: 'Executive analytics' },
    { allowed: canModerateVillage, label: 'Community safety', description: 'Review and resolve Village Square reports', href: '#/dashboard/village/moderation', link: 'Village moderation' },
  ];

  return <section className="member-dashboard">
    <div className="dashboard-heading"><div><p className="eyebrow">MySANGAJOR Digital Village</p><h1>Welcome, {displayName}</h1><p>Your secure Association member portal is now connected.</p></div><button className="secondary-button" type="button" onClick={signOut}>Sign out</button></div>
    {profileError && <p className="dashboard-alert" role="alert">{profileError}</p>}
    <h2>Member tools</h2>
    <div className="dashboard-grid">
      <article><span>AI Assistant</span><strong>Ask questions and automate helpful reminders</strong><a href="#/dashboard/assistant">Ask Sanga</a></article>
      <article><span>Village Square</span><strong>Share updates and celebrate our community</strong><a href="#/dashboard/village">Enter the Village Square</a></article>
      <article><span>Profile</span><strong>Complete or update your member profile</strong><a href="#/dashboard/profile">Open profile</a></article>
      <article><span>Events</span><strong>RSVP and review your attendance</strong><a href="#/dashboard/events">View member events</a></article>
      <article><span>Directory</span><strong>Connect with fellow members</strong><a href="#/dashboard/members">Browse members</a></article>
      <article><span>Connection Hub</span><strong>Build connections and message classmates privately</strong><a href="#/dashboard/connections">Open Connection Hub</a></article>
      <article><span>Communication</span>{unreadAnnouncements > 0 && <span className="notification-badge" aria-label={`${unreadAnnouncements} unread announcements`}>{unreadAnnouncements > 99 ? '99+' : unreadAnnouncements}</span>}<strong>Read official member announcements</strong><a href="#/dashboard/communications">Open communication centre</a></article>
      <article><span>Knowledge</span><strong>Browse minutes, policies, forms and resources</strong><a href="#/dashboard/documents">Open Knowledge Centre</a></article>
      <article><span>Service</span><strong>Join committees and volunteer for Association projects</strong><a href="#/dashboard/volunteering">Explore opportunities</a></article>
      <article><span>Contributions</span><strong>Track your dues and payment history</strong><a href="#/dashboard/dues">View my dues</a></article>
    </div>
    {isExecutive && <section className="executive-portal" aria-labelledby="executive-portal-title"><div><p className="eyebrow">Authorized office</p><h2 id="executive-portal-title">Executive Portal</h2><p>{roleLabel(profile!.role)} · tools shown below are limited to this office.</p></div><div className="dashboard-grid">{executiveTools.filter((tool) => tool.allowed).map((tool) => <article key={tool.href}><span>{tool.label}</span><strong>{tool.description}</strong><a href={tool.href}>{tool.link}</a></article>)}</div></section>}
  </section>;
}
