'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import styles from './sell.module.css';

const MAKES = [
  'Toyota','Honda','BMW','Mercedes-Benz','Audi','Volkswagen',
  'Mazda','Nissan','Hyundai','Ford','Isuzu','Mitsubishi',
  'Subaru','Land Rover','Jeep','Peugeot','Renault','Kia','Other',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i);

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1 — Car details
  make: string;
  model: string;
  year: string;
  mileage_km: string;
  transmission: string;
  fuel_type: string;
  colour: string;
  condition: string;
  intent: string;
  known_issues: string;
  // Step 2 — Pricing & description (asking_price optional, description maps to additional_notes)
  asking_price: string;
  additional_notes: string;
  // Step 3 — Contact
  seller_name: string;
  seller_phone: string;
  seller_whatsapp: string;
  seller_city: string;
}

const EMPTY: FormData = {
  make: '', model: '', year: '', mileage_km: '',
  transmission: '', fuel_type: '', colour: '', condition: '',
  intent: 'sell', known_issues: '',
  asking_price: '', additional_notes: '',
  seller_name: '', seller_phone: '', seller_whatsapp: '', seller_city: '',
};

function validate(data: FormData, step: Step): string | null {
  if (step === 1) {
    if (!data.make) return 'Please select a make.';
    if (!data.model.trim()) return 'Please enter the model.';
    if (!data.year) return 'Please select the year.';
    if (!data.mileage_km || isNaN(Number(data.mileage_km))) return 'Please enter a valid mileage.';
    if (!data.transmission) return 'Please select the transmission.';
    if (!data.fuel_type) return 'Please select the fuel type.';
    if (!data.colour.trim()) return 'Please enter the colour.';
    if (!data.condition) return 'Please select the condition.';
  }
  if (step === 3) {
    if (!data.seller_name.trim()) return 'Please enter your name.';
    if (!data.seller_phone.trim() || data.seller_phone.trim().length < 7) return 'Please enter a valid phone number.';
    if (!data.seller_city.trim()) return 'Please enter your city.';
  }
  return null;
}

