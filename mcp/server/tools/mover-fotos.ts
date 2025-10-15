import { z } from 'zod';
import { photoService } from '@/lib/services/photo.service';
import type { ToolDefinition } from './types.js';

const MoverFotosInput = z.object({
  eventId: z.string().min(1, 'eventId es requerido'),
  photoIds: z.array(z.string().min(1)).nonempty(),
  targetFolderId: z.union([z.string().min(1), z.null()]).optional(),
});

type MoverFotosInput = z.infer<typeof MoverFotosInput>;

export const moverFotosTool: ToolDefinition<MoverFotosInput> = {
  name: 'mover_fotos',
  title: 'Mover fotos a carpeta',
  description:
    'Reubica un conjunto de fotos dentro de un evento, actualizando su folder objetivo.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'ID del evento propietario de las fotos.',
      },
      photoIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      targetFolderId: {
        anyOf: [
          { type: 'string', description: 'ID de la carpeta destino.' },
          { type: 'null', description: 'Mover a la raíz.' },
        ],
      },
    },
    required: ['eventId', 'photoIds'],
  },
  parseInput: (value) => MoverFotosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Operación cancelada antes de comenzar.' }],
        isError: true,
      };
    }

    const result = await photoService.batchMovePhotos({
      eventId: input.eventId,
      photoIds: input.photoIds,
      targetFolderId: input.targetFolderId ?? null,
    });

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `No fue posible mover las fotos: ${result.error ?? 'error desconocido'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Se movieron ${result.data?.length ?? 0} fotos al destino ${input.targetFolderId ?? 'raíz'}.`,
        },
      ],
      _meta: {
        updated: result.data,
        targetFolderId: input.targetFolderId ?? null,
      },
    };
  },
};
