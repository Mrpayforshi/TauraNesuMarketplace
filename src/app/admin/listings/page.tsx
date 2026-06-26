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

interface DealerOption {
  id: string;
  name: string;
  status: string;
}

const BODY_TYPES = ['suv', 'sedan', 'hatchback', 'pickup', 'minivan'] as const;
const TRANSMISSIONS = ['automatic', 'manual'] as const;
const FUEL_TYPES = ['petrol', 'diesel'] as const;
const CONDITIONS = ['excellent', 'good', 'fair'] as const;
const DRIVES = ['rhd', 'lhd'] as const;
const NEW_LISTING_STATUSES = ['active', 'pending_review', 'draft'] as const;

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

  const [showAddListing, setShowAddListing] = useState(false);
  const [dealerOptions, setDealerOptions] = useState<DealerOption[]>([]);
  const [dealersLoading, setDealersLoading] = useState(false);
  const [newDealerId, setNewDealerId] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newMileage, setNewMileage] = useState('');
  const [newBodyType, setNewBodyType] = useState('');
  const [newTransmission, setNewTransmission] = useState('');
  const [newFuelType, setNewFuelType] = useState('');
  const [newColour, setNewColour] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newDrive, setNewDrive] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<string>('active');
  const [addListingError, setAddListingError] = useState('');
  const [addListingSaving, setAddListingSaving] = useState(false);

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

  async function openAddListing() {
    setNewDealerId('');
    setNewMake('');
    setNewModel('');
    setNewYear('');
    setNewPrice('');
    setNewMileage('');
    setNewBodyType('');
    setNewTransmission('');
    setNewFuelType('');
    setNewColour('');
    setNewCondition('');
    setNewDrive('');
    setNewDescription('');
    setNewStatus('active');
    setAddListingError('');
    setShowAddListing(true);

    setDealersLoading(true);
    try {
      const res = await authFetch('/api/admin/dealers?status=active');
      const data = await res.json();
      if (res.ok) setDealerOptions(data.dealers || []);
    } catch {
      // Dealer list is non-critical to load the modal; the dealer select
      // will just show "No active dealers found" and the save validation
      // below still catches a missing dealer_id.
    } finally {
      setDealersLoading(false);
    }
  }

  async function saveAddListing() {
    if (!newDealerId) {
      setAddListingError('Select a dealer.');
      return;
    }
    if (!newMake.trim() || !newModel.trim()) {
      setAddListingError('Make and model are required.');
      return;
    }
    const yearNum = parseInt(newYear, 10);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > currentYear) {
      setAddListingError(`Enter a year between 1990 and ${currentYear}.`);
      return;
    }
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setAddListingError('Enter a valid price.');
      return;
    }

    setAddListingSaving(true);
    setAddListingError('');
    try {
      const res = await authFetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealer_id: newDealerId,
          make: newMake.trim(),
          model: newModel.trim(),
          year: yearNum,
          price_usd: priceNum,
          mileage_km: newMileage ? parseInt(newMileage, 10) : undefined,
          body_type: newBodyType || undefined,
          transmission: newTransmission || undefined,
          fuel_type: newFuelType || undefined,
          colour: newColour.trim() || undefined,
          condition: newCondition || undefined,
          drive: newDrive || undefined,
          description: newDescription.trim() || undefined,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing');
      // The dealer name isn't returned by the insert .select(), so attach
      // it from the option the admin picked for an accurate table row.
      const dealerName = dealerOptions.find(d => d.id === newDealerId)?.name || '—';
      setListings(prev => [{ ...data.listing, dealers: { id: newDealerId, name: dealerName } }, ...prev]);
      // Jump to the tab matching the status just created, so the new
      // listing is immediately visible instead of landing on whatever tab
      // the admin happened to be on. There's no dedicated "Draft" tab, so
      // fall back to "All" in that case.
      setTab(newStatus === 'draft' ? 'all' : (newStatus as FilterTab));
      setShowAddListing(false);
    } catch (e) {
      setAddListingError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setAddListingSaving(false);
    }
  }

  return (
    <main className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.heading}>Listings</h1>
            <p className={styles.sub}>Review pending submissions and manage published listings</p>
          </div>
          <button type="button" className={styles.addBtn} onClick={openAddListing}>
            + Add Listing
          </button>
        </div>
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
      {showAddListing && (
        <div className={styles.modalOverlay} onClick={() => !addListingSaving && setShowAddListing(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Listing</h2>
            <p className={styles.modalSub}>
              Create a listing on behalf of an existing dealer. Defaults to <strong>active</strong> — no separate approval step for admin-created listings.
            </p>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="newDealer">Dealer *</label>
              <select
                id="newDealer"
                className={styles.modalSelect}
                value={newDealerId}
                onChange={e => setNewDealerId(e.target.value)}
                disabled={dealersLoading}
              >
                <option value="">{dealersLoading ? 'Loading dealers…' : 'Select a dealer'}</option>
                {dealerOptions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {!dealersLoading && dealerOptions.length === 0 && (
                <p className={styles.modalSub} style={{ marginTop: '0.4rem' }}>
                  No active dealers found. Add a dealer first from the Dealers tab.
                </p>
              )}
            </div>

            <div className={styles.modalGrid2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="newMake">Make *</label>
                <input id="newMake" type="text" className={styles.modalInput} value={newMake}
                  onChange={e => setNewMake(e.target.value)} placeholder="e.g. Toyota" />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="newModel">Model *</label>
                <input id="newModel" type="text" className={styles.modalInput} value={newModel}
                  onChange={e => setNewModel(e.target.value)} placeholder="e.g. Hilux" />
              </div>
            </div>

            <div className={styles.modalGrid2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="newYear">Year *</label>
                <input id="newYear" type="number" className={styles.modalInput} value={newYear}
                  onChange={e => setNewYear(e.target.value)} placeholder="2022" />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="newPrice">Price (USD) *</label>
                <input id="newPrice" type="number" className={styles.modalInput} value={newPrice}
                  onChange={e => setNewPrice(e.target.value)} placeholder="25000" />
              </div>
            </div>

            <div className={styles.modalGrid2}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="newMileage">Mileage (km)</label>
                <input id="newMileage" type="number" className={styles.modalInput} value={newMileage}
                  onChange={e => setNewMileage(e.target.value)} placeholder="45000" />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="newColour">Colour</label>
                <input id="newColour" type="text" className={styles.modalInput} value={newColour}
                  onChange={e => setNewColour(e.target.value)} placeholder="e.g. White" />
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Body type</label>
              <div className={styles.chipGroup}>
                {BODY_TYPES.map(v => (
                  <button key={v} type="button" className={`${styles.chip} ${newBodyType === v ? styles.chipActive : ''}`}
                    onClick={() => setNewBodyType(v)}>{v}</button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Transmission</label>
              <div className={styles.chipGroup}>
                {TRANSMISSIONS.map(v => (
                  <button key={v} type="button" className={`${styles.chip} ${newTransmission === v ? styles.chipActive : ''}`}
                    onClick={() => setNewTransmission(v)}>{v}</button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Fuel type</label>
              <div className={styles.chipGroup}>
                {FUEL_TYPES.map(v => (
                  <button key={v} type="button" className={`${styles.chip} ${newFuelType === v ? styles.chipActive : ''}`}
                    onClick={() => setNewFuelType(v)}>{v}</button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Condition</label>
              <div className={styles.chipGroup}>
                {CONDITIONS.map(v => (
                  <button key={v} type="button" className={`${styles.chip} ${newCondition === v ? styles.chipActive : ''}`}
                    onClick={() => setNewCondition(v)}>{v}</button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Drive</label>
              <div className={styles.chipGroup}>
                {DRIVES.map(v => (
                  <button key={v} type="button" className={`${styles.chip} ${newDrive === v ? styles.chipActive : ''}`}
                    onClick={() => setNewDrive(v)}>{v.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="newDescription">Description</label>
              <textarea id="newDescription" rows={3} className={styles.modalTextarea} value={newDescription}
                onChange={e => setNewDescription(e.target.value)} placeholder="Optional notes shown on the public listing" />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Status</label>
              <div className={styles.chipGroup}>
                {NEW_LISTING_STATUSES.map(v => (
                  <button key={v} type="button" className={`${styles.chip} ${newStatus === v ? styles.chipActive : ''}`}
                    onClick={() => setNewStatus(v)}>{formatStatusLabel(v)}</button>
                ))}
              </div>
            </div>

            {addListingError && <div className={styles.modalError}>{addListingError}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setShowAddListing(false)} disabled={addListingSaving}>
                Cancel
              </button>
              <button type="button" className={styles.modalSaveBtn} onClick={saveAddListing} disabled={addListingSaving}>
                {addListingSaving ? 'Creating…' : 'Create listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
