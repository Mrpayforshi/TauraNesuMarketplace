'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import ListingDetailView, { ListingDetailData } from '@/components/listing-detail/ListingDetailView';
import styles from './view.module.css';

export default function AdminListingViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [listing, setListing] = useState<ListingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/admin/listings/${id}`);
      if (res.status === 401) {
        clearAccessToken();
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load listing');
      setListing(data.listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove() {
    setActioning(true);
    try {
      const res = await authFetch(`/api/admin/listings/${id}/approve`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      setListing((prev) => (prev ? { ...prev, ...data.listing } : prev));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActioning(false);
    }
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      setRejectError('A rejection reason is required.');
      return;
    }
    setActioning(true);
    setRejectError('');
    try {
      const res = await authFetch(`/api/admin/listings/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      setListing((prev) => (prev ? { ...prev, ...data.listing } : prev));
      setShowRejectBox(false);
      setRejectReason('');
    } catch (e) {
      setRejectError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActioning(false);
    }
  }

  return (
    <main className={styles.root}>
      {loading ? (
        <div className={styles.stateWrap}>
          <div className={styles.skeleton} />
        </div>
      ) : error ? (
        <div className={styles.stateWrap}>
          <div className={styles.errorBox}>{error}</div>
        </div>
      ) : listing ? (
        <ListingDetailView
          listing={listing}
          backHref="/admin/listings"
          backLabel="Back to listings"
          note={
            listing.status === 'rejected' ? (
              <>
                This listing was rejected. Note: the rejection reason isn&apos;t currently saved anywhere in the
                database — see the note below about the reject endpoint.
              </>
            ) : undefined
          }
          actions={
            listing.status === 'pending_review' ? (
              <div className={styles.reviewActions}>
                {!showRejectBox ? (
                  <>
                    <button type="button" className={styles.approveBtn} onClick={handleApprove} disabled={actioning}>
                      {actioning ? 'Approving…' : 'Approve'}
                    </button>
                    <button type="button" className={styles.rejectBtn} onClick={() => setShowRejectBox(true)} disabled={actioning}>
                      Reject
                    </button>
                  </>
                ) : (
                  <div className={styles.rejectBox}>
                    <textarea
                      className={styles.rejectInput}
                      rows={3}
                      placeholder="Reason for rejection…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    {rejectError && <div className={styles.rejectError}>{rejectError}</div>}
                    <div className={styles.rejectBoxActions}>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => {
                          setShowRejectBox(false);
                          setRejectError('');
                        }}
                        disabled={actioning}
                      >
                        Cancel
                      </button>
                      <button type="button" className={styles.rejectBtn} onClick={confirmReject} disabled={actioning}>
                        {actioning ? 'Rejecting…' : 'Confirm reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : undefined
          }
        />
      ) : null}
    </main>
  );
}
