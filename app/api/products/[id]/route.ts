import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'product id requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const fields: Record<string, any> = {};
    const allowed = [
      'name',
      'description',
      'category_id',
      'type',
      'width_cm',
      'height_cm',
      'finish',
      'paper_quality',
      'base_price',
      'image_url',
      'is_featured',
      'is_active',
      'sort_order',
    ];
    for (const key of allowed) if (key in body) fields[key] = body[key];
    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sin cambios' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();
    const { data, error } = await supabase
      .from('photo_products')
      .update(fields)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error actualizando producto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

