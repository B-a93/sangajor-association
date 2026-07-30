import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './MemberDashboard.css';

export function MemberDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
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
        <article><span>Profile</span><strong>Complete your member profile</strong><a href="#/dashboard">Open profile</a></article>
        <article><span>Events</span><strong>View upcoming Association events</strong><a href="#/events">View events</a></article>
        <article><span>Directory</span><strong>Connect with fellow members</strong><span>Coming next</span></article>
        <article><span>Contributions</span><strong>Track your payment history</strong><span>Coming soon</span></article>
      </div>
    </section>
  );
}
