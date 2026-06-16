import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function SellSuccessPage() {
  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        background: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          background: 'var(--navy-2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '56px 48px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(5,150,105,0.15)',
            border: '2px solid var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: '1.75rem',
            fontWeight: 800, color: '#fff', marginBottom: 12,
          }}>Submission Received!</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 32 }}>
            Thanks for submitting your car. Our team will review the details and
            get back to you within 24 hours.
          </p>
          <Link href="/listings" style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'var(--blue)',
            color: '#fff',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}>
            Browse Listings
          </Link>
        </div>
      </main>
    </>
  );
}
