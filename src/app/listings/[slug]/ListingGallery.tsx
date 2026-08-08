'use client';

import { useState, KeyboardEvent, TouchEvent } from 'react';
import styles from './listing.module.css';

interface Props {
  images: string[];
  listingLabel: string;
  bodyType?: string | null;
  priceUsd?: number | null;
  year?: number | null;
  mileageKm?: number | null;
  fuelType?: string | null;
}

const MAX_VISIBLE_THUMBS = 4;
const SWIPE_THRESHOLD = 40; // px

function formatPrice(n: number) {
  return `$${n.toLocaleString()}`;
}

export default function ListingGallery({
  images,
  listingLabel,
  bodyType,
  priceUsd,
  year,
  mileageKm,
  fuelType,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const quickSpecs = [
    {
      key: 'year',
      value: year ?? null,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      key: 'mileage',
      value: mileageKm != null ? `${mileageKm.toLocaleString()} km` : null,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
          <path d="M12 12 9.5 9.5" />
          <path d="M12 6v1" />
        </svg>
      ),
    },
    {
      key: 'fuel',
      value: fuelType ? fuelType.charAt(0).toUpperCase() + fuelType.slice(1) : null,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
          <path d="M3 10h10" />
          <path d="M15 8h1.5a2 2 0 0 1 2 2v1.5l1.5 1.5V18a1.5 1.5 0 0 1-3 0v-2" />
        </svg>
      ),
    },
  ].filter((s) => s.value !== null);

  if (images.length === 0) {
    return (
      <div className={styles.noImage}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
        <p>No photos available</p>
      </div>
    );
  }

  // Thumbnail strip shows every image other than whichever one is currently
  // the main photo, capped at 4 visible with a "+N more" overlay on the
  // last one — clicking any thumb swaps it into the main slot, and the
  // image it replaces becomes selectable again from the strip.
  const thumbIndexes = images.map((_, i) => i).filter((i) => i !== activeIndex).slice(0, MAX_VISIBLE_THUMBS);
  const remaining = images.length - 1 - thumbIndexes.length;

  function selectThumb(i: number) {
    setActiveIndex(i);
  }

  function goPrev() {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }

  function goNext() {
    setActiveIndex((i) => (i + 1) % images.length);
  }

  function handleThumbKeyDown(e: KeyboardEvent<HTMLDivElement>, i: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectThumb(i);
    }
  }

  function handleMainKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (touchStartX == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > SWIPE_THRESHOLD) goPrev();
    else if (deltaX < -SWIPE_THRESHOLD) goNext();
    setTouchStartX(null);
  }

  return (
    <>
      <div
        className={styles.mainImgWrap}
        tabIndex={0}
        onKeyDown={handleMainKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[activeIndex]} alt={listingLabel} className={styles.mainImg} id="main-img" />
        {bodyType && <span className={styles.galleryBadge}>{bodyType}</span>}

        <span className={styles.galleryLogo}>TauraNesu</span>

        {images.length > 1 && (
          <>
            <span className={styles.galleryCounter}>
              {activeIndex + 1}/{images.length}
            </span>

            <button
              type="button"
              className={`${styles.galleryArrow} ${styles.galleryArrowLeft}`}
              onClick={goPrev}
              aria-label="Previous photo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className={`${styles.galleryArrow} ${styles.galleryArrowRight}`}
              onClick={goNext}
              aria-label="Next photo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div className={styles.galleryDots}>
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.galleryDot} ${i === activeIndex ? styles.galleryDotActive : ''}`}
                />
              ))}
            </div>
          </>
        )}

        {priceUsd != null && (
          <div className={styles.galleryPriceBadge}>
            <span className={styles.galleryPriceLabel}>Price</span>
            <span className={styles.galleryPriceValue}>{formatPrice(priceUsd)}</span>
          </div>
        )}
      </div>

      {quickSpecs.length > 0 && (
        <div className={styles.quickSpecRow}>
          {quickSpecs.map((s) => (
            <span key={s.key} className={styles.quickSpecItem}>
              {s.icon}
              {s.value}
            </span>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <div className={styles.thumbRow}>
          {thumbIndexes.map((i, pos) => (
            <div
              key={i}
              className={styles.thumbWrap}
              role="button"
              tabIndex={0}
              onClick={() => selectThumb(i)}
              onKeyDown={(e) => handleThumbKeyDown(e, i)}
              style={{ cursor: 'pointer' }}
              aria-label={`View photo ${i + 1} of ${images.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[i]} alt={`${listingLabel} - view ${i + 1}`} className={styles.thumb} />
              {pos === thumbIndexes.length - 1 && remaining > 0 && (
                <div className={styles.thumbMore}>+{remaining}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
