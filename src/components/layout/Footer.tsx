import './Footer.css';
import { associationEmail } from '../../config/site';

const officialLogo = '/sangajorr-association-logo.png.jpeg';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <div className="brand footer-brand">
            <div className="brand-mark footer-logo-wrap">
              <img
                src={officialLogo}
                alt="Sangajor B.C.S. Class of 2008 Association logo"
                width="54"
                height="54"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div>
              <strong>Sangajor B.C.S.</strong>
              <span>Class of 2008 Association</span>
            </div>
          </div>
          <p>Together for a Better Future.</p>
        </div>

        <nav aria-label="Footer — Explore">
          <h3>Explore</h3>
          <a href="#/about">Our Story</a>
          <a href="#/leadership">Leadership</a>
          <a href="#/membership">Membership</a>
          <a href="#/focus">Focus Areas</a>
          <a href="#/journey">Our Journey</a>
        </nav>

        <nav aria-label="Footer — News and media">
          <h3>News & Media</h3>
          <a href="#/updates">Latest News</a>
          <a href="#/events">Events</a>
          <a href="#/gallery">Gallery</a>
        </nav>

        <div className="footer-contact">
          <h3>Connect</h3>
          <a href={`mailto:${associationEmail}`}>{associationEmail}</a>
          <span>The Gambia and beyond</span>
          <a href="#/contact">Contact the Association</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Sangajor B.C.S. Class of 2008 Association. All rights reserved.</span>
        <span className="studio-credit">Designed &amp; developed by Elegant Empire AI Studio.</span>
      </div>
    </footer>
  );
}
