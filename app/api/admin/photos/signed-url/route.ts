import { NextRequest, NextResponse } from 'next/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
import { SecurityLogger } from '@/lib/middleware/auth.middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';

  try {
    const body = await request.json();
    const { storage_keys } = body;

    if (!Array.isArray(storage_keys) || storage_keys.length === 0) {
      return NextResponse.json(
        { error: 'storage_keys array is required' },
        { status: 400 }
      );
    }

    // Limit batch size for performance
    if (storage_keys.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 storage keys per request' },
        { status: 400 }
      );
    }

    // Generate signed URLs in parallel with error handling
    const urlPromises = storage_keys.map(async (key: string) => {
      try {
        const url = await signedUrlForKey(key, 900); // 15 minutes
        return { key, url, success: true };
      } catch (error) {
        console.warn(`Failed to generate signed URL for key: ${key}`, error);
        return { key, url: null, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(urlPromises);

    SecurityLogger.logSecurityEvent(
      'signed_urls_generated',
      {
        requestId,
        count: results.length,
        successful: results.filter(r => r.success).length,
      },
      'info'
    );

    return NextResponse.json({
      success: true,
      signed_urls: results,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });

  } catch (error: any) {
    SecurityLogger.logSecurityEvent(
      'signed_url_generation_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}