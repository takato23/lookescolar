import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { verifyAuthAdmin } from '@/lib/security/auth';

interface PhotoDetail {
  id: string;
  filename: string;
  originalSizeKB: number;
  optimizedSizeKB: number;
  compressionLevel: number;
  optimizationRatio: number;
  createdAt: string;
  eventId: string;
  eventName: string;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const user = await verifyAuthAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    
    // Get recent photos with optimization data
    const { data: photos, error } = await supabase
      .from('photos')
      .select(`
        id,
        original_filename,
        file_size,
        created_at,
        event_id,
        events (name),
        metadata
      `)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) {
      throw new Error(`Failed to fetch recent photos: ${error.message}`);
    }
    
    // Transform data for frontend
    const photoDetails: PhotoDetail[] = photos.map(photo => {
      const originalSize = photo.metadata?.original_size || (photo.file_size * 4); // Estimate if not available
      const optimizedSize = photo.file_size;
      const optimizationRatio = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
      const compressionLevel = photo.metadata?.compression_level || 3;
      
      return {
        id: photo.id,
        filename: photo.original_filename || `photo-${photo.id}.jpg`,
        originalSizeKB: Math.round(originalSize / 1024),
        optimizedSizeKB: Math.round(optimizedSize / 1024),
        compressionLevel,
        optimizationRatio,
        createdAt: photo.created_at,
        eventId: photo.event_id,
        eventName: (photo.events as any)?.name || 'Unknown Event'
      };
    });
    
    return NextResponse.json(photoDetails);
  } catch (error) {
    console.error('Error fetching recent photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent photos' },
      { status: 500 }
    );
  }
}