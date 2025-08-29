import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  SecurityLogger,
  generateRequestId,
} from '@/lib/middleware/auth.middleware';
import { z } from 'zod';

const batchSignedUrlsSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate input
    const validation = batchSignedUrlsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid photo IDs',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { photoIds } = validation.data;

    const supabase = await createServerSupabaseServiceClient();

    // Fetch photo paths
    const { data: photos, error: fetchError } = await supabase
      .from('photos')
      .select('id, preview_path, storage_path')
      .in('id', photoIds);

    if (fetchError) {
      console.error('Error fetching photos:', fetchError);
      throw fetchError;
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        success: true,
        signedUrls: {},
      });
    }

    // Generate signed URLs for each photo
    const signedUrls: Record<string, string> = {};
    const expiresIn = 3600; // 1 hour

    for (const photo of photos) {
      const path = photo.preview_path || photo.storage_path;

      if (!path) continue;

      try {
        const { data: signedUrl, error: signError } = await supabase.storage
          .from('photos')
          .createSignedUrl(path, expiresIn);

        if (!signError && signedUrl) {
          signedUrls[photo.id] = signedUrl.signedUrl;
        } else {
          console.error(
            `Error creating signed URL for photo ${photo.id}:`,
            signError
          );
        }
      } catch (error) {
        console.error(`Error processing photo ${photo.id}:`, error);
      }
    }

    SecurityLogger.logSecurityEvent(
      'batch_signed_urls_generated',
      {
        requestId,
        count: Object.keys(signedUrls).length,
        totalRequested: photoIds.length,
      },
      'info'
    );

    return NextResponse.json(
      {
        success: true,
        signedUrls,
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    console.error('Error in batch signed URLs:', error);

    SecurityLogger.logSecurityEvent(
      'batch_signed_urls_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Error generating signed URLs',
      },
      { status: 500 }
    );
  }
}
