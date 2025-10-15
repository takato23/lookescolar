// @ts-nocheck
import { z } from 'zod';
import { folderService } from '@/lib/services/folder.service';
import type { ToolDefinition } from './types.js';

const CrearCarpetaInput = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(255),
  parentId: z.union([z.string().min(1), z.null()]).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

type CrearCarpetaInput = z.infer<typeof CrearCarpetaInput>;

export const crearCarpetaTool: ToolDefinition<CrearCarpetaInput> = {
  name: 'crear_carpeta_evento',
  title: 'Crear carpeta de evento',
  description:
    'Genera una carpeta nueva dentro de un evento, permitiendo organizar fotografías por curso, día o sesión.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: { type: 'string' },
      name: { type: 'string' },
      parentId: {
        anyOf: [
          { type: 'string', description: 'ID de carpeta padre' },
          { type: 'null' },
        ],
      },
      description: { type: 'string' },
      sortOrder: { type: 'integer' },
    },
    required: ['eventId', 'name'],
  },
  parseInput: (value) => CrearCarpetaInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Solicitud cancelada.' }],
        isError: true,
      };
    }

    const result = await folderService.createFolder(input.eventId, {
      name: input.name,
      parent_id: input.parentId ?? null,
      description: input.description,
      sort_order: input.sortOrder,
    });

    if (!result.success || !result.folder) {
      return {
        content: [
          {
            type: 'text',
            text: `No se pudo crear la carpeta: ${result.error ?? 'error desconocido'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Carpeta "${result.folder.name}" creada correctamente en el evento ${input.eventId}.`,
        },
      ],
      _meta: {
        folder: result.folder,
      },
    };
  },
};
