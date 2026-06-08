import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_LISTING = 20;
const BUCKET_NAME = 'listings-images';

interface ImageRow {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

/**
 * POST /api/dealer/listings/[id]/images
 * Upload images for a dealer listing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authenticate dealer
    const dealer = await getDealerFromRequest(request);
    if (!dealer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const listingId = params.id;

    // Step 2: Verify listing exists and belongs to this dealer
    const supabase = createServerSupabaseClient();
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, primary_image_url')
      .eq('id', listingId)
      .eq('dealer_id', dealer.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Step 3: Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    // Extract all files from the 'images' field
    const files = formData.getAll('images') as File[];

    // Step 4: Validate files were provided
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Step 5: Server-side validation for each file
    for (const file of files) {
      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only JPEG, PNG, and WebP images are allowed' },
          { status: 400 }
        );
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Each image must be under 5MB' },
          { status: 400 }
        );
      }
    }

    // Step 6: Check current image count
    const { data: imageData, error: countError } = await supabase
      .from('listing_images')
      .select('id')
      .eq('listing_id', listingId);

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check image count' },
        { status: 500 }
      );
    }

    const currentImageCount = imageData?.length || 0;
    if (currentImageCount + files.length > MAX_IMAGES_PER_LISTING) {
      return NextResponse.json(
        { error: 'Maximum 20 images per listing' },
        { status: 400 }
      );
    }

    // Step 7: Get max display_order for this listing
    const { data: maxOrderData } = await supabase
      .from('listing_images')
      .select('display_order')
      .eq('listing_id', listingId)
      .order('display_order', { ascending: false })
      .limit(1);

    let nextDisplayOrder = 1;
    if (maxOrderData && maxOrderData.length > 0) {
      nextDisplayOrder = (maxOrderData[0].display_order || 0) + 1;
    }

    // Step 8: Upload files to Supabase Storage and collect image rows
    const adminClient = createAdminClient();
    const uploadedImages: ImageRow[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const sanitizedFilename = sanitizeFilename(file.name);
      const storagePath = `${dealer.id}/${listingId}/${timestamp}-${sanitizedFilename}`;

      // Upload file to storage
      const { error: uploadError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Failed to upload image: ${file.name}` },
          { status: 500 }
        );
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

      // Insert row into listing_images
      const { data: imageRow, error: insertError } = await supabase
        .from('listing_images')
        .insert({
          listing_id: listingId,
          image_url: publicUrl,
          display_order: nextDisplayOrder + i,
        })
        .select()
        .single();

      if (insertError || !imageRow) {
        return NextResponse.json(
          { error: `Failed to save image metadata for: ${file.name}` },
          { status: 500 }
        );
      }

      uploadedImages.push(imageRow as ImageRow);
    }

    // Step 9: If this is the first image, update listing's primary_image_url
    if (!listing.primary_image_url && uploadedImages.length > 0) {
      const { error: updateError } = await supabase
        .from('listings')
        .update({ primary_image_url: uploadedImages[0].image_url })
        .eq('id', listingId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to set primary image' },
          { status: 500 }
        );
      }
    }

    // Step 10: Return success response
    return NextResponse.json(
      {
        uploaded: uploadedImages.length,
        images: uploadedImages,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Sanitize filename to prevent path traversal and invalid characters.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 255);
}
