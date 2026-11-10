   import Link from 'next/link';
import { createServerClient, createAdminClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import {
  IconKey,
  IconBanknote,
  IconStorefront,
  IconShieldCheck,
  IconCar,
  IconCircleCheck,
  IconArrowRight,
} from '@/components/icons';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

const PRICE_STEPS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const PATHS = [
  {
    key: 'buy',
    index: '01',
    title: 'Buy a car',
    desc: 'Compare stock from verified dealers and get in touch with them directly.',
    cta: 'Browse cars',
    href: '/listings',
    Icon: IconKey,
    primary: false,
  },
  {
    key: 'sell',
    index: '02',
    title: 'Sell your car',
    desc: 'Submit your car once. Verified dealers review it and come to you with offers.',
    cta: 'Sell my car',
    href: '/sell',
    Icon: IconBanknote,
    primary: true,
  },
  {
    key: 'dealer',
    index: '03',
    title: 'List as a dealer',
    desc: 'List your stock for free and receive vetted seller leads.',
    cta: 'Open dealer portal',
    href: '/login?portal=dealer',
    Icon: IconStorefront,
    primary: false,
  },
];

/**
 * Real marketplace numbers for the stats bar.
 *
 * - Active listings: counted with the public client (the "Public read active
 *   listings" RLS policy already allows it).
 * - Verified dealers: the dealers table has no public read policy (it holds
 *   phone numbers and emails), so a head-only count is taken with the admin
 *   client. This runs on the server only and returns a bare number — no dealer
 *   rows ever reach the browser.
 */
async function getSiteStats() {
  try {
    const publicClient = createServerClient();
    const adminClient = createAdminClient();

    const [listingsRes, dealersRes] = await Promise.all([
      publicClient
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      adminClient
        .from('dealers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ]);

    if (listingsRes.error) console.error('getSiteStats listings error:', listingsRes.error.message);
    if (dealersRes.error) console.error('getSiteStats dealers error:', dealersRes.error.message);

    return {
      listings: listingsRes.count ?? 0,
      dealers: dealersRes.count ?? 0,
    };
  } catch (err) {
    console.error('getSiteStats failed:', err);
    return { listings: 0, dealers: 0 };
  }
}

const formatCount = (n: number) => n.toLocaleString('en-US');

async function getLatestListings() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('listings')
    .select('id, make, model, year, price_usd, body_type, slug, primary_image_url, trade_in_available, dealers(name, phone)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) {
    console.error('getLatestListings error:', error.message);
  }
  return data || [];
}

export default async function HomePage() {
  const [listings, stats] = await Promise.all([getLatestListings(), getSiteStats()]);

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroBg}>
            <img
              src="/images/hero-car-left.png"
              alt=""
              className={styles.heroCarLeft}
              aria-hidden="true"
            />
            <img
              src="/images/hero-car-right.png"
              alt=""
              className={styles.heroCarRight}
              aria-hidden="true"
            />
          </div>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              Zimbabwe&apos;s trusted car marketplace
            </span>
            <h1 className={styles.heroHeadline}>
              Taura.<br />
              <span className={styles.heroAccent}>Compare.</span><br />
              Drive the difference.
            </h1>
            <p className={styles.heroSub}>Browse verified dealers. Sell your car fast.</p>

            <form className={styles.heroSearch} action="/listings" method="GET">
              <span className={styles.heroSearchIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                name="q"
                type="text"
                placeholder="Search by make, model or keyword..."
                className={styles.heroSearchInput}
              />
              <button type="submit" className={styles.heroSearchBtn}>Search</button>
            </form>

            <div className={styles.heroPills}>
              {[
                { label: 'SUVs' },
                { label: 'Sedans' },
                { label: 'Hatchbacks' },
                { label: 'Pickups' },
                { label: 'Trucks' },
                { label: 'Buses' },
                { label: 'Under $10k' },
                { label: 'Specials' },
                { label: 'Trade-in Accepted', href: '/listings?trade_in=true' },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href || `/listings?q=${encodeURIComponent(label)}`}
                  className={styles.heroPill}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHOOSE YOUR PATH ── */}
        <section className={styles.paths} aria-labelledby="paths-heading">
          <div className={styles.container}>
            <div className={styles.pathsHead}>
              <h2 id="paths-heading" className={styles.pathsTitle}>One marketplace. Three ways in.</h2>
            </div>
            <div className={styles.pathsGrid}>
              {PATHS.map(({ key, index, title, desc, cta, href, Icon, primary }) => (
                <Link
                  key={key}
                  href={href}
                  className={`${styles.path} ${primary ? styles.pathPrimary : ''}`}
                >
                  <span className={styles.pathIndex} aria-hidden="true">{index}</span>
                  <Icon size={28} className={styles.pathIcon} />
                  <h3 className={styles.pathName}>{title}</h3>
                  <p className={styles.pathDesc}>{desc}</p>
                  <span className={styles.pathCta}>
                    {cta}
                    <IconArrowRight size={16} className={styles.pathArrow} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE STATS (real counts; items with a zero count are hidden) ── */}
        <div className={styles.statsBar}>
          {stats.dealers > 0 && (
            <div className={styles.statItem}>
              <IconShieldCheck size={22} className={styles.statIcon} />
              <div>
                <strong className={styles.statNum}>{formatCount(stats.dealers)}</strong>
                <span className={styles.statLabel}>
                  Verified {stats.dealers === 1 ? 'dealer' : 'dealers'}
                </span>
              </div>
            </div>
          )}
          {stats.listings > 0 && (
            <div className={styles.statItem}>
              <IconCar size={22} className={styles.statIcon} />
              <div>
                <strong className={styles.statNum}>{formatCount(stats.listings)}</strong>
                <span className={styles.statLabel}>
                  Active {stats.listings === 1 ? 'listing' : 'listings'}
                </span>
              </div>
            </div>
          )}
          <div className={styles.statItem}>
            <IconCircleCheck size={22} className={styles.statIcon} />
            <div>
              <strong className={styles.statNum}>Free</strong>
              <span className={styles.statLabel}>Browse without an account</span>
            </div>
          </div>
        </div>

        {/* ── BROWSE BY BUDGET ── */}
        <section className={styles.budgetSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeading}>BROWSE BY BUDGET</h2>
            <div className={styles.budgetGrid}>
              {[
                { label: 'Lease monthly', img: '/images/budget-suzuki.jpg',      href: '/listings?lease=true' },
                { label: 'Under $20k',    img: '/images/budget-bmw-x5.jpg',      href: '/listings?max_price=20000' },
                { label: 'Under $30k',    img: '/images/budget-bmw-3.jpg',       href: '/listings?max_price=30000' },
                { label: 'Under $40k',    img: '/images/budget-range-rover.jpg', href: '/listings?max_price=40000' },
                { label: 'Under $50k',    img: '/images/budget-jaguar.jpg',      href: '/listings?max_price=50000' },
                { label: 'Open budget',   img: '/images/budget-porsche.jpg',     href: '/listings' },
              ].map(({ label, img, href }) => (
                <Link key={label} href={href} className={styles.budgetCard}>
                  <div className={styles.budgetImgWrap}>
                    <img src={img} alt={label} className={styles.budgetImg} />
                  </div>
                  <span className={styles.budgetLabel}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── LATEST LISTINGS ── */}
        <section className={styles.listingsSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeadingLight}>LATEST LISTINGS</h2>
              <Link href="/listings" className={styles.viewAll}>View all listings <IconArrowRight size={14} className={styles.viewAllArrow} /></Link>
            </div>
            <div className={styles.listingsGrid}>
              {listings.length === 0 ? (
                <p className={styles.emptyState}>No listings yet — check back soon.</p>
              ) : (
                listings.map((listing: any) => {
                  const dealer = Array.isArray(listing.dealers) ? listing.dealers[0] : listing.dealers;
                  const firstImg = listing.primary_image_url || null;
                  const phone = dealer?.phone?.replace(/\D/g, '') || '';
                  return (
                    <div key={listing.id} className={styles.listingCard}>
                      <Link href={`/listings/${listing.slug}`} className={styles.listingImgWrap}>
                        {listing.body_type && (
                          <span className={styles.bodyBadge}>{listing.body_type}</span>
                        )}
                        {listing.trade_in_available && (
                          <span className={styles.tradeBadge}>Trade-in OK</span>
                        )}
                        {firstImg ? (
                          <img src={firstImg} alt={`${listing.make} ${listing.model} ${listing.year}`} className={styles.listingImg} />
                        ) : (
                          <div className={styles.listingImgPlaceholder}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                              <rect x="1" y="3" width="15" height="13" rx="2" />
                              <path d="M16 8h4l3 3v5h-7V8z" />
                              <circle cx="5.5" cy="18.5" r="2.5" />
                              <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                          </div>
                        )}
                      </Link>
                      <div className={styles.listingBody}>
                        <p className={styles.listingTitle}>{listing.make} {listing.model} {listing.year}</p>
                        <p className={styles.listingPrice}>${listing.price_usd?.toLocaleString()}</p>
                        <p className={styles.listingDealer}>{dealer?.name || 'TauraNesu Dealer'}</p>
                      </div>
                      {phone ? (
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.waBtn}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.054 23.447a.5.5 0 0 0 .617.608l5.796-1.522A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.665-.523-5.176-1.432l-.36-.215-3.742.983.998-3.648-.235-.374A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                          </svg>
                          WhatsApp
                        </a>
                      ) : (
                        <Link href={`/listings/${listing.slug}`} className={styles.waBtn} style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)'}}>View Listing</Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ── BROWSE BY BODY TYPE ── */}
        <section className={styles.bodyTypeSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionHeadingLight}>BROWSE BY BODY TYPE</h2>
            <div className={styles.bodyTypeGrid}>
              {[
                { label: 'SUV',       img: '/images/body-suv.png',       href: '/listings?body_type=suv' },
                { label: 'Sedan',     img: '/images/body-sedan.png',     href: '/listings?body_type=sedan' },
                { label: 'Hatchback', img: '/images/body-hatchback.png', href: '/listings?body_type=hatchback' },
                { label: 'Pickup',    img: '/images/body-pickup.png',    href: '/listings?body_type=pickup' },
                { label: 'Minivan',   img: '/images/body-minivan.png',   href: '/listings?body_type=minivan' },
                { label: 'Truck',     img: '/images/body-truck.png',     href: '/listings?body_type=truck' },
                { label: 'Bus',       img: '/images/body-bus.png',       href: '/listings?body_type=bus' },
              ].map(({ label, img, href }) => (
                <Link key={label} href={href} className={styles.bodyTypeCard}>
                  <img src={img} alt={label} className={styles.bodyTypeImg} />
                  <span className={styles.bodyTypeLabel}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── SELL CTA ── */}
        <section className={styles.sellSection} id="how-it-works">
          <div className={styles.container}>
            <div className={styles.sellBanner}>
              <div className={styles.sellLeft}>
                <h2 className={styles.sellTitle}>Selling your car?</h2>
                <p className={styles.sellDesc}>Get your car in front of verified dealers in 3 easy steps.</p>
                <Link href="/sell" className={styles.sellBtn}>Sell My Car</Link>
              </div>
              <div className={styles.sellSteps}>
                <div className={styles.sellStep}>
                  <div className={styles.sellStepCircle}>1</div>
                  <strong>Submit details</strong>
                  <span>Tell us about your car in a few steps.</span>
                </div>
                <div className={styles.sellArrow} aria-hidden="true"><IconArrowRight size={20} /></div>
                <div className={styles.sellStep}>
                  <div className={styles.sellStepCircle}>2</div>
                  <strong>Get a valuation</strong>
                  <span>Receive an estimated value for your car.</span>
                </div>
                <div className={styles.sellArrow} aria-hidden="true"><IconArrowRight size={20} /></div>
                <div className={styles.sellStep}>
                  <div className={styles.sellStepCircle}>3</div>
                  <strong>Dealers come to you</strong>
                  <span>Verified dealers view your car and make offers.</span>
                </div>
              </div>
              <div className={styles.sellCarWrap}>
                <img src="/images/sell-car.png" alt="" className={styles.sellCar} aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerGrid}>
              <div className={styles.footerBrand}>
                <span className={styles.footerLogo}>TauraNesu</span>
                <p className={styles.footerTagline}>Zimbabwe&apos;s trusted car marketplace.</p>
                <div className={styles.footerSocials}>
                  <a href="#" aria-label="Facebook" className={styles.socialIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="WhatsApp" className={styles.socialIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.054 23.447a.5.5 0 0 0 .617.608l5.796-1.522A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.665-.523-5.176-1.432l-.36-.215-3.742.983.998-3.648-.235-.374A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="Instagram" className={styles.socialIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className={styles.footerCol}>
                <h4 className={styles.footerColHeading}>BROWSE</h4>
                <Link href="/listings" className={styles.footerLink}>All Cars</Link>
                <Link href="/listings?body_type=suv" className={styles.footerLink}>SUVs</Link>
                <Link href="/listings?body_type=sedan" className={styles.footerLink}>Sedans</Link>
                <Link href="/listings?body_type=hatchback" className={styles.footerLink}>Hatchbacks</Link>
                <Link href="/listings?body_type=pickup" className={styles.footerLink}>Pickups</Link>
                <Link href="/listings?body_type=minivan" className={styles.footerLink}>Minivans</Link>
                <Link href="/listings?body_type=truck" className={styles.footerLink}>Trucks</Link>
                <Link href="/listings?body_type=bus" className={styles.footerLink}>Buses</Link>
                <Link href="/listings?specials=true" className={styles.footerLink}>Car Specials</Link>
                <Link href="/listings?trade_in=true" className={styles.footerLink}>Trade-in Accepted</Link>
              </div>

              <div className={styles.footerCol}>
                <h4 className={styles.footerColHeading}>PRICE RANGE</h4>
                <div className={styles.footerPriceGrid}>
                  {PRICE_STEPS.map((k) => (
                    <Link
                      key={k}
                      href={`/listings?max_price=${k * 1000}`}
                      className={styles.footerLink}
                    >
                      Under ${k}k
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.footerCol}>
                <h4 className={styles.footerColHeading}>COMPANY</h4>
                <Link href="/#how-it-works" className={styles.footerLink}>How It Works</Link>
                <Link href="/sell" className={styles.footerLink}>Sell Your Car</Link>
                <Link href="/contact" className={styles.footerLink}>Contact</Link>
                <Link href="/login" className={styles.footerLink}>Sign In</Link>
              </div>

              <div className={styles.footerCol}>
                <h4 className={styles.footerColHeading}>LEGAL</h4>
                <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
                <Link href="/terms" className={styles.footerLink}>Terms of Use</Link>
              </div>
            </div>

            <div className={styles.footerBottom}>
              <p>© 2026 TauraNesu. All rights reserved.</p>
              <Link
                href="/admin-login"
                className={styles.footerAdminLink}
                aria-label="Admin sign in"
                title="Admin"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </Link>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
