import { PageHero } from '../components/ui/PageHero';
import { reasonsToJoin } from '../data/site';

export function Membership() {
  return (
    <>
      <PageHero eyebrow="Membership" title="Belong to the community you helped create." text="Membership reconnects classmates, strengthens mutual support and gives every member a voice." />
      <section className="section"><div className="card-grid">{reasonsToJoin.map(({ icon: Icon, title, text }) => <article className="impact-card" key={title}><div className="icon-wrap"><Icon /></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    </>
  );
}
