import { BookOpen, CalendarDays } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';

export function Updates() {
  return (
    <>
      <PageHero eyebrow="News & Announcements" title="Official updates in one trusted place." text="A clear public record of approved announcements and Association developments." />
      <section className="section"><div className="update-grid"><article><CalendarDays /><span>Development</span><h3>Project Legacy public platform</h3><p>The website foundation and leadership directory are now being implemented.</p></article><article><BookOpen /><span>Leadership</span><h3>Executive profiles being published</h3><p>Completed profiles are live while remaining members submit their information.</p></article></div></section>
    </>
  );
}
