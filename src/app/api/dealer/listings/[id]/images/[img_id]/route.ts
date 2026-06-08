import { NextRequest, NextResponse } from 'next/server';
import { getDealerFromRequest } from '@/lib/dealer-auth';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase';

const BUCKET_NAME = 'listings-images';

/**
 * DELETE /api/dealer/listings/[id]/images/[img_id]
 * Delete an image from a dealer listing.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; img_id: string } }
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
    const imageId = params.img_id;

    // Step 2: Verify listing belongs to this dealer
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

    // Step 3: Fetch the image row
    const { data: image, error: imageError } = await supabase
      .from('listing_images')
      .select('id, image_url, display_order')
      .eq('id', imageId)
      .eq('listing_id', listingId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Step 4: Delete the file from Supabase Storage
    const storagePath = extractStoragePath(image.image_url);
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient();
    const { error: deleteStorageError } = await adminClient.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (deleteStorageError) {
      return NextResponse.json(
        { error: 'Failed to delete image from storage' },
        { status: 500 }
      );
    }

    // Step 5: Delete the row from listing_images
    const { error: deleteRowError } = await supabase
      .from('listing_images')
      .delete()
      .eq('id', imageId);

    if (deleteRowError) {
      return NextResponse.json(
        { error: 'Failed to delete image record' },
        { status: 500 }
      );
    }

    // Step 7: If deleted image was primary, update primary_image_url
    if (listing.primary_image_url === image.image_url) {
      // Find the remaining image with the lowest display_order
      const { data: nextImage } = await supabase
        .from('listing_images')
        .select('image_url')
        .eq('listing_id', listingId)
        .order('display_order', { ascending: true })
        .limit(1);

      const newPrimaryUrl = nextImage && nextImage.length > 0 ? nextImage[0].image_url : null;

      const { error: updateError } = await supabase
        .from('listings')
        .update({ primary_image_url: newPrimaryUrl })
        .eq('id', listingId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update primary image' },
          { status: 500 }
        );
      }
    }

    // Step 8: Return success
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Image delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract the storage path from a Supabase public URL.
 * Supabase URLs have the format: https://<project-id>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function extractStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    
    // Find the index of 'public' and extract everything after it
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex === -1 || publicIndex >= pathParts.length - 1) {
      return null;
    }

    // Skip 'public' and the bucket name, get the rest as the storage path
    const storagePath = pathParts.slice(publicIndex + 2).join('/');
    return storagePath || null;
  } catch {
    return null;
  }
}
