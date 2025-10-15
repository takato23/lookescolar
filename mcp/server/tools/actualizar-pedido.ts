import { z } from 'zod';
import {
  EnhancedOrderService,
  type UpdateOrderRequest,
} from '@/lib/services/enhanced-order.service';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const UpdateOrderInput = z.object({
  orderId: z.string().min(1),
  status: z.enum(['pending', 'approved', 'delivered', 'failed', 'cancelled']).optional(),
  notes: z.string().max(1000).optional(),
  priorityLevel: z.coerce.number().int().min(1).max(5).optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  deliveryMethod: z.enum(['pickup', 'email', 'postal', 'hand_delivery']).optional(),
  trackingNumber: z.string().max(255).optional(),
  adminId: z.string().optional(),
});

type UpdateOrderInput = z.infer<typeof UpdateOrderInput>;

export const actualizarPedidoTool: ToolDefinition<UpdateOrderInput> = {
  name: 'actualizar_pedido',
  title: 'Actualizar estado de pedido',
  description:
    'Permite modificar el estado, prioridad u otros campos operativos de un pedido para mantener la operación al día.',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'delivered', 'failed', 'cancelled'],
      },
      notes: { type: 'string' },
      priorityLevel: { type: 'integer', minimum: 1, maximum: 5 },
      estimatedDeliveryDate: { type: 'string', format: 'date-time' },
      deliveryMethod: {
        type: 'string',
        enum: ['pickup', 'email', 'postal', 'hand_delivery'],
      },
      trackingNumber: { type: 'string' },
      adminId: { type: 'string' },
    },
    required: ['orderId'],
  },
  parseInput: (value) => UpdateOrderInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Operación cancelada.' }],
        isError: true,
      };
    }

    const updates: UpdateOrderRequest = {
      status: input.status,
      notes: input.notes,
      priority_level: input.priorityLevel,
      estimated_delivery_date: input.estimatedDeliveryDate,
      delivery_method: input.deliveryMethod,
      tracking_number: input.trackingNumber,
    };

    try {
      const updated = await enhancedOrderService.updateOrder(
        input.orderId,
        updates,
        input.adminId ?? 'mcp'
      );

      return {
        content: [
          {
            type: 'text',
            text: `Pedido ${input.orderId} actualizado correctamente.`,
          },
        ],
        _meta: {
          order: updated,
          updates,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return {
        content: [
          {
            type: 'text',
            text: `No se pudo actualizar el pedido ${input.orderId}: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};
