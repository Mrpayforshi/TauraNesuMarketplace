'use client';

import { useMemo, useState } from 'react';
import styles from './ListingDetailView.module.css';

export interface ListingImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface ListingDetailData {
  id: string;
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
  drive: string | null;
  vin: string | null;
  description: string | null;
  status: string;
  is_special?: boolean | null;
  created_at: string;
  published_at?: string | null;
  dealers?: { id: string; name: string } | null;
  listing_images: ListingImage[];
  primary_image_url?: string | null;
  rejection_reason?: string | null;
}

interface Props {
  listing: ListingDetailData;
  backHref: string;
  backLabel: string;
  /** Context-specific action buttons (Approve/Reject, Edit/Delete, etc.) */
  actions?: React.ReactNode;
  /** Optional banner above the content, e.g. a rejection reason */
  note?: React.ReactNode;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatStatusLabel(status: string) {
  return status
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function specLabel(value: string | null) {
  if (!value) return '—';
  return value
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ListingDetailView({ listing, backHref, backLabel, actions, note }: Props) {
  // Build one ordered, de-duplicated image list from primary_image_url +
  // listing_images, so it doesn't matter whether the primary image was
  // also inserted into listing_images or not.
  const images = useMemo(() => {
    const fromGallery = [...(listing.listing_images || [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => img.image_url);

    const urls = listing.primary_image_url
      ? [listing.primary_image_url, ...fromGallery.filter((u) => u !== listing.primary_image_url)]
      : fromGallery;

    return urls.filter(Boolean);
  }, [listing.listing_images, listing.primary_image_url]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  const specs: { label: string; value: string }[] = [
    { label: 'Mileage', value: listing.mileage_km != null ? `${listing.mileage_km.toLocaleString()} km` : '—' },
    { label: 'Body type', value: specLabel(listing.body_type) },
    { label: 'Transmission', value: specLabel(listing.transmission) },
    { label: 'Fuel', value: specLabel(listing.fuel_type) },
    { label: 'Colour', value: listing.colour || '—' },
    { label: 'Condition', value: specLabel(listing.condition) },
    { label: 'Drive', value: listing.drive ? listing.drive.toUpperCase() : '—' },
    { label: 'VIN', value: listing.vin || '—' },
  ];

  return (
    <div className={styles.root}>
      <a href={backHref} className={styles.backLink}>
        ← {backLabel}
      </a>

      {note && <div className={styles.note}>{note}</div>}

      <div className={styles.layout}>
        <div className={styles.gallery}>
          {activeImage ? (
            <div className={styles.mainImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeImage} alt={`${listing.year} ${listing.make} ${listing.model}`} className={styles.mainImage} />
            </div>
          ) : (
            <div className={styles.noImage}>No images uploaded</div>
          )}

          {images.length > 1 && (
            <div className={styles.thumbRow}>
              {images.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  className={`${styles.thumbBtn} ${i === activeIndex ? styles.thumbBtnActive : ''}`}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={styles.thumbImage} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <span className={styles.statusBadge} data-status={listing.status}>
              {formatStatusLabel(listing.status)}
            </span>

            <h1 className={styles.title}>
              {listing.year} {listing.make} {listing.model}
            </h1>

            <div className={styles.price}>{formatPrice(listing.price_usd)}</div>

            {listing.dealers && (
              <div className={styles.dealerRow}>
                Dealer: <span>{listing.dealers.name}</span>
              </div>
            )}

            <div className={styles.metaRow}>
              Listed {formatDate(listing.created_at)}
              {listing.published_at ? ` · Published ${formatDate(listing.published_at)}` : ''}
            </div>

            {actions && <div className={styles.actions}>{actions}</div>}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Specifications</h2>
            <div className={styles.specGrid}>
              {specs.map((s) => (
                <div key={s.label} className={styles.specItem}>
                  <span className={styles.specLabel}>{s.label}</span>
                  <span className={styles.specValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {listing.description && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <p className={styles.description}>{listing.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
