import { NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { photo_ids, event_id } = await request.json();

    if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs de fotos requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Bulk approve photos
    const { data: updatedPhotos, error } = await supabase
      .from('photos')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .in('id', photo_ids)
      .eq('event_id', event_id) // Security: only update photos from this event
      .select('id, original_filename, approved');

    if (error) {
      console.error('Error approving photos:', error);
      return NextResponse.json(
        { error: 'Error aprobando fotos' },
        { status: 500 }
      );
    }

    // Log successful approval
    console.log(`✅ Approved ${updatedPhotos?.length || 0} photos for event ${event_id}`);

    return NextResponse.json({
      success: true,
      approved_count: updatedPhotos?.length || 0,
      photos: updatedPhotos,
      message: `${updatedPhotos?.length || 0} fotos aprobadas exitosamente`,
    });

  } catch (error) {
    console.error('API Error in bulk approve:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}