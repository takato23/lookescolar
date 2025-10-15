import { z } from 'zod';
import { EnhancedOrderService } from '@/lib/services/enhanced-order.service';
import {
  deriveTasksForOrder,
  loadWorkflowsByTrigger,
  hoursSince,
  fallbackOrdersQuery,
  buildFallbackStats,
} from './workflow-utils.js';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const AgendaWorkflowInput = z.object({
  eventId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type AgendaWorkflowInput = z.infer<typeof AgendaWorkflowInput>;

export const agendaWorkflowTool: ToolDefinition<AgendaWorkflowInput> = {
  name: 'agenda_workflow',
  title: 'Agenda diaria de workflows',
  description:
    'Genera una agenda priorizada con las acciones automáticas sugeridas a partir de los workflows (emails, recordatorios, asignación de prioridad).',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'Opcional. Limita la agenda a un evento específico.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 20,
      },
    },
  },
  parseInput: (value) => AgendaWorkflowInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Generación de agenda cancelada.' }],
        isError: true,
      };
    }

    const workflowsByTrigger = await loadWorkflowsByTrigger();

    let result;
    try {
      result = await enhancedOrderService.getOrders(
        {
          status: 'all',
          event_id: input.eventId,
        } as any,
        1,
        input.limit
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message &&
        error.message.includes('Failed to calculate stats')
      ) {
        const fallbackOrders = await fallbackOrdersQuery(
          input.eventId,
          input.limit
        );
        result = {
          orders: fallbackOrders,
          stats: buildFallbackStats(fallbackOrders),
          pagination: {
            page: 1,
            limit: fallbackOrders.length,
            total: fallbackOrders.length,
            total_pages: 1,
            has_more: false,
          },
        };
      } else {
        throw error;
      }
    }

    const agenda = result.orders.map((order: any) => {
      const tasks = deriveTasksForOrder(order, workflowsByTrigger);
      return {
        orderId: order.id,
        status: order.status,
        priority: order.priority_level,
        createdAt: order.created_at,
        hoursSinceCreation: hoursSince(order.created_at),
        tasks,
      };
    });

    const actionable = agenda.filter((entry) => entry.tasks.length > 0);

    const summary = actionable.length
      ? `Agenda sugerida con ${actionable.length} pedidos que requieren acción inmediata.`
      : 'No se detectaron pedidos que requieran acciones automáticas en este momento.';

    return {
      content: [{ type: 'text', text: summary }],
      _meta: {
        agenda: actionable,
        totalReviewed: agenda.length,
        eventId: input.eventId ?? null,
      },
    };
  },
};
