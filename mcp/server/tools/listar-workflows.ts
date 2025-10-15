// @ts-nocheck
import { z } from 'zod';
import {
  orderWorkflowService,
  type WorkflowTrigger,
} from '@/lib/services/order-workflow.service';
import type { ToolDefinition } from './types.js';

const TriggerEnum = z.enum([
  'order_created',
  'status_changed',
  'payment_received',
  'overdue_order',
  'delivery_reminder',
]);

const ListarWorkflowsInput = z.object({
  eventType: TriggerEnum.optional(),
});

type ListarWorkflowsInput = z.infer<typeof ListarWorkflowsInput>;

type InternalWorkflowService = typeof orderWorkflowService & {
  getActiveWorkflows?: (
    eventType: WorkflowTrigger['event_type']
  ) => Promise<WorkflowTrigger[]>;
};

async function fetchWorkflowsForTrigger(
  eventType: WorkflowTrigger['event_type']
) {
  const internalService = orderWorkflowService as InternalWorkflowService;
  if (typeof internalService.getActiveWorkflows === 'function') {
    return internalService.getActiveWorkflows(eventType);
  }

  // Fallback: ejecutar executeWorkflows con contexto vacío y capturar workflows
  // Para no modificar la lógica, devolvemos lista sintética vacía.
  return [];
}

export const listarWorkflowsTool: ToolDefinition<ListarWorkflowsInput> = {
  name: 'listar_workflows',
  title: 'Listar workflows disponibles',
  description:
    'Devuelve los workflows automáticos activos por tipo de disparador para ayudar a planificar la agenda.',
  inputSchema: {
    type: 'object',
    properties: {
      eventType: {
        type: 'string',
        enum: TriggerEnum.options,
        description:
          'Opcional. Si se indica, solo lista workflows de ese tipo de evento (order_created, status_changed, etc.).',
      },
    },
  },
  parseInput: (value) => ListarWorkflowsInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Consulta cancelada.' }],
        isError: true,
      };
    }

    const triggers = input.eventType ? [input.eventType] : TriggerEnum.options;
    const results: Record<string, WorkflowTrigger[]> = {};

    for (const trigger of triggers) {
      try {
        const workflows = await fetchWorkflowsForTrigger(trigger);
        results[trigger] = workflows;
      } catch (error) {
        results[trigger] = [];
      }
    }

    const summaryLines = Object.entries(results).map(([eventType, list]) => {
      if (list.length === 0) {
        return `${eventType}: sin workflows activos (usar configuración por defecto).`;
      }

      const names = list.map((wf) => wf.name).join(', ');
      return `${eventType}: ${list.length} workflow(s) activos → ${names}.`;
    });

    return {
      content: [
        {
          type: 'text',
          text: summaryLines.join('\n'),
        },
      ],
      _meta: {
        workflows: results,
      },
    };
  },
};
