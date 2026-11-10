// Repo path: src/app/privacy/page.tsx  (NEW FILE)

import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | TauraNesu',
  description: 'How TauraNesu collects, uses and protects your personal information.',
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className={styles.root}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: 10 November 2026</p>

          <p className={styles.intro}>
            This policy explains what personal information TauraNesu collects when you use our
            vehicle marketplace, why we collect it, who we share it with, and the choices you have.
          </p>

          <h2 className={styles.h2}>1. What we collect</h2>
          <ul className={styles.list}>
            <li><strong>Account details:</strong> your name, email address and password (stored securely; we cannot read your password).</li>
            <li><strong>Contact details:</strong> a phone number, if you give us one in a submission or enquiry.</li>
            <li><strong>Vehicle submissions and listings:</strong> make, model, year, mileage, condition, price, description and photos you upload.</li>
            <li><strong>Technical data:</strong> basic information such as your IP address and device/browser type, used to keep the site secure and working.</li>
          </ul>

          <h2 className={styles.h2}>2. How we use it</h2>
          <ul className={styles.list}>
            <li>To create and run your account and let you sign in.</li>
            <li>To show listings, handle enquiries, and value and place vehicles you submit.</li>
            <li>To introduce sellers to dealers and buyers to sellers or dealers.</li>
            <li>To protect the site against fraud, abuse and unauthorised access.</li>
            <li>To contact you about your account, submissions or enquiries.</li>
          </ul>

          <h2 className={styles.h2}>3. Who we share it with</h2>
          <p className={styles.p}>
            When you submit a vehicle, the details you provide and your contact information may be
            shared with the dealer we introduce you to, including through messaging apps such as
            WhatsApp, so that they can respond to you. If you enquire about a listing, the dealer or
            seller will receive your enquiry details.
          </p>
          <p className={styles.p}>
            We use service providers to run the site, including cloud hosting and database
            providers, who process data on our behalf. We do not sell your personal information. We
            may disclose information where the law requires it.
          </p>

          <h2 className={styles.h2}>4. Signing in on your device</h2>
          <p className={styles.p}>
            To keep you signed in, the site stores a sign-in token in your browser&apos;s local
            storage. It is removed when you sign out. We do not use it for advertising.
          </p>

          <h2 className={styles.h2}>5. How long we keep it</h2>
          <p className={styles.p}>
            We keep your information for as long as your account is active and as long as needed to
            handle submissions, comply with the law and resolve disputes. You can ask us to delete
            your account and personal information (see section 7).
          </p>

          <h2 className={styles.h2}>6. Security</h2>
          <p className={styles.p}>
            We use access controls, encrypted connections and limits on sign-in attempts to protect
            your information. No online service is completely secure, so please use a strong, unique
            password.
          </p>

          <h2 className={styles.h2}>7. Your choices</h2>
          <p className={styles.p}>
            You can ask to see, correct or delete the personal information we hold about you, or
            object to how we use it, by contacting us below. We will respond as required by
            applicable Zimbabwean data protection law.
          </p>

          <h2 className={styles.h2}>8. Children</h2>
          <p className={styles.p}>
            TauraNesu is intended for people aged 18 and over. We do not knowingly collect
            information from children.
          </p>

          <h2 className={styles.h2}>9. Changes</h2>
          <p className={styles.p}>
            We may update this policy. The date at the top shows when it last changed.
          </p>

          <h2 className={styles.h2}>10. Contact</h2>
          <p className={styles.p}>
            For privacy questions or requests:{' '}
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className={styles.link}>{CONTACT_EMAIL}</a>
            ) : (
              'contact TauraNesu through the site.'
            )}{' '}
            See also our{' '}
            <Link href="/terms" className={styles.link}>Terms of Use</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
