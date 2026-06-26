'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from './dashboard.module.css';
import { authFetch, clearAccessToken } from '@/lib/client-auth';

interface Listing {
  id: string;
  make: string;
  model: string;
  year: number;
  price_usd: number;
  status: string;
  view_count: number;
  created_at: string;
}

interface Analytics {
  period_days: number;
  active_listings: number;
  listings: Listing[];
  leads_received: number;
  pipeline: {
    accepted: number;
    passed: number;
  };
}

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US');
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  pending_review: 'Pending Review',
  sold: 'Sold',
  archived: 'Archived',
};

export default function DealerDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    authFetch(`/api/dealer/analytics?days=${period}`)
      .then(async (res) => {
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setAnalytics(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period, router]);

  async function handleDelete(id: string) {
    if (!confirm('Archive this listing? It will no longer be visible to buyers.')) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/dealer/listings/${id}`, { method: 'DELETE' });
      if (res.status === 401) { clearAccessToken(); router.push('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      // Re-fetch analytics
      const analyticsRes = await authFetch(`/api/dealer/analytics?days=${period}`);
      if (analyticsRes.status === 401) { clearAccessToken(); router.push('/login'); return; }
      const updated = await analyticsRes.json();
      setAnalytics(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setDeletingId(null);
    }
  }

  const totalListings = analytics?.listings.length ?? 0;
  const soldCount = analytics?.listings.filter(l => l.status === 'sold').length ?? 0;
  const acceptanceRate = analytics && (analytics.pipeline.accepted + analytics.pipeline.passed) > 0
    ? Math.round((analytics.pipeline.accepted / (analytics.pipeline.accepted + analytics.pipeline.passed)) * 100)
    : null;

  return (
    <>
      <Navbar />
      <main className={styles.root}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInner}>
            <div>
              <h1 className={styles.heading}>Dealer Dashboard</h1>
              <p className={styles.sub}>Manage your listings and track performance</p>
            </div>
            <div className={styles.headerActions}>
              <Link href="/dealer/leads" className={styles.leadsBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                View Leads
              </Link>
              <Link href="/dealer/listings/new" className={styles.newBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Listing
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.body}>

          {/* Period selector */}
          <div className={styles.periodRow}>
            <span className={styles.periodLabel}>Period:</span>
            {([30, 60, 90] as const).map(d => (
              <button
                key={d}
                className={`${styles.periodBtn} ${period === d ? styles.periodActive : ''}`}
                onClick={() => setPeriod(d)}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Stats */}
          {loading ? (
            <div className={styles.loadingGrid}>
              {[1,2,3,4].map(i => <div key={i} className={styles.skeletonCard} />)}
            </div>
          ) : error ? (
            <div className={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          ) : analytics ? (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} data-color="blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div className={styles.statValue}>{analytics.active_listings}</div>
                  <div className={styles.statLabel}>Active Listings</div>
                </div>

                <Link href="/dealer/leads" className={`${styles.statCard} ${styles.statCardLink}`}>
                  <div className={styles.statIcon} data-color="green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className={styles.statValue}>{analytics.leads_received}</div>
                  <div className={styles.statLabel}>Leads ({period}d)</div>
                  <span className={styles.statCardCta}>View leads →</span>
                </Link>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} data-color="orange">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div className={styles.statValue}>{totalListings}</div>
                  <div className={styles.statLabel}>Total Listings</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} data-color="purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className={styles.statValue}>
                    {acceptanceRate !== null ? `${acceptanceRate}%` : soldCount}
                  </div>
                  <div className={styles.statLabel}>
                    {acceptanceRate !== null ? 'Lead Acceptance' : 'Sold'}
                  </div>
                </div>
              </div>

              {/* Listings table */}
              <div className={styles.tableSection}>
                <div className={styles.tableTitleRow}>
                  <h2 className={styles.tableTitle}>Your Listings</h2>
                  <Link href="/dealer/listings/new" className={styles.tableNewBtn}>+ Add new</Link>
                </div>

                {analytics.listings.length === 0 ? (
                  <div className={styles.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    <p>No listings yet — add your first car to get started.</p>
                    <Link href="/dealer/listings/new" className={styles.newBtn}>Create Listing</Link>
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Added</th>
                          <th>Views</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.listings.map(listing => (
                          <tr key={listing.id}>
                            <td className={styles.vehicleCell}>
                              <span className={styles.vehicleName}>
                                {listing.year} {listing.make} {listing.model}
                              </span>
                            </td>
                            <td className={styles.priceCell}>{formatPrice(listing.price_usd)}</td>
                            <td>
                              <span className={`${styles.badge} ${styles[`badge_${listing.status}`]}`}>
                                {STATUS_LABEL[listing.status] ?? listing.status}
                              </span>
                            </td>
                            <td className={styles.dateCell}>{timeAgo(listing.created_at)}</td>
                            <td className={styles.viewsCell}>{listing.view_count}</td>
                            <td className={styles.actionsCell}>
                              <Link
                                href={`/dealer/listings/${listing.id}/edit`}
                                className={styles.actionBtn}
                                title="Edit"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </Link>
                              <button
                                className={`${styles.actionBtn} ${styles.actionDelete}`}
                                onClick={() => handleDelete(listing.id)}
                                disabled={deletingId === listing.id}
                                title="Archive"
                              >
                                {deletingId === listing.id ? (
                                  <span className={styles.miniSpinner} />
                                ) : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6"/><path d="M14 11v6"/>
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pipeline summary */}
              {(analytics.pipeline.accepted + analytics.pipeline.passed) > 0 && (
                <div className={styles.pipelineSection}>
                  <h2 className={styles.tableTitle}>Lead Pipeline</h2>
                  <div className={styles.pipelineGrid}>
                    <div className={styles.pipelineCard}>
                      <div className={styles.pipelineNum} data-color="green">{analytics.pipeline.accepted}</div>
                      <div className={styles.pipelineLabel}>Accepted</div>
                    </div>
                    <div className={styles.pipelineCard}>
                      <div className={styles.pipelineNum} data-color="red">{analytics.pipeline.passed}</div>
                      <div className={styles.pipelineLabel}>Passed</div>
                    </div>
                    <div className={styles.pipelineCard}>
                      <div className={styles.pipelineNum} data-color="blue">
                        {analytics.pipeline.accepted + analytics.pipeline.passed}
                      </div>
                      <div className={styles.pipelineLabel}>Total</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}

        </div>
      </main>
    </>
  );
}
