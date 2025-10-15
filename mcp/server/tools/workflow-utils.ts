// @ts-nocheck
import type {
  WorkflowTrigger,
} from '@/lib/services/order-workflow.service';
import { orderWorkflowService } from '@/lib/services/order-workflow.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export const TRIGGERS: WorkflowTrigger['event_type'][] = [
  'order_created',
  'status_changed',
  'payment_received',
  'overdue_order',
  'delivery_reminder',
];

type InternalWorkflowService = typeof orderWorkflowService & {
  getActiveWorkflows?: (
    eventType: WorkflowTrigger['event_type']
  ) => Promise<WorkflowTrigger[]>;
};

const internalWorkflowService = orderWorkflowService as InternalWorkflowService;

export async function loadWorkflowsByTrigger() {
  const map: Record<string, WorkflowTrigger[]> = {};
  for (const trigger of TRIGGERS) {
    try {
      map[trigger] =
        typeof internalWorkflowService.getActiveWorkflows === 'function'
          ? await internalWorkflowService.getActiveWorkflows(trigger)
          : [];
    } catch {
      map[trigger] = [];
    }
  }
  return map;
}

export function hoursSince(dateIso?: string | null) {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
}

export function deriveTasksForOrder(
  order: any,
  workflowsByTrigger: Record<string, WorkflowTrigger[]>
) {
  const tasks: Array<{
    trigger: WorkflowTrigger['event_type'];
    workflowName: string;
    actionSummary: string;
    recommendedAt: string;
  }> = [];

  const hoursPending = hoursSince(order.created_at) ?? 0;
  const pending = order.status === 'pending';
  const approved = order.status === 'approved';
  const delivered = order.status === 'delivered';

  if (pending) {
    const overdue = hoursPending > 24;
    const trigger = overdue ? 'overdue_order' : 'order_created';
    const workflows = workflowsByTrigger[trigger] ?? [];
    workflows.forEach((wf) => {
      const actions = wf.actions
        .map((action) => {
          switch (action.type) {
            case 'send_email':
              return `Enviar email (${action.parameters?.template ?? 'template'})`;
            case 'send_sms':
              return 'Enviar SMS de recordatorio';
            case 'assign_priority':
              return `Asignar prioridad ${action.parameters?.priority_level ?? 3}`;
            case 'update_status':
              return `Actualizar estado a ${action.parameters?.status ?? 'nuevo'}`;
            case 'create_reminder':
              return 'Crear recordatorio interno';
            case 'webhook':
              return 'Notificar webhook externo';
            default:
              return `Acción ${action.type}`;
          }
        })
        .join(', ');

      tasks.push({
        trigger,
        workflowName: wf.name,
        actionSummary: actions,
        recommendedAt: overdue
          ? `Urgente (pendiente hace ${hoursPending}h)`
          : `Revisión rápida (creado hace ${hoursPending}h)`,
      });
    });
  }

  if (approved) {
    const workflows = workflowsByTrigger['status_changed'] ?? [];
    workflows
      .filter((wf) =>
        wf.conditions?.some(
          (condition) =>
            condition.field === 'order.status' && condition.value === 'approved'
        )
      )
      .forEach((wf) => {
        tasks.push({
          trigger: 'status_changed',
          workflowName: wf.name,
          actionSummary: 'Confirmar pago y preparar entrega',
          recommendedAt: 'Lo antes posible (pedido aprobado)',
        });
      });
  }

  if (delivered) {
    const workflows = workflowsByTrigger['status_changed'] ?? [];
    workflows
      .filter((wf) =>
        wf.conditions?.some(
          (condition) =>
            condition.field === 'order.status' && condition.value === 'delivered'
        )
      )
      .forEach((wf) => {
        tasks.push({
          trigger: 'status_changed',
          workflowName: wf.name,
          actionSummary: 'Enviar confirmación de entrega y solicitar feedback',
          recommendedAt: 'Después de marcar entregado',
        });
      });
  }

  return tasks;
}

export async function fallbackOrdersQuery(
  eventId: string | undefined,
  limit: number
) {
  const supabase = await createServerSupabaseServiceClient();
  let query = supabase
    .from('orders')
    .select(
      `id, status, priority_level, created_at, last_status_change, contact_name, contact_email`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Fallback orders query failed: ${error.message}`);
  }

  return data ?? [];
}

export function buildFallbackStats(orders: Array<{ status: string; created_at: string }>) {
  const stats = {
    total: orders.length,
    by_status: {
      pending: 0,
      approved: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
    },
    total_revenue_cents: 0,
    overdue_pending: 0,
    overdue_delivery: 0,
    avg_processing_time_hours: 0,
    priority_distribution: {} as Record<number, number>,
  };

  const now = Date.now();
  orders.forEach((order: any) => {
    if (stats.by_status.hasOwnProperty(order.status)) {
      stats.by_status[order.status as keyof typeof stats.by_status]++;
    }
    const hours = order.created_at
      ? Math.floor((now - new Date(order.created_at).getTime()) / (1000 * 60 * 60))
      : 0;
    if (order.status === 'pending' && hours > 24) {
      stats.overdue_pending++;
    }
  });

  return stats;
}
