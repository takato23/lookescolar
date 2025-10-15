import { z } from 'zod';
import {
  EnhancedOrderService,
  type OrderFilters,
} from '@/lib/services/enhanced-order.service';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const OrdersFollowUpInput = z.object({
  eventId: z.string().optional(),
  status: z
    .enum(['pending', 'approved', 'delivered', 'failed', 'cancelled', 'all'])
    .default('pending'),
  overdueOnly: z.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(50).default(15),
  includeContacts: z.boolean().default(true),
});

type OrdersFollowUpInput = z.infer<typeof OrdersFollowUpInput>;

function hoursBetween(dateIso?: string | null): number | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.max(Math.round(diffMs / (1000 * 60 * 60)), 0);
}

function buildActionSuggestion(order: any): string {
  const hoursPending = hoursBetween(order.created_at) ?? 0;
  const overdue =
    (order.enhanced_status && String(order.enhanced_status).includes('overdue')) ||
    hoursPending > 72;

  if (order.status === 'pending' && overdue) {
    return 'Contactar al responsable y ofrecer pago asistido; evaluar upgrade de prioridad.';
  }
  if (order.status === 'pending') {
    return 'Enviar recordatorio amable y verificar datos de contacto.';
  }
  if (order.status === 'approved' && order.delivery_method === 'email') {
    return 'Verificar entrega digital y confirmar recepción con el cliente.';
  }
  if (order.status === 'approved') {
    return 'Revisar logística y preparar despacho o retiro coordinado.';
  }
  if (order.status === 'failed') {
    return 'Revisar motivos del fallo, reintentar cobro o informar al cliente.';
  }
  return 'Registrar nota de seguimiento y confirmar próximo hito.';
}

export const ordersFollowUpTool: ToolDefinition<OrdersFollowUpInput> = {
  name: 'orders_follow_up',
  title: 'Seguimiento prioritario de pedidos',
  description:
    'Identifica pedidos que requieren seguimiento (pendientes, overdue, alta prioridad) y sugiere acciones concretas.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'Filtra los pedidos a un evento específico.',
      },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'delivered', 'failed', 'cancelled', 'all'],
        default: 'pending',
      },
      overdueOnly: {
        type: 'boolean',
        default: true,
        description: 'Limita el resultado a pedidos con SLA vencido.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 15,
      },
      includeContacts: {
        type: 'boolean',
        default: true,
        description: 'Incluye datos de contacto para facilitar el outreach.',
      },
    },
  },
  metadata: {
    'openai/toolHint':
      'Usar para priorizar seguimiento de pedidos y responder “¿a quién tengo que contactar ahora?”.',
  },
  parseInput: (value) => OrdersFollowUpInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'El seguimiento fue cancelado.' }],
        isError: true,
      };
    }

    const filters: OrderFilters = {
      status: input.status,
      event_id: input.eventId,
      overdue_only: input.overdueOnly,
    };

    try {
      const result = await enhancedOrderService.getOrders(
        filters,
        1,
        input.limit
      );

      const prioritized = result.orders.map((order: any) => {
        const hoursSinceCreation = hoursBetween(order.created_at);
        const hoursSinceStatusChange = hoursBetween(order.last_status_change);
        const priority = order.priority_level ?? 1;
        const overdue = Boolean(
          order.enhanced_status && String(order.enhanced_status).includes('overdue')
        );

        const contact = input.includeContacts
          ? {
              name: order.contact_name ?? order.subject_name ?? null,
              email: order.contact_email ?? order.subject_email ?? null,
              phone: order.contact_phone ?? order.subject_phone ?? null,
            }
          : undefined;

        return {
          orderId: order.id,
          status: order.status,
          enhancedStatus: order.enhanced_status,
          priorityLevel: priority,
          deliveryMethod: order.delivery_method,
          totalAmountCents: order.total_cents,
          hoursSinceCreation,
          hoursSinceStatusChange,
          overdue,
          recommendedAction: buildActionSuggestion(order),
          contact,
          notes: order.notes ?? order.admin_notes ?? null,
        };
      });

      const overdueCount = prioritized.filter((item) => item.overdue).length;
      const highPriority = prioritized.filter((item) => (item.priorityLevel ?? 1) >= 3).length;

      const summaryPieces = [
        `Encontré ${prioritized.length} pedidos para seguimiento (limit=${input.limit}).`,
        `${overdueCount} aparecen con SLA vencido y ${highPriority} tienen prioridad alta (≥3).`,
      ];

      if (input.eventId) {
        summaryPieces.unshift(`Evento ${input.eventId}:`);
      }

      if (result.stats.overdue_pending > 0) {
        summaryPieces.push(
          `El tablero muestra ${result.stats.overdue_pending} pendientes vencidos en total.`
        );
      }

      return {
        content: [{ type: 'text', text: summaryPieces.join(' ') }],
        _meta: {
          filters,
          followUps: prioritized,
          stats: result.stats,
          pagination: result.pagination,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo generar el listado de seguimiento.';
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  },
};

