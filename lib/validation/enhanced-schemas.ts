import { z } from 'zod';

// Custom validators
const fileSize = (maxSizeInMB: number) =>
  z
    .number()
    .max(
      maxSizeInMB * 1024 * 1024,
      `El archivo no debe superar ${maxSizeInMB}MB`
    );

const imageFile = z.object({
  type: z
    .string()
    .regex(
      /^image\/(jpeg|png|webp)$/,
      'Solo se permiten imágenes JPEG, PNG o WebP'
    ),
  size: fileSize(10),
  name: z.string().min(1, 'El archivo debe tener un nombre'),
});

const phoneNumber = z
  .string()
  .regex(/^[+]?[1-9][\d]{0,15}$/, 'Número de teléfono inválido')
  .optional();

const email = z.string().email('Email inválido').min(1, 'Email es requerido');

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
  );

const uuid = z.string().uuid('ID inválido');

const positiveNumber = z.number().positive('Debe ser un número positivo');

const nonEmptyString = z.string().min(1, 'Este campo es requerido');

// Enhanced photo schemas
export const photoUploadSchema = z.object({
  files: z.array(imageFile).min(1, 'Debes seleccionar al menos una imagen'),
  eventId: uuid,
  subjectId: uuid.optional(),
  watermarkOpacity: z.number().min(0).max(1).default(0.3),
  generatePreviews: z.boolean().default(true),
  compressImages: z.boolean().default(true),
  maxWidth: z.number().positive().max(4000).default(1920),
  maxHeight: z.number().positive().max(4000).default(1080),
});

