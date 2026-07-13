'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import {
  Submission,
  Dealer,
  formatUsd,
  ValuationModal,
  RejectModal,
  SendLeadsModal,
  TransactionModal,
} from '../modals';
import styles from './view.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function intentLabel(intent: string | null) {
  if (intent === 'trade_in') return 'Trade-in';
  if (intent === 'either') return 'Either';
  return 'Sell';
}

export default function AdminSubmissionViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [activeImage, setActiveImage] = useState(0);

  const [showValuation, setShowValuation] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken();
    router.push('/login');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/admin/submissions/${id}`);
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load submission');
      setSubmission(data.submission);
      setActiveImage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id, handleUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    authFetch('/api/admin/dealers?status=active')
      .then((res) => res.json())
      .then((json) => setDealers(json.dealers ?? []))
      .catch(() => {
        // Non-fatal — dealer picker just shows empty if this fails.
      });
  }, []);

  const images = useMemo(
    () =>
      submission
        ? [...(submission.submission_images || [])].sort((a, b) => a.display_order - b.display_order)
        : [],
    [submission]
  );

  if (loading) {
    return (
      <main className={styles.root}>
        <div className={styles.skeleton} />
      </main>
    );
  }

  if (error || !submission) {
    return (
      <main className={styles.root}>
        <div className={styles.errorBox}>{error || 'Submission not found'}</div>
      </main>
    );
  }

  const valuationDisplay =
    submission.valuation_min_usd !== null && submission.valuation_max_usd !== null
      ? `${formatUsd(submission.valuation_min_usd)}–${formatUsd(submission.valuation_max_usd)}`
      : '—';

  return (
    <main className={styles.root}>
      <a href="/admin/submissions" className={styles.backLink}>← Back to submissions</a>

      {submission.status === 'rejected' && submission.rejection_reason && (
        <div className={styles.note}>Rejected: {submission.rejection_reason}</div>
      )}

      <div className={styles.layout}>
        <div className={styles.gallery}>
          {images.length > 0 ? (
            <>
              <div className={styles.mainImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[activeImage].image_url} alt="" className={styles.mainImage} />
              </div>
              {images.length > 1 && (
                <div className={styles.thumbRow}>
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`${styles.thumbBtn} ${i === activeImage ? styles.thumbBtnActive : ''}`}
                      onClick={() => setActiveImage(i)}
                      aria-label={`View photo ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image_url} alt="" className={styles.thumbImage} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.noImage}>No photos uploaded</div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <span className={styles.statusBadge} data-status={submission.status}>
              {submission.status.replace('_', ' ')}
            </span>
            <h1 className={styles.title}>
              {submission.year} {submission.make} {submission.model}
            </h1>
            <div className={styles.valuation}>{valuationDisplay}</div>
            <div className={styles.metaRow}>
              <span className={styles.intentBadge} data-intent={submission.intent ?? 'sell'}>
                {intentLabel(submission.intent)}
              </span>
              · Submitted {formatDate(submission.created_at)}
            </div>

            <div className={styles.actions}>
              {submission.status === 'pending' && (
                <>
                  <button className={styles.primaryBtn} onClick={() => setShowValuation(true)}>Set Valuation</button>
                  <button className={styles.dangerBtn} onClick={() => setShowReject(true)}>Reject</button>
                </>
              )}
              {(submission.status === 'valued' || submission.status === 'in_pipeline') && (
                <button className={styles.primaryBtn} onClick={() => setShowLeads(true)}>
                  {submission.status === 'valued' ? 'Send to Dealers' : 'Send to More Dealers'}
                </button>
              )}
              {submission.status === 'accepted' && (
                <button className={styles.primaryBtn} onClick={() => setShowTransaction(true)}>Record Deal</button>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Seller</h2>
            <div className={styles.specGrid}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Name</span>
                <span className={styles.specValue}>{submission.seller_name}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>City</span>
                <span className={styles.specValue}>{submission.seller_city}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Phone</span>
                <span className={styles.specValue}>{submission.seller_phone}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>WhatsApp</span>
                <span className={styles.specValue}>{submission.seller_whatsapp}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Vehicle specs</h2>
            <div className={styles.specGrid}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Mileage</span>
                <span className={styles.specValue}>{submission.mileage_km.toLocaleString()} km</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Transmission</span>
                <span className={styles.specValue}>{submission.transmission ?? '—'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Fuel</span>
                <span className={styles.specValue}>{submission.fuel_type ?? '—'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Colour</span>
                <span className={styles.specValue}>{submission.colour ?? '—'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Condition</span>
                <span className={styles.specValue}>{submission.condition ?? '—'}</span>
              </div>
            </div>
          </div>

          {submission.known_issues && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Known issues</h2>
              <p className={styles.description}>{submission.known_issues}</p>
            </div>
          )}

          {submission.additional_notes && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Additional notes</h2>
              <p className={styles.description}>{submission.additional_notes}</p>
            </div>
          )}

          {submission.valuation_notes && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Valuation notes</h2>
              <p className={styles.description}>{submission.valuation_notes}</p>
            </div>
          )}

          {submission.leads?.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Dealer leads</h2>
              {submission.leads.map((lead) => (
                <div key={lead.id} className={styles.leadRow}>
                  <span>{lead.dealers?.name ?? 'Unknown dealer'}</span>
                  {lead.action ? (
                    <span className={styles.leadActionBadge} data-action={lead.action}>{lead.action}</span>
                  ) : (
                    <span className={styles.muted}>Awaiting response</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showValuation && (
        <ValuationModal
          submission={submission}
          onClose={() => setShowValuation(false)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(updated) => {
            setSubmission((prev) => (prev ? { ...prev, ...updated } : prev));
            setShowValuation(false);
          }}
        />
      )}
      {showReject && (
        <RejectModal
          submission={submission}
          onClose={() => setShowReject(false)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(updated) => {
            setSubmission((prev) => (prev ? { ...prev, ...updated } : prev));
            setShowReject(false);
          }}
        />
      )}
      {showLeads && (
        <SendLeadsModal
          submission={submission}
          dealers={dealers}
          onClose={() => setShowLeads(false)}
          onUnauthorized={handleUnauthorized}
          onSuccess={(leads) => {
            setSubmission((prev) =>
              prev
                ? { ...prev, leads, status: prev.status === 'valued' ? 'in_pipeline' : prev.status }
                : prev
            );
            setShowLeads(false);
          }}
        />
      )}
      {showTransaction && (
        <TransactionModal
          submission={submission}
          onClose={() => setShowTransaction(false)}
          onUnauthorized={handleUnauthorized}
          onSuccess={() => {
            setSubmission((prev) => (prev ? { ...prev, status: 'closed' } : prev));
            setShowTransaction(false);
          }}
        />
      )}
    </main>
  );
}
