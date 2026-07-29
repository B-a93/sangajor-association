import './Footer.css';

const officialLogo = '/sangajorr-association-logo.png.jpeg';

export function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="brand footer-brand">
            <div className="brand-mark footer-logo-wrap">
              <img
                src={officialLogo}
                alt="Sangajor B.C.S. Class of 2008 Association logo"
                width="54"
                height="54"
              />
            </div>
            <div>
              <strong>Sangajor B.C.S.</strong>
              <span>Class of 2008 Association</span>
            </div>
          </div>
          <p>Together since childhood. United for life.</p>
        </div>

        <div>
          <h3>Explore</h3>
          <a href="#/about">Our Story</a>
          <a href="#/leadership">Leadership</a>
          <a href="#/membership">Membership</a>
          <a href="#/focus">Focus Areas</a>
          <a href="#/journey">Our Journey</a>
        </div>

        <div>
          <h3>News & Media</h3>
          <a href="#/updates">Latest News</a>
          <a href="#/events">Events</a>
          <a href="#/gallery">Gallery</a>
        </div>

        <div>
          <h3>Connect</h3>
          <a href="mailto:info@sangajor08.org">info@sangajor08.org</a>
          <span>The Gambia and beyond</span>
          <a href="#/contact">Contact the Association</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Sangajor B.C.S. Class of 2008 Association. All Rights Reserved.</span>
        <span className="studio-credit">Designed &amp; developed by Elegant Empire AI Studio.</span>
      </div>
    </footer>
  );
}
