import { FormEvent, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  HeartHandshake,
  Home,
  KeyRound,
  Landmark,
  Library,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  MessageCircleMore,
  Newspaper,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'

type Role = 'member' | 'ipro' | 'chairman' | 'secretary-general'
type AuthStep = 'identify' | 'password' | 'otp'
type LoginMode = 'member' | 'executive'

type Session = {
  name: string
  role: Role
  identifier: string
}

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

const roleLabels: Record<Role, string> = {
  member: 'Member',
  ipro: 'Information & Public Relations Officer',
  chairman: 'Chairman',
  'secretary-general': 'Secretary General',
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [mode, setMode] = useState<LoginMode>('member')
  const [step, setStep] = useState<AuthStep>('identify')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [demoRole, setDemoRole] = useState<Role>('ipro')

  const openLogin = (loginMode: LoginMode = 'member') => {
    setMode(loginMode)
    setStep('identify')
    setIdentifier('')
    setPassword('')
    setOtp('')
    setAuthOpen(true)
    setMenuOpen(false)
  }

  const closeLogin = () => setAuthOpen(false)

  const handleAuth = (event: FormEvent) => {
    event.preventDefault()

    if (step === 'identify') {
      setStep(mode === 'executive' ? 'password' : 'otp')
      return
    }

    if (step === 'password') {
      setStep('otp')
      return
    }

    const role = mode === 'member' ? 'member' : demoRole
    setSession({
      name: role === 'member' ? 'Omar Bah' : role === 'ipro' ? 'Banna' : role === 'chairman' ? 'Omar Bah' : 'Secretary General',
      role,
      identifier,
    })
    setAuthOpen(false)
  }

  const logout = () => setSession(null)
  const canViewConfidentialCare = session?.role === 'chairman' || session?.role === 'secretary-general'
  const canViewAnalytics = session?.role === 'ipro' || session?.role === 'chairman'

  if (session) {
    return (
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <a className="brand dashboard-brand" href="#dashboard">
            <span className="brand-mark">S</span>
            <span><strong>SANGAJOR</strong><small>Digital Village</small></span>
          </a>
          <nav className="dashboard-nav">
            <a className="active" href="#dashboard"><Home size={18} /> Dashboard</a>
            <a href="#profile"><CircleUserRound size={18} /> My Profile</a>
            <a href="#events"><CalendarDays size={18} /> Events</a>
            <a href="#connect"><UsersRound size={18} /> Connect Hub</a>
            <a href="#care"><HeartHandshake size={18} /> Member Care</a>
            {session.role !== 'member' && <a href="#office"><Landmark size={18} /> Executive Office</a>}
            {canViewAnalytics && <a href="#analytics"><BarChart3 size={18} /> Analytics</a>}
          </nav>
          <button className="logout-button" onClick={logout}><LogOut size={18} /> Sign out</button>
        </aside>

        <main className="dashboard-main" id="dashboard">
          <header className="dashboard-topbar">
            <div>
              <span className="eyebrow">MySANGAJOR</span>
              <h1>Good evening, {session.name.split(' ')[0]}.</h1>
            </div>
            <div className="dashboard-user">
              <button className="notification-button" aria-label="Notifications"><Bell size={19} /><span>3</span></button>
              <div className="dashboard-avatar">{session.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</div>
              <div><strong>{session.name}</strong><small>{roleLabels[session.role]}</small></div>
            </div>
          </header>

          <section className="welcome-strip">
            <div>
              <span className="eyebrow">Welcome home</span>
              <h2>Here is what is happening in your community today.</h2>
            </div>
            <ShieldCheck size={34} />
          </section>

          <section className="dashboard-stats">
            <article><CalendarDays /><span><strong>18 days</strong><small>Until Annual Reunion</small></span></article>
            <article><Newspaper /><span><strong>2 new</strong><small>Announcements</small></span></article>
            <article><HeartHandshake /><span><strong>Under review</strong><small>Member Care request</small></span></article>
            <article><UsersRound /><span><strong>286</strong><small>Active members</small></span></article>
          </section>

          <section className="dashboard-grid">
            <article className="dashboard-card wide-card">
              <div className="dashboard-card-heading"><div><span className="eyebrow">Quick access</span><h2>Your community services</h2></div></div>
              <div className="quick-action-grid">
                {memberTools.slice(0, 4).map(({ icon: Icon, title }) => (
                  <button key={title}><span className="icon-wrap"><Icon /></span><strong>{title}</strong><ChevronRight size={17} /></button>
                ))}
              </div>
            </article>

            <article className="dashboard-card">
              <span className="eyebrow">Access level</span>
              <h2>{roleLabels[session.role]}</h2>
              <p>Your account only displays information and tools approved for your role.</p>
              <div className="access-list">
                <span><ShieldCheck size={17} /> Secure authenticated session</span>
                <span><KeyRound size={17} /> Role-based permissions active</span>
                <span className={canViewConfidentialCare ? 'allowed' : 'restricted'}><LockKeyhole size={17} /> Confidential Member Care: {canViewConfidentialCare ? 'Allowed' : 'Restricted'}</span>
              </div>
            </article>
          </section>

          {canViewAnalytics && (
            <section className="analytics-panel dashboard-analytics" id="analytics">
              <div className="analytics-title"><div><span>AUTHORIZED VIEW</span><h3>Communications & Platform Analytics</h3></div><BarChart3 /></div>
              <div className="metric-grid">
                {analytics.map(item => <div className="metric" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div>)}
              </div>
              <div className="health-row"><Activity /><div><strong>Platform health</strong><span>All systems are operating normally</span></div><b>Online</b></div>
            </section>
          )}
        </main>
      </div>
    )
  }

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
          <button className="login-button" onClick={() => openLogin('member')}><LogIn size={17} /> Member login</button>
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
              <button className="primary-action" onClick={() => openLogin('member')}>Enter MySANGAJOR <ChevronRight size={18} /></button>
              <button className="secondary-action" onClick={() => openLogin('executive')}>Executive login</button>
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
                <button onClick={() => openLogin('member')}>Open centre <ChevronRight size={16} /></button>
              </article>
            ))}
          </div>
        </section>

        <section className="executive-section" id="leadership">
          <div className="executive-intro">
            <span className="eyebrow">Secure Executive Office</span>
            <h2>Leadership with clarity and accountability.</h2>
            <p>Each office receives a secure workspace with only the information and tools required for its responsibilities.</p>
            <div className="permission-note"><ShieldCheck /> Executive access requires a password and one-time verification code.</div>
          </div>
          <div className="office-list">
            {['Chairman Office', 'Secretary General Office', 'Treasurer Office', 'IPRO Office', 'Programmes Officer Office'].map((office, index) => (
              <button className="office-row" key={office} onClick={() => openLogin('executive')}><span>{String(index + 1).padStart(2, '0')}</span><strong>{office}</strong><ChevronRight /></button>
            ))}
          </div>
        </section>

        <section className="care-banner">
          <div className="care-icon"><HeartHandshake /></div>
          <div><span className="eyebrow">Member Care Centre</span><h2>When a member needs help, they should never feel alone.</h2><p>Confidential requests are accessible only to the Chairman and Secretary General.</p></div>
          <button onClick={() => openLogin('member')}>Request assistance <MessageCircleMore size={18} /></button>
        </section>
      </main>

      <footer><div className="brand footer-brand"><span className="brand-mark">S</span><span><strong>SANGAJOR</strong><small>B.C.S. Class of 2008 Association</small></span></div><p>Preserving our past. Strengthening our present. Building our future.</p></footer>

      {authOpen && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button className="auth-backdrop" onClick={closeLogin} aria-label="Close login" />
          <section className="auth-card">
            <button className="auth-close" onClick={closeLogin} aria-label="Close"><X /></button>
            <div className="auth-brand"><span className="brand-mark">S</span><div><strong>SANGAJOR</strong><small>Secure Access</small></div></div>
            <span className="eyebrow">{mode === 'member' ? 'Member access' : 'Executive access'}</span>
            <h2 id="auth-title">{step === 'otp' ? 'Enter verification code' : mode === 'member' ? 'Welcome to MySANGAJOR' : 'Executive Office sign in'}</h2>
            <p>{step === 'identify' ? 'Enter your registered email address or phone number.' : step === 'password' ? 'Enter your executive account password.' : `We sent a six-digit code to ${identifier || 'your registered contact'}.`}</p>

            {step === 'identify' && (
              <div className="auth-tabs">
                <button className={mode === 'member' ? 'active' : ''} onClick={() => setMode('member')}>Member</button>
                <button className={mode === 'executive' ? 'active' : ''} onClick={() => setMode('executive')}>Executive</button>
              </div>
            )}

            <form onSubmit={handleAuth}>
              {step === 'identify' && (
                <label>Email or phone number<input required value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="name@example.com or +220..." autoFocus /></label>
              )}

              {step === 'password' && (
                <>
                  <label>Password<div className="password-field"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" autoFocus /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
                  <label>Demo executive role<select value={demoRole} onChange={event => setDemoRole(event.target.value as Role)}><option value="ipro">IPRO</option><option value="chairman">Chairman</option><option value="secretary-general">Secretary General</option></select></label>
                </>
              )}

              {step === 'otp' && (
                <label>Six-digit code<input className="otp-input" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus /></label>
              )}

              <button className="auth-submit" type="submit">{step === 'identify' ? 'Continue' : step === 'password' ? 'Verify password' : 'Sign in securely'} <ChevronRight size={18} /></button>
            </form>

            {step !== 'identify' && <button className="auth-return" onClick={() => setStep(step === 'otp' && mode === 'executive' ? 'password' : 'identify')}><ArrowLeft size={16} /> Go back</button>}
            <div className="auth-security"><ShieldCheck size={18} /><span><strong>Protected access</strong><small>Members use passwordless OTP. Executives use password plus OTP.</small></span></div>
            <p className="demo-note">Prototype mode: enter any valid-looking details and use any six-digit code.</p>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
