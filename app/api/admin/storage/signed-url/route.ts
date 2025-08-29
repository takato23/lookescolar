import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const signedUrlSchema = z.object({
  photoId: z.string().min(1, 'Photo ID is required'),
  storagePath: z.string().min(1, 'Storage path is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoId, storagePath } = signedUrlSchema.parse(body);

    // Create Supabase client with service role for storage access
    const supabase = await createServerSupabaseServiceClient();

    // Determine bucket based on storage path or use preview bucket by default
    // Preview paths (watermarked) go to 'photos' bucket
    // Original paths go to 'photo-private' bucket
    const bucketName =
      storagePath.includes('watermark') || storagePath.includes('preview')
        ? process.env.STORAGE_BUCKET_PREVIEW || 'photos'
        : process.env.STORAGE_BUCKET_ORIGINAL || 'photo-private';

    console.log(
      `Generating signed URL: photoId=${photoId}, storagePath=${storagePath}, bucket=${bucketName}`
    );

    // Generate signed URL for the photo
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error generating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    if (!data.signedUrl) {
      return NextResponse.json(
        { error: 'No signed URL returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      photoId,
      expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
    });
  } catch (error) {
    console.error('Signed URL API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
