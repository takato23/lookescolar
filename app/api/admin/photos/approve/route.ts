import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { photoIds, approved } = await request.json();

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren IDs de fotos' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const { data, error } = await supabase
      .from('photos')
      .update({ approved: approved ?? true })
      .in('id', photoIds)
      .select();

    if (error) {
      console.error('Error aprobando fotos:', error);
      return NextResponse.json(
        { error: 'Error aprobando fotos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${data?.length || 0} fotos ${approved ? 'aprobadas' : 'desaprobadas'}`,
      updated: data?.length || 0,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
