import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './MemberDashboard.css';

export function MemberDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canInvite, setCanInvite] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canManageFinances, setCanManageFinances] = useState(false);
  const [canManageEvents, setCanManageEvents] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void supabase.rpc('is_executive').then(({ data: authorized }) => setCanInvite(Boolean(authorized)));
        void supabase.rpc('can_manage_members').then(({ data: authorized }) => setCanManage(Boolean(authorized)));
        void supabase.rpc('can_manage_finances').then(({ data: authorized }) => setCanManageFinances(Boolean(authorized)));
        void supabase.rpc('can_manage_events').then(({ data: authorized }) => setCanManageEvents(Boolean(authorized)));
      }
      setLoading(false);
      if (!data.session) window.location.hash = '/login';
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) window.location.hash = '/login';
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.hash = '/';
  }

  if (loading || !session) {
    return <section className="dashboard-loading">Loading your member portal…</section>;
  }

  const displayName = session.user.user_metadata.full_name || session.user.email || 'Member';

  return (
    <section className="member-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">MySANGAJOR Digital Village</p>
          <h1>Welcome, {displayName}</h1>
          <p>Your secure Association member portal is now connected.</p>
        </div>
        <button className="secondary-button" type="button" onClick={signOut}>Sign out</button>
      </div>

      <div className="dashboard-grid">
        <article><span>Profile</span><strong>Complete or update your member profile</strong><a href="#/dashboard/profile">Open profile</a></article>
        <article><span>Events</span><strong>RSVP and review your attendance</strong><a href="#/dashboard/events">View member events</a></article>
        <article><span>Directory</span><strong>Connect with fellow members</strong><a href="#/dashboard/members">Browse members</a></article>
        {canInvite && <article><span>Executive</span><strong>Invite and manage Association members</strong><a href="#/dashboard/invitations">Member invitations</a></article>}
        {canManage && <article><span>Administration</span><strong>Manage member access and executive roles</strong><a href="#/dashboard/administration">Member management</a></article>}
        <article><span>Contributions</span><strong>Track your dues and payment history</strong><a href="#/dashboard/dues">View my dues</a></article>
        {canManageFinances && <article><span>Finance</span><strong>Manage dues periods, receipts and reporting</strong><a href="#/dashboard/finance">Financial management</a></article>}
        {canManageEvents && <article><span>Programme</span><strong>Publish events and manage attendance</strong><a href="#/dashboard/events/manage">Event management</a></article>}
      </div>
    </section>
  );
}
