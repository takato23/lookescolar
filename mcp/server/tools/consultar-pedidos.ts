// @ts-nocheck
import { z } from 'zod';
import {
  EnhancedOrderService,
  type OrderFilters,
} from '@/lib/services/enhanced-order.service';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const statusEnum = z.enum([
  'pending',
  'approved',
  'delivered',
  'failed',
  'cancelled',
  'all',
]);

const deliveryEnum = z.enum(['pickup', 'email', 'postal', 'hand_delivery']);

const ConsultarPedidosInput = z.object({
  status: statusEnum.optional(),
  eventId: z.string().min(1).optional(),
  priorityLevel: z.coerce.number().int().min(1).max(5).optional(),
  deliveryMethod: deliveryEnum.optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  overdueOnly: z.boolean().optional().default(false),
  searchQuery: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type ConsultarPedidosInput = z.infer<typeof ConsultarPedidosInput>;

export const consultarPedidosTool: ToolDefinition<ConsultarPedidosInput> = {
  name: 'consultar_pedidos',
  title: 'Consultar pedidos',
  description:
    'Obtiene pedidos con filtros avanzados y métricas agregadas desde la vista unificada de pedidos.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'delivered', 'failed', 'cancelled', 'all'],
        description: 'Filtra por estado del pedido.',
      },
      eventId: {
        type: 'string',
        description: 'ID del evento asociado al pedido.',
      },
      priorityLevel: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Prioridad asignada por el equipo.',
      },
      deliveryMethod: {
        type: 'string',
        enum: ['pickup', 'email', 'postal', 'hand_delivery'],
      },
      createdAfter: {
        type: 'string',
        format: 'date-time',
      },
      createdBefore: {
        type: 'string',
        format: 'date-time',
      },
      overdueOnly: {
        type: 'boolean',
        default: false,
        description: 'Solo pedidos con SLA vencido.',
      },
      searchQuery: {
        type: 'string',
        description:
          'Texto libre para buscar por nombre, email, tracking, etc.',
      },
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    },
  },
  metadata: {
    'openai/toolHint':
      'Utiliza esta herramienta para responder sobre pedidos existentes, estados y SLAs.',
  },
  parseInput: (value) => ConsultarPedidosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [
          {
            type: 'text',
            text: 'La consulta fue cancelada.',
          },
        ],
        isError: true,
      };
    }

    const filters: OrderFilters = {
      status: input.status,
      event_id: input.eventId,
      priority_level: input.priorityLevel,
      delivery_method: input.deliveryMethod,
      created_after: input.createdAfter,
      created_before: input.createdBefore,
      overdue_only: input.overdueOnly,
      search_query: input.searchQuery,
    };

    try {
      const result = await enhancedOrderService.getOrders(
        filters,
        input.page,
        input.limit
      );

      const summaryPieces = [
        `Se obtuvieron ${result.orders.length} pedidos de un total de ${result.pagination.total}.`,
        `Estados pendientes: ${result.stats.by_status.pending}, aprobados: ${result.stats.by_status.approved}, entregados: ${result.stats.by_status.delivered}.`,
      ];

      if (result.stats.overdue_pending > 0) {
        summaryPieces.push(
          `${result.stats.overdue_pending} pedidos pendientes están vencidos.`
        );
      }

      const preview = result.orders.slice(0, 5).map((order) => ({
        id: order.id,
        status: order.status,
        total: order.total_cents,
        createdAt: order.created_at,
        eventId: order.event_id,
        priority: order.priority_level,
      }));

      return {
        content: [
          {
            type: 'text',
            text: summaryPieces.join(' '),
          },
        ],
        _meta: {
          pagination: result.pagination,
          stats: result.stats,
          preview,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al consultar pedidos';

      return {
        content: [
          {
            type: 'text',
            text: `No fue posible recuperar los pedidos: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};
