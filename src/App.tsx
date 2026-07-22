import {
  ArrowRight, BookOpen, CalendarDays, CheckCircle2, FileText, GraduationCap,
  HandHeart, HeartHandshake, History, Leaf, Mail, MapPin, Menu, Network,
  ShieldCheck, Sparkles, Users, X
} from 'lucide-react';
import { useEffect, useState } from 'react';

const impactAreas = [
  { icon: GraduationCap, title: 'Education', text: 'Supporting learning opportunities and educational initiatives at SANGAJOR B.C.S and beyond.' },
  { icon: HandHeart, title: 'Community Service', text: 'Organising meaningful service that benefits our school, community and environment.' },
  { icon: HeartHandshake, title: 'Member Welfare', text: 'Building mutual support systems for members and their families in times of need.' },
  { icon: Users, title: 'Youth Mentorship', text: 'Guiding young people through education, leadership and positive role models.' },
  { icon: ShieldCheck, title: 'Partnerships', text: 'Working with organisations and supporters who share our values and ambitions.' },
  { icon: Leaf, title: 'Sustainable Development', text: 'Creating long-term programmes that can serve future generations.' },
];

const reasonsToJoin = [
  { icon: Network, title: 'Reconnect', text: 'Strengthen friendships and professional connections formed during our school years.' },
  { icon: HandHeart, title: 'Contribute', text: 'Use your experience, ideas and skills to support members, our school and the wider community.' },
  { icon: History, title: 'Preserve Our Legacy', text: 'Help document the memories, milestones and achievements of the Class of 2008.' },
];

const values = ['Unity', 'Service', 'Education', 'Accountability', 'Community', 'Development'];
const navItems = [
  ['Home', '#/'], ['About', '#/about'], ['Leadership', '#/leadership'], ['Membership', '#/membership'],
  ['Focus Areas', '#/focus'], ['Updates', '#/updates'], ['Our Journey', '#/journey'], ['Contact', '#/contact']
];

