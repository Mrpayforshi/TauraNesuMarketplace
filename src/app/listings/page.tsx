import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import styles from './listings.module.css';

export const dynamic = 'force-dynamic';

const MAKES = ['Toyota','Honda','BMW','Mercedes-Benz','Audi','Volkswagen','Mazda','Nissan','Hyundai','Ford','Isuzu','Mitsubishi','Subaru','Land Rover','Jeep'];
const BODY_TYPES = ['SUV','Sedan','Hatchback','Pickup','Minivan','Coupe','Convertible','Wagon'];
const YEARS = Array.from({ length: 26 }, (_, i) => 2025 - i);
const PAGE_SIZE = 12;

interface SearchParams {
  q?: string;
  make?: string;
  body_type?: string;
  min_price?: string;
  max_price?: string;
  min_year?: string;
  max_year?: string;
  page?: string;
}

async function getListings(params: SearchParams) {
  const supabase = createServerClient();
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('listings')
    .select('id,make,model,year,price_usd,body_type,slug,primary_image_url,mileage_km,transmission,fuel_type,dealers(name)', { count: 'exact' })
    .eq('status', 'active');

  if (params.q) {
    query = query.or(`make.ilike.%${params.q}%,model.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  }
  if (params.make) query = query.ilike('make', params.make);
  if (params.body_type) query = query.ilike('body_type', params.body_type);
  if (params.min_price) query = query.gte('price_usd', parseInt(params.min_price));
  if (params.max_price) query = query.lte('price_usd', parseInt(params.max_price));
  if (params.min_year) query = query.gte('year', parseInt(params.min_year));
  if (params.max_year) query = query.lte('year', parseInt(params.max_year));

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count } = await query;
  return { listings: data || [], total: count || 0, page, totalPages: Math.ceil((count || 0) / PAGE_SIZE) };
}

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { listings, total, page, totalPages } = await getListings(searchParams);

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = { ...searchParams, ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v); });
    return `/listings?${params.toString()}`;
  };

  const activeFilters = [
    searchParams.q && { label: `"${searchParams.q}"`, key: 'q' },
    searchParams.make && { label: searchParams.make, key: 'make' },
    searchParams.body_type && { label: searchParams.body_type, key: 'body_type' },
    (searchParams.min_price || searchParams.max_price) && {
      label: `$${searchParams.min_price || '0'} – $${searchParams.max_price || '∞'}`,
      key: 'price',
    },
    (searchParams.min_year || searchParams.max_year) && {
      label: `${searchParams.min_year || 'Any'} – ${searchParams.max_year || 'Any'}`,
      key: 'year',
    },
  ].filter(Boolean) as { label: string; key: string }[];

  const removeFilter = (key: string) => {
    const overrides: Record<string, string> = { page: '1' };
    if (key === 'price') { overrides.min_price = ''; overrides.max_price = ''; }
    else if (key === 'year') { overrides.min_year = ''; overrides.max_year = ''; }
    else overrides[key] = '';
    return buildUrl(overrides);
  };

  return (
    <>
      <Navbar />
      <main className={styles.root}>

        {/* ── TOP BAR ── */}
        <div className={styles.topBar}>
          <div className={styles.container}>
            <div className={styles.topBarInner}>
              <div>
                <h1 className={styles.pageTitle}>Browse Cars</h1>
                <p className={styles.resultCount}>{total.toLocaleString()} car{total !== 1 ? 's' : ''} available</p>
              </div>
              <form className={styles.searchBar} action="/listings" method="GET">
                {/* Preserve other filters when searching */}
                {searchParams.make && <input type="hidden" name="make" value={searchParams.make} />}
                {searchParams.body_type && <input type="hidden" name="body_type" value={searchParams.body_type} />}
                {searchParams.min_price && <input type="hidden" name="min_price" value={searchParams.min_price} />}
                {searchParams.max_price && <input type="hidden" name="max_price" value={searchParams.max_price} />}
                <span className={styles.searchIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </span>
                <input
                  name="q"
                  type="text"
                  defaultValue={searchParams.q || ''}
                  placeholder="Search make, model, keyword…"
                  className={styles.searchInput}
                />
                <button type="submit" className={styles.searchBtn}>Search</button>
              </form>
            </div>
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.layout}>

            {/* ── SIDEBAR FILTERS ── */}
            <aside className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarHeader}>
                  <h2 className={styles.sidebarTitle}>Filters</h2>
                  <Link href="/listings" className={styles.clearAll}>Clear all</Link>
                </div>

                <form action="/listings" method="GET">
                  {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}

                  {/* Make */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Make</label>
                    <select name="make" className={styles.filterSelect} defaultValue={searchParams.make || ''}>
                      <option value="">All Makes</option>
                      {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Body Type */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Body Type</label>
                    <div className={styles.bodyTypeGrid}>
                      {BODY_TYPES.map(bt => (
                        <label key={bt} className={`${styles.bodyChip} ${(searchParams.body_type?.toLowerCase() === bt.toLowerCase()) ? styles.bodyChipActive : ''}`}>
                          <input type="radio" name="body_type" value={bt} defaultChecked={searchParams.body_type?.toLowerCase() === bt.toLowerCase()} className={styles.srOnly} />
                          {bt}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Price (USD)</label>
                    <div className={styles.rangeRow}>
                      <input type="number" name="min_price" placeholder="Min" defaultValue={searchParams.min_price || ''} className={styles.rangeInput} min="0" />
                      <span className={styles.rangeSep}>–</span>
                      <input type="number" name="max_price" placeholder="Max" defaultValue={searchParams.max_price || ''} className={styles.rangeInput} min="0" />
                    </div>
                  </div>

                  {/* Year Range */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Year</label>
                    <div className={styles.rangeRow}>
                      <select name="min_year" className={styles.rangeSelect} defaultValue={searchParams.min_year || ''}>
                        <option value="">From</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className={styles.rangeSep}>–</span>
                      <select name="max_year" className={styles.rangeSelect} defaultValue={searchParams.max_year || ''}>
                        <option value="">To</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="submit" className={styles.applyBtn}>Apply Filters</button>
                </form>
              </div>
            </aside>

            {/* ── RESULTS ── */}
            <section className={styles.results}>

              {/* Active filter chips */}
              {activeFilters.length > 0 && (
                <div className={styles.activeFilters}>
                  {activeFilters.map(f => (
                    <Link key={f.key} href={removeFilter(f.key)} className={styles.filterChip}>
                      {f.label} <span className={styles.chipX}>×</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Grid */}
              {listings.length === 0 ? (
                <div className={styles.empty}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                    <rect x="1" y="3" width="15" height="13" rx="2"/>
                    <path d="M16 8h4l3 3v5h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <p>No cars match your filters.</p>
                  <Link href="/listings" className={styles.emptyReset}>Reset filters</Link>
                </div>
              ) : (
                <div className={styles.grid}>
                  {listings.map((listing: any) => {
                    const dealer = Array.isArray(listing.dealers) ? listing.dealers[0] : listing.dealers;
                    const firstImg = listing.primary_image_url || null;
                    return (
                      <Link key={listing.id} href={`/listings/${listing.slug}`} className={styles.card}>
                        <div className={styles.cardImgWrap}>
                          {listing.body_type && <span className={styles.cardBadge}>{listing.body_type}</span>}
                          {firstImg ? (
                            <img src={firstImg} alt={`${listing.make} ${listing.model}`} className={styles.cardImg} />
                          ) : (
                            <div className={styles.cardImgPlaceholder}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                                <rect x="1" y="3" width="15" height="13" rx="2"/>
                                <path d="M16 8h4l3 3v5h-7V8z"/>
                                <circle cx="5.5" cy="18.5" r="2.5"/>
                                <circle cx="18.5" cy="18.5" r="2.5"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className={styles.cardBody}>
                          <p className={styles.cardTitle}>{listing.make} {listing.model}</p>
                          <p className={styles.cardSub}>{listing.year}{listing.mileage_km ? ` · ${listing.mileage_km.toLocaleString()} km` : ''}{listing.transmission ? ` · ${listing.transmission}` : ''}</p>
                          <p className={styles.cardPrice}>${listing.price_usd?.toLocaleString()}</p>
                          <p className={styles.cardDealer}>{dealer?.name || 'TauraNesu Dealer'}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  {page > 1 && (
                    <Link href={buildUrl({ page: String(page - 1) })} className={styles.pageBtn}>← Prev</Link>
                  )}
                  <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                  {page < totalPages && (
                    <Link href={buildUrl({ page: String(page + 1) })} className={styles.pageBtn}>Next →</Link>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
