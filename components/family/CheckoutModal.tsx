'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { useFamilyCartStore } from '@/lib/stores/unified-cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  GalleryThemeService,
  EventTheme,
} from '@/lib/services/gallery-theme.service';

// Validation schema
const CheckoutSchema = z.object({
  contactName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(8, 'Teléfono inválido').optional(),
});

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  token: string;
  eventTheme?: EventTheme;
}

export function CheckoutModal({
  isOpen,
  onClose,
  subjectId,
  token,
  eventTheme = 'default',
}: CheckoutModalProps) {
  const items = useFamilyCartStore((state) => state.items);
  const getTotalPrice = useFamilyCartStore((state) => state.getTotalPrice);
  const clearCart = useFamilyCartStore((state) => state.clearCart);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalPrice = getTotalPrice();

  // Aplicar clases CSS del tema correspondiente
  const themeClass = `theme-${eventTheme}`;

  // Aplicar CSS variables del tema
  useEffect(() => {
    if (!isOpen) return;

    const theme = GalleryThemeService.getTheme(eventTheme);
    const cssVars = GalleryThemeService.generateCSSVars(theme);
    const root = document.documentElement;

    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    return () => {
      Object.keys(cssVars).forEach((property) => {
        root.style.removeProperty(property);
      });
    };
  }, [isOpen, eventTheme]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    try {
      CheckoutSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Prepare items for API
      const checkoutItems = items.map((item) => ({
        photoId: item.photoId,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      // Create payment preference
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          token,
          items: checkoutItems,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la preferencia de pago');
      }

      const { preferenceId, initPoint, publicKey } = await response.json();

      // Clear cart after successful preference creation
      clearCart();

      // Redirect to Mercado Pago checkout
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        // If no initPoint, try to use the Mercado Pago SDK
        await loadMercadoPagoCheckout(preferenceId, publicKey);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al procesar el pago'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load Mercado Pago checkout (fallback method)
  const loadMercadoPagoCheckout = async (
    preferenceId: string,
    publicKey: string
  ) => {
    try {
      // Load Mercado Pago script if not already loaded
      if (!window.MercadoPago) {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Initialize Mercado Pago
      const mp = new window.MercadoPago(publicKey, {
        locale: 'es-AR',
      });

      // Create checkout
      mp.checkout({
        preference: {
          id: preferenceId,
        },
        autoOpen: true,
      });
    } catch (error) {
      console.error('Error loading Mercado Pago:', error);
      toast.error('Error al cargar Mercado Pago');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl ${themeClass}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-xl font-semibold">Finalizar Compra</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Order Summary */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 font-medium">Resumen del Pedido</h3>
              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.photoId} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.filename} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Información de Contacto</h3>

              <div>
                <Label htmlFor="contactName">Nombre completo *</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                {errors.contactName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.contactName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contactEmail">Email *</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                {errors.contactEmail && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.contactEmail}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contactPhone">Teléfono (opcional)</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.contactPhone && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.contactPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-blue-900">
                  <p className="mb-1 font-medium">
                    Pago Seguro con Mercado Pago
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Serás redirigido a Mercado Pago para completar el pago de
                    forma segura. Aceptamos tarjetas de crédito, débito y otros
                    medios de pago.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="theme-button flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="theme-button flex-1"
                disabled={isLoading || items.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar con Mercado Pago
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Add Mercado Pago types to window
declare global {
  interface Window {
    MercadoPago: any;
  }
}
