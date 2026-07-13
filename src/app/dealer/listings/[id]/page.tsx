'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { authFetch, clearAccessToken } from '@/lib/client-auth';
import ListingDetailView, { ListingDetailData } from '@/components/listing-detail/ListingDetailView';
import styles from './view.module.css';

export default function DealerListingViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [listing, setListing] = useState<ListingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authFetch(`/api/dealer/listings/${id}`);
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load listing');
        if (active) setListing(data.listing);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, router]);

  async function handleDelete() {
    if (!confirm('Archive this listing? It will no longer be visible to buyers.')) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/dealer/listings/${id}`, { method: 'DELETE' });
      if (res.status === 401) {
        clearAccessToken();
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      router.push('/dealer/dashboard');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Navbar />
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
            backHref="/dealer/dashboard"
            backLabel="Back to your listings"
            note={
              listing.status === 'rejected' ? (
                <>This listing was rejected. Edit it and resubmit, or contact support for details.</>
              ) : undefined
            }
            actions={
              <>
                <Link href={`/dealer/listings/${id}/edit`} className={styles.editBtn}>
                  Edit listing
                </Link>
                {listing.status !== 'deleted' && (
                  <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Archiving…' : 'Archive listing'}
                  </button>
                )}
              </>
            }
          />
        ) : null}
      </main>
    </>
  );
}
