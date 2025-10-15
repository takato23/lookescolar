import { z } from 'zod';
import { orderWorkflowService } from '@/lib/services/order-workflow.service';
import { EnhancedOrderService } from '@/lib/services/enhanced-order.service';
import {
  loadWorkflowsByTrigger,
  deriveTasksForOrder,
} from './workflow-utils.js';
import type { ToolDefinition } from './types.js';

const enhancedOrderService = new EnhancedOrderService();

const SimularWorkflowInput = z.object({
  orderId: z.string().min(1),
  eventType: z.enum(['order_created', 'status_changed']).default('status_changed'),
  newStatus: z.string().optional(),
  previousStatus: z.string().optional(),
});

type SimularWorkflowInput = z.infer<typeof SimularWorkflowInput>;

export const simularWorkflowTool: ToolDefinition<SimularWorkflowInput> = {
  name: 'simular_workflow_pedido',
  title: 'Simular ejecución de workflow',
  description:
    'Analiza qué acciones se ejecutarían para un pedido dado un evento (sin disparar los workflows reales).',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      eventType: {
        type: 'string',
        enum: ['order_created', 'status_changed'],
        default: 'status_changed',
      },
      newStatus: {
        type: 'string',
        description: 'Estado hipotético (requerido si eventType=status_changed).',
      },
      previousStatus: {
        type: 'string',
        description: 'Estado previo para contexto (opcional).',
      },
    },
    required: ['orderId'],
  },
  parseInput: (value) => SimularWorkflowInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Simulación cancelada.' }],
        isError: true,
      };
    }

    const order = await enhancedOrderService.getOrderById(input.orderId);
    if (!order) {
      return {
        content: [{ type: 'text', text: `No se encontró el pedido ${input.orderId}.` }],
        isError: true,
      };
    }

    const workflowsByTrigger = await loadWorkflowsByTrigger();

    const simulatedOrder = {
      ...order,
      status: input.eventType === 'status_changed' && input.newStatus
        ? input.newStatus
        : order.status,
    };

    const tasks = deriveTasksForOrder(simulatedOrder, workflowsByTrigger);

    const summary = tasks.length
      ? `Se ejecutarían ${tasks.length} acción(es): ${tasks
          .map((task) => `${task.workflowName} – ${task.actionSummary}`)
          .join('; ')}`
      : 'No se encontraron workflows aplicables para esta simulación.';

    return {
      content: [{ type: 'text', text: summary }],
      _meta: {
        orderId: input.orderId,
        originalStatus: order.status,
        simulatedStatus: simulatedOrder.status,
        tasks,
      },
    };
  },
};
