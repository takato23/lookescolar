import { z } from 'zod';
import { folderService } from '@/lib/services/folder.service';
import type { ToolDefinition } from './types.js';

const ListarCarpetasInput = z.object({
  eventId: z.string().min(1),
  parentId: z.union([z.string().min(1), z.null()]).optional(),
});

type ListarCarpetasInput = z.infer<typeof ListarCarpetasInput>;

export const listarCarpetasTool: ToolDefinition<ListarCarpetasInput> = {
  name: 'listar_carpetas_evento',
  title: 'Listar carpetas de un evento',
  description:
    'Devuelve la estructura de carpetas de un evento para facilitar la organización y la navegación.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: { type: 'string' },
      parentId: {
        anyOf: [
          { type: 'string', description: 'ID de carpeta padre para filtrar' },
          { type: 'null' },
        ],
      },
    },
    required: ['eventId'],
  },
  parseInput: (value) => ListarCarpetasInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [{ type: 'text', text: 'Operación cancelada.' }],
        isError: true,
      };
    }

    const result = await folderService.getFolders(
      input.eventId,
      input.parentId ?? undefined
    );

    if (!result.success || !result.folders) {
      return {
        content: [
          {
            type: 'text',
            text: `No se pudieron obtener las carpetas: ${result.error ?? 'error desconocido'}`,
          },
        ],
        isError: true,
      };
    }

    const total = result.folders.length;
    return {
      content: [
        {
          type: 'text',
          text: `Se listaron ${total} carpetas para el evento ${input.eventId}.`,
        },
      ],
      _meta: {
        folders: result.folders,
        parentId: input.parentId ?? null,
      },
    };
  },
};
