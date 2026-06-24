'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/listings?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          TauraNesu
        </Link>

        <div className={styles.links}>
          <Link href="/listings" className={styles.navLink}>Browse</Link>
          <Link href="/sell" className={styles.navLinkAccent}>Sell your car</Link>
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
          <Link href="/login" className={styles.signIn}>Sign In</Link>
          <Link href="/login?portal=dealer" className={styles.dealerBtn}>Dealer</Link>
          <Link href="/sell" className={styles.sellBtn}>Sell My Car</Link>
        </div>
      </div>
    </nav>
  );
}
