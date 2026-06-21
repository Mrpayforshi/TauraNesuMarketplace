'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import { useRouter } from 'next/navigation';
import styles from './admin-submissions.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type SubmissionStatus =
  | 'pending'
  | 'valued'
  | 'in_pipeline'
  | 'accepted'
  | 'closed'
  | 'rejected';

interface SubmissionImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface Dealer {
  id: string;
  name: string;
  status?: string;
}

interface Lead {
  id: string;
  dealer_id: string;
  action: 'accepted' | 'passed' | null;
  created_at: string;
  dealers: Dealer | null;
}

interface Submission {
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

const TABS: { key: SubmissionStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'valued', label: 'Valued' },
  { key: 'in_pipeline', label: 'In Pipeline' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'closed', label: 'Closed' },
  { key: 'rejected', label: 'Rejected' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatUsd(value: number | null) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString()}`;
}

function intentLabel(intent: string | null) {
  if (intent === 'trade_in') return 'Trade-in';
  if (intent === 'either') return 'Either';
  return 'Sell';
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminSubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allCounts, setAllCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<SubmissionStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);

  // Modal state
  const [valuationTarget, setValuationTarget] = useState<Submission | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null);
  const [leadsTarget, setLeadsTarget] = useState<Submission | null>(null);
  const [transactionTarget, setTransactionTarget] = useState<Submission | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken();
    router.push('/login');
  }, [router]);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all (no status filter) so tab counts stay accurate, then filter client-side.
      const res = await authFetch('/api/admin/submissions');
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load submissions');
        return;
      }
      const all: Submission[] = json.submissions ?? [];
      setSubmissions(all);

      const counts: Record<string, number> = {};
      for (const tab of TABS) counts[tab.key] = 0;
      for (const s of all) counts[s.status] = (counts[s.status] ?? 0) + 1;
      setAllCounts(counts);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  const loadDealers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/dealers?status=active');
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (res.ok) setDealers(json.dealers ?? []);
    } catch {
      // Non-fatal — dealer picker will just show empty if this fails.
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadSubmissions();
    loadDealers();
  }, [loadSubmissions, loadDealers]);

  // Merge a patch onto an existing row rather than replacing it outright —
  // action routes here do plain .select().single() with no joins, so a
  // full-replace would drop submission_images / leads from the row.
  const patchSubmission = (id: string, patch: Partial<Submission>) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const visibleSubmissions = submissions.filter((s) => s.status === activeTab);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Submissions</h1>
        <p className={styles.sub}>
          Review seller submissions, set valuations, and manage the dealer lead pipeline.
        </p>
      </div>

      <div className={styles.body}>
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(null);
              }}
            >
              {tab.label}
              <span className={styles.tabCount}>{allCounts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className={styles.errorBox}>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className={styles.skeletonList}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : visibleSubmissions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No submissions in this stage.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Vehicle</th>
                  <th>Intent</th>
                  <th>Valuation</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubmissions.map((s) => (
                  <SubmissionRow
                    key={s.id}
                    submission={s}
                    expanded={expandedId === s.id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === s.id ? null : s.id)
                    }
                    onValuate={() => setValuationTarget(s)}
                    onReject={() => setRejectTarget(s)}
                    onSendLeads={() => setLeadsTarget(s)}
                    onCreateTransaction={() => setTransactionTarget(s)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {valuationTarget && (
        <ValuationModal
          submission={valuationTarget}
          onClose={() => setValuationTarget(null)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(updated) => {
            patchSubmission(updated.id, updated);
            setAllCounts((prev) => ({
              ...prev,
              pending: Math.max(0, (prev.pending ?? 0) - 1),
              valued: (prev.valued ?? 0) + 1,
            }));
            setValuationTarget(null);
          }}
        />
      )}

      {rejectTarget && (
        <RejectModal
          submission={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(updated) => {
            patchSubmission(updated.id, updated);
            setAllCounts((prev) => ({
              ...prev,
              [rejectTarget.status]: Math.max(0, (prev[rejectTarget.status] ?? 0) - 1),
              rejected: (prev.rejected ?? 0) + 1,
            }));
            setRejectTarget(null);
          }}
        />
      )}

      {leadsTarget && (
        <SendLeadsModal
          submission={leadsTarget}
          dealers={dealers}
          onClose={() => setLeadsTarget(null)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(leads) => {
            const wasValued = leadsTarget.status === 'valued';
            patchSubmission(leadsTarget.id, {
              leads,
              status: wasValued ? 'in_pipeline' : leadsTarget.status,
            });
            if (wasValued) {
              setAllCounts((prev) => ({
                ...prev,
                valued: Math.max(0, (prev.valued ?? 0) - 1),
                in_pipeline: (prev.in_pipeline ?? 0) + 1,
              }));
            }
            setLeadsTarget(null);
          }}
        />
      )}

      {transactionTarget && (
        <TransactionModal
          submission={transactionTarget}
          onClose={() => setTransactionTarget(null)}
          onUnauthorized={handleUnauthorized}
          onSuccess={() => {
            patchSubmission(transactionTarget.id, { status: 'closed' });
            setAllCounts((prev) => ({
              ...prev,
              accepted: Math.max(0, (prev.accepted ?? 0) - 1),
              closed: (prev.closed ?? 0) + 1,
            }));
            setTransactionTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function SubmissionRow({
  submission: s,
  expanded,
  onToggleExpand,
  onValuate,
  onReject,
  onSendLeads,
  onCreateTransaction,
}: {
  submission: Submission;
  expanded: boolean;
  onToggleExpand: () => void;
  onValuate: () => void;
  onReject: () => void;
  onSendLeads: () => void;
  onCreateTransaction: () => void;
}) {
  const valuationDisplay =
    s.valuation_min_usd !== null && s.valuation_max_usd !== null
      ? `${formatUsd(s.valuation_min_usd)}–${formatUsd(s.valuation_max_usd)}`
      : '—';

  return (
    <>
      <tr onClick={onToggleExpand} style={{ cursor: 'pointer' }}>
        <td>
          <div className={styles.sellerName}>{s.seller_name}</div>
          <div className={styles.muted}>{s.seller_city}</div>
        </td>
        <td className={styles.vehicleName}>
          {s.year} {s.make} {s.model}
        </td>
        <td>
          <span className={styles.intentBadge} data-intent={s.intent ?? 'sell'}>
            {intentLabel(s.intent)}
          </span>
        </td>
        <td className={styles.price}>{valuationDisplay}</td>
        <td>
          <span className={styles.statusBadge} data-status={s.status}>
            {s.status.replace('_', ' ')}
          </span>
        </td>
        <td className={styles.muted}>{formatDate(s.created_at)}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <div className={styles.actionsCell}>
            {s.status === 'pending' && (
              <>
                <button className={styles.approveBtn} onClick={onValuate}>
                  Set Valuation
                </button>
                <button className={styles.rejectBtn} onClick={onReject}>
                  Reject
                </button>
              </>
            )}
            {(s.status === 'valued' || s.status === 'in_pipeline') && (
              <button className={styles.primaryBtn} onClick={onSendLeads}>
                {s.status === 'valued' ? 'Send to Dealers' : 'Send to More Dealers'}
              </button>
            )}
            {s.status === 'accepted' && (
              <button className={styles.approveBtn} onClick={onCreateTransaction}>
                Record Deal
              </button>
            )}
            <button className={styles.linkBtn} onClick={onToggleExpand}>
              {expanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className={styles.detailRow}>
          <td colSpan={7}>
            <SubmissionDetail submission={s} />
          </td>
        </tr>
      )}
    </>
  );
}

function SubmissionDetail({ submission: s }: { submission: Submission }) {
  return (
    <div>
      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Mileage</span>
          <span className={styles.detailValue}>{s.mileage_km.toLocaleString()} km</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Transmission</span>
          <span className={styles.detailValue}>{s.transmission ?? '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Fuel</span>
          <span className={styles.detailValue}>{s.fuel_type ?? '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Colour</span>
          <span className={styles.detailValue}>{s.colour ?? '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Condition</span>
          <span className={styles.detailValue}>{s.condition ?? '—'}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Phone</span>
          <span className={styles.detailValue}>{s.seller_phone}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>WhatsApp</span>
          <span className={styles.detailValue}>{s.seller_whatsapp}</span>
        </div>
      </div>

      {s.known_issues && (
        <div className={styles.detailItem} style={{ marginBottom: '1rem' }}>
          <span className={styles.detailLabel}>Known Issues</span>
          <span className={styles.detailValue}>{s.known_issues}</span>
        </div>
      )}

      {s.additional_notes && (
        <div className={styles.detailItem} style={{ marginBottom: '1rem' }}>
          <span className={styles.detailLabel}>Additional Notes</span>
          <span className={styles.detailValue}>{s.additional_notes}</span>
        </div>
      )}

      {s.valuation_notes && (
        <div className={styles.detailItem} style={{ marginBottom: '1rem' }}>
          <span className={styles.detailLabel}>Valuation Notes</span>
          <span className={styles.detailValue}>{s.valuation_notes}</span>
        </div>
      )}

      {s.rejection_reason && (
        <div className={styles.detailItem} style={{ marginBottom: '1rem' }}>
          <span className={styles.detailLabel}>Rejection Reason</span>
          <span className={styles.detailValue}>{s.rejection_reason}</span>
        </div>
      )}

      {s.submission_images?.length > 0 && (
        <div className={styles.thumbRow}>
          {[...s.submission_images]
            .sort((a, b) => a.display_order - b.display_order)
            .map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.image_url} alt="" className={styles.thumb} />
            ))}
        </div>
      )}

      {s.leads?.length > 0 && (
        <div className={styles.leadsPanel}>
          <div className={styles.leadsPanelTitle}>Dealer Leads</div>
          {s.leads.map((lead) => (
            <LeadRow key={lead.id} submissionId={s.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeadRow({
  submissionId,
  lead,
}: {
  submissionId: string;
  lead: Lead;
}) {
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(lead.action);

  const recordAction = async (newAction: 'accepted' | 'passed') => {
    setSaving(true);
    try {
      const res = await authFetch(
        `/api/admin/submissions/${submissionId}/leads/${lead.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: newAction }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setAction(json.lead?.action ?? newAction);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.leadRow}>
      <span className={styles.leadDealerName}>{lead.dealers?.name ?? 'Unknown dealer'}</span>
      {action ? (
        <span className={styles.leadActionBadge} data-action={action}>
          {action}
        </span>
      ) : (
        <div className={styles.actionsCell}>
          <button
            className={styles.approveBtn}
            disabled={saving}
            onClick={() => recordAction('accepted')}
          >
            Mark Accepted
          </button>
          <button
            className={styles.rejectBtn}
            disabled={saving}
            onClick={() => recordAction('passed')}
          >
            Mark Passed
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Valuation modal ────────────────────────────────────────────────────────
//
// Sets the valuation AND advances status pending → valued in one PATCH to
// the single submissions/[id] route (there is no separate /valuation
// sub-route — the backend handles status + valuation fields together).

function ValuationModal({
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

function RejectModal({
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

function SendLeadsModal({
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

function TransactionModal({
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

  const closeTransaction = async () => {
    if (!createdTransactionId) return;
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${submission.id}/transaction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: createdTransactionId }),
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
              <button className={styles.modalPrimaryBtn} onClick={closeTransaction} disabled={saving}>
                {saving ? 'Closing…' : 'Mark Closed'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
