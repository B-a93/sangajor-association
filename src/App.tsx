import { useEffect, useState, type ReactElement } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { executives } from './data/executives';
import { useHashRoute } from './hooks/useHashRoute';
import { supabase } from './lib/supabase';
import { About } from './pages/About';
import { Auth } from './pages/Auth';
import { InvitationAcceptance } from './pages/InvitationAcceptance';
import { MemberInvitations } from './pages/MemberInvitations';
import { MemberAdministration } from './pages/MemberAdministration';
import { Contact } from './pages/Contact';
import { CommunicationAdministration } from './pages/CommunicationAdministration';
import { CommunicationCenter } from './pages/CommunicationCenter';
import { CommitteesVolunteering } from './pages/CommitteesVolunteering';
import { ConnectionHub } from './pages/ConnectionHub';
import { EditMemberProfile } from './pages/EditMemberProfile';
import { Events } from './pages/Events';
import { EventAdministration } from './pages/EventAdministration';
import { ExecutiveProfile } from './pages/ExecutiveProfile';
import { Focus } from './pages/Focus';
import { FinanceAdministration } from './pages/FinanceAdministration';
import { Gallery } from './pages/Gallery';
import { Home } from './pages/Home';
import { Journey } from './pages/Journey';
import { KnowledgeCenter } from './pages/KnowledgeCenter';
import { DocumentAdministration } from './pages/DocumentAdministration';
import { Leadership } from './pages/Leadership';
import { MemberDashboard } from './pages/MemberDashboard';
import { MemberEvents } from './pages/MemberEvents';
import { MemberDirectory } from './pages/MemberDirectory';
import { MemberDues } from './pages/MemberDues';
import { Membership } from './pages/Membership';
import { Updates } from './pages/Updates';
import { VolunteerAdministration } from './pages/VolunteerAdministration';
import './pages/MemberDirectory.css';

type MemberProfileRecord = {
  id: string;
  membership_number: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  occupation: string | null;
  profile_photo: string | null;
  status: string | null;
};

function MemberProfile({ memberId }: { memberId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<MemberProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadMember() {
      const { data: authData } = await supabase.auth.getSession();
      const currentSession = authData.session;

      if (!currentSession) {
        window.location.hash = '/login';
        return;
      }

      setSession(currentSession);

      const { data, error } = await supabase
        .from('members')
        .select('id, membership_number, first_name, last_name, country, occupation, profile_photo, status')
        .eq('id', memberId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) setMessage('This member profile could not be loaded. Please try again.');
      else if (!data) setMessage('This member profile is unavailable or does not exist.');
      else setMember(data);

      setLoading(false);
    }

    void loadMember();
  }, [memberId]);

  if (loading || !session) return <section className="member-profile-loading">Loading member profile…</section>;

  if (!member) {
    return (
      <section className="member-profile-page">
        <a className="secondary-button" href="#/dashboard/members">Back to directory</a>
        <div className="member-profile-state" role="alert">
          <h1>Profile unavailable</h1>
          <p>{message}</p>
        </div>
      </section>
    );
  }

  const fullName = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || 'Association member';
  const initials = `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`.toUpperCase() || 'SM';

  return (
    <section className="member-profile-page">
      <div className="member-profile-header">
        <div>
          <p className="eyebrow">MySANGAJOR Digital Village</p>
          <h1>Member Profile</h1>
        </div>
        <a className="secondary-button" href="#/dashboard/members">Back to directory</a>
      </div>

      <article className="member-profile-card">
        <div className="member-profile-photo-wrap">
          {member.profile_photo ? (
            <img className="member-profile-photo" src={member.profile_photo} alt={`${fullName} profile`} />
          ) : (
            <div className="member-profile-initials" aria-hidden="true">{initials}</div>
          )}
        </div>

        <div className="member-profile-details">
          <span className="member-profile-number">{member.membership_number || 'Membership number pending'}</span>
          <h2>{fullName}</h2>
          <p className="member-profile-occupation">{member.occupation || 'Occupation not provided'}</p>
          <dl className="member-profile-list">
            <div><dt>Country</dt><dd>{member.country || 'Not provided'}</dd></div>
            <div><dt>Status</dt><dd><span className="member-status-badge">{member.status || 'Active'}</span></dd></div>
          </dl>
        </div>
      </article>
    </section>
  );
}

const pages: Record<string, ReactElement> = {
  '/': <Home />,
  '/about': <About />,
  '/leadership': <Leadership />,
  '/membership': <Membership />,
  '/focus': <Focus />,
  '/events': <Events />,
  '/gallery': <Gallery />,
  '/updates': <Updates />,
  '/journey': <Journey />,
  '/contact': <Contact />,
  '/login': <Auth />,
  '/accept-invitation': <InvitationAcceptance />,
  '/dashboard': <MemberDashboard />,
  '/dashboard/profile': <EditMemberProfile />,
  '/dashboard/members': <MemberDirectory />,
  '/dashboard/invitations': <MemberInvitations />,
  '/dashboard/administration': <MemberAdministration />,
  '/dashboard/dues': <MemberDues />,
  '/dashboard/finance': <FinanceAdministration />,
  '/dashboard/events': <MemberEvents />,
  '/dashboard/events/manage': <EventAdministration />,
  '/dashboard/communications': <CommunicationCenter />,
  '/dashboard/communications/manage': <CommunicationAdministration />,
  '/dashboard/documents': <KnowledgeCenter />,
  '/dashboard/documents/manage': <DocumentAdministration />,
  '/dashboard/volunteering': <CommitteesVolunteering />,
  '/dashboard/volunteering/manage': <VolunteerAdministration />,
  '/dashboard/connections': <ConnectionHub />,
};

export default function App() {
  const route = useHashRoute();
  const leadershipProfileMatch = route.match(/^\/leadership\/([^/]+)$/);
  const memberProfileMatch = route.match(/^\/dashboard\/members\/([^/]+)$/);

  let page: ReactElement;
  if (leadershipProfileMatch) {
    const executive = executives.find((item) => item.slug === leadershipProfileMatch[1]);
    page = executive ? <ExecutiveProfile executive={executive} /> : <Leadership />;
  } else if (memberProfileMatch) {
    page = <MemberProfile memberId={decodeURIComponent(memberProfileMatch[1])} />;
  } else {
    page = pages[route] ?? <Home />;
  }

  return (
    <div className="site-shell">
      <Header />
      <main id="top">{page}</main>
      <Footer />
    </div>
  );
}
