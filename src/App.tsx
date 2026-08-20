import { lazy, Suspense, useEffect, useState, type ReactElement } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { PWAExperience } from './components/pwa/PWAExperience';
import { AssistantErrorBoundary } from './components/AssistantErrorBoundary';
import { executives } from './data/executives';
import { useHashRoute } from './hooks/useHashRoute';
import { supabase } from './lib/supabase';
import './pages/MemberDirectory.css';

// Pages are loaded on demand so mobile visitors only download the route they open.
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })));
const Auth = lazy(() => import('./pages/Auth').then((module) => ({ default: module.Auth })));
const InvitationAcceptance = lazy(() => import('./pages/InvitationAcceptance').then((module) => ({ default: module.InvitationAcceptance })));
const MemberInvitations = lazy(() => import('./pages/MemberInvitations').then((module) => ({ default: module.MemberInvitations })));
const MemberAdministration = lazy(() => import('./pages/MemberAdministration').then((module) => ({ default: module.MemberAdministration })));
const Contact = lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })));
const ContactEnquiries = lazy(() => import('./pages/ContactEnquiries').then((module) => ({ default: module.ContactEnquiries })));
const CommunicationAdministration = lazy(() => import('./pages/CommunicationAdministration').then((module) => ({ default: module.CommunicationAdministration })));
const CommunicationCenter = lazy(() => import('./pages/CommunicationCenter').then((module) => ({ default: module.CommunicationCenter })));
const CommitteesVolunteering = lazy(() => import('./pages/CommitteesVolunteering').then((module) => ({ default: module.CommitteesVolunteering })));
const ConnectionHub = lazy(() => import('./pages/ConnectionHub').then((module) => ({ default: module.ConnectionHub })));
const SkillsExchange = lazy(() => import('./pages/ConnectionHub').then((module) => ({ default: module.SkillsExchange })));
const DigitalIncomeLesson = lazy(() => import('./pages/DigitalIncomeLesson').then((module) => ({ default: module.DigitalIncomeLesson })));
const DigitalIncomeCourseDashboard = lazy(() => import('./pages/DigitalIncomeCourse').then((module) => ({ default: module.DigitalIncomeCourseDashboard })));
const DigitalIncomeCourseLesson = lazy(() => import('./pages/DigitalIncomeCourse').then((module) => ({ default: module.DigitalIncomeCourseLesson })));
const DigitalIncomeFinalAssessment = lazy(() => import('./pages/DigitalIncomeCourse').then((module) => ({ default: module.DigitalIncomeFinalAssessment })));
const EverydayDigitalTechnologySkillsDashboard = lazy(() => import('./pages/EverydayDigitalTechnologySkillsCourse').then((module) => ({ default: module.EverydayDigitalTechnologySkillsDashboard })));
const EverydayDigitalTechnologySkillsLesson = lazy(() => import('./pages/EverydayDigitalTechnologySkillsCourse').then((module) => ({ default: module.EverydayDigitalTechnologySkillsLesson })));
const EverydayDigitalTechnologySkillsFinalAssessment = lazy(() => import('./pages/EverydayDigitalTechnologySkillsCourse').then((module) => ({ default: module.EverydayDigitalTechnologySkillsFinalAssessment })));
const ChairmanCertificateApproval = lazy(() => import('./pages/ChairmanCertificateApproval').then((module) => ({ default: module.ChairmanCertificateApproval })));
const TeachingRequests = lazy(() => import('./pages/TeachingRequests').then((module) => ({ default: module.TeachingRequests })));
const EditMemberProfile = lazy(() => import('./pages/EditMemberProfile').then((module) => ({ default: module.EditMemberProfile })));
const Events = lazy(() => import('./pages/Events').then((module) => ({ default: module.Events })));
const EventAdministration = lazy(() => import('./pages/EventAdministration').then((module) => ({ default: module.EventAdministration })));
const ExecutiveProfile = lazy(() => import('./pages/ExecutiveProfile').then((module) => ({ default: module.ExecutiveProfile })));
const ExecutiveAnalytics = lazy(() => import('./pages/ExecutiveAnalytics').then((module) => ({ default: module.ExecutiveAnalytics })));
const ExecutiveOfficeProgress = lazy(() => import('./pages/ExecutiveOfficeProgress').then((module) => ({ default: module.ExecutiveOfficeProgress })));
const SmartAssistant = lazy(() => import('./pages/SmartAssistant').then((module) => ({ default: module.SmartAssistant })));
const Focus = lazy(() => import('./pages/Focus').then((module) => ({ default: module.Focus })));
const FinanceAdministration = lazy(() => import('./pages/FinanceAdministration').then((module) => ({ default: module.FinanceAdministration })));
const Gallery = lazy(() => import('./pages/Gallery').then((module) => ({ default: module.Gallery })));
const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Journey = lazy(() => import('./pages/Journey').then((module) => ({ default: module.Journey })));
const KnowledgeCenter = lazy(() => import('./pages/KnowledgeCenter').then((module) => ({ default: module.KnowledgeCenter })));
const DocumentAdministration = lazy(() => import('./pages/DocumentAdministration').then((module) => ({ default: module.DocumentAdministration })));
const Leadership = lazy(() => import('./pages/Leadership').then((module) => ({ default: module.Leadership })));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard').then((module) => ({ default: module.MemberDashboard })));
const MemberEvents = lazy(() => import('./pages/MemberEvents').then((module) => ({ default: module.MemberEvents })));
const MemberDirectory = lazy(() => import('./pages/MemberDirectory').then((module) => ({ default: module.MemberDirectory })));
const MemberDues = lazy(() => import('./pages/MemberDues').then((module) => ({ default: module.MemberDues })));
const Membership = lazy(() => import('./pages/Membership').then((module) => ({ default: module.Membership })));
const Updates = lazy(() => import('./pages/Updates').then((module) => ({ default: module.Updates })));
const VolunteerAdministration = lazy(() => import('./pages/VolunteerAdministration').then((module) => ({ default: module.VolunteerAdministration })));
const VillageSquare = lazy(() => import('./pages/VillageSquare').then((module) => ({ default: module.VillageSquare })));
const VillageModeration = lazy(() => import('./pages/VillageModeration').then((module) => ({ default: module.VillageModeration })));

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
        .from('Members')
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
            <img className="member-profile-photo" src={member.profile_photo} alt={`${fullName} profile`} decoding="async" />
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
  '/dashboard/contact-enquiries': <ContactEnquiries />,
  '/login': <Auth />,
  '/accept-invitation': <InvitationAcceptance />,
  '/dashboard': <MemberDashboard />,
  '/dashboard/profile': <EditMemberProfile />,
  '/dashboard/members': <MemberDirectory />,
  '/dashboard/invitations': <MemberInvitations />,
  '/dashboard/administration': <MemberAdministration />,
  '/dashboard/analytics': <ExecutiveAnalytics />,
  '/dashboard/executive-progress': <ExecutiveOfficeProgress />,
  '/dashboard/certificates/approval': <ChairmanCertificateApproval />,
  '/dashboard/teaching-requests': <TeachingRequests />,
  '/dashboard/assistant': <AssistantErrorBoundary><SmartAssistant /></AssistantErrorBoundary>,
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
  '/dashboard/skills-exchange': <SkillsExchange />,
  '/dashboard/learning/digital-income/lesson-1': <DigitalIncomeLesson />,
  '/dashboard/learning/digital-income': <DigitalIncomeCourseDashboard />,
  '/dashboard/learning/digital-income/final-assessment': <DigitalIncomeFinalAssessment />,
  '/dashboard/learning/everyday-digital-technology-skills': <EverydayDigitalTechnologySkillsDashboard />,
  '/dashboard/learning/everyday-digital-technology-skills/final-assessment': <EverydayDigitalTechnologySkillsFinalAssessment />,
  '/dashboard/village': <VillageSquare />,
  '/dashboard/village/moderation': <VillageModeration />,
};

