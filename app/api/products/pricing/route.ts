// Product Pricing API
// POST /api/products/pricing - Calculate pricing for product selections

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  calculateProductCartTotal,
  formatProductPrice,
} from '@/lib/services/product-pricing';
import {
  EnhancedCartItem,
  PricingContext,
  PriceCalculationRequest,
} from '@/lib/types/products';

export async function POST(request: NextRequest) {
  try {
    const body: PriceCalculationRequest = await request.json();
    const { event_id, selections } = body;

    if (!event_id || !selections || selections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'event_id y selections son requeridos' },
        { status: 400 }
      );
    }

    // Fetch products and combos data
    const productIds = selections
      .filter((s) => s.product_id)
      .map((s) => s.product_id!);

    const comboIds = selections
      .filter((s) => s.combo_id)
      .map((s) => s.combo_id!);

    const [productsResult, combosResult, photosResult, eventPricingResult] =
      await Promise.all([
        // Fetch products
        productIds.length > 0
          ? supabase.from('photo_products').select('*').in('id', productIds)
          : { data: [], error: null },

        // Fetch combos
        comboIds.length > 0
          ? supabase.from('combo_packages').select('*').in('id', comboIds)
          : { data: [], error: null },

        // Fetch photos for metadata
        supabase
          .from('photos')
          .select('id, original_filename, watermark_path')
          .in(
            'id',
            selections.map((s) => s.photo_id)
          ),

        // Fetch event-specific pricing
        supabase
          .from('event_product_pricing')
          .select('*')
          .eq('event_id', event_id)
          .eq('is_active', true),
      ]);

    if (productsResult.error) {
      console.error(
        '[Pricing API] Error fetching products:',
        productsResult.error
      );
      return NextResponse.json(
        { success: false, error: 'Error al cargar productos' },
        { status: 500 }
      );
    }

    if (combosResult.error) {
      console.error('[Pricing API] Error fetching combos:', combosResult.error);
      return NextResponse.json(
        { success: false, error: 'Error al cargar combos' },
        { status: 500 }
      );
    }

    if (photosResult.error) {
      console.error('[Pricing API] Error fetching photos:', photosResult.error);
      return NextResponse.json(
        { success: false, error: 'Error al cargar fotos' },
        { status: 500 }
      );
    }

    if (eventPricingResult.error) {
      console.error(
        '[Pricing API] Error fetching event pricing:',
        eventPricingResult.error
      );
      // Don't fail the request, just log the error
    }

    const products = productsResult.data || [];
    const combos = combosResult.data || [];
    const photos = photosResult.data || [];
    const eventPricing = eventPricingResult.data || [];

    // Build enhanced cart items
    const enhanced_items: EnhancedCartItem[] = selections.map((selection) => {
      const photo = photos.find((p) => p.id === selection.photo_id);
      let product = null;
      let combo = null;
      let unit_price = 0;
      let product_name = 'Producto no encontrado';
      let product_specs: any = { type: 'print' };

      if (selection.product_id) {
        product = products.find((p) => p.id === selection.product_id);
        if (product) {
          product_name = product.name;
          product_specs = {
            type: product.type,
            width_cm: product.width_cm,
            height_cm: product.height_cm,
            finish: product.finish,
            paper_quality: product.paper_quality,
            is_digital: product.type === 'digital',
          };

          // Check for event-specific pricing
          const eventPrice = eventPricing.find(
            (ep) => ep.product_id === product.id && ep.is_active
          );
          unit_price = eventPrice?.override_price || product.base_price;
        }
      } else if (selection.combo_id) {
        combo = combos.find((c) => c.id === selection.combo_id);
        if (combo) {
          product_name = combo.name;
          product_specs = {
            type: 'combo' as const,
            is_digital: false,
          };

          // Check for event-specific pricing
          const eventPrice = eventPricing.find(
            (ep) => ep.combo_id === combo.id && ep.is_active
          );
          unit_price = eventPrice?.override_price || combo.base_price;
        }
      }

      return {
        photo_id: selection.photo_id,
        product_id: selection.product_id,
        combo_id: selection.combo_id,
        product_name,
        product_specs,
        quantity: selection.quantity,
        unit_price,
        subtotal: unit_price * selection.quantity,
        filename: photo?.original_filename,
        watermark_url: photo?.watermark_path,
        metadata: {
          event_id,
          context: 'family',
        },
      };
    });

    // Create pricing context
    const pricing_context: PricingContext = {
      event_id,
      bulk_discount_threshold: 5,
      bulk_discount_percentage: 10,
      tax_rate: 0, // No tax for now
    };

    // Calculate pricing
    const calculation = calculateProductCartTotal(
      enhanced_items,
      pricing_context,
      eventPricing
    );

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    console.error('[Pricing API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET /api/products/pricing?event_id=xxx&product_id=xxx or combo_id=xxx
// Get price for specific product or combo in an event
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');
    const product_id = searchParams.get('product_id');
    const combo_id = searchParams.get('combo_id');
    const quantity = parseInt(searchParams.get('quantity') || '1');

    if (!event_id || (!product_id && !combo_id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'event_id y (product_id o combo_id) son requeridos',
        },
        { status: 400 }
      );
    }

    let base_price = 0;
    let final_price = 0;
    let name = '';

    // Check event-specific pricing first
    const { data: eventPricing, error: pricingError } = await supabase
      .from('event_product_pricing')
      .select('*')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .or(`product_id.eq.${product_id},combo_id.eq.${combo_id}`)
      .single();

    if (pricingError && pricingError.code !== 'PGRST116') {
      console.error(
        '[Pricing API] Error fetching event pricing:',
        pricingError
      );
    }

    if (eventPricing) {
      final_price = eventPricing.override_price;
      base_price = final_price;
    } else {
      // Get base price from product or combo
      if (product_id) {
        const { data: product, error } = await supabase
          .from('photo_products')
          .select('name, base_price')
          .eq('id', product_id)
          .single();

        if (error) {
          return NextResponse.json(
            { success: false, error: 'Producto no encontrado' },
            { status: 404 }
          );
        }

        name = product.name;
        base_price = product.base_price;
        final_price = base_price;
      } else if (combo_id) {
        const { data: combo, error } = await supabase
          .from('combo_packages')
          .select('name, base_price, pricing_type, price_per_photo')
          .eq('id', combo_id)
          .single();

        if (error) {
          return NextResponse.json(
            { success: false, error: 'Combo no encontrado' },
            { status: 404 }
          );
        }

        name = combo.name;
        base_price = combo.base_price;

        // Calculate combo price based on quantity (if per_photo pricing)
        if (combo.pricing_type === 'per_photo' && combo.price_per_photo) {
          final_price =
            combo.base_price +
            combo.price_per_photo * Math.max(0, quantity - 1);
        } else {
          final_price = combo.base_price;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        name,
        base_price,
        final_price,
        total_price: final_price * quantity,
        quantity,
        formatted_price: formatProductPrice(final_price),
        formatted_total: formatProductPrice(final_price * quantity),
      },
    });
  } catch (error) {
    console.error('[Pricing API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
