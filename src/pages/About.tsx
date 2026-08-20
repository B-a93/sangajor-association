import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HandHeart,
  HeartHandshake,
  Landmark,
  Lightbulb,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';

const values = [
  { icon: Users, title: 'Unity', text: 'We honour our shared history and work together across locations, professions and life experiences.' },
  { icon: ShieldCheck, title: 'Integrity', text: 'We act honestly, protect the trust of members and place the Association’s interests first.' },
  { icon: Scale, title: 'Accountability', text: 'We accept responsibility for our decisions, resources and commitments.' },
  { icon: HeartHandshake, title: 'Respect', text: 'We value every member’s voice and treat one another with dignity and fairness.' },
  { icon: Sparkles, title: 'Excellence', text: 'We pursue high standards in leadership, service, communication and project delivery.' },
  { icon: HandHeart, title: 'Service', text: 'We use our time, knowledge and resources to support members, our school and the community.' },
  { icon: Landmark, title: 'Transparency', text: 'We communicate openly and promote proper reporting, documentation and financial stewardship.' },
  { icon: Network, title: 'Community', text: 'We build partnerships and initiatives that create lasting opportunities beyond our membership.' },
];

const objectives = [
  'Strengthen unity, communication and active participation among members of the Class of 2008.',
  'Promote the welfare, professional growth and personal development of members.',
  'Support SANGAJOR Basic Cycle School through educational, infrastructure and mentorship initiatives.',
  'Encourage youth development, community service and responsible citizenship.',
  'Create sustainable partnerships, fundraising opportunities and income-generating initiatives.',
  'Preserve the history, achievements and shared legacy of the Class of 2008.',
];

const milestones = [
  { year: '2008', title: 'A Shared Beginning', text: 'Members completed Grade 9 at SANGAJOR Basic Cycle School, carrying forward friendships and memories formed over many years.' },
  { year: '2026', title: 'Association Established', text: 'The Class of 2008 began formalising its alumni network into an organised and purpose-driven Association.' },
  { year: '2026', title: 'Leadership & Constitution', text: 'An Executive Committee was elected and the Association adopted structures to support accountable governance.' },
  { year: '2026', title: 'Digital Platform', text: 'The Association began building an official digital home for communication, documentation and member engagement.' },
  { year: '2027–2030', title: 'Projects & Partnerships', text: 'Member welfare, school support, learning, fundraising and community initiatives will be developed and expanded.' },
  { year: '2031', title: 'Legacy Vision', text: 'A stronger, sustainable and recognised Association serving members, the school and the wider community.' },
];

const faqs = [
  { question: 'Who can become a member?', answer: 'Membership is intended for former students connected to SANGAJOR Basic Cycle School’s Class of 2008, subject to the Association’s constitution and membership procedures.' },
  { question: 'How can members support the Association?', answer: 'Members can participate in meetings and activities, contribute ideas and skills, support approved projects, fulfil agreed financial commitments and help strengthen communication.' },
  { question: 'How are Association resources managed?', answer: 'Resources are managed through the elected leadership structure, with financial oversight, record-keeping and reporting intended to promote transparency and accountability.' },
  { question: 'Can partners and supporters work with the Association?', answer: 'Yes. The Association welcomes responsible partnerships that support education, youth development, member welfare and sustainable community initiatives.' },
];

