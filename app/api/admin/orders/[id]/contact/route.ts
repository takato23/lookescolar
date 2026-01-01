import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const UpdateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(50).optional(),
  }).optional(),
});

/**
 * PUT /api/admin/orders/[id]/contact
 * Update order contact information
 */
export const PUT = withAdminAuth(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
) => {
  const params = await context.params;

  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = UpdateContactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid contact data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updates = validation.data;
    const supabase = await createServerSupabaseServiceClient();

    // First, get the current order
    const { data: order, error: fetchError } = await supabase
      .from('unified_orders')
      .select('contact_info')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Merge existing contact info with updates
    const currentContactInfo = (order.contact_info as Record<string, any>) || {};
    const newContactInfo = {
      ...currentContactInfo,
      ...updates,
      address: updates.address
        ? { ...(currentContactInfo.address || {}), ...updates.address }
        : currentContactInfo.address,
    };

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('unified_orders')
      .update({
        contact_info: newContactInfo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Update Contact] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update contact info' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contacto actualizado correctamente',
      contact_info: newContactInfo,
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Update Contact] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update contact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
