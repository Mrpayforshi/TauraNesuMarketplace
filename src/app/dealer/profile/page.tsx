'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DealerNav from '@/components/DealerNav';
import styles from './profile.module.css';
import { authFetch, clearAccessToken } from '@/lib/client-auth';

interface DealerAccount {
  dealer: {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    city: string | null;
    subscription_tier: string;
    listing_limit: number;
    created_at: string;
  };
  subscription: {
    tier: string;
    price_usd: number;
    billing_start: string | null;
    billing_end: string | null;
    status: string;
  } | null;
  active_listing_count: number | null;
}

// Must match ALLOWED_CITIES in src/app/api/dealer/account/route.ts
const CITIES = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Other'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DealerProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<DealerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    authFetch('/api/dealer/account')
      .then(async (res) => {
        if (res.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load profile');
        setAccount(data);
        setContactName(data.dealer.contact_name ?? '');
        setPhone(data.dealer.phone ?? '');
        setCity(data.dealer.city ?? '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const res = await authFetch('/api/dealer/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_name: contactName, phone, city }),
      });
      if (res.status === 401) {
        clearAccessToken();
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save changes');
      setAccount((prev) =>
        prev
          ? { ...prev, dealer: { ...prev.dealer, contact_name: data.contact_name, phone: data.phone, city: data.city } }
          : prev
      );
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    clearAccessToken();
    router.push('/login?portal=dealer');
  }

  const used = account?.active_listing_count ?? 0;
  const limit = account?.dealer.listing_limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <>
      <Navbar />
      <DealerNav />
      <main className={styles.root}>
        <div className={styles.body}>
          <h1 className={styles.heading}>Profile</h1>
          <p className={styles.sub}>Your dealership details and contact info.</p>

          {loading ? (
            <div className={styles.skeleton} />
          ) : error || !account ? (
            <div className={styles.errorBox}>{error || 'Could not load your profile.'}</div>
          ) : (
            <div className={styles.grid}>

              {/* Dealership card */}
              <section className={styles.card} aria-label="Dealership">
                <div className={styles.dealerName}>{account.dealer.name}</div>
                <div className={styles.verified}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  Verified dealer
                </div>

                <dl className={styles.facts}>
                  <div>
                    <dt>Plan</dt>
                    <dd>{account.dealer.subscription_tier.charAt(0).toUpperCase() + account.dealer.subscription_tier.slice(1)}</dd>
                  </div>
                  <div>
                    <dt>Member since</dt>
                    <dd>{formatDate(account.dealer.created_at)}</dd>
                  </div>
                </dl>

                <div className={styles.usage}>
                  <div className={styles.usageRow}>
                    <span>Listings in use</span>
                    <span className={styles.usageNum}>{used} of {limit}</span>
                  </div>
                  <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label="Listing limit used">
                    <div className={styles.barFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <p className={styles.note}>
                  To change your dealership name or listing limit, contact the TauraNesu team.
                </p>
              </section>

              {/* Editable contact details */}
              <form className={styles.card} onSubmit={handleSave}>
                <h2 className={styles.cardTitle}>Contact details</h2>

                <label className={styles.field}>
                  <span className={styles.label}>Contact person</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={contactName}
                    onChange={(e) => { setContactName(e.target.value); setSaved(false); }}
                    autoComplete="name"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Phone (WhatsApp)</span>
                  <input
                    className={styles.input}
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
                    autoComplete="tel"
                    placeholder="+263 77 123 4567"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>City</span>
                  <select
                    className={styles.input}
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setSaved(false); }}
                  >
                    <option value="">Select a city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                {saveError && <div className={styles.errorBox}>{saveError}</div>}
                {saved && <div className={styles.okBox} role="status">Changes saved.</div>}

                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveBtn} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
