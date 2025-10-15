import { z } from 'zod';
import { EnhancedOrderService } from '@/lib/services/enhanced-order.service';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const ListarPedidosInput = z.object({
  eventId: z.string().optional(),
  status: z
    .enum(['pending', 'approved', 'delivered', 'failed', 'cancelled', 'all'])
    .default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

type ListarPedidosInput = z.infer<typeof ListarPedidosInput>;

export const listarPedidosTool: ToolDefinition<ListarPedidosInput> = {
  name: 'listar_pedidos_recientes',
  title: 'Listar pedidos recientes',
  description:
    'Devuelve un resumen de pedidos (ID, estado, cliente, fechas) para que el asistente pueda consultar o disparar workflows posteriores.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'Opcional. Limita los pedidos a un evento.',
      },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'delivered', 'failed', 'cancelled', 'all'],
        default: 'all',
        description: 'Filtra por estado; usa "all" para traer los más recientes.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 10,
      },
    },
  },
  parseInput: (value) => ListarPedidosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Consulta cancelada.' }],
        isError: true,
      };
    }

    const result = await enhancedOrderService.getOrders(
      {
        status: input.status,
        event_id: input.eventId,
      } as any,
      1,
      input.limit
    );

    const resumen = result.orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      priority: order.priority_level,
      contact: order.contact_name ?? order.subject_name ?? null,
      email: order.contact_email ?? order.subject_email ?? null,
      createdAt: order.created_at,
      totalCents: order.total_cents,
    }));

    const texto = resumen.length
      ? resumen
          .map((order) =>
            `${order.id} · ${order.status} · ${order.contact ?? 'Sin nombre'} (${order.email ?? 'sin email'})`
          )
          .join('\n')
      : 'No se encontraron pedidos con esos filtros.';

    return {
      content: [{ type: 'text', text: texto }],
      _meta: {
        orders: resumen,
        filters: input,
        stats: result.stats,
      },
    };
  },
};
