import { z } from 'zod';

// Función de sanitización simple que funciona tanto en cliente como servidor
function sanitizeString(value: string): string {
  if (!value) return '';

  // Sanitización básica que funciona en ambos contextos
  return value
    .trim()
    // Remover caracteres potencialmente peligrosos
    .replace(/[<>]/g, '')
    // Remover scripts y otros elementos peligrosos
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Limitar longitud para prevenir ataques DoS
    .substring(0, 1000);
}

/**
 * 🛡️ Validación y sanitización premium para store-config
 * Implementa validación estricta con Zod y sanitización completa
 */

export const StoreProductSchema = z.object({
  id: z.string()
    .min(1, 'El ID es requerido')
    .max(50, 'ID demasiado largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID debe contener solo letras, números, guiones y guiones bajos'),

  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Nombre demasiado largo')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Caracteres inválidos en el nombre')
    .transform(val => sanitizeString(val)),

  type: z.enum(['physical', 'digital'], {
    errorMap: () => ({ message: 'Tipo debe ser physical o digital' })
  }),

  enabled: z.boolean().default(true),

  price: z.number()
    .min(0, 'Precio debe ser positivo')
    .max(999999999, 'Precio máximo excedido')
    .transform(val => Math.round(val)),

  description: z.string()
    .max(500, 'Descripción demasiado larga')
    .transform(val => sanitizeString(val))
    .optional(),

  options: z.object({
    sizes: z.array(z.string().min(1).max(50)).max(10).optional(),
    formats: z.array(z.string().min(1).max(50)).max(10).optional(),
    quality: z.enum(['standard', 'premium']).optional()
  }).optional()
});

export const StoreConfigSchema = z.object({
  enabled: z.boolean().default(false),

  currency: z.enum(['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'PEN', 'COP', 'MXN'], {
    errorMap: () => ({ message: 'Moneda no válida' })
  }).default('ARS'),

  tax_rate: z.number()
    .min(0, 'Impuestos debe ser positivo')
    .max(100, 'Impuestos no puede exceder 100%')
    .default(0),

  shipping_enabled: z.boolean().default(true),

  shipping_price: z.number()
    .min(0, 'Precio de envío debe ser positivo')
    .max(999999999, 'Precio de envío máximo excedido')
    .default(50000),

  payment_methods: z.array(z.string()
    .min(1, 'Método de pago requerido')
    .max(50, 'Nombre de método de pago demasiado largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Caracteres inválidos en método de pago')
  ).min(1, 'Debe haber al menos un método de pago')
    .max(10, 'Máximo 10 métodos de pago'),

  products: z.array(StoreProductSchema)
    .min(1, 'Debe haber al menos un producto')
    .max(50, 'Máximo 50 productos'),

  // Branding y apariencia
  logo_url: z.string()
    .max(500, 'URL del logo demasiado larga')
    .transform(val => sanitizeString(val))
    .optional(),

  banner_url: z.string()
    .max(500, 'URL del banner demasiado larga')
    .transform(val => sanitizeString(val))
    .optional(),

  colors: z.object({
    primary: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color primario debe ser un hex válido')
      .default('#1f2937'),
    secondary: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color secundario debe ser un hex válido')
      .default('#6b7280'),
    accent: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color de acento debe ser un hex válido')
      .default('#3b82f6'),
    background: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color de fondo debe ser un hex válido')
      .default('#f9fafb'),
    surface: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color de superficie debe ser un hex válido')
      .default('#ffffff'),
    text: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color de texto debe ser un hex válido')
      .default('#111827'),
    text_secondary: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color de texto secundario debe ser un hex válido')
      .default('#6b7280')
  }).optional(),

  texts: z.object({
    hero_title: z.string()
      .min(1, 'El título es requerido')
      .max(100, 'Título demasiado largo')
      .transform(val => sanitizeString(val))
      .default('Galería Fotográfica'),

    hero_subtitle: z.string()
      .max(200, 'Subtítulo demasiado largo')
      .transform(val => sanitizeString(val))
      .default('Encuentra tus mejores momentos escolares'),

    footer_text: z.string()
      .max(100, 'Texto del footer demasiado largo')
      .transform(val => sanitizeString(val))
      .default('© 2024 LookEscolar - Fotografía Escolar'),

    contact_email: z.string()
      .email('Email inválido')
      .max(100, 'Email demasiado largo')
      .transform(val => sanitizeString(val))
      .optional()
      .or(z.literal('')),

    contact_phone: z.string()
      .max(50, 'Teléfono demasiado largo')
      .transform(val => sanitizeString(val))
      .optional()
      .or(z.literal('')),

    terms_url: z.string()
      .url('URL de términos inválida')
      .max(500, 'URL demasiado larga')
      .transform(val => sanitizeString(val))
      .optional()
      .or(z.literal('')),

    privacy_url: z.string()
      .url('URL de privacidad inválida')
      .max(500, 'URL demasiado larga')
      .transform(val => sanitizeString(val))
      .optional()
      .or(z.literal(''))
  }).optional(),

  notification_settings: z.object({
    email_notifications: z.boolean().default(true),
    order_confirmation: z.boolean().default(true),
    download_reminders: z.boolean().default(true),
    expiry_warnings: z.boolean().default(true),
    admin_notifications: z.boolean().default(false),

    reminder_delay_days: z.number()
      .min(1, 'Debe ser al menos 1 día')
      .max(30, 'Máximo 30 días')
      .default(7),

    expiry_warning_days: z.number()
      .min(1, 'Debe ser al menos 1 día')
      .max(60, 'Máximo 60 días')
      .default(3),

    email_templates: z.object({
      order_confirmation: z.object({
        subject: z.string()
          .min(1, 'El asunto es requerido')
          .max(200, 'Asunto demasiado largo')
          .transform(val => sanitizeString(val))
          .default('Confirmación de tu compra - {event_name}'),
        message: z.string()
          .min(10, 'El mensaje es muy corto')
          .max(2000, 'Mensaje demasiado largo')
          .transform(val => sanitizeString(val))
          .default('Hola {customer_name},\n\nTu compra ha sido procesada exitosamente.\n\nProductos comprados:\n{products_list}\n\nTotal: {total_amount}\n\n¡Gracias por tu compra!\n\nSaludos,\nEl equipo de {event_name}')
      }).optional()
    }).optional(),

    smtp: z.object({
      host: z.string()
        .min(1, 'El servidor SMTP es requerido')
        .max(100, 'Nombre de servidor demasiado largo')
        .transform(val => sanitizeString(val))
        .optional(),
      port: z.number()
        .min(1, 'Puerto inválido')
        .max(65535, 'Puerto inválido')
        .default(587),
      username: z.string()
        .max(100, 'Usuario demasiado largo')
        .transform(val => sanitizeString(val))
        .optional(),
      password: z.string()
        .max(100, 'Contraseña demasiado larga')
        .transform(val => sanitizeString(val))
        .optional()
    }).optional(),

    from_email: z.string()
      .email('Email remitente inválido')
      .max(100, 'Email demasiado largo')
      .transform(val => sanitizeString(val))
      .optional()
  }).optional(),

  advanced_settings: z.object({
    global_discount: z.number()
      .min(0, 'Descuento debe ser positivo')
      .max(100, 'Descuento no puede exceder 100%')
      .default(0),

    bulk_discount: z.number()
      .min(0, 'Descuento debe ser positivo')
      .max(50, 'Descuento por volumen no puede exceder 50%')
      .default(0),

    download_limits: z.object({
      enabled: z.boolean().default(false),
      max_downloads_per_photo: z.number()
        .min(1, 'Debe permitir al menos 1 descarga')
        .max(100, 'Máximo 100 descargas por foto')
        .default(10),
      max_downloads_per_user: z.number()
        .min(1, 'Debe permitir al menos 1 descarga')
        .max(500, 'Máximo 500 descargas por usuario')
        .default(50),
      track_downloads: z.boolean().default(true)
    }).optional(),

    download_expiry: z.object({
      enabled: z.boolean().default(false),
      expiry_days: z.number()
        .min(1, 'Debe expirar en al menos 1 día')
        .max(365, 'Máximo 365 días')
        .default(30)
    }).optional(),

    seo: z.object({
      meta_title: z.string()
        .max(60, 'Título SEO demasiado largo (máximo 60 caracteres)')
        .transform(val => sanitizeString(val))
        .optional(),
      meta_description: z.string()
        .max(160, 'Descripción SEO demasiado larga (máximo 160 caracteres)')
        .transform(val => sanitizeString(val))
        .optional(),
      meta_keywords: z.string()
        .max(500, 'Palabras clave demasiado largas')
        .transform(val => sanitizeString(val))
        .optional()
    }).optional(),

    security: z.object({
      password_protection: z.boolean().default(false),
      store_password: z.string()
        .min(6, 'Contraseña debe tener al menos 6 caracteres')
        .max(50, 'Contraseña demasiado larga')
        .transform(val => sanitizeString(val))
        .optional(),
      per_event_settings: z.boolean().default(true)
    }).optional()
  }).optional()
});

