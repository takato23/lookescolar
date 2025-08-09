import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// POST - Asignar fotos a un evento
export async function POST(request: NextRequest) {
  try {
    const { photoIds, eventId } = await request.json();

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren IDs de fotos' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Se requiere ID del evento' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    // Verificar que el evento existe
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar las fotos con el event_id
    const { data: updatedPhotos, error: updateError } = await supabase
      .from('photos')
      .update({ event_id: eventId })
      .in('id', photoIds)
      .select();

    if (updateError) {
      throw updateError;
    }

    logger.info('Fotos asignadas a evento', {
      eventId,
      eventName: event.name,
      photoCount: updatedPhotos?.length || 0,
      photoIds,
    });

    return NextResponse.json({
      success: true,
      message: `${updatedPhotos?.length || 0} fotos asignadas al evento "${event.name}"`,
      updated: updatedPhotos?.length || 0,
      eventId,
      eventName: event.name,
    });
  } catch (error) {
    logger.error('Error asignando fotos a evento', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
}

// GET - Obtener fotos sin evento para asignar
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Obtener fotos sin evento
    const { data: unassignedPhotos, error: photosError } = await supabase
      .from('photos')
      .select('id, original_filename, preview_path, created_at')
      .is('event_id', null)
      .order('created_at', { ascending: false });

    if (photosError) {
      throw photosError;
    }

    // Obtener eventos disponibles
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, date')
      .order('created_at', { ascending: false });

    if (eventsError) {
      throw eventsError;
    }

    return NextResponse.json({
      success: true,
      unassignedPhotos: unassignedPhotos || [],
      events: events || [],
      totalUnassigned: unassignedPhotos?.length || 0,
    });
  } catch (error) {
    logger.error('Error obteniendo datos para asignación', error);
    return NextResponse.json(
      { error: 'Error obteniendo datos' },
      { status: 500 }
    );
  }
}
