import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/orders/[id]/communications
 * Get communication history for an order
 */
export const GET = withAdminAuth(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
) => {
  const params = await context.params;

  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Get communications from order_communications table
    const { data: communications, error: commError } = await supabase
      .from('order_communications')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    // Get email logs
    const { data: emailLogs, error: emailError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    // Get WhatsApp notifications related to this order
    const { data: whatsappLogs, error: waError } = await supabase
      .from('whatsapp_notifications')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    // Combine and format all communications
    const allCommunications = [
      // From order_communications table
      ...(communications || []).map((c) => ({
        id: c.id,
        type: c.type,
        channel: c.channel,
        recipient: c.recipient,
        recipientEmail: c.recipient_email,
        recipientPhone: c.recipient_phone,
        status: c.status,
        errorMessage: c.error_message,
        messageId: c.provider_message_id,
        messageBody: c.message_body,
        createdAt: c.created_at,
        sentAt: c.sent_at,
        source: 'order_communications',
      })),
      // From email_logs table (if not already in order_communications)
      ...(emailLogs || [])
        .filter((e) => !communications?.some((c) => c.provider_message_id === e.provider_message_id))
        .map((e) => ({
          id: e.id,
          type: 'email',
          channel: e.email_type,
          recipient: 'customer',
          recipientEmail: e.to_email,
          recipientPhone: null,
          status: e.status,
          errorMessage: e.error_message,
          messageId: e.provider_message_id,
          messageBody: null,
          createdAt: e.created_at,
          sentAt: e.sent_at,
          source: 'email_logs',
        })),
      // From whatsapp_notifications table
      ...(whatsappLogs || [])
        .filter((w) => !communications?.some((c) => c.provider_message_id === w.provider_message_id))
        .map((w) => ({
          id: w.id,
          type: 'whatsapp',
          channel: 'order_paid',
          recipient: 'photographer',
          recipientEmail: w.photographer_email,
          recipientPhone: w.photographer_phone,
          status: w.status,
          errorMessage: w.last_error,
          messageId: w.provider_message_id,
          messageBody: w.message_body,
          createdAt: w.created_at,
          sentAt: w.last_attempt_at,
          source: 'whatsapp_notifications',
        })),
    ];

    // Sort by date
    allCommunications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      communications: allCommunications,
      count: allCommunications.length,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Get Communications] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
