import { PageHero } from '../components/ui/PageHero';

export function About() {
  return (
    <>
      <PageHero
        eyebrow="About SANGAJOR"
        title="A shared past. A purposeful future."
        text="The Class of 2008 is transforming lifelong connections into an organised association committed to service, education and community development."
      />
      <section className="section">
        <div className="story-grid">
          <div>
            <span className="eyebrow">Our Story</span>
            <h2>From Primary 1 through Grade 9.</h2>
            <p>Members learned, grew and completed their basic education together at SANGAJOR Basic Cycle School. In 2026, members began formalising that bond through elected leadership, a ratified constitution and preparations for NGO registration.</p>
          </div>
          <blockquote>We are starting from unity, honesty and a clear commitment to serve.</blockquote>
        </div>
      </section>
    </>
  );
}
