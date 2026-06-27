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
  auth_user_id: string | null;
  login_phone: string | null;
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

  const [showAddDealer, setShowAddDealer] = useState(false);
  const [addName, setAddName] = useState('');
  const [addContactName, setAddContactName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addCity, setAddCity] = useState('');
  const [addTier, setAddTier] = useState<string>('basic');
  const [addLimit, setAddLimit] = useState('20');
  const [addNotes, setAddNotes] = useState('');
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addWantsLogin, setAddWantsLogin] = useState(false);
  const [addIdentifierType, setAddIdentifierType] = useState<'email' | 'phone'>('email');
  const [addIdentifier, setAddIdentifier] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addPasswordVisible, setAddPasswordVisible] = useState(false);

  const [credentialsTarget, setCredentialsTarget] = useState<Dealer | null>(null);
  const [credIdentifierType, setCredIdentifierType] = useState<'email' | 'phone'>('email');
  const [credIdentifier, setCredIdentifier] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [credPasswordVisible, setCredPasswordVisible] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSaving, setCredSaving] = useState(false);

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

  function openAddDealer() {
    setAddName('');
    setAddContactName('');
    setAddPhone('');
    setAddCity('');
    setAddTier('basic');
    setAddLimit('20');
    setAddNotes('');
    setAddError('');
    setAddWantsLogin(false);
    setAddIdentifierType('email');
    setAddIdentifier('');
    setAddPassword('');
    setAddPasswordVisible(false);
    setShowAddDealer(true);
  }

  async function saveAddDealer() {
    if (!addName.trim()) {
      setAddError('Dealer name is required.');
      return;
    }
    const limitNum = parseInt(addLimit, 10);
    if (!Number.isInteger(limitNum) || limitNum < 0) {
      setAddError('Listing limit must be a non-negative whole number.');
      return;
    }
    if (addWantsLogin) {
      if (!addIdentifier.trim()) {
        setAddError(addIdentifierType === 'email' ? 'Email is required.' : 'Phone number is required.');
        return;
      }
      if (addPassword.length < 8) {
        setAddError('Password must be at least 8 characters.');
        return;
      }
    }
    setAddSaving(true);
    setAddError('');
    try {
      const res = await authFetch('/api/admin/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          contact_name: addContactName.trim() || undefined,
          phone: addPhone.trim() || undefined,
          city: addCity.trim() || undefined,
          subscription_tier: addTier,
          listing_limit: limitNum,
          notes: addNotes.trim() || undefined,
          ...(addWantsLogin && {
            identifierType: addIdentifierType,
            identifier: addIdentifier.trim(),
            password: addPassword,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create dealer');
      setDealers(prev => [data.dealer, ...prev]);
      setShowAddDealer(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setAddSaving(false);
    }
  }

  function openCredentials(dealer: Dealer) {
    setCredentialsTarget(dealer);
    setCredIdentifierType('email');
    setCredIdentifier('');
    setCredPassword('');
    setCredPasswordVisible(false);
    setCredError('');
  }

  async function saveCredentials() {
    if (!credentialsTarget) return;
    if (!credIdentifier.trim()) {
      setCredError(credIdentifierType === 'email' ? 'Email is required.' : 'Phone number is required.');
      return;
    }
    if (credPassword.length < 8) {
      setCredError('Password must be at least 8 characters.');
      return;
    }
    setCredSaving(true);
    setCredError('');
    try {
      const res = await authFetch(`/api/admin/dealers/${credentialsTarget.id}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifierType: credIdentifierType,
          identifier: credIdentifier.trim(),
          password: credPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set login');
      // The credentials route only returns a status message, not the
      // updated dealer row — refetch the list so auth_user_id/login_phone
      // reflect the real database state rather than an optimistic guess.
      const refreshed = await authFetch('/api/admin/dealers');
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setDealers(refreshedData.dealers || []);
      setCredentialsTarget(null);
    } catch (e) {
      setCredError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setCredSaving(false);
    }
  }

  return (
    <main className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.heading}>Dealers</h1>
            <p className={styles.sub}>Approve new dealers, manage tiers, and suspend accounts</p>
          </div>
          <button type="button" className={styles.addBtn} onClick={openAddDealer}>
            + Add Dealer
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
                      <button type="button" className={styles.editBtn} onClick={() => openCredentials(dealer)}>
                        {dealer.auth_user_id ? 'Reset Login' : 'Set Login'}
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
      {showAddDealer && (
        <div className={styles.modalOverlay} onClick={() => !addSaving && setShowAddDealer(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Dealer</h2>
            <p className={styles.modalSub}>
              Creates the dealer immediately as <strong>active</strong> — they can submit listings right away.
            </p>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="addName">Dealer name *</label>
              <input
                id="addName"
                type="text"
                className={styles.modalInput}
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="e.g. Harare Premium Motors"
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="addContactName">Contact name</label>
              <input
                id="addContactName"
                type="text"
                className={styles.modalInput}
                value={addContactName}
                onChange={e => setAddContactName(e.target.value)}
                placeholder="Primary contact at the dealership"
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="addPhone">Phone</label>
              <input
                id="addPhone"
                type="text"
                className={styles.modalInput}
                value={addPhone}
                onChange={e => setAddPhone(e.target.value)}
                placeholder="+263…"
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="addCity">City</label>
              <input
                id="addCity"
                type="text"
                className={styles.modalInput}
                value={addCity}
                onChange={e => setAddCity(e.target.value)}
                placeholder="e.g. Harare"
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Subscription tier</label>
              <div className={styles.chipGroup}>
                {TIERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.chip} ${addTier === t ? styles.chipActive : ''}`}
                    onClick={() => setAddTier(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="addLimit">Listing limit</label>
              <input
                id="addLimit"
                type="number"
                min="0"
                className={styles.modalInput}
                value={addLimit}
                onChange={e => setAddLimit(e.target.value)}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="addNotes">Notes</label>
              <textarea
                id="addNotes"
                rows={3}
                className={styles.modalTextarea}
                value={addNotes}
                onChange={e => setAddNotes(e.target.value)}
                placeholder="Internal notes about this dealer (optional)"
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={addWantsLogin}
                  onChange={e => setAddWantsLogin(e.target.checked)}
                />
                Set up login credentials now
              </label>
            </div>

            {addWantsLogin && (
              <>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Login by</label>
                  <div className={styles.chipGroup}>
                    <button
                      type="button"
                      className={`${styles.chip} ${addIdentifierType === 'email' ? styles.chipActive : ''}`}
                      onClick={() => { setAddIdentifierType('email'); setAddIdentifier(''); }}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      className={`${styles.chip} ${addIdentifierType === 'phone' ? styles.chipActive : ''}`}
                      onClick={() => { setAddIdentifierType('phone'); setAddIdentifier(''); }}
                    >
                      Phone
                    </button>
                  </div>
                </div>

                <div className={styles.modalField}>
                  <label className={styles.modalLabel} htmlFor="addIdentifier">
                    {addIdentifierType === 'email' ? 'Login email' : 'Login phone'}
                  </label>
                  <input
                    id="addIdentifier"
                    type={addIdentifierType === 'email' ? 'email' : 'text'}
                    className={styles.modalInput}
                    value={addIdentifier}
                    onChange={e => setAddIdentifier(e.target.value)}
                    placeholder={addIdentifierType === 'email' ? 'dealer@example.com' : 'e.g. 0771234567'}
                  />
                  {addIdentifierType === 'phone' && (
                    <p className={styles.modalSub} style={{ marginTop: '0.4rem' }}>
                      Password-based login for now — phone is just used as the sign-in ID, no SMS code is sent.
                    </p>
                  )}
                </div>

                <div className={styles.modalField}>
                  <label className={styles.modalLabel} htmlFor="addPassword">Password</label>
                  <div className={styles.passwordRow}>
                    <input
                      id="addPassword"
                      type={addPasswordVisible ? 'text' : 'password'}
                      className={styles.modalInput}
                      value={addPassword}
                      onChange={e => setAddPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className={styles.showHideBtn}
                      onClick={() => setAddPasswordVisible(v => !v)}
                    >
                      {addPasswordVisible ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {addError && <div className={styles.modalError}>{addError}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setShowAddDealer(false)} disabled={addSaving}>
                Cancel
              </button>
              <button type="button" className={styles.modalSaveBtn} onClick={saveAddDealer} disabled={addSaving}>
                {addSaving ? 'Creating…' : 'Create dealer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {credentialsTarget && (
        <div className={styles.modalOverlay} onClick={() => !credSaving && setCredentialsTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {credentialsTarget.auth_user_id ? 'Reset login for' : 'Set login for'} {credentialsTarget.name}
            </h2>
            <p className={styles.modalSub}>
              {credentialsTarget.auth_user_id
                ? "This replaces their current sign-in email/phone and password. They'll need to use the new ones from now on."
                : 'They\u2019ll use this to sign in to the dealer portal.'}
            </p>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Login by</label>
              <div className={styles.chipGroup}>
                <button
                  type="button"
                  className={`${styles.chip} ${credIdentifierType === 'email' ? styles.chipActive : ''}`}
                  onClick={() => { setCredIdentifierType('email'); setCredIdentifier(''); }}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${credIdentifierType === 'phone' ? styles.chipActive : ''}`}
                  onClick={() => { setCredIdentifierType('phone'); setCredIdentifier(''); }}
                >
                  Phone
                </button>
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="credIdentifier">
                {credIdentifierType === 'email' ? 'Login email' : 'Login phone'}
              </label>
              <input
                id="credIdentifier"
                type={credIdentifierType === 'email' ? 'email' : 'text'}
                className={styles.modalInput}
                value={credIdentifier}
                onChange={e => setCredIdentifier(e.target.value)}
                placeholder={credIdentifierType === 'email' ? 'dealer@example.com' : 'e.g. 0771234567'}
              />
              {credIdentifierType === 'phone' && (
                <p className={styles.modalSub} style={{ marginTop: '0.4rem' }}>
                  Password-based login for now — phone is just used as the sign-in ID, no SMS code is sent.
                </p>
              )}
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="credPassword">Password</label>
              <div className={styles.passwordRow}>
                <input
                  id="credPassword"
                  type={credPasswordVisible ? 'text' : 'password'}
                  className={styles.modalInput}
                  value={credPassword}
                  onChange={e => setCredPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className={styles.showHideBtn}
                  onClick={() => setCredPasswordVisible(v => !v)}
                >
                  {credPasswordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {credError && <div className={styles.modalError}>{credError}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setCredentialsTarget(null)} disabled={credSaving}>
                Cancel
              </button>
              <button type="button" className={styles.modalSaveBtn} onClick={saveCredentials} disabled={credSaving}>
                {credSaving ? 'Saving…' : credentialsTarget.auth_user_id ? 'Reset login' : 'Create login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
