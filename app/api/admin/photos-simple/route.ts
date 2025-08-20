import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔧 ULTRA-SIMPLE PHOTOS ENDPOINT');
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 10); // MAX 10 photos
    
    console.log('🔧 Ultra-simple query with limit:', limit);

    // Use service client - minimal query
    const supabase = await createServerSupabaseServiceClient();
    
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, original_filename, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    console.log('🔧 Query result:', { photosCount: photos?.length, error: error?.message });

    if (error) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    // Ultra-minimal processing
    const processedPhotos = (photos || []).map(photo => ({
      id: photo.id,
      filename: photo.original_filename || 'unknown.jpg',
      created_at: photo.created_at
    }));

    console.log('🔧 SUCCESS - Returning', processedPhotos.length, 'photos');

    return NextResponse.json({
      success: true,
      photos: processedPhotos,
      count: processedPhotos.length,
      _debug: {
        endpoint: 'ultra-simple',
        memory_minimal: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('🔧 ULTRA-SIMPLE ENDPOINT ERROR:', error);
    return NextResponse.json(
      { error: 'Ultra-simple endpoint error', message: error.message },
      { status: 500 }
    );
  }
}