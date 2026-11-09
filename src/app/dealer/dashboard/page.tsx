'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import DealerNav from '@/components/DealerNav';
import styles from './dashboard.module.css';
import { authFetch, clearAccessToken } from '@/lib/client-auth';

interface Listing {
  id: string;
  slug: string | null;
  make: string;
  model: string;
  year: number;
  price_usd: number;
  mileage_km: number | null;
  body_type: string | null;
  transmission: string | null;
  fuel_type: string | null;
  colour: string | null;
  condition: string | null;
  status: string;
  created_at: string;
  primary_image_url: string | null;
}

interface Analytics {
  period_days: number;
  active_listings: number;
  listings: Listing[];
  leads_received: number;
  pipeline: {
    accepted: number;
    passed: number;
  };
}

interface GalleryImage {
  id: string;
  image_url: string;
  display_order: number;
}

type FilterKey = 'all' | 'active' | 'pending_review' | 'sold' | 'rejected';

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US');
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

function titleCase(value: string | null) {
  if (!value) return '—';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Live',
  pending: 'Pending',
  pending_review: 'In review',
  sold: 'Sold',
  rejected: 'Rejected',
  draft: 'Draft',
  archived: 'Archived',
};

function badgeClass(status: string) {
  switch (status) {
    case 'active':
      return styles.badgeLive;
    case 'pending':
    case 'pending_review':
      return styles.badgeReview;
    case 'sold':
      return styles.badgeSold;
    case 'rejected':
      return styles.badgeRejected;
    default:
      return styles.badgeOther;
  }
}

