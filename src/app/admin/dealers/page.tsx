'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import styles from './admin-dealers.module.css';

interface Dealer {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  status: 'pending' | 'active' | 'suspended';
  subscription_tier: 'basic' | 'standard' | 'premium';
  listing_limit: number;
  notes: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'pending' | 'active' | 'suspended';

const TABS: FilterTab[] = ['all', 'pending', 'active', 'suspended'];
const TIERS = ['basic', 'standard', 'premium'] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminDealersPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [editDealer, setEditDealer] = useState<Dealer | null>(null);
  const [editTier, setEditTier] = useState<string>('basic');
  const [editLimit, setEditLimit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState<Dealer | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendSaving, setSuspendSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authFetch('/api/admin/dealers');
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load dealers');
        if (active) setDealers(data.dealers || []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const counts = useMemo(() => ({
    all: dealers.length,
    pending: dealers.filter(d => d.status === 'pending').length,
    active: dealers.filter(d => d.status === 'active').length,
    suspended: dealers.filter(d => d.status === 'suspended').length,
  }), [dealers]);

  const filtered = tab === 'all' ? dealers : dealers.filter(d => d.status === tab);

  async function handleApprove(dealer: Dealer) {
    setActioningId(dealer.id);
    try {
      const res = await authFetch(`/api/admin/dealers/${dealer.id}/approve`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setDealers(prev => prev.map(d => (d.id === dealer.id ? data.dealer : d)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActioningId(null);
    }
  }

  function openSuspend(dealer: Dealer) {
    setSuspendTarget(dealer);
    setSuspendReason('');
  }

  async function confirmSuspend() {
    if (!suspendTarget) return;
    setSuspendSaving(true);
    try {
      const res = await authFetch(`/api/admin/dealers/${suspendTarget.id}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suspend failed');
      setDealers(prev => prev.map(d => (d.id === suspendTarget.id ? data.dealer : d)));
      setSuspendTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSuspendSaving(false);
    }
  }

  function openEdit(dealer: Dealer) {
    setEditDealer(dealer);
    setEditTier(dealer.subscription_tier);
    setEditLimit(String(dealer.listing_limit));
    setEditNotes(dealer.notes || '');
    setEditError('');
  }

  async function saveEdit() {
    if (!editDealer) return;
    const limitNum = parseInt(editLimit, 10);
    if (!Number.isInteger(limitNum) || limitNum < 0) {
      setEditError('Listing limit must be a non-negative whole number.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await authFetch(`/api/admin/dealers/${editDealer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: editTier,
          listing_limit: limitNum,
          notes: editNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setDealers(prev => prev.map(d => (d.id === editDealer.id ? data.dealer : d)));
      setEditDealer(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <main className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Dealers</h1>
        <p className={styles.sub}>Approve new dealers, manage tiers, and suspend accounts</p>
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
              {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No {tab === 'all' ? '' : tab} dealers to show.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dealer</th>
                  <th>Location</th>
                  <th>Phone</th>
                  <th>Tier</th>
                  <th>Limit</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(dealer => (
                  <tr key={dealer.id}>
                    <td>
                      <div className={styles.dealerName}>{dealer.name}</div>
                      {dealer.contact_name && <div className={styles.dealerContact}>{dealer.contact_name}</div>}
                    </td>
                    <td className={styles.muted}>{dealer.city || '—'}</td>
                    <td className={styles.muted}>{dealer.phone || '—'}</td>
                    <td><span className={styles.tierBadge} data-tier={dealer.subscription_tier}>{dealer.subscription_tier}</span></td>
                    <td className={styles.muted}>{dealer.listing_limit}</td>
                    <td><span className={styles.statusBadge} data-status={dealer.status}>{dealer.status}</span></td>
                    <td className={styles.muted}>{formatDate(dealer.created_at)}</td>
                    <td className={styles.actionsCell}>
                      {dealer.status === 'pending' && (
                        <button
                          type="button"
                          className={styles.approveBtn}
                          onClick={() => handleApprove(dealer)}
                          disabled={actioningId === dealer.id}
                        >
                          {actioningId === dealer.id ? 'Approving…' : 'Approve'}
                        </button>
                      )}
                      {dealer.status === 'active' && (
                        <button
                          type="button"
                          className={styles.suspendBtn}
                          onClick={() => openSuspend(dealer)}
                          disabled={actioningId === dealer.id}
                        >
                          Suspend
                        </button>
                      )}
                      {dealer.status === 'suspended' && (
                        <button
                          type="button"
                          className={styles.approveBtn}
                          onClick={() => handleApprove(dealer)}
                          disabled={actioningId === dealer.id}
                        >
                          {actioningId === dealer.id ? 'Reactivating…' : 'Reactivate'}
                        </button>
                      )}
                      <button type="button" className={styles.editBtn} onClick={() => openEdit(dealer)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editDealer && (
        <div className={styles.modalOverlay} onClick={() => !editSaving && setEditDealer(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit {editDealer.name}</h2>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Subscription tier</label>
              <div className={styles.chipGroup}>
                {TIERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.chip} ${editTier === t ? styles.chipActive : ''}`}
                    onClick={() => setEditTier(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="listingLimit">Listing limit</label>
              <input
                id="listingLimit"
                type="number"
                min="0"
                className={styles.modalInput}
                value={editLimit}
                onChange={e => setEditLimit(e.target.value)}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                rows={3}
                className={styles.modalTextarea}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Internal notes about this dealer (optional)"
              />
            </div>

            {editError && <div className={styles.modalError}>{editError}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setEditDealer(null)} disabled={editSaving}>
                Cancel
              </button>
              <button type="button" className={styles.modalSaveBtn} onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {suspendTarget && (
        <div className={styles.modalOverlay} onClick={() => !suspendSaving && setSuspendTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Suspend {suspendTarget.name}?</h2>
            <p className={styles.modalSub}>
              Their account will be marked suspended and they won&apos;t be able to manage listings until reactivated.
            </p>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="suspendReason">Reason (optional, visible to other admins)</label>
              <textarea
                id="suspendReason"
                rows={3}
                className={styles.modalTextarea}
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Repeated policy violations"
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setSuspendTarget(null)} disabled={suspendSaving}>
                Cancel
              </button>
              <button type="button" className={styles.modalDangerBtn} onClick={confirmSuspend} disabled={suspendSaving}>
                {suspendSaving ? 'Suspending…' : 'Suspend dealer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
