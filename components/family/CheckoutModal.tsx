'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const CheckoutSchema = z.object({
  contactName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(8, 'Teléfono inválido').optional()
});

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  token: string;
}

export function CheckoutModal({
  isOpen,
  onClose,
  subjectId,
  token
}: CheckoutModalProps) {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const totalPrice = getTotalPrice();
  
  if (!isOpen) return null;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
        error.errors.forEach(err => {
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
      const checkoutItems = items.map(item => ({
        photoId: item.photoId,
        quantity: item.quantity,
        unitPrice: item.price
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
          contactPhone: formData.contactPhone || undefined
        })
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
      toast.error(error instanceof Error ? error.message : 'Error al procesar el pago');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load Mercado Pago checkout (fallback method)
  const loadMercadoPagoCheckout = async (preferenceId: string, publicKey: string) => {
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
        locale: 'es-AR'
      });
      
      // Create checkout
      mp.checkout({
        preference: {
          id: preferenceId
        },
        autoOpen: true
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
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
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
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-3">Resumen del Pedido</h3>
              <div className="space-y-2 text-sm">
                {items.map(item => (
                  <div key={item.photoId} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.filename} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalPrice)}</span>
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
                  <p className="text-red-500 text-sm mt-1">{errors.contactName}</p>
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
                  <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>
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
                  <p className="text-red-500 text-sm mt-1">{errors.contactPhone}</p>
                )}
              </div>
            </div>
            
            {/* Payment Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Pago Seguro con Mercado Pago</p>
                  <p className="text-blue-700">
                    Serás redirigido a Mercado Pago para completar el pago de forma segura.
                    Aceptamos tarjetas de crédito, débito y otros medios de pago.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || items.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
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