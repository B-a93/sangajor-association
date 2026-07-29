import { Clock3, Mail, MapPin, Users } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import './Contact.css';

export function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Connect with SANGAJOR."
        text="Questions about membership, partnerships or the Association can be directed through the official channels below."
      />

      <section className="section contact-section">
        <div className="contact-grid">
          <article>
            <Mail />
            <h3>Email</h3>
            <a href="mailto:info@sangajor08.org">info@sangajor08.org</a>
          </article>
          <article>
            <MapPin />
            <h3>Community</h3>
            <p>The Gambia and members around the world.</p>
          </article>
          <article>
            <Users />
            <h3>Membership</h3>
            <a href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Open registration form</a>
          </article>
        </div>

        <aside className="response-time-note">
          <div className="response-time-icon"><Clock3 size={27} /></div>
          <div>
            <span className="eyebrow">Response Time</span>
            <h2>We aim to respond within 2–3 business days.</h2>
            <p>Our team aims to respond to all enquiries within 2–3 business days. We appreciate your patience and look forward to assisting you.</p>
          </div>
        </aside>
      </section>
    </>
  );
}
