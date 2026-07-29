import { ArrowRight, Newspaper } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import { news } from '../data/content';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

export function Updates() {
  return (
    <>
      <PageHero
        eyebrow="News & Announcements"
        title="Official updates in one trusted place."
        text="Follow approved announcements, Association developments and important information for members."
      />

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Latest Updates</span>
          <h2>News from the Association</h2>
          <p>Clear, accurate and accessible communication from the SANGAJOR B.C.S Class of 2008 Association.</p>
        </div>

        {news.length > 0 ? (
          <div className="news-grid">
            {news.map((item, index) => (
              <article className={index === 0 ? 'news-card featured-news' : 'news-card'} key={item.slug}>
                <div className="news-icon"><Newspaper size={24} /></div>
                <div className="news-card-body">
                  <div className="news-meta"><span className="content-category">{item.category}</span><time>{formatDate(item.published)}</time></div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <span className="news-read-more">Official announcement <ArrowRight size={16} /></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Newspaper size={34} /><h3>No news published yet</h3><p>Approved announcements will appear here when they are ready.</p></div>
        )}
      </section>

      <section className="news-standard">
        <div>
          <span className="eyebrow light">Communication Standard</span>
          <h2>Information members can trust.</h2>
          <p>Published updates should be accurate, respectful, approved by the appropriate office and consistent with the Association's constitution and values.</p>
        </div>
        <a className="button button-light" href="#/contact">Submit an enquiry</a>
      </section>
    </>
  );
}
