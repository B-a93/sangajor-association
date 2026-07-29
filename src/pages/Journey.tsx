import { PageHero } from '../components/ui/PageHero';

export function Journey() {
  return (
    <>
      <PageHero eyebrow="Our Journey" title="A shared history. A growing legacy." text="This living timeline will expand with photographs, memories, milestones and future service." />
      <section className="section journey-section"><div className="timeline"><div><span>Before 2008</span><h3>Growing and learning together</h3></div><div><span>2008</span><h3>Class journey completed</h3></div><div><span>2026</span><h3>Association formally establishing</h3></div><div><span>Next</span><h3>Service, impact and legacy</h3></div></div></section>
    </>
  );
}
