'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from './edit.module.css';
import { authFetch, clearAccessToken } from '@/lib/client-auth';

/* ── Constants ── */
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

interface FormData {
  make: string; model: string; year: string; price_usd: string;
  mileage_km: string; body_type: string; transmission: string;
  fuel_type: string; colour: string; condition: string; drive: string;
  description: string; vin: string; is_special: boolean;
}

interface ExistingImage {
  id: string;
  image_url: string;
  display_order: number;
}

type Tab = 'details' | 'images';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tab, setTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState<FormData>({
    make: '', model: '', year: '', price_usd: '', mileage_km: '',
    body_type: '', transmission: '', fuel_type: '', colour: '',
    condition: '', drive: '', description: '', vin: '', is_special: false,
  });
  const [errors, setErrors] = useState<Partial<FormData & { general: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Existing images
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageError, setImageError] = useState('');

  // New images to upload
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Load listing ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await authFetch(`/api/dealer/listings/${id}`);
        if (res.status === 401) { clearAccessToken(); router.push('/login'); return; }
        if (res.status === 403) { router.push('/dealer/dashboard'); return; }
        if (!res.ok) throw new Error('Listing not found');
        const data = await res.json();
        const l = data.listing ?? data;
        setForm({
          make: l.make ?? '',
          model: l.model ?? '',
          year: String(l.year ?? ''),
          price_usd: String(l.price_usd ?? ''),
          mileage_km: String(l.mileage_km ?? ''),
          body_type: l.body_type ?? '',
          transmission: l.transmission ?? '',
          fuel_type: l.fuel_type ?? '',
          colour: l.colour ?? '',
          condition: l.condition ?? '',
          drive: l.drive ?? '',
          description: l.description ?? '',
          vin: l.vin ?? '',
          is_special: l.is_special ?? false,
        });
        setExistingImages(
          (l.listing_images ?? l.images ?? []).sort(
            (a: ExistingImage, b: ExistingImage) => a.display_order - b.display_order
          )
        );
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  /* ── Field change ── */
  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setSaveSuccess(false);
  }

  /* ── Validate ── */
  function validate(): boolean {
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

  /* ── Save details ── */
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveSuccess(false);
    setErrors({});
    try {
      const res = await authFetch(`/api/dealer/listings/${id}`, {
        method: 'PATCH',
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
        if (res.status === 401) { clearAccessToken(); router.push('/login'); return; }
        throw new Error(data.error || 'Failed to save');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete existing image ── */
  async function handleDeleteImage(imageId: string) {
    setDeletingId(imageId);
    setImageError('');
    try {
      const res = await authFetch(`/api/dealer/listings/${id}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (res.status === 401) { clearAccessToken(); router.push('/login'); return; }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (e: unknown) {
      setImageError(e instanceof Error ? e.message : 'Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  }

  /* ── New image picker ── */
  const handleFilePick = useCallback((files: FileList | null) => {
    if (!files) return;
    setUploadError('');
    const arr = Array.from(files);
    const valid: File[] = [];
    const previews: string[] = [];
    const total = existingImages.length + newFiles.length;
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
    if (total + valid.length > 20) {
      setUploadError('Maximum 20 images per listing.'); return;
    }
    setNewFiles(prev => [...prev, ...valid]);
    setNewPreviews(prev => [...prev, ...previews]);
  }, [existingImages.length, newFiles.length]);

  function removeNewFile(index: number) {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  }

  /* ── Upload new images ── */
  async function handleUpload() {
    if (newFiles.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      newFiles.forEach(f => fd.append('images', f));
      const res = await authFetch(`/api/dealer/listings/${id}/images`, {
        method: 'POST',
        body: fd,
      });
      if (res.status === 401) { clearAccessToken(); router.push('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      // Merge new images in
      const added: ExistingImage[] = data.images ?? [];
      setExistingImages(prev => [...prev, ...added]);
      // Clear pending
      newPreviews.forEach(url => URL.revokeObjectURL(url));
      setNewFiles([]);
      setNewPreviews([]);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <>
        <Navbar />
        <main className={styles.root}>
          <div className={styles.loadingState}>
            <span className={styles.loadingSpinner} />
            <p>Loading listing…</p>
          </div>
        </main>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Navbar />
        <main className={styles.root}>
          <div className={styles.loadingState}>
            <p className={styles.loadErrorText}>{loadError}</p>
            <Link href="/dealer/dashboard" className={styles.primaryBtn}>Back to Dashboard</Link>
          </div>
        </main>
      </>
    );
  }

  const totalImages = existingImages.length + newFiles.length;

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
              <h1 className={styles.heading}>Edit Listing</h1>
              <p className={styles.subheading}>{form.year} {form.make} {form.model}</p>
            </div>

            {/* Tab switcher */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'details' ? styles.tabActive : ''}`}
                onClick={() => setTab('details')}
              >
                Details
              </button>
              <button
                className={`${styles.tab} ${tab === 'images' ? styles.tabActive : ''}`}
                onClick={() => setTab('images')}
              >
                Photos
                {existingImages.length > 0 && (
                  <span className={styles.tabBadge}>{existingImages.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.body}>

          {/* ── DETAILS TAB ── */}
          {tab === 'details' && (
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

              {saveSuccess && (
                <div className={styles.successBanner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Changes saved successfully
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
                    onChange={e => set('year', e.target.value)} placeholder="e.g. 2020" min="1990" max={new Date().getFullYear()} />
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
                <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className={styles.btnSpinner} /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── IMAGES TAB ── */}
          {tab === 'images' && (
            <div className={styles.card}>
              <div className={styles.imageTabHeader}>
                <h2 className={styles.sectionTitle}>Photos</h2>
                <span className={styles.imageCount}>{totalImages} / 20</span>
              </div>

              {imageError && (
                <div className={styles.errorBanner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {imageError}
                </div>
              )}

              {/* Existing images */}
              {existingImages.length > 0 && (
                <div>
                  <p className={styles.imgSectionLabel}>Current Photos</p>
                  <div className={styles.previewGrid}>
                    {existingImages.map((img, i) => (
                      <div key={img.id} className={`${styles.previewItem} ${i === 0 ? styles.previewCover : ''}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.image_url} alt={`Photo ${i + 1}`} className={styles.previewImg} />
                        {i === 0 && <span className={styles.coverBadge}>Cover</span>}
                        <button
                          className={`${styles.removeBtn} ${deletingId === img.id ? styles.removeBtnDeleting : ''}`}
                          onClick={() => handleDeleteImage(img.id)}
                          disabled={deletingId !== null}
                          title="Remove photo"
                        >
                          {deletingId === img.id
                            ? <span className={styles.miniSpinner} />
                            : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingImages.length === 0 && newFiles.length === 0 && (
                <p className={styles.noImages}>No photos yet. Add some below.</p>
              )}

              {/* Add new images */}
              {totalImages < 20 && (
                <div>
                  <p className={styles.imgSectionLabel}>Add More Photos</p>
                  {uploadError && (
                    <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {uploadError}
                    </div>
                  )}
                  <div
                    className={styles.dropZone}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFilePick(e.dataTransfer.files); }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p className={styles.dropText}>
                      {newFiles.length === 0
                        ? 'Drag & drop photos, or click to browse'
                        : `${newFiles.length} new photo${newFiles.length !== 1 ? 's' : ''} staged — click to add more`}
                    </p>
                    <span className={styles.dropSub}>JPEG · PNG · WebP · Max 5MB each</span>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                      multiple style={{ display: 'none' }} onChange={e => handleFilePick(e.target.files)} />
                  </div>

                  {/* New file previews */}
                  {newPreviews.length > 0 && (
                    <div className={styles.previewGrid} style={{ marginTop: '1rem' }}>
                      {newPreviews.map((src, i) => (
                        <div key={i} className={styles.previewItem}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`New ${i + 1}`} className={styles.previewImg} />
                          <span className={styles.newBadge}>New</span>
                          <button className={styles.removeBtn} onClick={() => removeNewFile(i)} title="Remove">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.actions}>
                <Link href="/dealer/dashboard" className={styles.cancelBtn}>Done</Link>
                {newFiles.length > 0 && (
                  <button className={styles.primaryBtn} onClick={handleUpload} disabled={uploading}>
                    {uploading
                      ? <><span className={styles.btnSpinner} /> Uploading…</>
                      : `Upload ${newFiles.length} Photo${newFiles.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
