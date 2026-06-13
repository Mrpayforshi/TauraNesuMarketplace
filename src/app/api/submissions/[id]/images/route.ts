import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ─── Config ────────────────────────────────────────────────────────────────

const BUCKET          = 'submission-images'
const MIN_IMAGES      = 4
const MAX_IMAGES      = 20
const MAX_SIZE_BYTES  = 5 * 1024 * 1024          // 5 MB
const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

function sanitiseFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

// ─── POST /api/submissions/[id]/images ────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params

  if (!/^[0-9a-f-]{36}$/.test(submissionId)) {
    return err('Invalid submission ID')
  }

  const supabase = createServerClient()

  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('id', submissionId)
    .single()

  if (fetchError || !submission) {
    return err('Submission not found', 404)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return err('Expected multipart/form-data')
  }

  const files = formData.getAll('images') as File[]

  if (!files || files.length === 0) {
    return err('No images provided. Upload files under the field name "images"')
  }

  if (files.length < MIN_IMAGES) {
    return err(`Minimum ${MIN_IMAGES} images required. You uploaded ${files.length}.`)
  }

  if (files.length > MAX_IMAGES) {
    return err(`Maximum ${MAX_IMAGES} images allowed. You uploaded ${files.length}.`)
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return err(
        `Invalid file type "${file.type}" for "${file.name}". Only JPEG, PNG, and WebP are allowed.`
      )
    }
    if (file.size > MAX_SIZE_BYTES) {
      return err(
        `File "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 5 MB per image.`
      )
    }
    if (file.size === 0) {
      return err(`File "${file.name}" appears to be empty.`)
    }
  }

  const timestamp = Date.now()
  const uploadedUrls: string[] = []
  const errors: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file   = files[i]
    const safeName = sanitiseFilename(file.name)
    const storagePath = `submissions/${submissionId}/${timestamp}-${i + 1}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType:  file.type,
        cacheControl: '31536000',
        upsert:       false,
      })

    if (uploadError) {
      console.error(`[submissions/images] Storage upload failed for ${safeName}:`, uploadError)
      errors.push(`Failed to upload "${file.name}": ${uploadError.message}`)
      continue
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    uploadedUrls.push(urlData.publicUrl)
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: 'One or more images failed to upload. Please try again.',
        details: errors,
      },
      { status: 500 }
    )
  }

  const imageRows = uploadedUrls.map((url, index) => ({
    submission_id: submissionId,
    image_url:     url,
    display_order: index,
  }))

  const { error: insertError } = await supabase
    .from('submission_images')
    .insert(imageRows)

  if (insertError) {
    console.error('[submissions/images] DB insert failed:', insertError)
    return NextResponse.json(
      { error: 'Images uploaded but failed to save records. Contact support.' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      submission_id: submissionId,
      uploaded:      uploadedUrls.length,
      images:        uploadedUrls,
    },
    { status: 201 }
  )
}
