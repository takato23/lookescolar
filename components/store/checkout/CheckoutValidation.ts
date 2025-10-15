import { z, ZodTypeAny } from 'zod';

export const checkoutSchema = z.object({
  guardianName: z
    .string()
    .trim()
    .min(2, 'Ingresá el nombre del responsable (mínimo 2 caracteres).'),
  guardianEmail: z
    .string()
    .trim()
    .email('Ingresá un correo electrónico válido.'),
  guardianPhone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .superRefine((value, ctx) => {
      if (!value) return;
      const digits = value.replace(/\D/g, '');
      if (digits.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresá un teléfono de contacto válido (mínimo 8 dígitos).',
        });
      }
    }),
  studentName: z
    .string()
    .trim()
    .min(2, 'Ingresá el nombre del alumno o la alumna.'),
  studentGrade: z
    .string()
    .trim()
    .min(2, 'Contanos el curso o sala para coordinar la entrega.'),
  deliveryPreference: z.enum(['school', 'pickup', 'digital'], {
    required_error: 'Elegí una opción de entrega disponible.',
  }),
  notes: z
    .string()
    .trim()
    .max(400, 'El mensaje puede tener hasta 400 caracteres.')
    .optional()
    .or(z.literal('')),
  acceptPolicies: z
    .boolean({ required_error: 'Tenés que aceptar las políticas para continuar.' })
    .refine((value) => value === true, {
      message: 'Tenés que aceptar las políticas para continuar.',
    }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type CheckoutField = keyof CheckoutFormData;

export const checkoutInitialValues: CheckoutFormData = {
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  studentName: '',
  studentGrade: '',
  deliveryPreference: 'school',
  notes: '',
  acceptPolicies: false,
};

type FieldErrors = Partial<Record<CheckoutField, string>>;

export function validateCheckout(data: CheckoutFormData) {
  const result = checkoutSchema.safeParse(data);

  if (result.success) {
    return { valid: true as const, errors: {} as FieldErrors };
  }

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as CheckoutField | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { valid: false as const, errors };
}

const shape = checkoutSchema.shape as Record<CheckoutField, ZodTypeAny>;

export function validateCheckoutField(
  field: CheckoutField,
  value: CheckoutFormData[CheckoutField]
): string | null {
  const fieldSchema = shape[field];
  if (!fieldSchema) return null;

  const result = fieldSchema.safeParse(value);
  if (result.success) {
    return null;
  }

  const issue = result.error.issues[0];
  return issue?.message ?? 'Revisá este campo.';
}

export function mapTouchedErrors(
  touched: Record<CheckoutField, boolean>,
  errors: FieldErrors
): FieldErrors {
  return (Object.keys(touched) as CheckoutField[]).reduce<FieldErrors>((acc, key) => {
    if (touched[key] && errors[key]) {
      acc[key] = errors[key];
    }
    return acc;
  }, {});
}

