'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import styles from './admin-listings.module.css';

interface Listing {
  id: string;
  make: string;
  model: string;
  year: number;
  price_usd: number;
  status: 'draft' | 'pending_review' | 'active' | 'rejected' | 'sold' | 'archived' | 'deleted';
  created_at: string;
  dealers: { id: string; name: string } | null;
}

type FilterTab = 'all' | 'pending_review' | 'active' | 'rejected' | 'sold';

const TABS: FilterTab[] = ['all', 'pending_review', 'active', 'rejected', 'sold'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatStatusLabel(status: string) {
  return status.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export default function AdminListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<FilterTab>('pending_review');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authFetch('/api/admin/listings');
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load listings');
        if (active) setListings(data.listings || []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const counts = useMemo(() => ({
    all: listings.length,
    pending_review: listings.filter(l => l.status === 'pending_review').length,
    active: listings.filter(l => l.status === 'active').length,
    rejected: listings.filter(l => l.status === 'rejected').length,
    sold: listings.filter(l => l.status === 'sold').length,
  }), [listings]);

  const filtered = tab === 'all' ? listings : listings.filter(l => l.status === tab);

  // Approve/reject responses come from a plain `.select().single()` with no
  // dealer join, so merge onto the existing row instead of replacing it —
  // otherwise the dealer name would disappear after an action.
  function mergeListing(id: string, patch: Partial<Listing>) {
    setListings(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleApprove(listing: Listing) {
    setActioningId(listing.id);
    try {
      const res = await authFetch(`/api/admin/listings/${listing.id}/approve`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      mergeListing(listing.id, data.listing);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActioningId(null);
    }
  }

  function openReject(listing: Listing) {
    setRejectTarget(listing);
    setRejectReason('');
    setRejectError('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('A rejection reason is required.');
      return;
    }
    setRejectSaving(true);
    setRejectError('');
    try {
      const res = await authFetch(`/api/admin/listings/${rejectTarget.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      mergeListing(rejectTarget.id, data.listing);
      setRejectTarget(null);
    } catch (e) {
      setRejectError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setRejectSaving(false);
    }
  }

  return (
    <main className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Listings</h1>
        <p className={styles.sub}>Review pending submissions and manage published listings</p>
      </div>

      <div className={styles.body}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'all' ? 'All' : formatStatusLabel(t)}
              <span className={styles.tabCount}>{counts[t]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} className={styles.skeletonRow} />)}
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M9 21V9" />
            </svg>
            <p>No {tab === 'all' ? '' : formatStatusLabel(tab).toLowerCase()} listings to show.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Vehicle</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(listing => (
                  <tr key={listing.id}>
                    <td><span className={styles.dealerName}>{listing.dealers?.name || '—'}</span></td>
                    <td><span className={styles.vehicleName}>{listing.year} {listing.make} {listing.model}</span></td>
                    <td className={styles.price}>{formatPrice(listing.price_usd)}</td>
                    <td><span className={styles.statusBadge} data-status={listing.status}>{formatStatusLabel(listing.status)}</span></td>
                    <td className={styles.muted}>{formatDate(listing.created_at)}</td>
                    <td className={styles.actionsCell}>
                      {listing.status === 'pending_review' && (
                        <>
                          <button
                            type="button"
                            className={styles.approveBtn}
                            onClick={() => handleApprove(listing)}
                            disabled={actioningId === listing.id}
                          >
                            {actioningId === listing.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className={styles.rejectBtn}
                            onClick={() => openReject(listing)}
                            disabled={actioningId === listing.id}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className={styles.modalOverlay} onClick={() => !rejectSaving && setRejectTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              Reject {rejectTarget.year} {rejectTarget.make} {rejectTarget.model}?
            </h2>
            <p className={styles.modalSub}>
              The dealer will see this listing marked as rejected. A reason is required.
            </p>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="rejectReason">Reason</label>
              <textarea
                id="rejectReason"
                rows={3}
                className={styles.modalTextarea}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Photos don't match listed condition"
              />
            </div>

            {rejectError && <div className={styles.modalError}>{rejectError}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setRejectTarget(null)} disabled={rejectSaving}>
                Cancel
              </button>
              <button type="button" className={styles.modalDangerBtn} onClick={confirmReject} disabled={rejectSaving}>
                {rejectSaving ? 'Rejecting…' : 'Reject listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
