import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { navItems } from '../../data/site';

function AssociationMark() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Sangajor B.C.S. Class of 2008 Association mark">
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M18 24h28v18H18z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 23l16-10 16 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42V29h16v13" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="32" y="37" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor">2008</text>
      <path d="M22 49h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Sangajor B.C.S. Class of 2008 Association homepage">
        <div className="brand-mark"><AssociationMark /></div>
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
