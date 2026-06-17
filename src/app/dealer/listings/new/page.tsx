'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from './new.module.css';

/* ── Constants (must match API validation) ── */
const BODY_TYPES = ['suv', 'sedan', 'hatchback', 'pickup', 'minivan'] as const;
const TRANSMISSIONS = ['automatic', 'manual'] as const;
const FUEL_TYPES = ['petrol', 'diesel'] as const;
const CONDITIONS = ['excellent', 'good', 'fair'] as const;
const DRIVES = ['rhd', 'lhd'] as const;

const LABEL: Record<string, string> = {
  suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback', pickup: 'Pickup', minivan: 'Minivan',
  automatic: 'Automatic', manual: 'Manual',
  petrol: 'Petrol', diesel: 'Diesel',
  excellent: 'Excellent', good: 'Good', fair: 'Fair',
  rhd: 'RHD (Right-hand drive)', lhd: 'LHD (Left-hand drive)',
};

type Step = 'details' | 'images' | 'publish';

interface FormData {
  make: string; model: string; year: string; price_usd: string;
  mileage_km: string; body_type: string; transmission: string;
  fuel_type: string; colour: string; condition: string; drive: string;
  description: string; vin: string; is_special: boolean;
}

const EMPTY: FormData = {
  make: '', model: '', year: '', price_usd: '', mileage_km: '',
  body_type: '', transmission: '', fuel_type: '', colour: '',
  condition: '', drive: '', description: '', vin: '', is_special: false,
};

