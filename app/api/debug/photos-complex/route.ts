import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const GET = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const requestId = crypto.randomUUID();
  let eventId: string | undefined;

  try {
    const resolvedParams = await params;
    eventId = resolvedParams.id;
    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50'),
      100
    );
    const includeSignedUrls = url.searchParams.get('includeSignedUrls') === 'true';

    logger.info('Fetching photos for event folder', {
      requestId,
      eventId,
      folderId: folderId || 'root',
      page,
      limit,
      includeSignedUrls,
    });

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Validate that the event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({
        success: true,
        photos: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
        folder: folderId ? { id: folderId } : null,
      });
    }

    // Simple query for photos without folder logic
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId)
      .range((page - 1) * limit, page * limit - 1);

    if (photosError) {
      logger.error('Failed to fetch photos', {
        requestId,
        eventId,
        error: photosError.message,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photos: photos || [],
      pagination: {
        page,
        limit,
        total: photos?.length || 0,
        totalPages: Math.ceil((photos?.length || 0) / limit),
        hasMore: (photos?.length || 0) >= limit,
      },
      folder: folderId ? { id: folderId } : null,
    });

  } catch (error) {
    logger.error('Photos API error', {
      requestId,
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});


