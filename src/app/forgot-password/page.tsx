// Repo path: src/app/forgot-password/page.tsx  (NEW FILE)

'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from '../login/login.module.css';
import extras from '../auth-extras.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter the email address you signed up with.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className={styles.root}>
        <div className={styles.container}>
          <div className={styles.panel}>
            <div className={styles.panelInner}>
              <div className={styles.panelLogo}>TauraNesu</div>
              <h2 className={styles.panelHeading}>Locked out? It happens.</h2>
              <ul className={styles.panelList}>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  We&apos;ll email you a secure reset link
                </li>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  The link works for a limited time
                </li>
              </ul>
            </div>
            <div className={styles.panelDecor} aria-hidden />
          </div>

          <div className={styles.formSide}>
            <div className={styles.card}>
              <h1 className={styles.title}>Reset your password</h1>
              <p className={styles.sub}>
                Remembered it?{' '}
                <Link href="/login" className={styles.link}>Back to sign in</Link>
              </p>

              {sent ? (
                <div className={extras.stack}>
                  <div className={extras.successBox}>
                    If an account exists for {email.trim().toLowerCase()}, a reset link is on its way.
                    Check your inbox and spam folder.
                  </div>
                  <p className={extras.note}>
                    Dealers who sign in with a phone number don&apos;t have an email reset —
                    please contact TauraNesu and we&apos;ll set a new password for you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="email">Email address</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(''); }}
                      className={styles.input}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className={styles.errorBox}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {error}
                    </div>
                  )}

                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? <span className={styles.spinner} aria-hidden /> : null}
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>

                  <p className={extras.note}>
                    Dealers who sign in with a phone number: contact TauraNesu to reset your password.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