interface UploadedImage { id: string; image_url: string; display_order: number; }

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData & { general: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  // After step 1
  const [listingId, setListingId] = useState<string | null>(null);

  // Image state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  /* ── Field change ── */
  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  /* ── Step 1: Validate & create draft ── */
  function validateDetails(): boolean {
    const e: Partial<FormData & { general: string }> = {};
    const currentYear = new Date().getFullYear();
    if (!form.make.trim()) e.make = 'Required';
    if (!form.model.trim()) e.model = 'Required';
    const yr = parseInt(form.year);
    if (!form.year || isNaN(yr) || yr < 1990 || yr > currentYear)
      e.year = `Enter a year between 1990 and ${currentYear}`;
    const price = parseFloat(form.price_usd);
    if (!form.price_usd || isNaN(price) || price <= 0) e.price_usd = 'Enter a valid price';
    const mileage = parseInt(form.mileage_km);
    if (!form.mileage_km || isNaN(mileage) || mileage < 0) e.mileage_km = 'Enter a valid mileage';
    if (!form.body_type) e.body_type = 'Required';
    if (!form.transmission) e.transmission = 'Required';
    if (!form.fuel_type) e.fuel_type = 'Required';
    if (!form.colour.trim()) e.colour = 'Required';
    if (!form.condition) e.condition = 'Required';
    if (!form.drive) e.drive = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateDraft() {
    if (!validateDetails()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch('/api/dealer/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: form.make.trim(),
          model: form.model.trim(),
          year: parseInt(form.year),
          price_usd: parseFloat(form.price_usd),
          mileage_km: parseInt(form.mileage_km),
          body_type: form.body_type,
          transmission: form.transmission,
          fuel_type: form.fuel_type,
          colour: form.colour.trim(),
          condition: form.condition,
          drive: form.drive,
          description: form.description.trim() || null,
          vin: form.vin.trim() || null,
          is_special: form.is_special,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(data.error || 'Failed to create listing');
      }
      setListingId(data.id);
      setStep('images');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step 2: Image handling ── */
  const handleFilePick = useCallback((files: FileList | null) => {
    if (!files) return;
    setUploadError('');
    const arr = Array.from(files);
    const valid: File[] = [];
    const previews: string[] = [];
    for (const f of arr) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setUploadError('Only JPEG, PNG, and WebP images are allowed.'); return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setUploadError('Each image must be under 5MB.'); return;
      }
      valid.push(f);
      previews.push(URL.createObjectURL(f));
    }
    if (imageFiles.length + valid.length > 20) {
      setUploadError('Maximum 20 images per listing.'); return;
    }
    setImageFiles(prev => [...prev, ...valid]);
    setImagePreviews(prev => [...prev, ...previews]);
  }, [imageFiles]);

  function removeFile(index: number) {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleUploadImages() {
    if (!listingId || imageFiles.length === 0) { setStep('publish'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      imageFiles.forEach(f => fd.append('images', f));
      const res = await fetch(`/api/dealer/listings/${listingId}/images`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedImages(data.images || []);
      setStep('publish');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  /* ── Step 3: Publish ── */
  async function handlePublish() {
    if (!listingId) return;
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`/api/dealer/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      router.push('/dealer/dashboard');
    } catch (e: unknown) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveDraft() {
    router.push('/dealer/dashboard');
  }

  /* ── Progress indicator ── */
  const STEPS: Step[] = ['details', 'images', 'publish'];
  const STEP_LABELS = ['Details', 'Photos', 'Publish'];
  const stepIndex = STEPS.indexOf(step);

  return (
    <>
      <Navbar />
      <main className={styles.root}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInner}>
            <div>
              <Link href="/dealer/dashboard" className={styles.backLink}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Dashboard
              </Link>
              <h1 className={styles.heading}>New Listing</h1>
            </div>
            <div className={styles.stepBar}>
              {STEPS.map((s, i) => (
                <div key={s} className={styles.stepItem}>
                  <div className={`${styles.stepDot} ${i < stepIndex ? styles.stepDone : ''} ${i === stepIndex ? styles.stepActive : ''}`}>
                    {i < stepIndex ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span className={`${styles.stepLabel} ${i === stepIndex ? styles.stepLabelActive : ''}`}>{STEP_LABELS[i]}</span>
                  {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < stepIndex ? styles.stepLineDone : ''}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.body}>

          {/* ── STEP 1: Details ── */}
          {step === 'details' && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Vehicle Details</h2>

              {errors.general && (
                <div className={styles.errorBanner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.general}
                </div>
              )}

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Make <span className={styles.req}>*</span></label>
                  <input className={`${styles.input} ${errors.make ? styles.inputError : ''}`} value={form.make}
                    onChange={e => set('make', e.target.value)} placeholder="e.g. Toyota" />
                  {errors.make && <span className={styles.fieldError}>{errors.make}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Model <span className={styles.req}>*</span></label>
                  <input className={`${styles.input} ${errors.model ? styles.inputError : ''}`} value={form.model}
                    onChange={e => set('model', e.target.value)} placeholder="e.g. Land Cruiser" />
                  {errors.model && <span className={styles.fieldError}>{errors.model}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Year <span className={styles.req}>*</span></label>
                  <input className={`${styles.input} ${errors.year ? styles.inputError : ''}`} value={form.year} type="number"
                    onChange={e => set('year', e.target.value)} placeholder={`e.g. ${new Date().getFullYear() - 2}`} min="1990" max={new Date().getFullYear()} />
                  {errors.year && <span className={styles.fieldError}>{errors.year}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Colour <span className={styles.req}>*</span></label>
                  <input className={`${styles.input} ${errors.colour ? styles.inputError : ''}`} value={form.colour}
                    onChange={e => set('colour', e.target.value)} placeholder="e.g. Pearl White" />
                  {errors.colour && <span className={styles.fieldError}>{errors.colour}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Price (USD) <span className={styles.req}>*</span></label>
                  <div className={styles.inputPrefix}>
                    <span className={styles.prefix}>$</span>
                    <input className={`${styles.input} ${styles.inputWithPrefix} ${errors.price_usd ? styles.inputError : ''}`}
                      value={form.price_usd} type="number" min="0"
                      onChange={e => set('price_usd', e.target.value)} placeholder="e.g. 18500" />
                  </div>
                  {errors.price_usd && <span className={styles.fieldError}>{errors.price_usd}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mileage (km) <span className={styles.req}>*</span></label>
                  <input className={`${styles.input} ${errors.mileage_km ? styles.inputError : ''}`} value={form.mileage_km} type="number" min="0"
                    onChange={e => set('mileage_km', e.target.value)} placeholder="e.g. 72000" />
                  {errors.mileage_km && <span className={styles.fieldError}>{errors.mileage_km}</span>}
                </div>
              </div>

              {/* Enum selects */}
              <div className={styles.grid3}>
                <div className={styles.field}>
                  <label className={styles.label}>Body Type <span className={styles.req}>*</span></label>
                  <div className={styles.chipGroup}>
                    {BODY_TYPES.map(v => (
                      <button key={v} type="button"
                        className={`${styles.chip} ${form.body_type === v ? styles.chipActive : ''}`}
                        onClick={() => set('body_type', v)}>{LABEL[v]}</button>
                    ))}
                  </div>
                  {errors.body_type && <span className={styles.fieldError}>{errors.body_type}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Transmission <span className={styles.req}>*</span></label>
                  <div className={styles.chipGroup}>
                    {TRANSMISSIONS.map(v => (
                      <button key={v} type="button"
                        className={`${styles.chip} ${form.transmission === v ? styles.chipActive : ''}`}
                        onClick={() => set('transmission', v)}>{LABEL[v]}</button>
                    ))}
                  </div>
                  {errors.transmission && <span className={styles.fieldError}>{errors.transmission}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Fuel Type <span className={styles.req}>*</span></label>
                  <div className={styles.chipGroup}>
                    {FUEL_TYPES.map(v => (
                      <button key={v} type="button"
                        className={`${styles.chip} ${form.fuel_type === v ? styles.chipActive : ''}`}
                        onClick={() => set('fuel_type', v)}>{LABEL[v]}</button>
                    ))}
                  </div>
                  {errors.fuel_type && <span className={styles.fieldError}>{errors.fuel_type}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Condition <span className={styles.req}>*</span></label>
                  <div className={styles.chipGroup}>
                    {CONDITIONS.map(v => (
                      <button key={v} type="button"
                        className={`${styles.chip} ${form.condition === v ? styles.chipActive : ''}`}
                        onClick={() => set('condition', v)}>{LABEL[v]}</button>
                    ))}
                  </div>
                  {errors.condition && <span className={styles.fieldError}>{errors.condition}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Drive <span className={styles.req}>*</span></label>
                  <div className={styles.chipGroup}>
                    {DRIVES.map(v => (
                      <button key={v} type="button"
                        className={`${styles.chip} ${form.drive === v ? styles.chipActive : ''}`}
                        onClick={() => set('drive', v)}>{LABEL[v]}</button>
                    ))}
                  </div>
                  {errors.drive && <span className={styles.fieldError}>{errors.drive}</span>}
                </div>
              </div>

              {/* Optional fields */}
              <div className={styles.field}>
                <label className={styles.label}>Description <span className={styles.optional}>(optional)</span></label>
                <textarea className={styles.textarea} value={form.description} rows={4}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Highlight the car's condition, service history, standout features..." />
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>VIN <span className={styles.optional}>(optional)</span></label>
                  <input className={styles.input} value={form.vin}
                    onChange={e => set('vin', e.target.value)} placeholder="Vehicle identification number" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Featured Listing</label>
                  <button type="button"
                    className={`${styles.toggle} ${form.is_special ? styles.toggleOn : ''}`}
                    onClick={() => set('is_special', !form.is_special)}>
                    <span className={styles.toggleThumb} />
                    <span className={styles.toggleLabel}>{form.is_special ? 'Featured' : 'Standard'}</span>
                  </button>
                  <p className={styles.hint}>Featured listings appear with a highlight badge.</p>
                </div>
              </div>

              <div className={styles.actions}>
                <Link href="/dealer/dashboard" className={styles.cancelBtn}>Cancel</Link>
                <button className={styles.primaryBtn} onClick={handleCreateDraft} disabled={submitting}>
                  {submitting ? <><span className={styles.btnSpinner} /> Saving…</> : <>Continue to Photos →</>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Images ── */}
          {step === 'images' && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Upload Photos</h2>
              <p className={styles.sectionSub}>Add up to 20 photos. JPEG, PNG, or WebP — max 5MB each. The first photo will be the cover image.</p>

              {uploadError && (
                <div className={styles.errorBanner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {uploadError}
                </div>
              )}

              {/* Drop zone */}
              <div
                className={`${styles.dropZone} ${imagePreviews.length >= 20 ? styles.dropZoneDisabled : ''}`}
                onClick={() => imagePreviews.length < 20 && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); handleFilePick(e.dataTransfer.files); }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className={styles.dropText}>
                  {imagePreviews.length === 0
                    ? 'Drag & drop photos here, or click to browse'
                    : `${imagePreviews.length} photo${imagePreviews.length !== 1 ? 's' : ''} selected — click to add more`}
                </p>
                <span className={styles.dropSub}>JPEG · PNG · WebP · Max 5MB each</span>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  multiple style={{ display: 'none' }} onChange={e => handleFilePick(e.target.files)} />
              </div>

              {/* Previews */}
              {imagePreviews.length > 0 && (
                <div className={styles.previewGrid}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} className={`${styles.previewItem} ${i === 0 ? styles.previewCover : ''}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Preview ${i + 1}`} className={styles.previewImg} />
                      {i === 0 && <span className={styles.coverBadge}>Cover</span>}
                      <button className={styles.removeBtn} onClick={() => removeFile(i)} title="Remove">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.actions}>
                <button className={styles.skipBtn} onClick={() => setStep('publish')} disabled={uploading}>
                  Skip for now
                </button>
                <button className={styles.primaryBtn} onClick={handleUploadImages} disabled={uploading || imageFiles.length === 0}>
                  {uploading
                    ? <><span className={styles.btnSpinner} /> Uploading…</>
                    : imageFiles.length === 0
                      ? 'Skip to Publish →'
                      :