export type StoreConfig = z.infer<typeof StoreConfigSchema>;
export type StoreProduct = z.infer<typeof StoreProductSchema>;

/**
 * Valida y sanitiza configuración completa
 */
export function validateStoreConfig(config: any): StoreConfig {
  try {
    const validated = StoreConfigSchema.parse(config);

    // Sanitización adicional para campos de texto
    const sanitized: StoreConfig = {
      ...validated,
      products: validated.products.map(product => ({
        ...product,
        name: sanitizeString(product.name),
        description: product.description ? sanitizeString(product.description) : undefined,
        options: product.options ? {
          ...product.options,
          sizes: product.options.sizes?.map(size => sanitizeString(size)),
          formats: product.options.formats?.map(format => sanitizeString(format))
        } : undefined
      }))
    };

    return sanitized;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Errores de validación: ${errors.join(', ')}`);
    }
    throw new Error('Error de validación desconocido');
  }
}

/**
 * Sanitiza inputs individuales
 */
export function sanitizeInput(value: string): string {
  return sanitizeString(value);
}

/**
 * Valida y sanitiza producto individual
 */
export function validateStoreProduct(product: any): StoreProduct {
  try {
    return StoreProductSchema.parse(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Errores en producto: ${errors.join(', ')}`);
    }
    throw new Error('Error de validación en producto');
  }
}

/**
 * Valida método de pago
 */
export const PaymentMethodSchema = z.object({
  name: z.string()
    .min(1, 'Nombre del método es requerido')
    .max(50, 'Nombre demasiado largo')
    .transform(val => sanitizeString(val)),

  enabled: z.boolean().default(true),

  description: z.string()
    .max(200, 'Descripción demasiado larga')
    .transform(val => sanitizeString(val))
    .optional()
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
