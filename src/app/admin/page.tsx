'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './admin-dashboard.module.css';

interface Stats {
  dealers: { total: number; active: number; pending: number };
  listings: { total: number; active: number; pending: number };
  submissions: { total: number };
  transactions: { total: number };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        if (res.status === 401) { router.push('/login'); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load stats');
        setStats(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Something went wrong'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Admin Dashboard</h1>
        <p className={styles.sub}>Platform-wide overview</p>
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.loadingGrid}>
            {[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonCard} />)}
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        ) : stats ? (
          <>
            <div className={styles.statsGrid}>
              <Link href="/admin/dealers" className={styles.statCard}>
                <div className={styles.statIcon} data-color="blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className={styles.statValue}>{stats.dealers.total}</div>
                <div className={styles.statLabel}>Dealers</div>
                {stats.dealers.pending > 0 && (
                  <span className={styles.statFlag}>{stats.dealers.pending} pending</span>
                )}
              </Link>

              <Link href="/admin/listings" className={styles.statCard}>
                <div className={styles.statIcon} data-color="green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div className={styles.statValue}>{stats.listings.total}</div>
                <div className={styles.statLabel}>Listings</div>
                {stats.listings.pending > 0 && (
                  <span className={styles.statFlag}>{stats.listings.pending} pending</span>
                )}
              </Link>

              <Link href="/admin/submissions" className={styles.statCard}>
                <div className={styles.statIcon} data-color="orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                </div>
                <div className={styles.statValue}>{stats.submissions.total}</div>
                <div className={styles.statLabel}>Submissions</div>
              </Link>

              <div className={styles.statCard}>
                <div className={styles.statIcon} data-color="purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className={styles.statValue}>{stats.transactions.total}</div>
                <div className={styles.statLabel}>Transactions</div>
              </div>
            </div>

            <div className={styles.breakdownSection}>
              <h2 className={styles.sectionTitle}>Status Breakdown</h2>
              <div className={styles.breakdownGrid}>
                <div className={styles.breakdownCard}>
                  <p className={styles.breakdownTitle}>Dealers</p>
                  <div className={styles.breakdownRow}><span>Active</span><strong>{stats.dealers.active}</strong></div>
                  <div className={styles.breakdownRow}><span>Pending</span><strong>{stats.dealers.pending}</strong></div>
                </div>
                <div className={styles.breakdownCard}>
                  <p className={styles.breakdownTitle}>Listings</p>
                  <div className={styles.breakdownRow}><span>Active</span><strong>{stats.listings.active}</strong></div>
                  <div className={styles.breakdownRow}><span>Pending</span><strong>{stats.listings.pending}</strong></div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
