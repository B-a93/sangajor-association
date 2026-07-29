import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { navItems } from '../../data/site';

const officialLogo = '/sangajorr-association-logo.png.jpeg';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Sangajor B.C.S. Class of 2008 Association homepage">
        <div className="brand-mark">
          <img
            src={officialLogo}
            alt="Sangajor B.C.S. Class of 2008 Association logo"
            width="45"
            height="45"
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
      </nav>

      <button
        className="menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}