export default function App() {
  const route = useHashRoute();
  const leadershipProfileMatch = route.match(/^\/leadership\/([^/]+)$/);
  const memberProfileMatch = route.match(/^\/dashboard\/members\/([^/]+)$/);
  const digitalIncomeLessonMatch = route.match(/^\/dashboard\/learning\/digital-income\/lesson-([2-6])$/);
  const everydayDigitalTechnologyLessonMatch = route.match(/^\/dashboard\/learning\/everyday-digital-technology-skills\/lesson-([1-6])$/);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);

  let page: ReactElement;
  if (leadershipProfileMatch) {
    const executive = executives.find((item) => item.slug === leadershipProfileMatch[1]);
    page = executive ? <ExecutiveProfile executive={executive} /> : <Leadership />;
  } else if (memberProfileMatch) {
    page = <MemberProfile memberId={decodeURIComponent(memberProfileMatch[1])} />;
  } else if (digitalIncomeLessonMatch) {
    page = <DigitalIncomeCourseLesson lessonNumber={Number(digitalIncomeLessonMatch[1])} />;
  } else if (everydayDigitalTechnologyLessonMatch) {
    page = <EverydayDigitalTechnologySkillsLesson lessonNumber={Number(everydayDigitalTechnologyLessonMatch[1])} />;
  } else {
    page = pages[route] ?? <Home />;
  }

  return (
    <div className="site-shell">
      <Header />
      <PWAExperience />
      <main id="top"><Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>{page}</Suspense></main>
      <Footer />
    </div>
  );
}
