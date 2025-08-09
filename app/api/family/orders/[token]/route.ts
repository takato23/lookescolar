import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { familyService } from '@/lib/services/family.service';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

const tokenParamsSchema = z.object({
  token: z.string().min(20, 'Token must be at least 20 characters'),
});

/**
 * GET /api/family/orders/[token]
 * Obtener historial de pedidos de una familia
 */
export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(
    async (
      request: NextRequest,
      authContext,
      { params }: { params: { token: string } }
    ) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      try {
        // Verificar que es una familia con token válido
        if (!authContext.isFamily || !authContext.subject) {
          return NextResponse.json(
            { error: 'Family token access required' },
            { status: 403 }
          );
        }

        const { token } = tokenParamsSchema.parse(params);
        const subject = authContext.subject;

        // Log del acceso
        SecurityLogger.logResourceAccess('family_orders', authContext, request);

        // Obtener todos los pedidos del sujeto
        const orders = await familyService.getOrderHistory(subject.id);

        const duration = Date.now() - startTime;

        SecurityLogger.logSecurityEvent('family_orders_success', {
          requestId,
          subjectId: subject.id,
          orderCount: orders.length,
          duration,
        });

        return NextResponse.json({
          subject: {
            id: subject.id,
            name: subject.name,
            parent_name: subject.parent_name,
            parent_email: subject.parent_email,
          },
          orders: orders.map((order) => ({
            id: order.id,
            status: order.status,
            total_amount: order.total_amount,
            created_at: order.created_at,
            mp_payment_id: order.mp_payment_id,
            items: order.items.map((item) => ({
              photo_id: item.photo_id,
              quantity: item.quantity,
              price: item.price,
              // No incluir filename por seguridad
            })),
            items_count: order.items.length,
            total_photos: order.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            ),
            delivery_status:
              order.status === 'completed'
                ? 'delivered'
                : order.status === 'paid'
                  ? 'ready'
                  : order.status === 'processing'
                    ? 'processing'
                    : 'pending',
          })),
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        SecurityLogger.logSecurityEvent(
          'family_orders_error',
          {
            requestId,
            subjectId: authContext.subject?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
          },
          'error'
        );

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid parameters',
              details: error.errors.map(
                (e) => `${e.path.join('.')}: ${e.message}`
              ),
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },
    'family'
  )
);
