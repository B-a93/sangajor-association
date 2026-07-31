import { ArrowRight, BriefcaseBusiness, MapPin } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import { executives } from '../data/executives';

export function Leadership() {
  const complete = executives.filter((executive) => executive.status === 'complete').length;

  return (
    <>
      <PageHero eyebrow="Leadership & Advisory Council" title="Serving with integrity, experience and shared responsibility." text="Meet the elected officers and advisers helping guide the Association." />
      <section className="section">
        <div className="leadership-summary">
          <div><span className="eyebrow">Executive Term</span><h2>2026–2031</h2></div>
          <div className="profile-progress"><strong>{complete} of {executives.length}</strong><span>profiles completed</span><div><i style={{ width: `${(complete / executives.length) * 100}%` }} /></div></div>
        </div>
        <div className="leadership-grid">
          {executives.map((executive) => (
            <article className={`leader-card ${executive.status}`} key={executive.slug}>
              <div className="leader-portrait">{executive.image ? <img src={executive.image} alt={`${executive.name} official portrait`} loading="lazy" /> : <span>{executive.name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</span>}{executive.status === 'pending' && <small>Profile Coming Soon</small>}</div>
              <div className="leader-card-body">
                <span>{executive.role}</span><h3>{executive.name}</h3>
                {executive.location && <p><MapPin size={15} />{executive.location}</p>}
                {executive.occupation && <p><BriefcaseBusiness size={15} />{executive.occupation}</p>}
                {executive.status === 'complete' ? <a className="profile-link" href={`#/leadership/${executive.slug}`}>View Profile <ArrowRight size={16} /></a> : <div className="pending-label">Profile Coming Soon</div>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
