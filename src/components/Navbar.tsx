'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/listings?q=${encodeURIComponent(query.trim())}`);
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          TauraNesu
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          )}
        </button>

        <div className={`${styles.menuPanel} ${menuOpen ? styles.menuPanelOpen : ''}`}>
          <div className={styles.links}>
            <Link href="/listings" className={styles.navLink} onClick={closeMenu}>Browse</Link>
            <Link href="/sell" className={styles.navLinkAccent} onClick={closeMenu}>Sell your car</Link>
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search make, model, keyword..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={styles.searchInput}
            />
          </form>

          <div className={styles.actions}>
            <Link href="/login" className={styles.signIn} onClick={closeMenu}>Sign In</Link>
            <Link href="/login?portal=dealer" className={styles.dealerBtn} onClick={closeMenu}>Dealer</Link>
            <Link href="/sell" className={styles.sellBtn} onClick={closeMenu}>Sell My Car</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
