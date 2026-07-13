'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/client-auth';
import styles from './admin-submissions.module.css';

// ─── Shared types ───────────────────────────────────────────────────────────

export interface Dealer {
  id: string;
  name: string;
  status?: string;
}

export interface Lead {
  id: string;
  dealer_id: string;
  action: 'accepted' | 'passed' | null;
  created_at: string;
  dealers: Dealer | null;
}

export type SubmissionStatus = 'pending' | 'valued' | 'in_pipeline' | 'accepted' | 'closed' | 'rejected';

export interface SubmissionImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface Submission {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  transmission: string | null;
  fuel_type: string | null;
  colour: string | null;
  condition: string | null;
  intent: 'sell' | 'trade_in' | 'either' | null;
  known_issues: string | null;
  seller_name: string;
  seller_phone: string;
  seller_whatsapp: string;
  seller_city: string;
  additional_notes: string | null;
  valuation_min_usd: number | null;
  valuation_max_usd: number | null;
  valuation_notes: string | null;
  status: SubmissionStatus;
  rejection_reason: string | null;
  created_at: string;
  submission_images: SubmissionImage[];
  leads: Lead[];
}

export function formatUsd(value: number | null) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString()}`;
}

// ─── Valuation modal ────────────────────────────────────────────────────────
//
// Sets the valuation AND advances status pending → valued in one PATCH to
// the single submissions/[id] route (there is no separate /valuation
// sub-route — the backend handles status + valuation fields together).

export function ValuationModal({
  submission,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  submission: Submission;
  onClose: () => void;
  onSuccess: (updated: Submission) => void;
  onUnauthorized: () => void;
}) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    const minNum = Number(min);
    const maxNum = Number(max);
    if (!min || !Number.isFinite(minNum) || minNum < 0) {
      setError('Enter a valid minimum valuation');
      return;
    }
    if (!max || !Number.isFinite(maxNum) || maxNum < 0) {
      setError('Enter a valid maximum valuation');
      return;
    }
    if (maxNum < minNum) {
      setError('Maximum cannot be less than minimum');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'valued',
          valuation_min_usd: minNum,
          valuation_max_usd: maxNum,
          valuation_notes: notes.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save valuation');
        return;
      }
      onSuccess(json.submission);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Set Valuation</div>
        <div className={styles.modalSub}>
          {submission.year} {submission.make} {submission.model} — {submission.seller_name}
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.modalRow}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Min (USD)</label>
            <input
              className={styles.modalInput}
              type="number"
              min={0}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="e.g. 8000"
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Max (USD)</label>
            <input
              className={styles.modalInput}
              type="number"
              min={0}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="e.g. 9500"
            />
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Valuation Notes (optional)</label>
          <textarea
            className={styles.modalTextarea}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes on how this valuation was reached"
          />
        </div>

        <div className={styles.modalActions}>
          <button className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.modalPrimaryBtn} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Valuation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject modal ───────────────────────────────────────────────────────────
//
// PATCHes the same submissions/[id] route with status: 'rejected' plus
// rejection_reason — the backend requires rejection_reason whenever status
// is set to 'rejected', and rejects the field name "reason" (not accepted).

export function RejectModal({
  submission,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  submission: Submission;
  onClose: () => void;
  onSuccess: (updated: Submission) => void;
  onUnauthorized: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setError('A reason is required');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason.trim() }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to reject submission');
        return;
      }
      onSuccess(json.submission);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Reject Submission</div>
        <div className={styles.modalSub}>
          {submission.year} {submission.make} {submission.model} — {submission.seller_name}
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Reason</label>
          <textarea
            className={styles.modalTextarea}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this submission being declined?"
          />
        </div>

        <div className={styles.modalActions}>
          <button className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.modalDangerBtn} onClick={submit} disabled={saving}>
            {saving ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send-to-dealers modal ──────────────────────────────────────────────────

export function SendLeadsModal({
  submission,
  dealers,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  submission: Submission;
  dealers: Dealer[];
  onClose: () => void;
  onSuccess: (leads: Lead[]) => void;
  onUnauthorized: () => void;
}) {
  const alreadySentIds = new Set((submission.leads ?? []).map((l) => l.dealer_id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) {
      setError('Select at least one dealer');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${submission.id}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealer_ids: Array.from(selected) }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to send leads');
        return;
      }
      onSuccess(json.leads ?? []);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Send to Dealers</div>
        <div className={styles.modalSub}>
          {submission.year} {submission.make} {submission.model} — select dealers to offer this
          lead to.
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.dealerList}>
          {dealers.length === 0 && (
            <span className={styles.muted}>No active dealers found.</span>
          )}
          {dealers.map((dealer) => {
            const alreadySent = alreadySentIds.has(dealer.id);
            return (
              <label
                key={dealer.id}
                className={styles.dealerCheckRow}
                style={alreadySent ? { opacity: 0.45 } : undefined}
              >
                <input
                  type="checkbox"
                  disabled={alreadySent}
                  checked={selected.has(dealer.id)}
                  onChange={() => toggle(dealer.id)}
                />
                {dealer.name}
                {alreadySent ? ' (already sent)' : ''}
              </label>
            );
          })}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.modalPrimaryBtn} onClick={submit} disabled={saving}>
            {saving ? 'Sending…' : 'Send Leads'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction modal ──────────────────────────────────────────────────────

export function TransactionModal({
  submission,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  submission: Submission;
  onClose: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
}) {
  const acceptedLead = (submission.leads ?? []).find((l) => l.action === 'accepted');

  const [dealValue, setDealValue] = useState('');
  const [commission, setCommission] = useState('');
  const [leadFee, setLeadFee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null);

  const createTransaction = async () => {
    if (!acceptedLead) {
      setError('No dealer has accepted this submission yet');
      return;
    }
    const dealNum = Number(dealValue);
    if (!dealValue || !Number.isFinite(dealNum) || dealNum < 0) {
      setError('Enter a valid deal value');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${submission.id}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealer_id: acceptedLead.dealer_id,
          deal_value_usd: dealNum,
          commission_usd: commission ? Number(commission) : undefined,
          lead_fee_usd: leadFee ? Number(leadFee) : undefined,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to create transaction');
        return;
      }
      setCreatedTransactionId(json.transaction.id);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  const closeTransaction = async (status: 'completed' | 'disputed') => {
    if (!createdTransactionId) return;
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${submission.id}/transaction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: createdTransactionId, status }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to close transaction');
        return;
      }
      onSuccess();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Record Deal</div>
        <div className={styles.modalSub}>
          {submission.year} {submission.make} {submission.model}
          {acceptedLead?.dealers?.name ? ` — accepted by ${acceptedLead.dealers.name}` : ''}
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        {!createdTransactionId ? (
          <>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Deal Value (USD)</label>
              <input
                className={styles.modalInput}
                type="number"
                min={0}
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. 9000"
              />
            </div>
            <div className={styles.modalRow}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Commission (USD, optional)</label>
                <input
                  className={styles.modalInput}
                  type="number"
                  min={0}
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Lead Fee (USD, optional)</label>
                <input
                  className={styles.modalInput}
                  type="number"
                  min={0}
                  value={leadFee}
                  onChange={(e) => setLeadFee(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button className={styles.modalPrimaryBtn} onClick={createTransaction} disabled={saving}>
                {saving ? 'Saving…' : 'Create Transaction'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalSub}>
              Transaction recorded as pending. Close it once the deal has fully settled.
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
                Close Later
              </button>
              <button
                className={styles.modalCancelBtn}
                onClick={() => closeTransaction('disputed')}
                disabled={saving}
              >
                Dispute
              </button>
              <button
                className={styles.modalPrimaryBtn}
                onClick={() => closeTransaction('completed')}
                disabled={saving}
              >
                {saving ? 'Closing…' : 'Mark Closed'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
