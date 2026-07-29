import { PageHero } from '../components/ui/PageHero';
import { impactAreas } from '../data/site';

export function Focus() {
  return (
    <>
      <PageHero eyebrow="Our Focus Areas" title="Plans designed to create lasting value." text="These areas describe what we intend to build, support and improve over time." />
      <section className="section"><div className="card-grid">{impactAreas.map(({ icon: Icon, title, text }) => <article className="impact-card" key={title}><div className="icon-wrap"><Icon /></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    </>
  );
}
