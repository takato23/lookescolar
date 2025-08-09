'use client';

import { useState } from 'react';
import { z } from 'zod';

const contactSchema = z.object({
  parent_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  parent_email: z.string().email('Email inválido'),
  parent_phone: z.string().optional(),
  delivery_preference: z.enum(['pickup', 'school', 'email']).default('pickup'),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  loading?: boolean;
  initialData?: Partial<ContactFormData>;
}

export function ContactForm({
  onSubmit,
  loading = false,
  initialData,
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    parent_name: initialData?.parent_name || '',
    parent_email: initialData?.parent_email || '',
    parent_phone: initialData?.parent_phone || '',
    delivery_preference: initialData?.delivery_preference || 'pickup',
    notes: initialData?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo al modificarlo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar datos
    try {
      const validatedData = contactSchema.parse(formData);
      setErrors({});
      setIsSubmitting(true);

      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = loading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <h3 className="mb-3 font-semibold text-purple-800">
          📋 Información de Contacto
        </h3>
        <p className="text-sm text-purple-700">
          Complete sus datos para procesar el pedido y coordinar la entrega de
          las fotos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Nombre del responsable */}
        <div className="md:col-span-1">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Nombre del responsable *
          </label>
          <input
            type="text"
            value={formData.parent_name}
            onChange={(e) => handleInputChange('parent_name', e.target.value)}
            disabled={isFormDisabled}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.parent_name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
            } ${isFormDisabled ? 'cursor-not-allowed bg-gray-50' : 'bg-white'}`}
            placeholder="Nombre completo"
          />
          {errors.parent_name && (
            <p className="mt-1 text-sm text-red-600">{errors.parent_name}</p>
          )}
        </div>

        {/* Email */}
        <div className="md:col-span-1">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            type="email"
            value={formData.parent_email}
            onChange={(e) => handleInputChange('parent_email', e.target.value)}
            disabled={isFormDisabled}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.parent_email
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
            } ${isFormDisabled ? 'cursor-not-allowed bg-gray-50' : 'bg-white'}`}
            placeholder="correo@ejemplo.com"
          />
          {errors.parent_email && (
            <p className="mt-1 text-sm text-red-600">{errors.parent_email}</p>
          )}
        </div>
      </div>

      {/* Teléfono (opcional) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Teléfono (opcional)
        </label>
        <input
          type="tel"
          value={formData.parent_phone}
          onChange={(e) => handleInputChange('parent_phone', e.target.value)}
          disabled={isFormDisabled}
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${
            isFormDisabled ? 'cursor-not-allowed bg-gray-50' : 'bg-white'
          }`}
          placeholder="+54 11 1234-5678"
        />
      </div>

      {/* Preferencia de entrega */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Preferencia de entrega
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="delivery_preference"
              value="pickup"
              checked={formData.delivery_preference === 'pickup'}
              onChange={(e) =>
                handleInputChange('delivery_preference', e.target.value)
              }
              disabled={isFormDisabled}
              className="mr-3 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                📍 Retiro en estudio
              </div>
              <div className="text-xs text-gray-500">
                Coordinaremos el retiro personal en nuestro estudio
              </div>
            </div>
          </label>

          <label className="flex items-center">
            <input
              type="radio"
              name="delivery_preference"
              value="school"
              checked={formData.delivery_preference === 'school'}
              onChange={(e) =>
                handleInputChange('delivery_preference', e.target.value)
              }
              disabled={isFormDisabled}
              className="mr-3 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                🏫 Entrega en el colegio
              </div>
              <div className="text-xs text-gray-500">
                Las fotos se entregarán directamente en el colegio
              </div>
            </div>
          </label>

          <label className="flex items-center">
            <input
              type="radio"
              name="delivery_preference"
              value="email"
              checked={formData.delivery_preference === 'email'}
              onChange={(e) =>
                handleInputChange('delivery_preference', e.target.value)
              }
              disabled={isFormDisabled}
              className="mr-3 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                📧 Envío por email
              </div>
              <div className="text-xs text-gray-500">
                Fotos digitales enviadas a su correo (sin marca de agua)
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Notas adicionales */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Notas adicionales (opcional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          disabled={isFormDisabled}
          rows={3}
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${
            isFormDisabled ? 'cursor-not-allowed bg-gray-50' : 'bg-white'
          }`}
          placeholder="Instrucciones especiales, horarios de contacto, etc."
          maxLength={500}
        />
        <div className="mt-1 text-right text-xs text-gray-500">
          {formData.notes.length}/500 caracteres
        </div>
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
        )}
      </div>

      {/* Botón de envío */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isFormDisabled}
          className="w-full rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Procesando pedido...
            </div>
          ) : (
            '💳 Proceder al Pago con Mercado Pago'
          )}
        </button>

        <p className="mt-3 text-center text-xs text-gray-500">
          Al continuar, será redirigido a Mercado Pago para completar el pago de
          forma segura. Sus datos se procesan de manera confidencial.
        </p>
      </div>
    </form>
  );
}
