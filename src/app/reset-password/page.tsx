// Repo path: src/app/reset-password/page.tsx  (NEW FILE)

'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { clearAccessToken } from '@/lib/client-auth';
import styles from '../login/login.module.css';
import extras from '../auth-extras.module.css';

// Supabase sends the person back here as /reset-password#access_token=...&type=recovery
// (or #error=...&error_description=... if the link is expired/used). The
// fragment never reaches the server, so we read it in the browser, keep the
// token in memory only, and remove it from the address bar.

export default function ResetPasswordPage() {
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [linkProblem, setLinkProblem] = useState(false);
  const [ready, setReady] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('access_token');
    const type = params.get('type');

    if (token && type === 'recovery') {
      setRecoveryToken(token);
    } else {
      setLinkProblem(true);
    }

    // Don't leave the token sitting in the URL / browser history.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setReady(true);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${recoveryToken}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setLinkProblem(true);
        } else {
          setError(data.error || 'Could not update your password. Please try again.');
        }
        return;
      }

      // Drop any old session on this browser; they sign in fresh.
      clearAccessToken();
      setRecoveryToken(null);
      setDone(true);
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
              <h2 className={styles.panelHeading}>Choose a new password</h2>
              <ul className={styles.panelList}>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  At least 8 characters
                </li>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Don&apos;t reuse a password from another site
                </li>
              </ul>
            </div>
            <div className={styles.panelDecor} aria-hidden />
          </div>

          <div className={styles.formSide}>
            <div className={styles.card}>
              {!ready ? null : done ? (
                <div className={extras.stack}>
                  <h1 className={styles.title}>Password updated</h1>
                  <div className={extras.successBox}>
                    Your password has been changed. You can now sign in with it.
                  </div>
                  <Link href="/login" className={styles.submitBtn} style={{ textDecoration: 'none' }}>
                    Go to sign in
                  </Link>
                </div>
              ) : linkProblem ? (
                <div className={extras.stack}>
                  <h1 className={styles.title}>Link expired</h1>
                  <div className={styles.errorBox}>
                    This reset link is invalid or has expired. Reset links can only be used once.
                  </div>
                  <Link href="/forgot-password" className={styles.submitBtn} style={{ textDecoration: 'none' }}>
                    Request a new link
                  </Link>
                </div>
              ) : (
                <>
                  <h1 className={styles.title}>New password</h1>
                  <p className={styles.sub}>Enter and confirm your new password below.</p>

                  <form onSubmit={handleSubmit} noValidate className={styles.form}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="password">New password</label>
                      <div className={styles.passwordWrap}>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(''); }}
                          className={styles.input}
                          placeholder="Min. 8 characters"
                          autoComplete="new-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="confirm">Confirm password</label>
                      <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => { setConfirm(e.target.value); setError(''); }}
                        className={styles.input}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
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
                      {loading ? 'Saving…' : 'Update password'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
