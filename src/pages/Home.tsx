import { ArrowRight } from 'lucide-react';
import { CallToAction } from '../components/ui/CallToAction';
import { executives } from '../data/executives';
import { impactAreas } from '../data/site';

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">The official digital platform of the Class of 2008</span>
          <h1>Together since childhood. <em>United for life.</em></h1>
          <p>What began in one classroom is becoming a lifelong commitment to support one another, serve our school and strengthen our community.</p>
          <div className="hero-actions">
            <a className="button" href="#/leadership">Meet Our Leadership <ArrowRight size={18} /></a>
            <a className="button button-secondary" href="#/about">Learn Our Story</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading centered">
          <span className="eyebrow">Our Focus Areas</span>
          <h2>Six ways we plan to create lasting value.</h2>
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

      <section className="section muted-section leadership-preview">
        <div className="section-heading">
          <span className="eyebrow">Leadership</span>
          <h2>Meet the people serving our shared mission.</h2>
          <a className="text-link" href="#/leadership">Explore leadership <ArrowRight size={17} /></a>
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
