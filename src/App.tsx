import { ArrowRight, BookOpen, CalendarDays, GraduationCap, HandHeart, HeartHandshake, Leaf, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { useState } from 'react';

const impactAreas = [
  { icon: GraduationCap, title: 'Education', text: 'Supporting learning opportunities and educational initiatives at SANGAJOR B.C.S and beyond.' },
  { icon: HandHeart, title: 'Community Service', text: 'Organising meaningful service that benefits our school, community and environment.' },
  { icon: HeartHandshake, title: 'Member Welfare', text: 'Building mutual support systems for members and their families in times of need.' },
  { icon: Users, title: 'Youth Mentorship', text: 'Guiding young people through education, leadership and positive role models.' },
  { icon: ShieldCheck, title: 'Partnerships', text: 'Working with organisations and supporters who share our values and ambitions.' },
  { icon: Leaf, title: 'Sustainable Development', text: 'Creating long-term programmes that can serve future generations.' },
];

const values = ['Unity', 'Service', 'Education', 'Accountability', 'Community', 'Development'];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = ['About', 'Leadership', 'Membership', 'Impact', 'Updates', 'Our Journey', 'Contact'];

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SANGAJOR home">
          <div className="brand-mark">S</div>
          <div>
            <strong>SANGAJOR</strong>
            <span>B.C.S Class of 2008 Association</span>
          </div>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}>{item}</a>)}
          <a className="button button-small" href="#membership">Become a Member</a>
        </nav>

        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} onClick={() => setMenuOpen(false)}>{item}</a>)}
            <a className="button" href="#membership" onClick={() => setMenuOpen(false)}>Become a Member</a>
          </nav>
        )}
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-content">
            <span className="eyebrow">Established in spirit since 2008</span>
            <h1>Together since childhood. <em>United for life.</em></h1>
            <p>What began in one classroom is becoming a lifelong commitment to support one another, serve our school and strengthen our community.</p>
            <div className="hero-actions">
              <a className="button" href="#membership">Become a Member <ArrowRight size={18} /></a>
              <a className="button button-secondary" href="#about">Learn Our Story</a>
            </div>
          </div>
          <div className="hero-card">
            <span>Project Legacy</span>
            <strong>Building the digital future of the SANGAJOR B.C.S Class of 2008 Association.</strong>
            <div className="hero-card-stats">
              <div><b>120+</b><small>Members</small></div>
              <div><b>2026</b><small>Formal establishment</small></div>
              <div><b>1</b><small>Shared purpose</small></div>
            </div>
          </div>
        </section>

        <section className="section story-section" id="about">
          <div className="section-heading">
            <span className="eyebrow">Our Story</span>
            <h2>From the same classroom, building something together.</h2>
          </div>
          <div className="story-grid">
            <div className="story-copy">
              <p>Our journey began at SANGAJOR Basic Cycle School, where we learned and grew together from Primary 1 through Grade 9.</p>
              <p>Although no official reunion has been held since graduation, the bond among members has remained strong. We are now formalising that bond into a structured, purpose-driven association.</p>
              <a className="text-link" href="#journey">Explore our journey <ArrowRight size={17} /></a>
            </div>
            <blockquote>“What began in one classroom continues as a lifelong commitment to each other and to our community.”</blockquote>
          </div>
        </section>

        <section className="section muted-section" id="impact">
          <div className="section-heading centered">
            <span className="eyebrow">Our Impact Areas</span>
            <h2>Six ways we plan to create lasting value.</h2>
            <p>These focus areas will guide our future programmes, partnerships and service.</p>
          </div>
          <div className="card-grid">
            {impactAreas.map(({ icon: Icon, title, text }) => (
              <article className="impact-card" key={title}>
                <div className="icon-wrap"><Icon size={24} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section values-section">
          <div className="section-heading">
            <span className="eyebrow">What Guides Us</span>
            <h2>Rooted in values that keep us accountable.</h2>
          </div>
          <div className="values-list">
            {values.map((value, index) => <div key={value}><span>0{index + 1}</span><strong>{value}</strong></div>)}
          </div>
        </section>

        <section className="section journey-section" id="our-journey">
          <div className="section-heading centered">
            <span className="eyebrow">Our Journey</span>
            <h2>A shared history. A growing legacy.</h2>
          </div>
          <div className="timeline">
            <div><span>Before 2008</span><h3>Growing and learning together</h3><p>Members shared their school journey from Primary 1 through Grade 9.</p></div>
            <div><span>2008</span><h3>Class journey completed</h3><p>The Class of 2008 left SANGAJOR B.C.S with friendships that continued across borders.</p></div>
            <div><span>2026</span><h3>Association formally establishing</h3><p>Elected officers, a ratified constitution and preparations for NGO registration.</p></div>
            <div><span>Next</span><h3>Service, impact and legacy</h3><p>Future programmes will support members, education and community development.</p></div>
          </div>
        </section>

        <section className="section updates-section" id="updates">
          <div className="section-heading">
            <span className="eyebrow">Latest Updates</span>
            <h2>Stay connected to what is happening.</h2>
          </div>
          <div className="update-grid">
            <article><CalendarDays /><span>Association Update</span><h3>Project Legacy development begins</h3><p>The association is building its official digital platform in phases.</p></article>
            <article><BookOpen /><span>Governance</span><h3>Constitution and leadership structure</h3><p>Official documents and committee information will be published after approval.</p></article>
          </div>
        </section>

        <section className="cta-section" id="membership">
          <div>
            <span className="eyebrow light">Get Involved</span>
            <h2>Be part of what we are building together.</h2>
            <p>Register as a member, support our development or partner with us on future initiatives.</p>
          </div>
          <div className="cta-actions">
            <a className="button button-light" href="mailto:info@sangajor08.org">Join the Association</a>
            <a className="button button-outline-light" href="mailto:info@sangajor08.org">Partner With Us</a>
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="footer-grid">
          <div>
            <div className="brand footer-brand"><div className="brand-mark">S</div><div><strong>SANGAJOR</strong><span>B.C.S Class of 2008 Association</span></div></div>
            <p>Together since childhood. United for life.</p>
          </div>
          <div><h3>Explore</h3><a href="#about">Our Story</a><a href="#impact">Impact Areas</a><a href="#our-journey">Our Journey</a></div>
          <div><h3>Connect</h3><a href="mailto:info@sangajor08.org">info@sangajor08.org</a><span>The Gambia and beyond</span></div>
        </div>
        <div className="footer-bottom"><span>© 2026 SANGAJOR B.C.S Class of 2008 Association.</span><span>Designed & developed by Elegant Empire AI Studio.</span></div>
      </footer>
    </div>
  );
}
