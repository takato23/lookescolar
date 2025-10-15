import { z } from 'zod';
import {
  OrderAnalyticsService,
  type AnalyticsFilters,
} from '@/lib/services/order-analytics.service';
import type { ToolDefinition } from './types.js';

const orderAnalyticsService = new OrderAnalyticsService();

const AnalyticsEventInsightsInput = z.object({
  eventId: z.string().min(1, 'eventId es requerido'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeForecasting: z.boolean().default(false),
  includeAlerts: z.boolean().default(true),
});

type AnalyticsEventInsightsInput = z.infer<
  typeof AnalyticsEventInsightsInput
>;

function formatCurrency(cents: number) {
  return (cents / 100).toFixed(2);
}

export const analyticsEventInsightsTool: ToolDefinition<AnalyticsEventInsightsInput> = {
  name: 'analytics_event_insights',
  title: 'Insights del evento',
  description:
    'Genera un resumen ejecutivo del desempeño de un evento con métricas clave, alertas y recomendaciones.',
  inputSchema: {
    type: 'object',
    required: ['eventId'],
    properties: {
      eventId: {
        type: 'string',
        description: 'ID del evento a analizar.',
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha inicial ISO del rango a analizar.',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha final ISO del rango a analizar.',
      },
      includeForecasting: {
        type: 'boolean',
        default: false,
        description: 'Incluye proyecciones de ventas a 30 días.',
      },
      includeAlerts: {
        type: 'boolean',
        default: true,
        description: 'Incluye alertas relevantes del evento.',
      },
    },
  },
  metadata: {
    'openai/toolHint':
      'Usá esta herramienta para responder cómo viene un evento específico: ventas, pendientes, horas pico y alertas.',
  },
  parseInput: (value) => AnalyticsEventInsightsInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [
          {
            type: 'text',
            text: 'La generación de insights fue cancelada.',
          },
        ],
        isError: true,
      };
    }

    const filters: AnalyticsFilters = {
      event_id: input.eventId,
      start_date: input.startDate,
      end_date: input.endDate,
      include_forecasting: input.includeForecasting,
    };

    try {
      const metrics = await orderAnalyticsService.getOrderMetrics(filters);

      const { overview, trends, status_breakdown, performance, alerts } = metrics;

      const topEvents = performance?.top_events ?? [];
      const peakHours = (performance?.peak_hours ?? []) as Array<{
        hour: number;
        orders_count: number;
        percentage: number;
      }>;
      const dailyOrders = (trends?.daily_orders ?? []) as Array<{
        date: string;
        orders_count: number;
        revenue_cents?: number;
      }>;

      const eventInfo = topEvents.find(
        (event) => event.event_id === input.eventId
      );

      const eventLabel = eventInfo
        ? `${eventInfo.event_name ?? 'Evento sin nombre'} (${eventInfo.school_name ?? 'Escuela desconocida'})`
        : `Evento ${input.eventId}`;

      const topDay = dailyOrders.length
        ? dailyOrders.reduce((best, current) =>
            current.orders_count > best.orders_count ? current : best
          )
        : null;

      const peakHour = peakHours.length
        ? peakHours.reduce((best, current) =>
            current.orders_count > best.orders_count ? current : best
          )
        : null;

      const statusMap = status_breakdown.by_status as Record<
        string,
        { count: number; percentage: number }
      >;
      const statusEntries = Object.entries(statusMap);
      const dominantStatus = statusEntries.length
        ? statusEntries.reduce((best, entry) =>
            entry[1].count > best[1].count ? entry : best
          )
        : null;

      const summaryParts = [
        `${eventLabel} registró ${overview.total_orders} pedidos por ${formatCurrency(overview.total_revenue_cents)} ARS en el período analizado.`,
        `Ticket promedio: ${formatCurrency(overview.average_order_value_cents)} ARS con tasa de conversión ${(overview.conversion_rate * 100).toFixed(1)}%.`,
      ];

      if (overview.overdue_orders > 0 || overview.pending_orders > 0) {
        summaryParts.push(
          `Pendientes: ${overview.pending_orders} (Overdue: ${overview.overdue_orders}).`
        );
      }

      if (topDay && topDay.orders_count > 0) {
        summaryParts.push(
          `Día con mejor desempeño: ${topDay.date} (${topDay.orders_count} pedidos).`
        );
      }

      if (peakHour && peakHour.orders_count > 0) {
        summaryParts.push(
          `Hora pico: ${peakHour.hour}:00 (${(peakHour.percentage * 100).toFixed(1)}% del total).`
        );
      }

      if (dominantStatus) {
        summaryParts.push(
          `Estado dominante: ${dominantStatus[0]} (${dominantStatus[1].count} pedidos, ${(dominantStatus[1].percentage * 100).toFixed(1)}%).`
        );
      }

      if (input.includeForecasting) {
        const forecast = metrics.forecasting.next_30_days;
        summaryParts.push(
          `Proyección 30 días: ${forecast.predicted_orders} pedidos (${formatCurrency(forecast.predicted_revenue_cents)} ARS) con ${(forecast.confidence_level * 100).toFixed(0)}% de confianza.`
        );
      }

      if (input.includeAlerts && alerts.length > 0) {
        const warningCount = alerts.filter((alert) => alert.type !== 'info')
          .length;
        summaryParts.push(
          `Alertas abiertas: ${alerts.length} (${warningCount} críticas/aviso).`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: summaryParts.join(' '),
          },
        ],
        _meta: {
          metrics,
          highlights: {
            eventLabel,
            peakHour,
            topDay,
            dominantStatus,
            alerts: input.includeAlerts ? alerts : [],
          },
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudieron generar los insights del evento';
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        isError: true,
      };
    }
  },
};