export const photoUpdateSchema = z.object({
  id: uuid,
  approved: z.boolean().optional(),
  subjectId: uuid.optional(),
  eventId: uuid.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const photoBatchUpdateSchema = z.object({
  photoIds: z.array(uuid).min(1, 'Debes seleccionar al menos una foto'),
  updates: z.object({
    approved: z.boolean().optional(),
    subjectId: uuid.optional(),
    eventId: uuid.optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Enhanced event schemas
export const eventCreateSchema = z.object({
  school: nonEmptyString.max(200, 'El nombre de la escuela es muy largo'),
  date: z.string().datetime('Fecha inválida'),
  description: z.string().max(500, 'La descripción es muy larga').optional(),
  active: z.boolean().default(true),
  pricing: z
    .object({
      basePrice: positiveNumber,
      bulkDiscounts: z
        .array(
          z.object({
            minQuantity: positiveNumber,
            discountPercent: z.number().min(0).max(100),
          })
        )
        .optional(),
    })
    .optional(),
  settings: z
    .object({
      allowPublicGallery: z.boolean().default(false),
      requireApproval: z.boolean().default(true),
      autoGenerateTokens: z.boolean().default(true),
      maxPhotosPerFamily: z.number().positive().optional(),
    })
    .optional(),
});

export const eventUpdateSchema = eventCreateSchema.partial().extend({
  id: uuid,
});

// Enhanced subject schemas
export const subjectCreateSchema = z.object({
  name: nonEmptyString.max(100, 'El nombre es muy largo'),
  eventId: uuid,
  description: z.string().max(300, 'La descripción es muy larga').optional(),
  active: z.boolean().default(true),
  capacity: z.number().positive().optional(),
  grade: z.string().max(50).optional(),
  division: z.string().max(50).optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial().extend({
  id: uuid,
});

// Enhanced student schemas
export const studentCreateSchema = z.object({
  firstName: nonEmptyString.max(100, 'El nombre es muy largo'),
  lastName: nonEmptyString.max(100, 'El apellido es muy largo'),
  subjectId: uuid,
  studentNumber: z.string().max(50).optional(),
  grade: z.string().max(50).optional(),
  division: z.string().max(50).optional(),
  birthDate: z.string().date().optional(),
  parentEmail: email.optional(),
  parentPhone: phoneNumber,
  notes: z.string().max(500).optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  id: uuid,
});

export const studentBulkCreateSchema = z.object({
  subjectId: uuid,
  students: z
    .array(studentCreateSchema.omit({ subjectId: true }))
    .min(1, 'Debes incluir al menos un estudiante'),
  generateTokens: z.boolean().default(true),
  sendEmails: z.boolean().default(false),
});

// Enhanced order schemas
export const orderCreateSchema = z.object({
  eventId: uuid,
  subjectId: uuid,
  customerName: nonEmptyString.max(200),
  customerEmail: email,
  customerPhone: phoneNumber,
  items: z
    .array(
      z.object({
        photoId: uuid,
        priceListItemId: uuid,
        quantity: positiveNumber,
      })
    )
    .min(1, 'Debes seleccionar al menos una foto'),
  notes: z.string().max(500).optional(),
  totalCents: positiveNumber,
  paymentMethod: z
    .enum(['mercadopago', 'transfer', 'cash'])
    .default('mercadopago'),
});

export const orderUpdateSchema = z.object({
  id: uuid,
  status: z
    .enum(['pending', 'paid', 'processing', 'completed', 'cancelled'])
    .optional(),
  mpPaymentId: z.string().optional(),
  notes: z.string().max(500).optional(),
  processedAt: z.string().datetime().optional(),
});

// Enhanced authentication schemas
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es requerida'),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
    firstName: nonEmptyString.max(100),
    lastName: nonEmptyString.max(100),
    acceptTerms: z
      .boolean()
      .refine(
        (val) => val === true,
        'Debes aceptar los términos y condiciones'
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z
  .object({
    email,
    token: z.string().min(1, 'Token inválido'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// Enhanced payment schemas
export const paymentPreferenceSchema = z.object({
  orderId: uuid,
  items: z
    .array(
      z.object({
        title: nonEmptyString,
        quantity: positiveNumber,
        unitPrice: positiveNumber,
        pictureUrl: z.string().url().optional(),
      })
    )
    .min(1),
  payer: z.object({
    name: nonEmptyString,
    email,
    phone: phoneNumber,
  }),
  backUrls: z.object({
    success: z.string().url(),
    pending: z.string().url(),
    failure: z.string().url(),
  }),
  autoReturn: z.enum(['approved', 'all']).default('approved'),
  externalReference: z.string().optional(),
});

export const webhookSchema = z.object({
  id: z.number(),
  liveMode: z.boolean(),
  type: z.string(),
  dateCreated: z.string(),
  applicationId: z.number(),
  userId: z.number().optional(),
  version: z.number(),
  apiVersion: z.string(),
  action: z.string(),
  data: z.object({
    id: z.string(),
  }),
});

// Enhanced search and filter schemas
export const photoFilterSchema = z.object({
  eventId: uuid.optional(),
  subjectId: uuid.optional(),
  approved: z.boolean().optional(),
  tagged: z.boolean().optional(),
  search: z.string().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  sortBy: z.enum(['date', 'name', 'size']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().default(0),
});

export const orderFilterSchema = z.object({
  eventId: uuid.optional(),
  subjectId: uuid.optional(),
  status: z
    .enum(['pending', 'paid', 'processing', 'completed', 'cancelled'])
    .optional(),
  customerEmail: email.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  sortBy: z.enum(['date', 'total', 'status']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().default(0),
});

// Enhanced configuration schemas
export const appConfigSchema = z.object({
  site: z.object({
    name: nonEmptyString,
    description: z.string().optional(),
    url: z.string().url(),
    logoUrl: z.string().url().optional(),
  }),
  features: z.object({
    publicGallery: z.boolean().default(false),
    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    autoApproval: z.boolean().default(false),
    watermarks: z.boolean().default(true),
  }),
  limits: z.object({
    maxFileSize: z.number().positive().default(10),
    maxFilesPerUpload: z.number().positive().default(50),
    maxOrderValue: z.number().positive().default(100000),
    tokenExpiryDays: z.number().positive().default(30),
  }),
  mercadoPago: z.object({
    publicKey: nonEmptyString,
    accessToken: nonEmptyString,
    webhookUrl: z.string().url(),
    environment: z.enum(['sandbox', 'production']).default('sandbox'),
  }),
  email: z.object({
    fromAddress: email,
    fromName: nonEmptyString,
    replyTo: email.optional(),
    provider: z.enum(['smtp', 'resend', 'sendgrid']).default('smtp'),
    templates: z.object({
      orderConfirmation: nonEmptyString,
      tokenGeneration: nonEmptyString,
      paymentSuccess: nonEmptyString,
    }),
  }),
});

// Type exports
export type PhotoUpload = z.infer<typeof photoUploadSchema>;
export type PhotoUpdate = z.infer<typeof photoUpdateSchema>;
export type PhotoBatchUpdate = z.infer<typeof photoBatchUpdateSchema>;
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type SubjectCreate = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdate = z.infer<typeof subjectUpdateSchema>;
export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type StudentBulkCreate = z.infer<typeof studentBulkCreateSchema>;
export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderUpdate = z.infer<typeof orderUpdateSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type PaymentPreference = z.infer<typeof paymentPreferenceSchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type PhotoFilter = z.infer<typeof photoFilterSchema>;
export type OrderFilter = z.infer<typeof orderFilterSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

// Validation utilities
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateData(schema, data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }
    return result.data;
  };
}

// Schema registry for dynamic validation
export const schemaRegistry = {
  photoUpload: photoUploadSchema,
  photoUpdate: photoUpdateSchema,
  photoBatchUpdate: photoBatchUpdateSchema,
  eventCreate: eventCreateSchema,
  eventUpdate: eventUpdateSchema,
  subjectCreate: subjectCreateSchema,
  subjectUpdate: subjectUpdateSchema,
  studentCreate: studentCreateSchema,
  studentUpdate: studentUpdateSchema,
  studentBulkCreate: studentBulkCreateSchema,
  orderCreate: orderCreateSchema,
  orderUpdate: orderUpdateSchema,
  login: loginSchema,
  register: registerSchema,
  resetPassword: resetPasswordSchema,
  paymentPreference: paymentPreferenceSchema,
  webhook: webhookSchema,
  photoFilter: photoFilterSchema,
  orderFilter: orderFilterSchema,
  appConfig: appConfigSchema,
} as const;

export type SchemaKey = keyof typeof schemaRegistry;
