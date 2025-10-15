import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 });
    const body = await request.json();
    const {
      name,
      description,
      min_photos,
      max_photos,
      allows_duplicates,
      pricing_type,
      base_price,
      price_per_photo,
      image_url,
      badge_text,
      badge_color,
      is_featured,
      is_active,
      items,
    } = body || {};

    const fields: Record<string, any> = {};
    const set = (k: string, v: any) => { if (v !== undefined) fields[k] = v; };
    set('name', name);
    set('description', description);
    set('min_photos', min_photos);
    set('max_photos', max_photos);
    set('allows_duplicates', allows_duplicates);
    set('pricing_type', pricing_type);
    set('base_price', base_price);
    set('price_per_photo', price_per_photo);
    set('image_url', image_url);
    set('badge_text', badge_text);
    set('badge_color', badge_color);
    set('is_featured', is_featured);
    set('is_active', is_active);

    const supabase = await createServerSupabaseServiceClient();
    if (Object.keys(fields).length > 0) {
      const { error } = await supabase
        .from('combo_packages')
        .update(fields)
        .eq('id', id);
      if (error) return NextResponse.json({ success: false, error: 'Error actualizando combo' }, { status: 500 });
    }

    // Replace items if provided
    if (Array.isArray(items)) {
      await supabase.from('combo_package_items').delete().eq('combo_id', id);
      if (items.length > 0) {
        const rows = items.map((it: any) => ({
          combo_id: id,
          product_id: it.product_id,
          quantity: it.quantity ?? 1,
          is_required: it.is_required ?? true,
          additional_price: it.additional_price ?? 0,
        }));
        await supabase.from('combo_package_items').insert(rows);
      }
    }

    const { data, error } = await supabase
      .from('combo_packages')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ success: false, error: 'Combo no encontrado' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

