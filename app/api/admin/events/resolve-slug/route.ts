import { NextRequest, NextResponse } from 'next/server';
import { resolveFriendlyEventId } from '@/lib/utils/friendly-urls';

/**
 * 🌐 RESOLVE FRIENDLY EVENT URL API
 * Resolves friendly event identifier to UUID for client-side routing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('slug'); // Keep 'slug' for compatibility

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier parameter is required' },
        { status: 400 }
      );
    }

    const eventId = await resolveFriendlyEventId(identifier);

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event not found for identifier: ' + identifier },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      eventId,
      identifier,
      resolved: true 
    });

  } catch (error) {
    console.error('Error resolving friendly event identifier:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}