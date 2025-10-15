import { z } from 'zod';
import { EnhancedOrderService } from '@/lib/services/enhanced-order.service';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const ResumenPedidosInput = z.object({
  eventId: z.string().optional(),
  overdueOnly: z.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type ResumenPedidosInput = z.infer<typeof ResumenPedidosInput>;

export const resumenPedidosTool: ToolDefinition<ResumenPedidosInput> = {
  name: 'resumen_pedidos',
  title: 'Resumen de pedidos pendientes',
  description:
    'Genera un resumen de pedidos pendientes o vencidos para priorizar acciones y seguir SLA.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: { type: 'string' },
      overdueOnly: { type: 'boolean', default: true },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  parseInput: (value) => ResumenPedidosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Solicitud cancelada.' }],
        isError: true,
      };
    }

    try {
      const result = await enhancedOrderService.getOrders(
        {
          event_id: input.eventId,
          status: 'pending',
          overdue_only: input.overdueOnly,
        },
        1,
        input.limit
      );

      const overdue = result.stats.overdue_pending + result.stats.overdue_delivery;
      const summary = `Pendientes totales: ${result.stats.by_status.pending}. Overdue: ${overdue}. Se listan ${result.orders.length} pedidos.`;

      return {
        content: [{ type: 'text', text: summary }],
        _meta: {
          stats: result.stats,
          orders: result.orders,
          pagination: result.pagination,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return {
        content: [
          {
            type: 'text',
            text: `No fue posible obtener el resumen de pedidos: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};
