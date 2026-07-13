'use client';

import { useState, KeyboardEvent } from 'react';
import styles from './listing.module.css';

interface Props {
  images: string[];
  listingLabel: string;
  bodyType?: string | null;
}

const MAX_VISIBLE_THUMBS = 4;

export default function ListingGallery({ images, listingLabel, bodyType }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

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

  function handleThumbKeyDown(e: KeyboardEvent<HTMLDivElement>, i: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectThumb(i);
    }
  }

  return (
    <>
      <div className={styles.mainImgWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[activeIndex]} alt={listingLabel} className={styles.mainImg} id="main-img" />
        {bodyType && <span className={styles.galleryBadge}>{bodyType}</span>}
      </div>
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
