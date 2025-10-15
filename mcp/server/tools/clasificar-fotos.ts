import { z } from 'zod';
import { photoClassificationService } from '@/lib/services/photo-classification.service';
import type { ToolDefinition } from './types.js';

const ClasificarFotosInput = z.object({
  photoIds: z.array(z.string().min(1)).nonempty(),
});

type ClasificarFotosInput = z.infer<typeof ClasificarFotosInput>;

export const clasificarFotosTool: ToolDefinition<ClasificarFotosInput> = {
  name: 'clasificar_fotos',
  title: 'Clasificar fotos (IA heurística)',
  description:
    'Analiza fotografías y estima si son grupales o individuales, devolviendo confianza y razones.',
  inputSchema: {
    type: 'object',
    properties: {
      photoIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'IDs de fotos a clasificar.',
      },
    },
    required: ['photoIds'],
  },
  parseInput: (value) => ClasificarFotosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Clasificación cancelada.' }],
        isError: true,
      };
    }

    const results = await photoClassificationService.classifyPhotos(
      input.photoIds
    );

    const resumen = results
      .map(
        (r) =>
          `${r.photoId}: ${r.isGroupPhoto ? 'grupo' : 'individual'} (confianza ${(r.confidence * 100).toFixed(0)}%)`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Clasificación completada para ${results.length} fotos:\n${resumen}`,
        },
      ],
      _meta: {
        results,
      },
    };
  },
};
