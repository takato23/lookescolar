import { z } from 'zod';
import { orderWorkflowService } from '@/lib/services/order-workflow.service';
import type { ToolDefinition } from './types.js';

const TriggerEnum = z.enum(['order_created', 'status_changed', 'overdue_sweep']);

const DispararWorkflowInput = z.object({
  orderId: z.string().min(1).optional(),
  eventType: TriggerEnum,
  newStatus: z.string().optional(),
  previousStatus: z.string().optional(),
});

type DispararWorkflowInput = z.infer<typeof DispararWorkflowInput>;

export const dispararWorkflowTool: ToolDefinition<DispararWorkflowInput> = {
  name: 'disparar_workflow_pedido',
  title: 'Disparar workflows de pedidos',
  description:
    'Permite ejecutar manualmente un workflow existente (crear pedido, cambio de estado o barrido de vencidos).',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'ID del pedido a afectar (no requerido para overdue_sweep).',
      },
      eventType: {
        type: 'string',
        enum: TriggerEnum.options,
        description: 'Tipo de evento a disparar: order_created, status_changed o overdue_sweep.',
      },
      newStatus: {
        type: 'string',
        description: 'Estado nuevo (requerido para status_changed).',
      },
      previousStatus: {
        type: 'string',
        description: 'Estado anterior (opcional para status_changed).',
      },
    },
    required: ['eventType'],
  },
  parseInput: (value) => DispararWorkflowInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Solicitud cancelada.' }],
        isError: true,
      };
    }

    const { eventType } = input;

    if (eventType === 'overdue_sweep') {
      await orderWorkflowService.processOverdueOrders();
      return {
        content: [
          {
            type: 'text',
            text: 'Se ejecutó el barrido de pedidos vencidos. Revisa la agenda para ver acciones generadas.',
          },
        ],
      };
    }

    if (!input.orderId) {
      return {
        content: [
          {
            type: 'text',
            text: 'orderId es obligatorio para order_created y status_changed.',
          },
        ],
        isError: true,
      };
    }

    if (eventType === 'order_created') {
      await orderWorkflowService.triggerOrderCreated(input.orderId);
      return {
        content: [
          {
            type: 'text',
            text: `Workflow de creación disparado para el pedido ${input.orderId}.`,
          },
        ],
      };
    }

    if (eventType === 'status_changed') {
      if (!input.newStatus) {
        return {
          content: [
            {
              type: 'text',
              text: 'newStatus es obligatorio para status_changed.',
            },
          ],
          isError: true,
        };
      }

      await orderWorkflowService.triggerStatusChanged(
        input.orderId,
        input.newStatus,
        input.previousStatus ?? ''
      );

      return {
        content: [
          {
            type: 'text',
            text: `Se disparó el workflow de cambio de estado (${input.newStatus}) para el pedido ${input.orderId}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Evento no soportado.',
        },
      ],
      isError: true,
    };
  },
};
