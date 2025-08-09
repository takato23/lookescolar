import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV !== 'development') {
      // TODO: Verificar autenticación en producción
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { photo_id, subject_id } = body;

    if (!photo_id || !subject_id) {
      return NextResponse.json(
        { error: 'Photo ID y Subject ID son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verificar si ya existe la relación
    const { data: existing } = await supabase
      .from('photo_subjects')
      .select('id')
      .eq('photo_id', photo_id)
      .eq('subject_id', subject_id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'La foto ya está asignada a este estudiante',
      });
    }

    // Crear la relación
    const { data, error } = await supabase
      .from('photo_subjects')
      .insert({
        photo_id,
        subject_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error asignando foto:', error);
      return NextResponse.json(
        { error: 'Error al asignar la foto' },
        { status: 500 }
      );
    }

    // Actualizar el estado tagged de la foto
    await supabase.from('photos').update({ tagged: true }).eq('id', photo_id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error en tagging API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // En desarrollo, no verificar autenticación
    if (process.env.NODE_ENV !== 'development') {
      // TODO: Verificar autenticación en producción
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { photo_id, subject_id } = body;

    if (!photo_id || !subject_id) {
      return NextResponse.json(
        { error: 'Photo ID y Subject ID son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Eliminar la relación
    const { error } = await supabase
      .from('photo_subjects')
      .delete()
      .eq('photo_id', photo_id)
      .eq('subject_id', subject_id);

    if (error) {
      console.error('Error eliminando asignación:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la asignación' },
        { status: 500 }
      );
    }

    // Verificar si la foto tiene otras asignaciones
    const { data: otherAssignments } = await supabase
      .from('photo_subjects')
      .select('id')
      .eq('photo_id', photo_id);

    // Si no hay más asignaciones, marcar la foto como no etiquetada
    if (!otherAssignments || otherAssignments.length === 0) {
      await supabase
        .from('photos')
        .update({ tagged: false })
        .eq('id', photo_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Asignación eliminada correctamente',
    });
  } catch (error) {
    console.error('Error en tagging API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
