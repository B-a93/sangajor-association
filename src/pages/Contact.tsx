import { Mail, MapPin, Users } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';

export function Contact() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Connect with SANGAJOR." text="Questions about membership, partnerships or the Association can be directed through the official channels below." />
      <section className="section"><div className="contact-grid"><article><Mail /><h3>Email</h3><a href="mailto:info@sangajor08.org">info@sangajor08.org</a></article><article><MapPin /><h3>Community</h3><p>The Gambia and members around the world.</p></article><article><Users /><h3>Membership</h3><a href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Open registration form</a></article></div></section>
    </>
  );
}
