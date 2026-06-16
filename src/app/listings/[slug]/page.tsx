import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import styles from './listing.module.css';

async function getListing(slug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('listings')
    .select(`
      id, title, make, model, year, price, body_type, slug,
      images, mileage, transmission, fuel_type, color, description,
      condition, features, status, created_at,
      dealers(id, name, phone, email, location, logo_url)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
  return data;
}

async function getRelated(make: string, excludeSlug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('listings')
    .select('id, title, make, model, year, price, slug, images, body_type')
    .eq('make', make)
    .eq('status', 'active')
    .neq('slug', excludeSlug)
    .limit(4);
  return data || [];
}

export default async function ListingDetailPage({ params }: { params: { slug: string } }) {
  const listing = await getListing(params.slug);
  if (!listing) notFound();

  const related = await getRelated(listing.make, listing.slug);
  const dealer = Array.isArray(listing.dealers) ? listing.dealers[0] : listing.dealers;
  const images: string[] = Array.isArray(listing.images) ? listing.images : [];
  const features: string[] = Array.isArray(listing.features) ? listing.features : [];
  const phone = dealer?.phone?.replace(/\D/g, '') || '';

  const specs = [
    { label: 'Year',         value: listing.year },
    { label: 'Make',         value: listing.make },
    { label: 'Model',        value: listing.model },
    { label: 'Body Type',    value: listing.body_type },
    { label: 'Mileage',      value: listing.mileage ? `${listing.mileage.toLocaleString()} km` : null },
    { label: 'Transmission', value: listing.transmission },
    { label: 'Fuel Type',    value: listing.fuel_type },
    { label: 'Color',        value: listing.color },
    { label: 'Condition',    value: listing.condition },
  ].filter(s => s.value);

  return (
    <>
      <Navbar />
      <main className={styles.root}>
        <div className={styles.container}>

          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href="/" className={styles.breadLink}>Home</Link>
            <span className={styles.breadSep}>›</span>
            <Link href="/listings" className={styles.breadLink}>Browse Cars</Link>
            <span className={styles.breadSep}>›</span>
            <span className={styles.breadCurrent}>{listing.make} {listing.model} {listing.year}</span>
          </nav>

          <div className={styles.layout}>

            {/* ── LEFT: Images + Specs ── */}
            <div className={styles.leftCol}>

              {/* Image gallery */}
              <div className={styles.gallery}>
                {images.length > 0 ? (
                  <>
                    <div className={styles.mainImgWrap}>
                      <img src={images[0]} alt={listing.title} className={styles.mainImg} id="main-img" />
                      {listing.body_type && <span className={styles.galleryBadge}>{listing.body_type}</span>}
                    </div>
                    {images.length > 1 && (
                      <div className={styles.thumbRow}>
                        {images.slice(1, 5).map((img, i) => (
                          <div key={i} className={styles.thumbWrap}>
                            <img src={img} alt={`View ${i + 2}`} className={styles.thumb} />
                            {i === 3 && images.length > 5 && (
                              <div className={styles.thumbMore}>+{images.length - 5}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.noImage}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2">
                      <rect x="1" y="3" width="15" height="13" rx="2"/>
                      <path d="M16 8h4l3 3v5h-7V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <p>No photos available</p>
                  </div>
                )}
              </div>

              {/* Specs table */}
              <div className={styles.specsCard}>
                <h2 className={styles.specsTitle}>Specifications</h2>
                <div className={styles.specsGrid}>
                  {specs.map(s => (
                    <div key={s.label} className={styles.specRow}>
                      <span className={styles.specLabel}>{s.label}</span>
                      <span className={styles.specValue}>{String(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              {features.length > 0 && (
                <div className={styles.featuresCard}>
                  <h2 className={styles.specsTitle}>Features & Extras</h2>
                  <div className={styles.featuresGrid}>
                    {features.map((f: string) => (
                      <div key={f} className={styles.featureItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <div className={styles.descCard}>
                  <h2 className={styles.specsTitle}>Description</h2>
                  <p className={styles.descText}>{listing.description}</p>
                </div>
              )}
            </div>

            {/* ── RIGHT: Price + Dealer ── */}
            <div className={styles.rightCol}>
              <div className={styles.priceCard}>
                <p className={styles.listingTitle}>{listing.make} {listing.model}</p>
                <p className={styles.listingYear}>{listing.year}{listing.mileage ? ` · ${listing.mileage.toLocaleString()} km` : ''}</p>
                <p className={styles.price}>${listing.price?.toLocaleString()}</p>
                <p className={styles.priceNote}>USD · Price as listed</p>

                {/* CTA buttons */}
                <div className={styles.ctaStack}>
                  {phone ? (
                    
                      href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi, I'm interested in the ${listing.year} ${listing.make} ${listing.model} listed on TauraNesu. Is it still available?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.waBtnPrimary}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.054 23.447a.5.5 0 0 0 .617.608l5.796-1.522A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.665-.523-5.176-1.432l-.36-.215-3.742.983.998-3.648-.235-.374A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      WhatsApp Dealer
                    </a>
                  ) : null}
                  {dealer?.phone && (
                    <a href={`tel:${dealer.phone}`} className={styles.callBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Call Dealer
                    </a>
                  )}
                </div>

                {/* Dealer card */}
                {dealer && (
                  <div className={styles.dealerCard}>
                    <div className={styles.dealerHeader}>
                      {dealer.logo_url ? (
                        <img src={dealer.logo_url} alt={dealer.name} className={styles.dealerLogo} />
                      ) : (
                        <div className={styles.dealerLogoPlaceholder}>
                          {dealer.name?.charAt(0) || 'D'}
                        </div>
                      )}
                      <div>
                        <p className={styles.dealerName}>{dealer.name}</p>
                        {dealer.location && <p className={styles.dealerLocation}>{dealer.location}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Safety note */}
                <div className={styles.safetyNote}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Always inspect the vehicle in person before purchasing.</span>
                </div>
              </div>

              {/* Favourite / share */}
              <div className={styles.actionRow}>
                <Link href="/listings" className={styles.backLink}>← Back to listings</Link>
              </div>
            </div>
          </div>

          {/* ── RELATED LISTINGS ── */}
          {related.length > 0 && (
            <section className={styles.related}>
              <h2 className={styles.relatedTitle}>More {listing.make} listings</h2>
              <div className={styles.relatedGrid}>
                {related.map((r: any) => {
                  const img = Array.isArray(r.images) ? r.images[0] : null;
                  return (
                    <Link key={r.id} href={`/listings/${r.slug}`} className={styles.relatedCard}>
                      <div className={styles.relatedImgWrap}>
                        {img ? (
                          <img src={img} alt={r.title} className={styles.relatedImg} />
                        ) : (
                          <div className={styles.relatedImgPlaceholder} />
                        )}
                      </div>
                      <div className={styles.relatedBody}>
                        <p className={styles.relatedName}>{r.make} {r.model} {r.year}</p>
                        <p className={styles.relatedPrice}>${r.price?.toLocaleString()}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
