import { z } from 'zod';
import { photoService } from '@/lib/services/photo.service';
import type { ToolDefinition } from './types.js';

const GenerarUrlsInput = z.object({
  photoIds: z.array(z.string().min(1)).nonempty(),
  expiryMinutes: z.coerce.number().int().min(1).max(1440).default(60),
  usePreview: z.boolean().default(true),
});

type GenerarUrlsInput = z.infer<typeof GenerarUrlsInput>;

export const generarUrlsFotosTool: ToolDefinition<GenerarUrlsInput> = {
  name: 'generar_urls_fotos',
  title: 'Generar enlaces compartibles',
  description:
    'Crea URLs firmadas temporales para compartir fotos con familias o colaboradores.',
  inputSchema: {
    type: 'object',
    properties: {
      photoIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      expiryMinutes: {
        type: 'integer',
        minimum: 1,
        maximum: 1440,
        default: 60,
      },
      usePreview: {
        type: 'boolean',
        default: true,
        description: 'Si es true usa la versión preview; si no, la original.',
      },
    },
    required: ['photoIds'],
  },
  parseInput: (value) => GenerarUrlsInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Operación cancelada.' }],
        isError: true,
      };
    }

    const result = await photoService.batchGenerateSignedUrls({
      photoIds: input.photoIds,
      expiryMinutes: input.expiryMinutes,
      usePreview: input.usePreview,
    });

    if (!result.success || !result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `No se pudieron generar enlaces: ${result.error ?? 'error desconocido'}`,
          },
        ],
        isError: true,
      };
    }

    const total = Object.keys(result.data).length;
    return {
      content: [
        {
          type: 'text',
          text: `Se generaron ${total} enlaces válidos por ${input.expiryMinutes} minutos.`,
        },
      ],
      _meta: {
        urls: result.data,
        expiryMinutes: input.expiryMinutes,
        usePreview: input.usePreview,
      },
    };
  },
};
