import { NextRequest, NextResponse } from 'next/server';
import { resolveFolderId } from '@/lib/utils/slug-resolver';

/**
 * 🏷️ RESOLVE FOLDER SLUG API
 * Resolves folder slug to UUID for client-side routing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const slug = searchParams.get('slug');

    if (!eventId || !slug) {
      return NextResponse.json(
        { error: 'eventId and slug parameters are required' },
        { status: 400 }
      );
    }

    const folderId = await resolveFolderId(eventId, slug);

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      folderId,
      eventId,
      slug,
      resolved: true 
    });

  } catch (error) {
    console.error('Error resolving folder slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}