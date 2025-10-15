import { z } from 'zod';
import {
  OrderAnalyticsService,
  type AnalyticsFilters,
} from '@/lib/services/order-analytics.service';
import type { ToolDefinition } from './types.js';

const orderAnalyticsService = new OrderAnalyticsService();

const EstadisticasVentasInput = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventId: z.string().optional(),
  status: z.array(z.string()).optional(),
  includeForecasting: z.boolean().optional().default(true),
});

type EstadisticasVentasInput = z.infer<typeof EstadisticasVentasInput>;

export const estadisticasVentasTool: ToolDefinition<EstadisticasVentasInput> = {
  name: 'estadisticas_ventas',
  title: 'Estadísticas de ventas',
  description:
    'Calcula métricas de ventas, tendencias y predicciones usando OrderAnalyticsService.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha ISO inicial del rango (incluida).',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha ISO final del rango (incluida).',
      },
      eventId: {
        type: 'string',
        description: 'Restringe las métricas a un evento concreto.',
      },
      status: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Lista de estados a considerar (ej. ["approved","delivered"]).',
      },
      includeForecasting: {
        type: 'boolean',
        default: true,
        description: 'Incluye proyecciones de 30 días si es true.',
      },
    },
  },
  metadata: {
    'openai/toolHint':
      'Utiliza esta herramienta cuando necesites métricas agregadas o tendencias de ventas.',
  },
  parseInput: (value) => EstadisticasVentasInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [
          {
            type: 'text',
            text: 'El cálculo de métricas fue cancelado.',
          },
        ],
        isError: true,
      };
    }

    const filters: AnalyticsFilters = {
      start_date: input.startDate,
      end_date: input.endDate,
      event_id: input.eventId,
      status: input.status,
      include_forecasting: input.includeForecasting,
    };

    try {
      const metrics = await orderAnalyticsService.getOrderMetrics(filters);

      const overview = metrics.overview;
      const growthWeek = metrics.trends.weekly_summary.growth_rate;
      const forecast = metrics.forecasting.next_30_days;

      const summary = [
        `Pedidos totales: ${overview.total_orders}, ingresos: ${(overview.total_revenue_cents / 100).toFixed(2)} ARS.`,
        `Ticket promedio: ${(overview.average_order_value_cents / 100).toFixed(2)} ARS.`,
        `Crecimiento semanal: ${(growthWeek * 100).toFixed(1)}%.`,
      ];

      if (input.includeForecasting && forecast.predicted_orders > 0) {
        summary.push(
          `Proyección 30 días: ${forecast.predicted_orders} pedidos (${(forecast.predicted_revenue_cents / 100).toFixed(2)} ARS) con ${(forecast.confidence_level * 100).toFixed(0)}% de confianza.`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: summary.join(' '),
          },
        ],
        _meta: {
          overview: metrics.overview,
          trends: metrics.trends,
          statusBreakdown: metrics.status_breakdown,
          alerts: metrics.alerts,
          forecasting: metrics.forecasting,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudieron calcular las métricas de ventas';
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
