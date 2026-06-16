'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from './signup.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function clearError() { setError(''); }

  function validate(): string | null {
    if (!fullName.trim() || fullName.trim().length < 2) return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed. Please try again.');
        return;
      }

      router.push('/listings');
      router.refresh();
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 && !/[^a-zA-Z0-9]/.test(password) ? 2
    : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthClass = [styles.strengthNone, styles.strengthWeak, styles.strengthFair, styles.strengthStrong][strength];

  return (
    <>
      <Navbar />
      <main className={styles.root}>
        <div className={styles.container}>

          {/* Left brand panel */}
          <div className={styles.panel}>
            <div className={styles.panelInner}>
              <div className={styles.panelLogo}>TauraNesu</div>
              <h2 className={styles.panelHeading}>Join Zimbabwe's premier automotive marketplace</h2>
              <ul className={styles.panelList}>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Save favourite listings
                </li>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Submit your car for valuation
                </li>
                <li className={styles.panelItem}>
                  <span className={styles.panelCheck}>✓</span>
                  Apply for a dealer account
                </li>
              </ul>
            </div>
            <div className={styles.panelDecor} aria-hidden />
          </div>

          {/* Right form side */}
          <div className={styles.formSide}>
            <div className={styles.card}>
              <h1 className={styles.title}>Create an account</h1>
              <p className={styles.sub}>
                Already have one?{' '}
                <Link href="/login" className={styles.link}>Sign in</Link>
              </p>

              <form onSubmit={handleSubmit} noValidate className={styles.form}>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setFullName(e.target.value); clearError(); }}
                    className={styles.input}
                    placeholder="Tendai Moyo"
                    autoComplete="name"
                    autoFocus
                    maxLength={100}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); clearError(); }}
                    className={styles.input}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">Password</label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); clearError(); }}
                      className={styles.input}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
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
                  {password.length > 0 && (
                    <div className={styles.strengthRow}>
                      <div className={styles.strengthBar}>
                        <div className={`${styles.strengthFill} ${strengthClass}`} />
                      </div>
                      <span className={`${styles.strengthText} ${strengthClass}`}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="confirm">Confirm Password</label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => { setConfirm(e.target.value); clearError(); }}
                      className={`${styles.input} ${confirm && confirm !== password ? styles.inputError : ''}`}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? (
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
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <p className={styles.terms}>
                  By creating an account you agree to our{' '}
                  <a href="#" className={styles.termsLink}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className={styles.termsLink}>Privacy Policy</a>.
                </p>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading && <span className={styles.spinner} aria-hidden />}
                  {loading ? 'Creating account…' : 'Create account'}
                </button>

              </form>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
