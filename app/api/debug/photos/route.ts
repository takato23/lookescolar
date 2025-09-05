import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';
    const includeSignedUrls = searchParams.get('includeSignedUrls') === 'true';

    return NextResponse.json({
      success: true,
      message: 'Debug route working',
      params: {
        eventId,
        page,
        limit,
        includeSignedUrls,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug route failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