export function About() {
  return (
    <>
      <PageHero
        eyebrow="About SANGAJOR"
        title="A shared past. A purposeful future."
        text="SANGAJOR B.C.S. Class of 2008 Association is transforming lifelong connections into organised service, opportunity and lasting community impact."
      />

      <section className="section">
        <div className="story-grid about-story">
          <div className="story-copy">
            <span className="eyebrow">Our Story</span>
            <h2>From classmates to a community of service.</h2>
            <p>Members of the Class of 2008 learned, grew and completed their basic education together at SANGAJOR Basic Cycle School. Years later, that shared foundation continues to connect members living and working in The Gambia and abroad.</p>
            <p>In 2026, members began formalising that bond through elected leadership, a ratified constitution and preparations for NGO registration. The Association was created to strengthen communication, support members, give back to the school and contribute meaningfully to the wider community.</p>
            <p>This is more than a reunion. It is a long-term commitment to unity, responsible leadership and a legacy future generations can build upon.</p>
          </div>
          <blockquote>“We are starting from unity, honesty and a clear commitment to serve.”</blockquote>
        </div>
      </section>

      <section className="section muted-section">
        <div className="mission-grid">
          <article className="mission-card">
            <div className="icon-wrap"><Target size={24} /></div>
            <span className="eyebrow">Our Vision</span>
            <h2>A united and sustainable Association creating opportunity and lasting impact.</h2>
            <p>We envision an organised, transparent and forward-looking Association that supports its members, strengthens our former school and contributes to community development.</p>
          </article>
          <article className="mission-card featured">
            <div className="icon-wrap"><Lightbulb size={24} /></div>
            <span className="eyebrow">Our Mission</span>
            <h2>Turning our shared history into meaningful action.</h2>
            <p>Our mission is to connect and empower members through communication, welfare support, education, skills development, responsible partnerships and service to SANGAJOR Basic Cycle School and the wider community.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading centered">
          <span className="eyebrow">What Guides Us</span>
          <h2>Our core values</h2>
          <p>These principles shape how we lead, communicate, manage resources and serve.</p>
        </div>
        <div className="about-values-grid">
          {values.map(({ icon: Icon, title, text }) => (
            <article className="about-value-card" key={title}>
              <div className="icon-wrap"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section muted-section">
        <div className="objectives-layout">
          <div className="section-heading">
            <span className="eyebrow">Our Objectives</span>
            <h2>Clear priorities for collective progress.</h2>
            <p>Our objectives provide a practical framework for the Association’s programmes, decisions and partnerships.</p>
          </div>
          <div className="objectives-list">
            {objectives.map((objective) => (
              <div key={objective}><CheckCircle2 size={21} /><span>{objective}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section legacy-section">
        <div className="legacy-copy">
          <span className="eyebrow light">Project Legacy 2031</span>
          <h2>Building today for the Association we want to become.</h2>
          <p>Project Legacy 2031 is the Association’s long-term development vision for the 2026–2031 executive term. It connects strong governance, member engagement, digital transformation and community service into one shared direction.</p>
          <div className="legacy-pillars">
            <div><strong>01</strong><span>Stronger member communication and participation</span></div>
            <div><strong>02</strong><span>Transparent systems and responsible leadership</span></div>
            <div><strong>03</strong><span>Education, skills and welfare initiatives</span></div>
            <div><strong>04</strong><span>Sustainable partnerships and community impact</span></div>
          </div>
        </div>
        <aside className="legacy-card">
          <span>Our 2031 Commitment</span>
          <strong>Build a strong institution from the ground up for future generations.</strong>
          <p>Every programme, partnership and digital tool should contribute to a more organised, inclusive and sustainable Association.</p>
        </aside>
      </section>

      <section className="section chairman-section">
        <div className="chairman-mark">OB</div>
        <div>
          <span className="eyebrow">Chairman’s Message</span>
          <h2>Leadership is service.</h2>
          <p>“Our shared history gives us a strong foundation. Through unity, responsible leadership and active participation, we can transform that bond into meaningful opportunities for our members, our former school and the wider community.”</p>
          <strong>Omar Bah</strong>
          <small>Chairman, SANGAJOR B.C.S. Class of 2008 Association</small>
          <a className="text-link" href="#/leadership/omar-bah">View Chairman’s Profile <ArrowRight size={17} /></a>
        </div>
      </section>

      <section className="section muted-section">
        <div className="school-grid">
          <div className="school-icon"><BookOpen size={42} /></div>
          <div>
            <span className="eyebrow">Our School</span>
            <h2>SANGAJOR Basic Cycle School</h2>
            <p>SANGAJOR Basic Cycle School is the place where members of the Class of 2008 built the educational and personal foundation that continues to unite them. The Association honours that legacy by preserving its connection to the school and supporting initiatives that benefit students, teachers and the surrounding community.</p>
          </div>
        </div>
      </section>

      <section className="section journey-section">
        <div className="section-heading centered">
          <span className="eyebrow">Our Journey</span>
          <h2>From 2008 to Legacy 2031</h2>
        </div>
        <div className="about-timeline">
          {milestones.map((milestone) => (
            <article key={`${milestone.year}-${milestone.title}`}>
              <span>{milestone.year}</span>
              <h3>{milestone.title}</h3>
              <p>{milestone.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading centered">
          <span className="eyebrow">Frequently Asked Questions</span>
          <h2>Understanding the Association</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <div>
          <span className="eyebrow light">Be Part of the Journey</span>
          <h2>Help us turn shared history into lasting impact.</h2>
          <p>Connect with the Association, participate in our work and support the vision of Project Legacy 2031.</p>
        </div>
        <div className="cta-actions">
          <a className="button button-light" href="#/membership">Become a Member</a>
          <a className="button button-outline-light" href="#/contact">Contact Us</a>
        </div>
      </section>
    </>
  );
}
