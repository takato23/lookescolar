import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
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
      items,
    } = body || {};

    if (!name || !pricing_type || base_price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campos requeridos: name, pricing_type, base_price' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const { data: combo, error } = await supabase
      .from('combo_packages')
      .insert({
        name,
        description,
        min_photos: min_photos ?? 1,
        max_photos: max_photos ?? null,
        allows_duplicates: allows_duplicates ?? true,
        pricing_type,
        base_price,
        price_per_photo: price_per_photo ?? null,
        image_url,
        badge_text,
        badge_color,
        is_featured: !!is_featured,
        sort_order: 0,
        is_active: true,
      })
      .select('*')
      .single();

    if (error || !combo) {
      return NextResponse.json(
        { success: false, error: 'Error al crear combo' },
        { status: 500 }
      );
    }

    // Insert items if provided
    if (Array.isArray(items) && items.length > 0) {
      const rows = items.map((it: any) => ({
        combo_id: combo.id,
        product_id: it.product_id,
        quantity: it.quantity ?? 1,
        is_required: it.is_required ?? true,
        additional_price: it.additional_price ?? 0,
      }));
      await supabase.from('combo_package_items').insert(rows);
    }

    return NextResponse.json({ success: true, data: combo });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

