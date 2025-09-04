// Product Catalog API
export const runtime = 'nodejs';
// GET /api/products/catalog - Get complete product catalog

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { ProductCatalog, ProductFilters } from '@/lib/types/products';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');
    const category_id = searchParams.get('category_id');
    const featured_only = searchParams.get('featured_only') === 'true';
    const include_inactive = searchParams.get('include_inactive') === 'true';

    // Build filters from query params
    const filters: ProductFilters = {
      is_active: !include_inactive,
      is_featured: featured_only || undefined,
      category_ids: category_id ? [category_id] : undefined,
    };

    // Fetch product categories
    let categoriesQuery = supabase
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!include_inactive) {
      categoriesQuery = categoriesQuery.eq('is_active', true);
    }

    let categories: any[] | null = null;
    {
      const { data, error } = await categoriesQuery;
      if (error) {
        // Graceful fallback in dev if migration not applied yet
        console.warn('[Products API] Categories unavailable, continuing with empty list:', error.message);
        categories = [];
      } else {
        categories = data;
      }
    }

    // Fetch photo products
    let productsQuery = supabase
      .from('photo_products')
      .select(
        `
        *,
        category:product_categories(*)
      `
      )
      .order('sort_order', { ascending: true });

    // Apply filters
    if (filters.category_ids?.length) {
      productsQuery = productsQuery.in('category_id', filters.category_ids);
    }
    if (filters.is_featured !== undefined) {
      productsQuery = productsQuery.eq('is_featured', filters.is_featured);
    }
    if (filters.is_active !== undefined) {
      productsQuery = productsQuery.eq('is_active', filters.is_active);
    }

    let products: any[] | null = null;
    {
      const { data, error } = await productsQuery;
      if (error) {
        console.warn('[Products API] Products unavailable, continuing with empty list:', error.message);
        products = [];
      } else {
        products = data;
      }
    }

    // Fetch combo packages
    let combosQuery = supabase
      .from('combo_packages')
      .select(
        `
        *,
        items:combo_package_items(
          *,
          product:photo_products(*)
        )
      `
      )
      .order('sort_order', { ascending: true });

    if (filters.is_featured !== undefined) {
      combosQuery = combosQuery.eq('is_featured', filters.is_featured);
    }
    if (filters.is_active !== undefined) {
      combosQuery = combosQuery.eq('is_active', filters.is_active);
    }

    let combos: any[] | null = null;
    {
      const { data, error } = await combosQuery;
      if (error) {
        console.warn('[Products API] Combos unavailable, continuing with empty list:', error.message);
        combos = [];
      } else {
        combos = data;
      }
    }

    // Fetch event-specific pricing if event_id provided
    let event_pricing = null;
    if (event_id) {
      const { data: pricingData, error: pricingError } = await supabase
        .from('event_product_pricing')
        .select(
          `
          *,
          product:photo_products(*),
          combo:combo_packages(*)
        `
        )
        .eq('event_id', event_id)
        .eq('is_active', true);

      if (pricingError) {
        console.error(
          '[Products API] Error fetching event pricing:',
          pricingError
        );
        // Don't fail the request, just log the error
      } else {
        event_pricing = pricingData;
      }
    }

    const catalog: ProductCatalog = {
      categories: categories || [],
      products: products || [],
      combos: combos || [],
      event_pricing: event_pricing || undefined,
    };

    return NextResponse.json({
      success: true,
      data: catalog,
    });
  } catch (error) {
    console.error('[Products API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();
    const body = await request.json();
    const {
      name,
      description,
      category_id,
      type,
      width_cm,
      height_cm,
      finish,
      paper_quality,
      base_price,
      image_url,
      is_featured,
    } = body;

    // Validation
    if (!name || !category_id || !type || !base_price) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos requeridos: name, category_id, type, base_price',
        },
        { status: 400 }
      );
    }

    if (type !== 'digital' && (!width_cm || !height_cm)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Productos físicos requieren width_cm y height_cm',
        },
        { status: 400 }
      );
    }

    // Get next sort order
    const { data: lastProduct } = await supabase
      .from('photo_products')
      .select('sort_order')
      .eq('category_id', category_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sort_order = (lastProduct?.[0]?.sort_order || 0) + 10;

    // Create product
    const { data: product, error } = await supabase
      .from('photo_products')
      .insert({
        name,
        description,
        category_id,
        type,
        width_cm: type === 'digital' ? null : width_cm,
        height_cm: type === 'digital' ? null : height_cm,
        finish: type === 'digital' ? null : finish,
        paper_quality: type === 'digital' ? null : paper_quality,
        base_price,
        image_url,
        is_featured: is_featured || false,
        sort_order,
        is_active: true,
      })
      .select(
        `
        *,
        category:product_categories(*)
      `
      )
      .single();

    if (error) {
      console.error('[Products API] Error creating product:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear producto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('[Products API] Unexpected error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
