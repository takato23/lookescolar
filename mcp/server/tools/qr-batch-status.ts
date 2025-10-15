import { z } from 'zod';
import { qrBatchProcessingService } from '@/lib/services/qr-batch-processing.service';
import type { ToolDefinition } from './types.js';

const QrBatchStatusInput = z.object({
  eventId: z.string().min(1, 'eventId es obligatorio'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

type QrBatchStatusInput = z.infer<typeof QrBatchStatusInput>;

export const qrBatchStatusTool: ToolDefinition<QrBatchStatusInput> = {
  name: 'qr_batch_status',
  title: 'Estado de QR por evento',
  description:
    'Resume actividad de escaneos QR para un evento: volumen, éxito, horarios pico y errores frecuentes.',
  inputSchema: {
    type: 'object',
    required: ['eventId'],
    properties: {
      eventId: {
        type: 'string',
        description: 'ID del evento para calcular métricas de QR.',
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha inicial ISO para filtrar eventos de escaneo.',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha final ISO para filtrar eventos de escaneo.',
      },
    },
  },
  metadata: {
    'openai/toolHint':
      'Ideal para responder sobre engagement QR: cuántos escaneos hubo, errores y cuándo se concentran.',
  },
  parseInput: (value) => QrBatchStatusInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Solicitud cancelada.' }],
        isError: true,
      };
    }

    try {
      const timeRange =
        input.startDate || input.endDate
          ? {
              start: input.startDate ? new Date(input.startDate) : new Date('1970-01-01T00:00:00Z'),
              end: input.endDate ? new Date(input.endDate) : new Date(),
            }
          : undefined;

      const analytics = await qrBatchProcessingService.getBatchAnalytics({
        eventId: input.eventId,
        timeRange,
      });

      const { metrics } = analytics;

      const successRatePercentage = (metrics.successRate * 100).toFixed(1);
      const scansByHour = metrics.scansByHour as Record<string, number>;
      const scansByDay = metrics.scansByDay as Record<string, number>;
      const errorAnalysis = metrics.errorAnalysis as Record<string, number>;

      const topHourEntry = Object.entries(scansByHour).sort(
        (a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0)
      )[0];

      const topDayEntry = Object.entries(scansByDay).sort(
        (a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0)
      )[0];

      const topDevice = metrics.popularDevices[0];

      const summaryParts = [
        `Se registraron ${metrics.totalScans} escaneos (${metrics.uniqueScans} únicos) para el evento ${input.eventId}.`,
        `Tasa de éxito: ${successRatePercentage}%. Tiempo promedio: ${metrics.avgScanTime.toFixed(1)}s.`,
      ];

      if (topHourEntry) {
        summaryParts.push(`Hora pico: ${topHourEntry[0]}h con ${topHourEntry[1]} escaneos.`);
      }

      if (topDayEntry) {
        summaryParts.push(`Día más activo: ${topDayEntry[0]} (${topDayEntry[1]} escaneos).`);
      }

      if (topDevice) {
        summaryParts.push(
          `Dispositivo más usado: ${topDevice.device} (${topDevice.count} escaneos).`
        );
      }

      const errorEntries = Object.entries(errorAnalysis)
        .filter(([, count]) => Number(count) > 0)
        .slice(0, 3);

      if (errorEntries.length > 0) {
        summaryParts.push(
          `Errores frecuentes: ${errorEntries
            .map(([label, count]) => `${label} (${count})`)
            .join(', ')}.`
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
          eventId: input.eventId,
          metrics,
          timeRange,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible obtener el estado de QR.';
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
