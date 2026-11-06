'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DealerNav.module.css';

const TABS = [
  { href: '/dealer/dashboard', label: 'Inventory' },
  { href: '/dealer/leads', label: 'Leads' },
  { href: '/dealer/profile', label: 'Profile' },
];

export default function DealerNav() {
  const pathname = usePathname() ?? '';

  return (
    <div className={styles.bar}>
      <nav className={styles.inner} aria-label="Dealer portal">
        {TABS.map((t) => {
          // Listing pages (/dealer/listings/...) belong to the Inventory tab
          const active =
            pathname === t.href ||
            pathname.startsWith(t.href + '/') ||
            (t.href === '/dealer/dashboard' && pathname.startsWith('/dealer/listings'));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
