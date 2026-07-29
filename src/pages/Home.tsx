import { ArrowRight, HeartHandshake, School, Users } from 'lucide-react';
import { CallToAction } from '../components/ui/CallToAction';
import { executives } from '../data/executives';
import { impactAreas } from '../data/site';

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
        <div className="hero-glow hero-glow-two" aria-hidden="true" />

        <div className="hero-content">
          <span className="eyebrow">Welcome to our official digital platform</span>
          <h1>
            Sangajor B.C.S. Class of 2008 <em>Association</em>
          </h1>
          <p>
            Reconnecting classmates, supporting one another, serving our school and
            building a lasting legacy for our community and future generations.
          </p>
          <div className="hero-actions">
            <a className="button" href="#/membership">
              Join Our Membership <ArrowRight size={18} />
            </a>
            <a className="button button-secondary" href="#/about">Discover Our Story</a>
          </div>
        </div>

        <aside className="hero-card" aria-label="Association vision">
          <span>Project Legacy 2031</span>
          <strong>United by our shared past. Committed to a stronger future.</strong>
          <div className="hero-card-stats">
            <div><b><Users size={24} /></b><small>Member connection and mutual support</small></div>
            <div><b><School size={24} /></b><small>Service to our school and community</small></div>
            <div><b><HeartHandshake size={24} /></b><small>A legacy built through collective action</small></div>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section-heading centered">
          <span className="eyebrow">Who We Are</span>
          <h2>More than former classmates—we are a community for life.</h2>
          <p>
            The Sangajor B.C.S. Class of 2008 Association brings members together to
            reconnect, contribute their skills, care for one another and create meaningful
            impact through education, welfare and community service.
          </p>
        </div>
      </section>

      <section className="section muted-section">
        <div className="section-heading centered">
          <span className="eyebrow">Our Focus Areas</span>
          <h2>Six ways we are creating lasting value.</h2>
        </div>
        <div className="card-grid">
          {impactAreas.map(({ icon: Icon, title, text }) => (
            <article className="impact-card" key={title}>
              <div className="icon-wrap"><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section leadership-preview">
        <div className="section-heading">
          <span className="eyebrow">Leadership</span>
          <h2>Meet the people entrusted to serve our shared mission.</h2>
          <a className="text-link" href="#/leadership">Explore our leadership <ArrowRight size={17} /></a>
        </div>
        <div className="mini-leaders">
          {executives.filter((executive) => executive.status === 'complete').slice(0, 4).map((executive) => (
            <a href={`#/leadership/${executive.slug}`} key={executive.slug}>
              <span>{executive.name.split(' ').map((name) => name[0]).join('')}</span>
              <div>
                <strong>{executive.name}</strong>
                <small>{executive.role}</small>
              </div>
            </a>
          ))}
        </div>
      </section>

      <CallToAction />
    </>
  );
}