function useRoute() {
  const read = () => window.location.hash.replace('#', '') || '/';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const handler = () => { setRoute(read()); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header">
    <a className="brand" href="#/" aria-label="SANGAJOR home">
      <div className="brand-mark" aria-hidden="true">S</div>
      <div><strong>SANGAJOR</strong><span>B.C.S Class of 2008 Association</span></div>
    </a>
    <nav className="desktop-nav" aria-label="Primary navigation">
      {navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      <a className="button button-small" href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Become a Member</a>
    </nav>
    <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
      {menuOpen ? <X /> : <Menu />}
    </button>
    {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
      <a className="button" href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Become a Member</a>
    </nav>}
  </header>;
}

function Footer() {
  return <footer>
    <div className="footer-grid">
      <div><div className="brand footer-brand"><div className="brand-mark">S</div><div><strong>SANGAJOR</strong><span>B.C.S Class of 2008 Association</span></div></div><p>Together since childhood. United for life.</p></div>
      <div><h3>Explore</h3><a href="#/about">Our Story</a><a href="#/focus">Focus Areas</a><a href="#/journey">Our Journey</a></div>
      <div><h3>Connect</h3><a href="mailto:info@sangajor08.org">info@sangajor08.org</a><span>The Gambia and beyond</span></div>
    </div>
    <div className="footer-bottom"><span>© 2026 SANGAJOR B.C.S Class of 2008 Association.</span><span>Designed & developed by Elegant Empire AI Studio.</span></div>
  </footer>;
}

function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="page-hero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></section>;
}

function Home() {
  return <>
    <section className="hero">
      <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
      <div className="hero-content"><span className="eyebrow">The official digital platform of the Class of 2008</span><h1>Together since childhood. <em>United for life.</em></h1><p>What began in one classroom is becoming a lifelong commitment to support one another, serve our school and strengthen our community.</p><div className="hero-actions"><a className="button" href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Become a Member <ArrowRight size={18} /></a><a className="button button-secondary" href="#/about">Learn Our Story</a></div></div>
      <div className="hero-card"><span>Project Legacy</span><strong>Building the digital future of the SANGAJOR B.C.S Class of 2008 Association.</strong><div className="hero-card-stats"><div><b>120+</b><small>Members reconnecting</small></div><div><b>2026</b><small>Formal establishment</small></div><div><b>1</b><small>Shared purpose</small></div></div></div>
    </section>
    <section className="section story-section"><div className="section-heading"><span className="eyebrow">Our Story</span><h2>From the same classroom, building something together.</h2></div><div className="story-grid"><div className="story-copy"><p>Our journey began at SANGAJOR Basic Cycle School, where we learned and grew together from Primary 1 through Grade 9.</p><p>Although no official reunion has been held since graduation, the bond among members has remained strong. We are now formalising that bond into a structured, purpose-driven association.</p><a className="text-link" href="#/about">Read our full story <ArrowRight size={17} /></a></div><blockquote>“What began in one classroom continues as a lifelong commitment to each other and to our community.”</blockquote></div></section>
    <section className="section muted-section"><div className="section-heading centered"><span className="eyebrow">Our Purpose</span><h2>Connect. Serve. Build.</h2><p>Three simple commitments guide the association as it grows.</p></div><div className="card-grid">{reasonsToJoin.map(({icon:Icon,title,text})=><article className="impact-card" key={title}><div className="icon-wrap"><Icon size={24}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="section"><div className="section-heading centered"><span className="eyebrow">Our Focus Areas</span><h2>Six ways we plan to create lasting value.</h2><p>These are future priorities, not claims of completed projects.</p></div><div className="card-grid">{impactAreas.map(({icon:Icon,title,text})=><article className="impact-card" key={title}><div className="icon-wrap"><Icon size={24}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="section values-section"><div className="section-heading"><span className="eyebrow">What Guides Us</span><h2>Rooted in values that keep us accountable.</h2></div><div className="values-list">{values.map((value,index)=><div key={value}><span>0{index+1}</span><strong>{value}</strong></div>)}</div></section>
    <section className="section muted-section"><div className="section-heading"><span className="eyebrow">Leadership</span><h2>Serving with integrity, transparency and shared responsibility.</h2><p>Our leadership page is ready for approved names, portraits and biographies.</p><a className="text-link" href="#/leadership">Meet the leadership structure <ArrowRight size={17}/></a></div></section>
    <section className="section"><div className="section-heading"><span className="eyebrow">News & Announcements</span><h2>Stay connected to what is happening.</h2></div><div className="update-grid"><article><CalendarDays/><span>Association Update</span><h3>Project Legacy development begins</h3><p>The association is building its official digital platform in phases.</p></article><article><BookOpen/><span>Governance</span><h3>Constitution and leadership structure</h3><p>Official documents and committee information will be published after content approval.</p></article></div></section>
    <CTA />
  </>;
}

function About() { return <><PageHero eyebrow="About SANGAJOR" title="A shared past. A purposeful future." text="The Class of 2008 is transforming lifelong connections into an organised association committed to service, education and community development."/><section className="section"><div className="story-grid"><div><span className="eyebrow">Our Story</span><h2>From Primary 1 through Grade 9.</h2><p>Members learned, grew and completed their basic education together at SANGAJOR Basic Cycle School. Although no official reunion has yet been held since graduation, the connection between classmates has remained strong.</p><p>In 2026, members began formalising that bond through elected leadership, a ratified constitution and preparations for NGO registration.</p></div><blockquote>We are not starting from achievements we have not yet made. We are starting from unity, honesty and a clear commitment to serve.</blockquote></div></section><section className="section muted-section"><div className="section-heading centered"><span className="eyebrow">Mission & Vision</span><h2>What we are working toward.</h2></div><div className="update-grid"><article><Sparkles/><span>Mission</span><h3>Unite and support</h3><p>To unite members of SANGAJOR B.C.S Class of 2008 and support educational, social and community development initiatives.</p></article><article><ShieldCheck/><span>Vision</span><h3>Build lasting impact</h3><p>To build a strong, organised and impactful alumni community that contributes positively to members, the school and the wider community.</p></article></div></section><section className="section values-section"><div className="section-heading"><span className="eyebrow">Core Values</span><h2>The standards that guide our conduct.</h2></div><div className="values-list">{values.map((value,index)=><div key={value}><span>0{index+1}</span><strong>{value}</strong></div>)}</div></section><section className="section"><div className="section-heading"><span className="eyebrow">Governance</span><h2>Constitution and accountability.</h2><p>The association has a ratified constitution and elected officers. A searchable digital constitution and downloadable copy will be added after the final approved document is supplied.</p><div className="notice"><FileText/><div><strong>Constitution page prepared</strong><span>Awaiting the final approved constitution file.</span></div></div></section></>; }

function Leadership() { return <><PageHero eyebrow="Leadership" title="Serving the association with integrity." text="The leadership page will present approved executive members, their responsibilities and their commitment to members."/><section className="section"><div className="section-heading"><span className="eyebrow">Executive Committee</span><h2>A transparent structure built for service.</h2><p>We will add names and portraits only after they are provided and checked. Until then, the page clearly shows the intended structure without inventing information.</p></div><div className="leadership-grid">{['Chairman','Vice Chairman','Secretary General','Assistant Secretary','Treasurer','IPRO','Welfare Officer','Auditor'].map(role=><article className="leader-card" key={role}><div className="leader-placeholder"><Users/></div><span>Executive Role</span><h3>{role}</h3><p>Name and approved biography to be added.</p></article>)}</div></section><section className="section muted-section"><div className="section-heading centered"><span className="eyebrow">Photo Standard</span><h2>Professional and consistent, wherever members live.</h2><p>Portraits will use the same crop, dimensions, border and card layout. Backgrounds may remain natural or be replaced later with a unified branded background.</p></div></section></>; }

function Membership() { return <><PageHero eyebrow="Membership" title="Belong to the community you helped create." text="Membership reconnects classmates, strengthens mutual support and gives every member a voice in building the association's future."/><section className="section"><div className="section-heading centered"><span className="eyebrow">Why Join?</span><h2>Shared roots. Shared opportunities. Shared responsibility.</h2></div><div className="card-grid">{reasonsToJoin.map(({icon:Icon,title,text})=><article className="impact-card" key={title}><div className="icon-wrap"><Icon/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="section muted-section"><div className="section-heading"><span className="eyebrow">Membership Process</span><h2>Simple, clear and respectful.</h2></div><div className="steps">{['Complete the official member form','Submit a clear directory photograph','Information is reviewed','Approved profile is added to the member platform'].map((step,index)=><div key={step}><span>{index+1}</span><p>{step}</p></div>)}</div><a className="button" href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Complete Member Registration</a></section></>; }

function Focus() { return <><PageHero eyebrow="Our Focus Areas" title="Plans designed to create lasting value." text="The association is newly establishing itself. These areas describe what we intend to build, support and improve over time."/><section className="section"><div className="card-grid">{impactAreas.map(({icon:Icon,title,text})=><article className="impact-card" key={title}><div className="icon-wrap"><Icon/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section></>; }
function Updates() { return <><PageHero eyebrow="News & Announcements" title="Official updates in one trusted place." text="This page will reduce dependence on scattered WhatsApp messages by providing a clear public record of approved announcements."/><section className="section"><div className="update-grid"><article><CalendarDays/><span>Development</span><h3>Project Legacy public platform</h3><p>Sprint 1 and Sprint 2 are being built before formal website review.</p></article><article><BookOpen/><span>Governance</span><h3>Official documents coming soon</h3><p>The constitution, meeting summaries and approved notices will be added as they become available.</p></article></div></section></>; }
function Journey() { return <><PageHero eyebrow="Our Journey" title="A shared history. A growing legacy." text="This living timeline will expand with photographs, memories, milestones and future service."/><section className="section journey-section"><div className="timeline"><div><span>Before 2008</span><h3>Growing and learning together</h3><p>Members shared their school journey from Primary 1 through Grade 9.</p></div><div><span>2008</span><h3>Class journey completed</h3><p>The Class of 2008 left SANGAJOR B.C.S with friendships that continued across borders.</p></div><div><span>2026</span><h3>Association formally establishing</h3><p>Elected officers, a ratified constitution and preparations for NGO registration.</p></div><div><span>Next</span><h3>Service, impact and legacy</h3><p>Future programmes will support members, education and community development.</p></div></div></section></>; }
function Contact() { return <><PageHero eyebrow="Contact" title="Connect with SANGAJOR." text="Questions about membership, partnerships or the association can be directed through the official contact channels below."/><section className="section"><div className="contact-grid"><article><Mail/><h3>Email</h3><a href="mailto:info@sangajor08.org">info@sangajor08.org</a></article><article><MapPin/><h3>Community</h3><p>The Gambia and members around the world.</p></article><article><Users/><h3>Membership</h3><a href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Open registration form</a></article></div></section></>; }
function CTA(){return <section className="cta-section"><div><span className="eyebrow light">Get Involved</span><h2>Every great legacy begins with people who choose to act.</h2><p>Join us as we build a stronger future for our members, our school and our community.</p></div><div className="cta-actions"><a className="button button-light" href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Join the Association</a><a className="button button-outline-light" href="mailto:info@sangajor08.org">Partner With Us</a></div></section>}

export default function App() {
  const route = useRoute();
  const pages: Record<string, JSX.Element> = {'/':<Home/>, '/about':<About/>, '/leadership':<Leadership/>, '/membership':<Membership/>, '/focus':<Focus/>, '/updates':<Updates/>, '/journey':<Journey/>, '/contact':<Contact/>};
  return <div className="site-shell"><Header/><main id="top">{pages[route] ?? <Home/>}</main><Footer/></div>;
}
