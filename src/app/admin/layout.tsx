'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAccessToken } from '@/lib/client-auth';
import styles from './admin-layout.module.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'grid' },
  { href: '/admin/dealers', label: 'Dealers', icon: 'users' },
  { href: '/admin/listings', label: 'Listings', icon: 'car' },
  { href: '/admin/submissions', label: 'Submissions', icon: 'inbox' },
] as const;

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'grid':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case 'users':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'car':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 17h14l1.6-5.6a2 2 0 0 0-1.92-2.54H6.32a2 2 0 0 0-1.92 1.46L3 17" />
          <circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" />
          <path d="M5 11l1.2-4.2A2 2 0 0 1 8.13 5.4h7.74a2 2 0 0 1 1.93 1.4L19 11" />
        </svg>
      );
    case 'inbox':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAccessToken();
      router.push('/login');
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>TauraNesu</Link>
          <span className={styles.badge}>Admin</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </aside>

      <div className={styles.main}>
        {children}
      </div>
    </div>
  );
}
