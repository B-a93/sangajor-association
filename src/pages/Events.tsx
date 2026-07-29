import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import { events } from '../data/content';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

export function Events() {
  const upcoming = events.filter((event) => event.status === 'upcoming');
  const past = events.filter((event) => event.status === 'past');

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Gathering with purpose. Serving with unity."
        text="Stay informed about Association meetings, community service, training, fundraising and social activities."
      />

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Coming Up</span>
          <h2>Upcoming events</h2>
          <p>Official activities approved for members and the wider Association community.</p>
        </div>

        {upcoming.length > 0 ? (
          <div className="event-grid">
            {upcoming.map((event) => (
              <article className="event-card" key={event.slug}>
                <div className="event-date"><CalendarDays size={22} /><strong>{formatDate(event.date)}</strong></div>
                <span className="content-category">{event.category}</span>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
                <div className="event-meta">
                  <span><Clock3 size={16} />{event.time}</span>
                  <span><MapPin size={16} />{event.venue}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><CalendarDays size={34} /><h3>No upcoming events yet</h3><p>Approved activities will appear here as soon as dates are confirmed.</p></div>
        )}
      </section>

      <section className="section muted-section">
        <div className="section-heading">
          <span className="eyebrow">Archive</span>
          <h2>Past events</h2>
          <p>A growing public record of meetings, programmes and activities delivered by the Association.</p>
        </div>
        <div className="event-list">
          {past.map((event) => (
            <article key={event.slug}>
              <div><span className="content-category">{event.category}</span><h3>{event.title}</h3><p>{event.summary}</p></div>
              <div className="event-list-meta"><strong>{formatDate(event.date)}</strong><span>{event.time} · {event.venue}</span></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
