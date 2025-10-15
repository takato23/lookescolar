import { z } from 'zod';
import { photoClassificationService } from '@/lib/services/photo-classification.service';
import type { ToolDefinition } from './types.js';

const AutoClasificarEventoInput = z.object({
  eventId: z.string().min(1),
});

type AutoClasificarEventoInput = z.infer<typeof AutoClasificarEventoInput>;

export const autoClasificarEventoTool: ToolDefinition<AutoClasificarEventoInput> = {
  name: 'auto_clasificar_evento',
  title: 'Auto-clasificar fotos del evento',
  description:
    'Revisa fotos aprobadas sin etiquetar de un evento e intenta clasificar automáticamente las que superen un umbral de confianza.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: { type: 'string' },
    },
    required: ['eventId'],
  },
  parseInput: (value) => AutoClasificarEventoInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Operación cancelada.' }],
        isError: true,
      };
    }

    const result =
      await photoClassificationService.autoClassifyUnassignedPhotos(
        input.eventId
      );

    return {
      content: [
        {
          type: 'text',
          text: `Se clasificaron automáticamente ${result.classified} fotos en el evento ${input.eventId}.`,
        },
      ],
      _meta: {
        classified: result.classified,
        errors: result.errors,
      },
      isError: result.errors.length > 0 && result.classified === 0,
    };
  },
};
