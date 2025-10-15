// @ts-nocheck
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { ToolDefinition } from './types.js';

const ComboItemInput = z.object({
  productId: z.string().min(1, 'productId es requerido'),
  quantity: z.coerce.number().int().min(1).default(1),
  isRequired: z.boolean().optional().default(true),
  additionalPrice: z.coerce.number().min(0).default(0),
});

const CrearPaqueteInput = z.object({
  name: z.string().min(1, 'name es requerido'),
  description: z.string().optional(),
  minPhotos: z.coerce.number().int().min(1).default(1),
  maxPhotos: z
    .union([z.coerce.number().int().min(1), z.null()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value)),
  allowsDuplicates: z.boolean().optional().default(true),
  pricingType: z.string().min(1, 'pricingType es requerido'),
  basePrice: z.coerce.number().min(0, 'basePrice debe ser >= 0'),
  pricePerPhoto: z
    .union([z.coerce.number().min(0), z.null()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value)),
  imageUrl: z.string().url().optional(),
  badgeText: z.string().optional(),
  badgeColor: z.string().optional(),
  isFeatured: z.boolean().optional().default(false),
  items: z.array(ComboItemInput).default([]),
});

type CrearPaqueteInput = z.infer<typeof CrearPaqueteInput>;

export const crearPaqueteTool: ToolDefinition<CrearPaqueteInput> = {
  name: 'crear_paquete',
  title: 'Crear paquete combo',
  description:
    'Crea un paquete combo (combo_packages) con sus ítems asociados para la tienda de LookEscolar. Úsalo cuando el usuario quiera definir una nueva oferta de productos.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Nombre comercial del paquete.',
      },
      description: {
        type: 'string',
        description: 'Descripción visible para familias.',
      },
      minPhotos: {
        type: 'integer',
        minimum: 1,
        default: 1,
      },
      maxPhotos: {
        anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
        description:
          'Límite máximo de fotos permitidas. Usa null para sin límite.',
      },
      allowsDuplicates: {
        type: 'boolean',
        default: true,
        description:
          'Permite repetir la misma foto varias veces dentro del paquete.',
      },
      pricingType: {
        type: 'string',
        description:
          'Tipo de pricing definido en combo_packages.pricing_type (ej. fixed, tiered, per_photo).',
      },
      basePrice: {
        type: 'number',
        minimum: 0,
        description: 'Precio base en centavos.',
      },
      pricePerPhoto: {
        anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }],
        description:
          'Precio adicional por foto (en centavos) para esquemas variables.',
      },
      imageUrl: {
        type: 'string',
        format: 'uri',
      },
      badgeText: {
        type: 'string',
      },
      badgeColor: {
        type: 'string',
      },
      isFeatured: {
        type: 'boolean',
        default: false,
      },
      items: {
        type: 'array',
        description:
          'Listado de componentes del paquete (combo_package_items).',
        items: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'ID del producto base.',
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
            isRequired: {
              type: 'boolean',
              default: true,
            },
            additionalPrice: {
              type: 'number',
              minimum: 0,
              default: 0,
              description:
                'Cargo adicional en centavos si este ítem agrega costo.',
            },
          },
          required: ['productId'],
        },
      },
    },
    required: ['name', 'pricingType', 'basePrice'],
  },
  metadata: {
    'openai/toolHint':
      'Solicita confirmación previa si el usuario no proporciona name o basePrice. Operación con impacto financiero.',
  },
  parseInput: (value) => CrearPaqueteInput.parse(value),
  async handler(input, context) {
    if (context.signal.aborted) {
      return {
        content: [
          {
            type: 'text',
            text: 'La creación del paquete fue cancelada.',
          },
        ],
        isError: true,
      };
    }

    const supabase = await createServerSupabaseServiceClient();

    const { data: combo, error } = await supabase
      .from('combo_packages')
      .insert({
        name: input.name,
        description: input.description ?? null,
        min_photos: input.minPhotos,
        max_photos:
          input.maxPhotos === undefined ? null : input.maxPhotos ?? null,
        allows_duplicates: input.allowsDuplicates ?? true,
        pricing_type: input.pricingType,
        base_price: input.basePrice,
        price_per_photo:
          input.pricePerPhoto === undefined
            ? null
            : input.pricePerPhoto ?? null,
        image_url: input.imageUrl ?? null,
        badge_text: input.badgeText ?? null,
        badge_color: input.badgeColor ?? null,
        is_featured: input.isFeatured ?? false,
        sort_order: 0,
        is_active: true,
      })
      .select('*')
      .single();

    if (error || !combo) {
      return {
        content: [
          {
            type: 'text',
            text: `No se pudo crear el paquete: ${error?.message ?? 'error desconocido'}`,
          },
        ],
        isError: true,
      };
    }

    if (input.items.length > 0) {
      const rows = input.items.map((item) => ({
        combo_id: combo.id,
        product_id: item.productId,
        quantity: item.quantity,
        is_required: item.isRequired ?? true,
        additional_price: item.additionalPrice ?? 0,
      }));

      const { error: itemsError } = await supabase
        .from('combo_package_items')
        .insert(rows);

      if (itemsError) {
        return {
          content: [
            {
              type: 'text',
              text: `Paquete ${combo.name} creado, pero ocurrió un error al guardar los items: ${itemsError.message}`,
            },
          ],
          isError: true,
          _meta: {
            combo,
          },
        };
      }
    }

    const { data: comboWithItems } = await supabase
      .from('combo_packages')
      .select(
        `
        *,
        combo_package_items (
          id,
          product_id,
          quantity,
          is_required,
          additional_price
        )
      `
      )
      .eq('id', combo.id)
      .single();

    return {
      content: [
        {
          type: 'text',
          text: `Paquete "${combo.name}" creado correctamente (ID ${combo.id}).`,
        },
      ],
      _meta: {
        combo: comboWithItems ?? combo,
      },
    };
  },
};
