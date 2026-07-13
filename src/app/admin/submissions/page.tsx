'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './admin-submissions.module.css';
import {
  Submission,
  SubmissionStatus,
  Dealer,
  Lead,
  formatUsd,
  ValuationModal,
  RejectModal,
  SendLeadsModal,
  TransactionModal,
} from './modals';

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
            <Link
              href={`/admin/submissions/${s.id}`}
              style={{
                display: 'inline-block',
                padding: '0.4rem 0.75rem',
                borderRadius: 6,
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              View
            </Link>
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