export default function SellPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  function next(e: FormEvent) {
    e.preventDefault();
    const err = validate(form, step);
    if (err) { setError(err); return; }
    setStep(s => (s + 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setStep(s => (s - 1) as Step);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validate(form, 3);
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');

    try {
      const payload = {
        make: form.make,
        model: form.model.trim(),
        year: parseInt(form.year),
        mileage_km: parseInt(form.mileage_km),
        transmission: form.transmission,
        fuel_type: form.fuel_type,
        colour: form.colour.trim(),
        condition: form.condition,
        intent: form.intent,
        known_issues: form.known_issues.trim() || null,
        seller_name: form.seller_name.trim(),
        seller_phone: form.seller_phone.trim(),
        seller_whatsapp: form.seller_whatsapp.trim() || form.seller_phone.trim(),
        seller_city: form.seller_city.trim(),
        additional_notes: form.additional_notes.trim() || null,
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      router.push('/sell/success');
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ['Car Details', 'Pricing & Notes', 'Your Contact'];

  return (
    <>
      <Navbar />
      <main className={styles.root}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>Sell Your Car</h1>
            <p className={styles.heroSub}>
              Fill in the details below and our team will get back to you within 24 hours.
            </p>
          </div>
        </div>

        <div className={styles.container}>

          {/* Progress */}
          <div className={styles.progress}>
            {stepLabels.map((label, i) => {
              const n = (i + 1) as Step;
              const active = step === n;
              const done = step > n;
              return (
                <div key={n} className={styles.progressItem}>
                  <div className={`${styles.progressDot} ${done ? styles.done : ''} ${active ? styles.active : ''}`}>
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : n}
                  </div>
                  <span className={`${styles.progressLabel} ${active ? styles.progressLabelActive : ''}`}>{label}</span>
                  {i < stepLabels.length - 1 && <div className={`${styles.progressLine} ${done ? styles.progressLineDone : ''}`} />}
                </div>
              );
            })}
          </div>

          {/* Form card */}
          <div className={styles.card}>

            {/* ── STEP 1: Car Details ── */}
            {step === 1 && (
              <form onSubmit={next} noValidate>
                <h2 className={styles.sectionTitle}>Car Details</h2>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="make">Make <span className={styles.req}>*</span></label>
                    <select id="make" name="make" value={form.make} onChange={update} className={styles.select}>
                      <option value="">Select make</option>
                      {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="model">Model <span className={styles.req}>*</span></label>
                    <input id="model" name="model" value={form.model} onChange={update}
                      className={styles.input} placeholder="e.g. Corolla, Hilux" maxLength={100} />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="year">Year <span className={styles.req}>*</span></label>
                    <select id="year" name="year" value={form.year} onChange={update} className={styles.select}>
                      <option value="">Select year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="mileage_km">Mileage (km) <span className={styles.req}>*</span></label>
                    <input id="mileage_km" name="mileage_km" type="number" value={form.mileage_km} onChange={update}
                      className={styles.input} placeholder="e.g. 85000" min={0} max={2000000} />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Transmission <span className={styles.req}>*</span></label>
                    <div className={styles.chipGroup}>
                      {['automatic', 'manual'].map(v => (
                        <label key={v} className={`${styles.chip} ${form.transmission === v ? styles.chipActive : ''}`}>
                          <input type="radio" name="transmission" value={v} checked={form.transmission === v}
                            onChange={update} className={styles.srOnly} />
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Fuel Type <span className={styles.req}>*</span></label>
                    <div className={styles.chipGroup}>
                      {['petrol', 'diesel'].map(v => (
                        <label key={v} className={`${styles.chip} ${form.fuel_type === v ? styles.chipActive : ''}`}>
                          <input type="radio" name="fuel_type" value={v} checked={form.fuel_type === v}
                            onChange={update} className={styles.srOnly} />
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="colour">Colour <span className={styles.req}>*</span></label>
                    <input id="colour" name="colour" value={form.colour} onChange={update}
                      className={styles.input} placeholder="e.g. Silver, White" maxLength={50} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Condition <span className={styles.req}>*</span></label>
                    <div className={styles.chipGroup}>
                      {['excellent', 'good', 'fair', 'poor'].map(v => (
                        <label key={v} className={`${styles.chip} ${form.condition === v ? styles.chipActive : ''}`}>
                          <input type="radio" name="condition" value={v} checked={form.condition === v}
                            onChange={update} className={styles.srOnly} />
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>What would you like to do? <span className={styles.req}>*</span></label>
                  <div className={styles.chipGroup}>
                    {[
                      { value: 'sell', label: 'Sell it' },
                      { value: 'trade_in', label: 'Trade in' },
                      { value: 'either', label: 'Either' },
                    ].map(o => (
                      <label key={o.value} className={`${styles.chip} ${form.intent === o.value ? styles.chipActive : ''}`}>
                        <input type="radio" name="intent" value={o.value} checked={form.intent === o.value}
                          onChange={update} className={styles.srOnly} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="known_issues">Known Issues <span className={styles.opt}>(optional)</span></label>
                  <textarea id="known_issues" name="known_issues" value={form.known_issues} onChange={update}
                    className={styles.textarea} placeholder="Any mechanical issues, accident history, body damage…"
                    rows={3} maxLength={1000} />
                </div>

                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.actions}>
                  <button type="submit" className={styles.nextBtn}>Next: Pricing & Notes →</button>
                </div>
              </form>
            )}

            {/* ── STEP 2: Pricing & Notes ── */}
            {step === 2 && (
              <form onSubmit={next} noValidate>
                <h2 className={styles.sectionTitle}>Pricing & Notes</h2>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="asking_price">
                    Asking Price (USD) <span className={styles.opt}>(optional)</span>
                  </label>
                  <div className={styles.prefixWrap}>
                    <span className={styles.prefix}>$</span>
                    <input id="asking_price" name="asking_price" type="number" value={form.asking_price}
                      onChange={update} className={`${styles.input} ${styles.inputPrefixed}`}
                      placeholder="e.g. 12500" min={0} />
                  </div>
                  <p className={styles.hint}>Leave blank if you'd like us to suggest a market price.</p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="additional_notes">
                    Additional Notes <span className={styles.opt}>(optional)</span>
                  </label>
                  <textarea id="additional_notes" name="additional_notes" value={form.additional_notes}
                    onChange={update} className={styles.textarea}
                    placeholder="Service history, recent repairs, extras included, reason for selling…"
                    rows={5} maxLength={1000} />
                  <p className={styles.charCount}>{form.additional_notes.length}/1000</p>
                </div>

                <div className={styles.summaryBox}>
                  <h3 className={styles.summaryTitle}>Your car summary</h3>
                  <div className={styles.summaryGrid}>
                    <span className={styles.summaryKey}>Make / Model</span>
                    <span className={styles.summaryVal}>{form.make} {form.model}</span>
                    <span className={styles.summaryKey}>Year</span>
                    <span className={styles.summaryVal}>{form.year}</span>
                    <span className={styles.summaryKey}>Mileage</span>
                    <span className={styles.summaryVal}>{Number(form.mileage_km).toLocaleString()} km</span>
                    <span className={styles.summaryKey}>Transmission</span>
                    <span className={styles.summaryVal}>{form.transmission}</span>
                    <span className={styles.summaryKey}>Fuel</span>
                    <span className={styles.summaryVal}>{form.fuel_type}</span>
                    <span className={styles.summaryKey}>Condition</span>
                    <span className={styles.summaryVal}>{form.condition}</span>
                  </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.actions}>
                  <button type="button" onClick={back} className={styles.backBtn}>← Back</button>
                  <button type="submit" className={styles.nextBtn}>Next: Your Contact →</button>
                </div>
              </form>
            )}

            {/* ── STEP 3: Contact ── */}
            {step === 3 && (
              <form onSubmit={submit} noValidate>
                <h2 className={styles.sectionTitle}>Your Contact Details</h2>
                <p className={styles.stepSub}>We'll use these to reach you about your submission. Not displayed publicly.</p>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="seller_name">Full Name <span className={styles.req}>*</span></label>
                    <input id="seller_name" name="seller_name" value={form.seller_name} onChange={update}
                      className={styles.input} placeholder="Your full name" maxLength={100} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="seller_city">City <span className={styles.req}>*</span></label>
                    <input id="seller_city" name="seller_city" value={form.seller_city} onChange={update}
                      className={styles.input} placeholder="e.g. Harare, Bulawayo" maxLength={100} />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="seller_phone">Phone Number <span className={styles.req}>*</span></label>
                    <input id="seller_phone" name="seller_phone" type="tel" value={form.seller_phone}
                      onChange={update} className={styles.input} placeholder="+263 77 123 4567" maxLength={20} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="seller_whatsapp">
                      WhatsApp Number <span className={styles.opt}>(if different)</span>
                    </label>
                    <input id="seller_whatsapp" name="seller_whatsapp" type="tel" value={form.seller_whatsapp}
                      onChange={update} className={styles.input} placeholder="Leave blank to use phone number" maxLength={20} />
                  </div>
                </div>

                <div className={styles.trustNote}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Your details are only shared with our team — never posted publicly.
                </div>

                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.actions}>
                  <button type="button" onClick={back} className={styles.backBtn}>← Back</button>
                  <button type="submit" className={styles.nextBtn} disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit Listing ✓'}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Bottom trust bar */}
          <div className={styles.trustBar}>
            <div className={styles.trustItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Response within 24 hours</span>
            </div>
            <div className={styles.trustItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Your info stays private</span>
            </div>
            <div className={styles.trustItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Free to list — no fees</span>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
