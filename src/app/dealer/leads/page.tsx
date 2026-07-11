'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import styles from './leads.module.css';
import { authFetch, clearAccessToken } from '@/lib/client-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

type ViewType = 'new' | 'accepted' | 'passed';

interface SubmissionImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface LeadSubmission {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  transmission: string;
  fuel_type: string;
  colour: string;
  condition: string;
  intent: string;
  known_issues: string | null;
  additional_notes: string | null;
  seller_city: string;
  valuation_min_usd: number;
  valuation_max_usd: number;
  status: string;
  created_at: string;
  submission_images: SubmissionImage[];
  // Only present when tab === 'accepted' — the API withholds these
  // for 'new' and 'passed' to protect seller PII until a dealer commits.
  seller_name?: string;
  seller_phone?: string;
  seller_whatsapp?: string;
  transaction?: { id: string; status: string; deal_value_usd: number } | null;
}

const TABS: { key: ViewType; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'passed', label: 'Passed' },
];

const EMPTY_MESSAGE: Record<ViewType, string> = {
  new: 'No new leads right now — check back soon.',
  accepted: "You haven't accepted any leads yet.",
  passed: "You haven't passed on any leads yet.",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUsd(n: number) {
  return `$${Number(n).toLocaleString()}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function intentLabel(intent: string) {
  if (intent === 'trade_in') return 'Trade-in';
  if (intent === 'either') return 'Either';
  return 'Sell';
}

// Mirrors the message the backend builds in
// /api/dealer/submissions/[id]/action when a lead is first accepted, so
// re-opening an already-accepted lead later offers the same WhatsApp text.
function buildWhatsappLink(s: LeadSubmission): string | null {
  if (!s.seller_whatsapp || !s.seller_name) return null;
  const message = `Hi ${s.seller_name}, I saw your ${s.year} ${s.make} ${s.model} submission on TauraNesu and I am interested. Can we arrange an inspection?`;
  return `https://wa.me/${s.seller_whatsapp}?text=${encodeURIComponent(message)}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DealerLeadsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<ViewType>('new');
  const [leads, setLeads] = useState<LeadSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [soldTarget, setSoldTarget] = useState<LeadSubmission | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken();
    router.push('/login');
  }, [router]);

  const load = useCallback(
    (view: ViewType) => {
      setLoading(true);
      setLoadError('');
      authFetch(`/api/dealer/submissions?view=${view}`)
        .then(async (res) => {
          if (res.status === 401) {
            handleUnauthorized();
            return;
          }
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to load leads');
          setLeads(data.submissions || []);
        })
        .catch((e: Error) => setLoadError(e.message))
        .finally(() => setLoading(false));
    },
    [handleUnauthorized]
  );

  useEffect(() => {
    setExpandedId(null);
    setActionError('');
    load(tab);
  }, [tab, load]);

  async function act(submissionId: string, action: 'accepted' | 'passed') {
    if (action === 'passed' && !confirm("Pass on this lead? You won't be able to undo this.")) {
      return;
    }

    setActingId(submissionId);
    setActionError('');
    try {
      const res = await authFetch(`/api/dealer/submissions/${submissionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Action failed — please try again.');
        return;
      }
      if (action === 'accepted' && data.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank', 'noopener,noreferrer');
      }
      // Leaving 'new' is correct for both actions; an accepted/passed lead
      // belongs in its own tab now, not here.
      setLeads((prev) => prev.filter((l) => l.id !== submissionId));
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setActingId(null);
    }
  }

  function handleSoldSuccess(submissionId: string, transaction: { id: string; status: string; deal_value_usd: number }) {
    setLeads((prev) =>
      prev.map((l) => (l.id === submissionId ? { ...l, transaction } : l))
    );
    setSoldTarget(null);
  }

  return (
    <>
      <Navbar />
      <main className={styles.root}>

        <div className={styles.header}>
          <div className={styles.headerInner}>
            <div>
              <h1 className={styles.heading}>Leads</h1>
              <p className={styles.sub}>Vehicles our team has valuated and matched to you</p>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {actionError && (
            <div className={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {actionError}
            </div>
          )}

          {loading ? (
            <div className={styles.skeletonList}>
              {[1, 2, 3].map((i) => <div key={i} className={styles.skeletonRow} />)}
            </div>
          ) : loadError ? (
            <div className={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {loadError}
            </div>
          ) : leads.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p>{EMPTY_MESSAGE[tab]}</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Valuation</th>
                    <th>Mileage</th>
                    <th>City</th>
                    <th>Submitted</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((s) => (
                    <LeadRow
                      key={s.id}
                      submission={s}
                      tab={tab}
                      expanded={expandedId === s.id}
                      onToggleExpand={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      onAccept={() => act(s.id, 'accepted')}
                      onPass={() => act(s.id, 'passed')}
                      onMarkSold={() => setSoldTarget(s)}
                      acting={actingId === s.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {soldTarget && (
        <MarkSoldModal
          submission={soldTarget}
          onClose={() => setSoldTarget(null)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(transaction) => handleSoldSuccess(soldTarget.id, transaction)}
        />
      )}
    </>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function LeadRow({
  submission: s,
  tab,
  expanded,
  onToggleExpand,
  onAccept,
  onPass,
  onMarkSold,
  acting,
}: {
  submission: LeadSubmission;
  tab: ViewType;
  expanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onPass: () => void;
  onMarkSold: () => void;
  acting: boolean;
}) {
  const whatsappLink = tab === 'accepted' ? buildWhatsappLink(s) : null;
  const sortedImages = [...(s.submission_images || [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <>
      <tr onClick={onToggleExpand} className={styles.clickableRow}>
        <td className={styles.vehicleCell}>
          {sortedImages[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sortedImages[0].image_url} alt="" className={styles.rowThumb} />
          )}
          <div className={styles.vehicleInfo}>
            <span className={styles.vehicleName}>{s.year} {s.make} {s.model}</span>
            <span className={styles.intentBadge} data-intent={s.intent}>{intentLabel(s.intent)}</span>
          </div>
        </td>
        <td className={styles.valuationCell}>
          {formatUsd(s.valuation_min_usd)}–{formatUsd(s.valuation_max_usd)}
        </td>
        <td className={styles.muted}>{s.mileage_km.toLocaleString()} km</td>
        <td className={styles.muted}>{s.seller_city}</td>
        <td className={styles.muted}>{timeAgo(s.created_at)}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <div className={styles.actionsCell}>
            {tab === 'new' && (
              <>
                <button className={styles.approveBtn} onClick={onAccept} disabled={acting}>
                  {acting ? (
                    <span className={styles.miniSpinner} />
                  ) : (
                    'Accept'
                  )}
                </button>
                <button className={styles.rejectBtn} onClick={onPass} disabled={acting}>
                  Pass
                </button>
              </>
            )}
            {tab === 'accepted' && whatsappLink && (
              <a
                className={styles.whatsappBtn}
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                WhatsApp
              </a>
            )}
            {tab === 'accepted' && !s.transaction && (
              <button
                className={styles.approveBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkSold();
                }}
              >
                Mark as Sold
              </button>
            )}
            {tab === 'accepted' && s.transaction?.status === 'pending' && (
              <span className={styles.passedBadge}>Reported — awaiting confirmation</span>
            )}
            {tab === 'accepted' && s.transaction?.status === 'completed' && (
              <span className={styles.passedBadge}>Closed</span>
            )}
            {tab === 'accepted' && s.transaction?.status === 'disputed' && (
              <span className={styles.passedBadge}>Disputed — contact admin</span>
            )}
            {tab === 'passed' && <span className={styles.passedBadge}>Passed</span>}
            <button className={styles.linkBtn} onClick={onToggleExpand}>
              {expanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className={styles.detailRow}>
          <td colSpan={6}>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Transmission</span>
                <span className={styles.detailValue}>{s.transmission}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Fuel</span>
                <span className={styles.detailValue}>{s.fuel_type}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Colour</span>
                <span className={styles.detailValue}>{s.colour}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Condition</span>
                <span className={styles.detailValue}>{s.condition}</span>
              </div>
              {tab === 'accepted' && s.seller_name && (
                <>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Seller</span>
                    <span className={styles.detailValue}>{s.seller_name}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Phone</span>
                    <span className={styles.detailValue}>{s.seller_phone}</span>
                  </div>
                </>
              )}
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

            {sortedImages.length > 0 && (
              <div className={styles.thumbRow}>
                {sortedImages.map((img) => (
                  <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="" className={styles.thumb} />
                  </a>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Mark as Sold modal ─────────────────────────────────────────────────────

const COMMISSION_RATE = 0.03;

function MarkSoldModal({
  submission,
  onClose,
  onSuccess,
  onUnauthorized,
}: {
  submission: LeadSubmission;
  onClose: () => void;
  onSuccess: (transaction: { id: string; status: string; deal_value_usd: number }) => void;
  onUnauthorized: () => void;
}) {
  const [dealValue, setDealValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dealNum = Number(dealValue);
  const validDeal = dealValue !== '' && Number.isFinite(dealNum) && dealNum > 0;
  const commissionPreview = validDeal ? Math.round(dealNum * COMMISSION_RATE * 100) / 100 : 0;

  async function submit() {
    if (!validDeal) {
      setError('Enter a valid sale price');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(`/api/dealer/submissions/${submission.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_value_usd: dealNum }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to report sale — please try again.');
        return;
      }
      onSuccess({
        id: data.transaction.id,
        status: data.transaction.status,
        deal_value_usd: data.transaction.deal_value_usd,
      });
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Mark as Sold</div>
        <div className={styles.modalSub}>
          {submission.year} {submission.make} {submission.model}
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Sale Price (USD)</label>
          <input
            className={styles.modalInput}
            type="number"
            min={0}
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
            placeholder="e.g. 9000"
            autoFocus
          />
        </div>

        {validDeal && (
          <p className={styles.modalSub}>
            Commission at 3%: {formatUsd(commissionPreview)}
          </p>
        )}

        <p className={styles.modalSub}>
          This reports the sale for admin review — it isn&apos;t final until confirmed.
        </p>

        <div className={styles.modalActions}>
          <button className={styles.modalCancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.modalPrimaryBtn} onClick={submit} disabled={saving || !validDeal}>
            {saving ? 'Reporting…' : 'Report Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
