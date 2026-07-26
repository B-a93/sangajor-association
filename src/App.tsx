import { useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  HeartHandshake,
  Home,
  Landmark,
  Library,
  LogIn,
  Menu,
  MessageCircleMore,
  Newspaper,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'

type Role = 'member' | 'ipro'

const memberTools = [
  { icon: CircleUserRound, title: 'My Profile', text: 'Keep your membership details and digital card up to date.' },
  { icon: HeartHandshake, title: 'Member Care Centre', text: 'Request assistance and privately track your case.' },
  { icon: UsersRound, title: 'Connect Hub', text: 'Reconnect, exchange skills and celebrate one another.' },
  { icon: BriefcaseBusiness, title: 'Business & Career Hub', text: 'Find opportunities and support member businesses.' },
  { icon: CalendarDays, title: 'Events', text: 'Register for upcoming programmes and community activities.' },
  { icon: Library, title: 'Knowledge Centre', text: 'Access learning resources, templates and Association documents.' },
]

const analytics = [
  { label: 'Website visitors', value: '1,245', detail: '+18% this month' },
  { label: 'Active members', value: '286', detail: '74% engagement rate' },
  { label: 'Top content', value: 'Reunion 2026', detail: '680 views' },
  { label: 'Mobile visitors', value: '78%', detail: 'Primary device type' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [role, setRole] = useState<Role>('member')

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SANGAJOR Digital Village home">
          <span className="brand-mark">S</span>
          <span><strong>SANGAJOR</strong><small>Digital Village</small></span>
        </a>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#leadership">Leadership</a>
          <a href="#news">News</a>
          <a href="#events">Events</a>
          <a href="#contact">Contact</a>
          <button className="login-button" onClick={() => setRole(role === 'member' ? 'ipro' : 'member')}>
            <LogIn size={17} /> {role === 'member' ? 'Executive preview' : 'Member preview'}
          </button>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> One Community. One Platform. Endless Possibilities.</span>
            <h1>Welcome home to the <em>SANGAJOR Digital Village.</em></h1>
            <p>The official digital headquarters of the SANGAJOR B.C.S. Class of 2008 Association—built to connect members, strengthen leadership and preserve our legacy.</p>
            <div className="hero-actions">
              <button className="primary-action">Enter MySANGAJOR <ChevronRight size={18} /></button>
              <button className="secondary-action">Explore our story</button>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={17} /> Secure member access</span>
              <span><Landmark size={17} /> Role-based executive offices</span>
            </div>
          </div>
          <div className="welcome-card">
            <div className="card-topline"><span>MY SANGAJOR</span><Bell size={18} /></div>
            <div className="avatar">OB</div>
            <p className="muted">Good evening</p>
            <h2>Welcome back, Omar.</h2>
            <p>Here is what is happening in your community today.</p>
            <div className="updates">
              <div><CalendarDays /><span><strong>Reunion</strong><small>18 days to go</small></span></div>
              <div><Newspaper /><span><strong>2 announcements</strong><small>Published this week</small></span></div>
              <div><HeartHandshake /><span><strong>Member Care</strong><small>Your request is under review</small></span></div>
            </div>
          </div>
        </section>

        <section className="portal-section" id="about">
          <div className="section-heading">
            <span className="eyebrow">Built around our members</span>
            <h2>Everything our community needs, in one place.</h2>
            <p>MySANGAJOR makes it easy to access services, opportunities, programmes and trusted support.</p>
          </div>
          <div className="tool-grid">
            {memberTools.map(({ icon: Icon, title, text }) => (
              <article className="tool-card" key={title}>
                <span className="icon-wrap"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <button>Open centre <ChevronRight size={16} /></button>
              </article>
            ))}
          </div>
        </section>

        <section className="executive-section" id="leadership">
          <div className="executive-intro">
            <span className="eyebrow">Secure Executive Office</span>
            <h2>{role === 'ipro' ? 'IPRO Digital Command Centre' : 'Leadership with clarity and accountability.'}</h2>
            <p>{role === 'ipro' ? 'The IPRO Office can monitor communications, content, member engagement and platform health while confidential records remain protected.' : 'Each office receives a secure workspace with only the information and tools required for its responsibilities.'}</p>
            <div className="permission-note"><ShieldCheck /> Executive access requires a password and one-time verification code.</div>
          </div>

          {role === 'ipro' ? (
            <div className="analytics-panel">
              <div className="analytics-title"><div><span>LIVE OVERVIEW</span><h3>Communications & Platform Analytics</h3></div><BarChart3 /></div>
              <div className="metric-grid">
                {analytics.map(item => <div className="metric" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div>)}
              </div>
              <div className="health-row"><Activity /><div><strong>Platform health</strong><span>All systems are operating normally</span></div><b>Online</b></div>
            </div>
          ) : (
            <div className="office-list">
              {['Chairman Office', 'Secretary General Office', 'Treasurer Office', 'IPRO Office', 'Programmes Officer Office'].map((office, index) => (
                <div className="office-row" key={office}><span>{String(index + 1).padStart(2, '0')}</span><strong>{office}</strong><ChevronRight /></div>
              ))}
            </div>
          )}
        </section>

        <section className="care-banner">
          <div className="care-icon"><HeartHandshake /></div>
          <div><span className="eyebrow">Member Care Centre</span><h2>When a member needs help, they should never feel alone.</h2><p>Confidential requests are accessible only to the Chairman and Secretary General.</p></div>
          <button>Request assistance <MessageCircleMore size={18} /></button>
        </section>
      </main>

      <footer><div className="brand footer-brand"><span className="brand-mark">S</span><span><strong>SANGAJOR</strong><small>B.C.S. Class of 2008 Association</small></span></div><p>Preserving our past. Strengthening our present. Building our future.</p></footer>
    </div>
  )
}

export default App