export default function DealerDashboard() {
  const router = useRouter();
  const detailRef = useRef<HTMLElement | null>(null);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // listing id -> ordered list of photo urls (loaded on demand)
  const [galleries, setGalleries] = useState<Record<string, string[]>>({});
  const [galleryLoadingId, setGalleryLoadingId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    authFetch(`/api/dealer/analytics?days=${period}`)
      .then(async (res) => {
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setAnalytics(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period, router]);

  const listings = useMemo(() => analytics?.listings ?? [], [analytics]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: listings.length, active: 0, pending_review: 0, sold: 0, rejected: 0 };
    for (const l of listings) {
      if (l.status === 'active') c.active++;
      else if (l.status === 'pending_review' || l.status === 'pending') c.pending_review++;
      else if (l.status === 'sold') c.sold++;
      else if (l.status === 'rejected') c.rejected++;
    }
    return c;
  }, [listings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (filter === 'active' && l.status !== 'active') return false;
      if (filter === 'pending_review' && l.status !== 'pending_review' && l.status !== 'pending') return false;
      if (filter === 'sold' && l.status !== 'sold') return false;
      if (filter === 'rejected' && l.status !== 'rejected') return false;
      if (!q) return true;
      return `${l.year} ${l.make} ${l.model} ${l.colour ?? ''}`.toLowerCase().includes(q);
    });
  }, [listings, filter, query]);

  // The selected car; falls back to the first visible car so the panel is never empty
  const selected = filtered.find((l) => l.id === selectedId) ?? filtered[0] ?? null;
  const selectedKey = selected?.id ?? null;

  // Load all photos for the selected car (the list only carries the primary photo)
  useEffect(() => {
    if (!selectedKey) return;
    setPhotoIndex(0);
    if (galleries[selectedKey]) return;
    let active = true;
    const primary = listings.find((l) => l.id === selectedKey)?.primary_image_url ?? null;
    setGalleryLoadingId(selectedKey);
    authFetch(`/api/dealer/listings/${selectedKey}`)
      .then(async (res) => {
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load photos');
        const imgs: GalleryImage[] = (data.listing?.listing_images ?? [])
          .slice()
          .sort((a: GalleryImage, b: GalleryImage) => a.display_order - b.display_order);
        const urls = imgs.map((i) => i.image_url);
        const ordered = primary ? [primary, ...urls.filter((u) => u !== primary)] : urls;
        if (active) setGalleries((prev) => ({ ...prev, [selectedKey]: ordered }));
      })
      .catch(() => {
        // Fall back to the primary photo only
        if (active) setGalleries((prev) => ({ ...prev, [selectedKey]: primary ? [primary] : [] }));
      })
      .finally(() => {
        if (active) setGalleryLoadingId((cur) => (cur === selectedKey ? null : cur));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  function handleSelect(id: string) {
    setSelectedId(id);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Archive this listing? It will no longer be visible to buyers.')) return;
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/dealer/listings/${id}`, { method: 'DELETE' });
      if (res.status === 401) { clearAccessToken(); router.push('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      // Re-fetch analytics
      const analyticsRes = await authFetch(`/api/dealer/analytics?days=${period}`);
      if (analyticsRes.status === 401) { clearAccessToken(); router.push('/login'); return; }
      const updated = await analyticsRes.json();
      setAnalytics(updated);
      setSelectedId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setDeletingId(null);
    }
  }

  const chips: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'active', label: 'Live', count: counts.active },
    { key: 'pending_review', label: 'In review', count: counts.pending_review },
    { key: 'sold', label: 'Sold', count: counts.sold },
  ];
  if (counts.rejected > 0) chips.push({ key: 'rejected', label: 'Rejected', count: counts.rejected });

  const photos = selected ? galleries[selected.id] ?? (selected.primary_image_url ? [selected.primary_image_url] : []) : [];
  const currentPhoto = photos[Math.min(photoIndex, Math.max(photos.length - 1, 0))] ?? null;
  const photosLoading = selected ? galleryLoadingId === selected.id : false;

  return (
    <>
      <Navbar />
      <DealerNav />
      <main className={styles.root}>
        <div className={styles.body}>

          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.heading}>Inventory</h1>
              <p className={styles.sub}>
                {loading ? 'Loading your stock…' : `${counts.all} ${counts.all === 1 ? 'vehicle' : 'vehicles'} listed`}
              </p>
            </div>
            <Link href="/dealer/listings/new" className={styles.newBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New listing
            </Link>
          </div>

          {/* Summary strip */}
          {analytics && !loading && (
            <div className={styles.strip}>
              <div className={styles.stripItem}>
                <span className={styles.stripValue}>{analytics.active_listings}</span>
                <span className={styles.stripLabel}>Live</span>
              </div>
              <div className={styles.stripItem}>
                <span className={styles.stripValue}>{counts.pending_review}</span>
                <span className={styles.stripLabel}>In review</span>
              </div>
              <Link href="/dealer/leads" className={`${styles.stripItem} ${styles.stripLink}`}>
                <span className={styles.stripValue}>{analytics.leads_received}</span>
                <span className={styles.stripLabel}>Leads ({period}d) →</span>
              </Link>
              <div className={styles.periodRow} role="group" aria-label="Leads period">
                {([30, 60, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.periodBtn} ${period === d ? styles.periodActive : ''}`}
                    onClick={() => setPeriod(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className={styles.split}>
              <div className={styles.listCol}>
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.skeletonRow} />)}
              </div>
              <div className={styles.skeletonDetail} />
            </div>
          ) : error ? (
            <div className={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          ) : listings.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              <p>No listings yet — add your first car to get started.</p>
              <Link href="/dealer/listings/new" className={styles.newBtn}>Create listing</Link>
            </div>
          ) : (
            <div className={styles.split}>

              {/* ── Left: searchable list ── */}
              <section className={styles.listCol} aria-label="Your vehicles">
                <label className={styles.search}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span className={styles.srOnly}>Search your vehicles</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search make, model or colour"
                    className={styles.searchInput}
                  />
                </label>

                <div className={styles.chips}>
                  {chips.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`${styles.chip} ${filter === c.key ? styles.chipActive : ''}`}
                      onClick={() => setFilter(c.key)}
                    >
                      {c.label} {c.count}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <p className={styles.noMatch}>No vehicles match this filter.</p>
                ) : (
                  <ul className={styles.rows}>
                    {filtered.map((l) => {
                      const isSel = selected?.id === l.id;
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            className={`${styles.row} ${isSel ? styles.rowActive : ''}`}
                            onClick={() => handleSelect(l.id)}
                            aria-pressed={isSel}
                          >
                            {l.primary_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.primary_image_url} alt="" className={styles.thumb} />
                            ) : (
                              <span className={`${styles.thumb} ${styles.thumbEmpty}`} aria-hidden="true">No photo</span>
                            )}
                            <span className={styles.rowText}>
                              <span className={styles.rowTitle}>{l.year} {l.make} {l.model}</span>
                              <span className={styles.rowMeta}>
                                {l.mileage_km !== null ? `${l.mileage_km.toLocaleString('en-US')} km` : '—'}
                                {' · '}{titleCase(l.transmission)} · {timeAgo(l.created_at)}
                              </span>
                            </span>
                            <span className={styles.rowRight}>
                              <span className={styles.rowPrice}>{formatPrice(l.price_usd)}</span>
                              <span className={`${styles.badge} ${badgeClass(l.status)}`}>
                                {STATUS_LABEL[l.status] ?? titleCase(l.status)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* ── Right: the selected car ── */}
              <section className={styles.detail} ref={detailRef} aria-label="Selected vehicle">
                {selected ? (
                  <>
                    <div className={styles.hero}>
                      {currentPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentPhoto} alt={`${selected.year} ${selected.make} ${selected.model}`} className={styles.heroImg} />
                      ) : (
                        <div className={styles.heroEmpty}>
                          <span>{photosLoading ? 'Loading photos…' : 'No photos yet'}</span>
                          {!photosLoading && (
                            <Link href={`/dealer/listings/${selected.id}/edit`} className={styles.heroEmptyLink}>
                              Add photos
                            </Link>
                          )}
                        </div>
                      )}
                      <span className={`${styles.heroBadge} ${styles.badge} ${badgeClass(selected.status)}`}>
                        {STATUS_LABEL[selected.status] ?? titleCase(selected.status)}
                      </span>
                      {photos.length > 1 && (
                        <span className={styles.heroCount}>
                          {Math.min(photoIndex, photos.length - 1) + 1} of {photos.length}
                        </span>
                      )}
                    </div>

                    {photos.length > 1 && (
                      <div className={styles.thumbStrip}>
                        {photos.map((url, i) => (
                          <button
                            key={url}
                            type="button"
                            className={`${styles.stripThumb} ${i === photoIndex ? styles.stripThumbActive : ''}`}
                            onClick={() => setPhotoIndex(i)}
                            aria-label={`Show photo ${i + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className={styles.detailHead}>
                      <div>
                        <h2 className={styles.detailTitle}>{selected.year} {selected.make} {selected.model}</h2>
                        <p className={styles.detailSub}>Listed {timeAgo(selected.created_at).toLowerCase()}</p>
                      </div>
                      <div className={styles.detailPrice}>{formatPrice(selected.price_usd)}</div>
                    </div>

                    <dl className={styles.specs}>
                      <div className={styles.spec}><dt>Year</dt><dd>{selected.year}</dd></div>
                      <div className={styles.spec}>
                        <dt>Mileage</dt>
                        <dd>{selected.mileage_km !== null ? `${selected.mileage_km.toLocaleString('en-US')} km` : '—'}</dd>
                      </div>
                      <div className={styles.spec}><dt>Transmission</dt><dd>{titleCase(selected.transmission)}</dd></div>
                      <div className={styles.spec}><dt>Fuel</dt><dd>{titleCase(selected.fuel_type)}</dd></div>
                      <div className={styles.spec}><dt>Body</dt><dd>{titleCase(selected.body_type)}</dd></div>
                      <div className={styles.spec}><dt>Colour</dt><dd>{titleCase(selected.colour)}</dd></div>
                    </dl>

                    <div className={styles.actions}>
                      {selected.status === 'active' && selected.slug && (
                        <Link href={`/listings/${selected.slug}`} target="_blank" className={styles.primaryBtn}>
                          View as buyer
                        </Link>
                      )}
                      <Link href={`/dealer/listings/${selected.id}`} className={styles.ghostBtn}>
                        Full details
                      </Link>
                      <Link href={`/dealer/listings/${selected.id}/edit`} className={styles.ghostBtn}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => handleDelete(selected.id)}
                        disabled={deletingId === selected.id}
                      >
                        {deletingId === selected.id ? 'Archiving…' : 'Archive'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className={styles.noMatch}>Select a vehicle to see its photos and details.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
