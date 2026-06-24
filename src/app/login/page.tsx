// Repo path: src/app/login/page.tsx

'use client';

import { useState, Suspense, ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { setAccessToken } from '@/lib/client-auth';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when the person arrived via the "Dealer" entry point (Navbar /
  // homepage card both link to /login?portal=dealer). Carries their intent
  // through the shared login form so the redirect after sign-in honours
  // *what they came here to do*, not just whatever the account's default
  // priority role happens to be.
  const portal = searchParams.get('portal');
  const isDealerPortal = portal === 'dealer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      // Store the access token so authFetch() can attach it to protected
      // admin/dealer requests going forward.
      if (data.session) {
        setAccessToken(data.session);
      }

      if (isDealerPortal) {
        // Came in through the Dealer entry point — honour that intent.
        // isAdmin and isDealer are not mutually exclusive (an account can
        // be both at once), so don't fall back to /admin just because the
        // account also happens to carry the admin flag.
        if (data.isDealer) {
          router.push('/dealer/dashboard');
        } else {
          setError(
            "This account isn't registered as a dealer. Sign in with your dealer account, or contact us to set one up."
          );
          return;
        }
      } else if (data.role === 'admin') {
        router.push('/admin');
      } else if (data.role === 'dealer') {
        router.push('/dealer/dashboard');
      } else {
        router.push('/listings');
      }
      router.refresh();
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

          {/* Left panel — branding */}
          <div className={styles.panel}>
            <div className={styles.panelInner}>
              <div className={styles.panelLogo}>TauraNesu</div>
              <h2 className={styles.panelHeading}>
                {isDealerPortal ? 'Sign in to your dealer account' : "Zimbabwe's premium car marketplace"}
              </h2>
              <ul className={styles.panelList}>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Manage your listings in one place
                </li>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Track enquiries and favourites
                </li>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Dealer tools & analytics
                </li>
              </ul>
            </div>
            <div className={styles.panelDecor} aria-hidden />
          </div>

          {/* Right panel — form */}
          <div className={styles.formSide}>
            <div className={styles.card}>
              <h1 className={styles.title}>{isDealerPortal ? 'Dealer sign in' : 'Sign in'}</h1>
              <p className={styles.sub}>
                Don't have an account?{' '}
                <Link href="/signup" className={styles.link}>Create one free</Link>
              </p>

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

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="password">Password</label>
                    <a href="#" className={styles.forgotLink} tabIndex={-1}>Forgot password?</a>
                  </div>
                  <div className={styles.passwordWrap}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(''); }}
                      className={styles.input}
                      placeholder="••••••••"
                      autoComplete="current-password"
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

                {error && (
                  <div className={styles.errorBox}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? (
                    <span className={styles.spinner} aria-hidden />
                  ) : null}
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>

              </form>

              {!isDealerPortal && (
                <>
                  <div className={styles.divider}><span>or continue as</span></div>
                  <div className={styles.altLinks}>
                    <Link href="/login?portal=dealer" className={styles.altBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      Dealer Portal
                    </Link>
                  </div>
                </>
              )}

            </div>
          </div>

        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary, or `next build` fails
  // with "useSearchParams() should be wrapped in a suspense boundary" —
  // the same class of bug as the middleware fix above: code that's valid
  // in dev but breaks the production build. Wrapping here keeps that
  // failure from ever reaching Vercel.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
