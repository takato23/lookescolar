import { z } from 'zod';
import { photoService } from '@/lib/services/photo.service';
import type { ToolDefinition } from './types.js';

const BuscarFotosInput = z.object({
  eventId: z.string().min(1, 'eventId es requerido'),
  folderId: z
    .union([z.string().min(1), z.null()])
    .optional()
    .transform((value) => value ?? undefined),
  approved: z.boolean().optional(),
  processingStatus: z
    .enum(['pending', 'processing', 'completed', 'failed'])
    .optional(),
  searchTerm: z.string().min(1).optional(),
  sortBy: z
    .enum(['created_at', 'original_filename', 'file_size', 'updated_at'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type BuscarFotosInput = z.infer<typeof BuscarFotosInput>;

export const buscarFotosTool: ToolDefinition<BuscarFotosInput> = {
  name: 'buscar_fotos',
  title: 'Buscar fotos en eventos',
  description:
    'Busca fotos escolares existentes filtrando por evento, carpeta, estado o término. Ideal cuando el usuario necesita ubicar fotos concretas para familias o pedidos.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        description: 'ID del evento escolar a consultar.',
      },
      folderId: {
        anyOf: [
          { type: 'string', description: 'ID de la carpeta dentro del evento.' },
          { type: 'null' },
        ],
      },
      approved: {
        type: 'boolean',
        description:
          'Filtra por estado de aprobación. true para aprobadas, false para pendientes.',
      },
      processingStatus: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed'],
        description: 'Estado de procesamiento técnico de las fotos.',
      },
      searchTerm: {
        type: 'string',
        description:
          'Texto a buscar en el nombre original del archivo (coincidencia parcial).',
      },
      sortBy: {
        type: 'string',
        enum: [
          'created_at',
          'original_filename',
          'file_size',
          'updated_at',
        ],
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
      },
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    },
    required: ['eventId'],
  },
  annotations: {
    readOnlyHint: true,
  },
  metadata: {
    'openai/toolHint':
      'Usa esta herramienta cuando el usuario quiera ubicar fotos o confirmar disponibilidad en un evento.',
  },
  parseInput: (value) => BuscarFotosInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [
          {
            type: 'text',
            text: 'La búsqueda fue cancelada antes de iniciar.',
          },
        ],
        isError: true,
      };
    }

    const result = await photoService.getPhotos({
      eventId: input.eventId,
      folderId: input.folderId,
      approved: input.approved,
      processingStatus: input.processingStatus,
      searchTerm: input.searchTerm,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      page: input.page,
      limit: input.limit,
    });

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `No se pudieron obtener fotos: ${result.error ?? 'error desconocido'}`,
          },
        ],
        isError: true,
      };
    }

    const total = result.pagination?.total ?? result.data?.length ?? 0;
    const preview = (result.data ?? []).slice(0, 5).map((photo) => ({
      id: photo.id,
      filename: photo.original_filename,
      approved: photo.approved,
      createdAt: photo.created_at,
      folderId: photo.folder_id,
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Encontradas ${total} fotos en el evento ${input.eventId}. Mostrando ${preview.length} resultados en la página ${input.page}.`,
        },
      ],
      _meta: {
        pagination: result.pagination,
        preview,
      },
    };
  },
};
