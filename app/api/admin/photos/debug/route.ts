import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug endpoint started');
    
    // Test basic response
    const start = Date.now();
    
    // Simulate some basic data
    const mockPhotos = [
      { id: '1', name: 'test1.jpg', created_at: new Date().toISOString() },
      { id: '2', name: 'test2.jpg', created_at: new Date().toISOString() }
    ];
    
    const duration = Date.now() - start;
    console.log(`Debug endpoint completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      photos: mockPhotos,
      count: mockPhotos.length,
      performance: { duration_ms: duration }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed' },
      { status: 500 }
    );
  }
}