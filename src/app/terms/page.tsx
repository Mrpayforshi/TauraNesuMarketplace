// Repo path: src/app/terms/page.tsx  (NEW FILE)

import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms of Use | TauraNesu',
  description: 'The terms that apply when you use the TauraNesu vehicle marketplace.',
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className={styles.root}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Terms of Use</h1>
          <p className={styles.updated}>Last updated: 10 November 2026</p>

          <p className={styles.intro}>
            These terms apply when you use TauraNesu (&quot;TauraNesu&quot;, &quot;we&quot;, &quot;us&quot;), an online
            marketplace in Zimbabwe that connects people who want to buy or sell vehicles with
            vetted dealers. By creating an account or using the site you agree to them. If you do
            not agree, please do not use the site.
          </p>

          <h2 className={styles.h2}>1. What TauraNesu does</h2>
          <p className={styles.p}>
            TauraNesu lets dealers list vehicles, lets buyers browse and enquire about them, and
            lets sellers submit a vehicle for valuation and introduction to a dealer. We are an
            intermediary. Unless we clearly say otherwise on a listing, we do not own the vehicles
            listed, and the sale of a vehicle is an agreement between the buyer and the seller or
            dealer, not with TauraNesu.
          </p>

          <h2 className={styles.h2}>2. Your account</h2>
          <ul className={styles.list}>
            <li>You must be at least 18 years old to create an account.</li>
            <li>Give accurate information and keep your password private. You are responsible for activity on your account.</li>
            <li>Tell us promptly if you think someone else has accessed your account.</li>
            <li>Dealer accounts are created and approved by TauraNesu and may be suspended or removed if the dealer breaks these terms.</li>
          </ul>

          <h2 className={styles.h2}>3. Listings and vehicle information</h2>
          <p className={styles.p}>
            Dealers and sellers are responsible for the accuracy of their listings, including price,
            mileage, condition, history and photos. We take steps to vet dealers, but we cannot
            guarantee that every listing is complete or error-free. Before you pay for a vehicle you
            should inspect it, check its documents and duty status, and confirm the details directly
            with the seller or dealer.
          </p>

          <h2 className={styles.h2}>4. Valuations</h2>
          <p className={styles.p}>
            Any valuation or price indication we give for a vehicle is an estimate to help you
            decide what to do next. It is not a binding offer to buy, and the final price is agreed
            between the seller and the dealer.
          </p>

          <h2 className={styles.h2}>5. Payments</h2>
          <p className={styles.p}>
            TauraNesu does not currently take payment for vehicles on the site. Do not send money to
            anyone who contacts you claiming to act for TauraNesu. If we introduce financing or other
            paid services in future, the terms for those services will be shown to you before you
            use them.
          </p>

          <h2 className={styles.h2}>6. Acceptable use</h2>
          <p className={styles.p}>You agree not to:</p>
          <ul className={styles.list}>
            <li>post false, misleading or fraudulent listings or enquiries;</li>
            <li>list a vehicle you do not have the right to sell;</li>
            <li>attempt to access accounts, data or systems you are not authorised to use;</li>
            <li>scrape, copy or reuse listings or photos at scale without our written permission; or</li>
            <li>use the site for anything unlawful, abusive or harmful to others.</li>
          </ul>

          <h2 className={styles.h2}>7. Content you provide</h2>
          <p className={styles.p}>
            You keep ownership of photos and information you upload, but you give us permission to
            display, store and share them as needed to run the marketplace, including showing a
            seller&apos;s submission to dealers we introduce them to.
          </p>

          <h2 className={styles.h2}>8. Our liability</h2>
          <p className={styles.p}>
            We work to keep the site available and accurate, but it is provided &quot;as is&quot;. To the extent the
            law allows, TauraNesu is not liable for losses arising from a transaction between users,
            from inaccurate listings, or from the site being unavailable. Nothing in these terms
            limits any right you have under Zimbabwean law that cannot lawfully be limited.
          </p>

          <h2 className={styles.h2}>9. Suspension and changes</h2>
          <p className={styles.p}>
            We may suspend or close an account that breaks these terms. We may update these terms
            from time to time; the date at the top shows when they last changed, and continuing to
            use the site after a change means you accept the new terms.
          </p>

          <h2 className={styles.h2}>10. Governing law</h2>
          <p className={styles.p}>These terms are governed by the laws of Zimbabwe.</p>

          <h2 className={styles.h2}>11. Contact</h2>
          <p className={styles.p}>
            Questions about these terms?{' '}
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className={styles.link}>{CONTACT_EMAIL}</a>
            ) : (
              'Contact TauraNesu through the site.'
            )}{' '}
            See also our{' '}
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
