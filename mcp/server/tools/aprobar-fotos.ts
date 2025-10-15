import { z } from 'zod';
import { photoService } from '@/lib/services/photo.service';
import type { ToolDefinition } from './types.js';

const AprobarFotosInput = z.object({
  photoIds: z.array(z.string().min(1)).nonempty('Debes incluir al menos una foto'),
  approved: z.boolean().default(true),
  notify: z
    .object({
      enabled: z.boolean().default(false),
      message: z.string().max(500).optional(),
    })
    .optional(),
});

type AprobarFotosInput = z.infer<typeof AprobarFotosInput>;

export const aprobarFotosTool: ToolDefinition<AprobarFotosInput> = {
  name: 'aprobar_fotos',
  title: 'Aprobar o rechazar fotos',
  description:
    'Actualiza el estado de aprobación de múltiples fotos y devuelve un resumen del resultado. Úsalo después de revisar un lote.',
  inputSchema: {
    type: 'object',
    properties: {
      photoIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs de fotos a actualizar.',
      },
      approved: {
        type: 'boolean',
        default: true,
        description: 'Define si las fotos quedan aprobadas (true) o rechazadas (false).',
      },
      notify: {
        type: 'object',
        description:
          'Opcional: especifica si se debe disparar una notificación externa luego de actualizar.',
        properties: {
          enabled: { type: 'boolean', default: false },
          message: { type: 'string', maxLength: 500 },
        },
      },
    },
    required: ['photoIds'],
  },
  parseInput: (value) => AprobarFotosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Operación cancelada antes de comenzar.' }],
        isError: true,
      };
    }

    let successCount = 0;
    const errors: Array<{ photoId: string; error: string }> = [];

    for (const photoId of input.photoIds) {
      if (context.signal.aborted) {
        break;
      }
      try {
        const result = await photoService.updatePhotoApproval(photoId, input.approved);
        if (result.success) {
          successCount += 1;
        } else {
          errors.push({ photoId, error: result.error ?? 'Motivo desconocido' });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        errors.push({ photoId, error: message });
      }
    }

    const failedCount = errors.length;
    const summary = `Se actualizaron ${successCount} fotos. ${failedCount > 0 ? `${failedCount} tuvieron errores.` : 'No hubo fallas.'}`;

    return {
      content: [{ type: 'text', text: summary }],
      _meta: {
        approved: input.approved,
        processed: successCount,
        failed: failedCount,
        errors,
        notify: input.notify,
      },
      isError: failedCount === input.photoIds.length,
    };
  },
};
