import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navItems } from '../../data/site';
import { supabase } from '../../lib/supabase';

const officialLogo = '/sangajorr-association-logo.png.jpeg';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Sangajor B.C.S. Class of 2008 Association homepage">
        <div className="brand-mark">
          <img
            src={officialLogo}
            alt="Sangajor B.C.S. Class of 2008 Association logo"
            width="45"
            height="45"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
          />
        </div>
        <div>
          <strong>Sangajor B.C.S.</strong>
          <span>Class of 2008 Association</span>
        </div>
      </a>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        <a className="member-login-link" href={signedIn ? '#/dashboard' : '#/login'}>{signedIn ? 'Member Dashboard' : 'Member Login'}</a>
      </nav>

      <button
        className="menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          <a className="mobile-member-link" href={signedIn ? '#/dashboard' : '#/login'} onClick={() => setMenuOpen(false)}>
            {signedIn ? 'Member Dashboard' : 'Member Login'}
          </a>
          {navItems.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}
