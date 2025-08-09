'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ContactInfoSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

interface CheckoutFormProps {
  onSubmit: (contactInfo: ContactInfo) => Promise<void>;
  loading: boolean;
}

export default function CheckoutForm({ onSubmit, loading }: CheckoutFormProps) {
  const [formData, setFormData] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Limpiar errores anteriores
      setErrors({});

      // Validar datos
      const validation = ContactInfoSchema.safeParse(formData);
      if (!validation.success) {
        const newErrors: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
        return;
      }

      // Enviar datos
      await onSubmit(validation.data);
    } catch (error) {
      console.error('Error en formulario:', error);
    }
  };

  const handleInputChange = (field: keyof ContactInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="p-6">
      <h2 className="mb-6 text-xl font-semibold">Datos de Contacto</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre completo */}
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Nombre completo *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ingresa tu nombre completo"
            required
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="tu@email.com"
            required
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Te enviaremos la confirmación de compra a este email
          </p>
        </div>

        {/* Teléfono */}
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Teléfono (opcional)
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+54 11 1234-5678"
          />
          <p className="mt-1 text-xs text-gray-500">
            Para contactarte en caso de consultas sobre tu pedido
          </p>
        </div>

        {/* Términos y condiciones */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-900">
            Términos de la compra:
          </h3>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>
              • Las fotos se entregarán en formato digital sin marca de agua
            </li>
            <li>
              • El pago se procesa de forma segura a través de Mercado Pago
            </li>
            <li>
              • Recibirás una confirmación por email una vez aprobado el pago
            </li>
            <li>• Las fotos estarán disponibles para descarga por 30 días</li>
          </ul>
        </div>

        {/* Botón de envío */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              'Continuar al Pago'
            )}
          </Button>
        </div>

        {/* Nota de seguridad */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 Tus datos están protegidos con encriptación SSL
          </p>
        </div>
      </form>
    </Card>
  );
}
