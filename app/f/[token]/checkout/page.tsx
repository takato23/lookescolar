'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CheckoutForm from '@/components/family/CheckoutForm';
import PaymentSummary from '@/components/family/PaymentSummary';
import PaymentStatus from '@/components/family/PaymentStatus';

// Schema para validación de datos de contacto
const ContactInfoSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

interface CartItem {
  photoId: string;
  priceListItemId: string;
  quantity: number;
  label: string;
  price: number;
}

type CheckoutStep = 'form' | 'payment' | 'processing' | 'success' | 'error';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [step, setStep] = useState<CheckoutStep>('form');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [paymentPreference, setPaymentPreference] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar carrito del localStorage
  useEffect(() => {
    const loadCart = () => {
      try {
        const cartData = localStorage.getItem(`cart_${token}`);
        if (!cartData) {
          router.push(`/f/${token}`);
          return;
        }

        const cart = JSON.parse(cartData);
        if (!cart.items || cart.items.length === 0) {
          router.push(`/f/${token}`);
          return;
        }

        setCartItems(cart.items);
        setLoading(false);
      } catch (error) {
        console.error('Error cargando carrito:', error);
        setError('Error cargando el carrito');
        setLoading(false);
      }
    };

    loadCart();
  }, [token, router]);

  const calculateTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const handleContactSubmit = async (contactData: ContactInfo) => {
    try {
      setLoading(true);
      setContactInfo(contactData);

      // Crear preferencia de pago
      const response = await fetch('/api/family/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          contactInfo: contactData,
          items: cartItems.map((item) => ({
            photoId: item.photoId,
            priceType: 'base', // TODO: Get from item
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(
            'Demasiadas solicitudes. Intenta de nuevo en un momento.'
          );
        }
        if (response.status === 409) {
          throw new Error(
            'Ya tienes un pedido pendiente. Completa el pago anterior o cancélalo.'
          );
        }
        throw new Error(errorData.error || 'Error creando preferencia de pago');
      }

      const preference = await response.json();
      setPaymentPreference({
        preferenceId: preference.preferenceId,
        orderId: preference.orderId,
        redirectUrl: preference.redirectUrl,
      });
      setStep('payment');
    } catch (error) {
      console.error('Error creando preferencia:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentPreference) return;

    try {
      setStep('processing');

      // Redirigir directamente a Mercado Pago
      if (paymentPreference.redirectUrl) {
        window.location.href = paymentPreference.redirectUrl;
      } else {
        throw new Error('URL de redirección no disponible');
      }
    } catch (error) {
      console.error('Error iniciando pago:', error);
      setError('Error iniciando el pago. Intenta de nuevo.');
      setStep('error');
    }
  };

  const handleBackToForm = () => {
    setStep('form');
    setError(null);
  };

  const handleBackToGallery = () => {
    router.push(`/f/${token}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && step !== 'payment') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-6">
            <div className="py-8 text-center">
              <div className="mb-4 text-6xl text-red-500">⚠️</div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Error en el Checkout
              </h2>
              <p className="mb-6 text-gray-600">{error}</p>
              <div className="space-x-4">
                <Button onClick={handleBackToForm} variant="outline">
                  Volver al Formulario
                </Button>
                <Button onClick={handleBackToGallery} variant="secondary">
                  Volver a la Galería
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Finalizar Compra
          </h1>
          <p className="text-gray-600">
            Completa tus datos y procede con el pago seguro
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center ${step === 'form' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  step === 'form'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Datos</span>
            </div>

            <div className="h-px w-16 bg-gray-300"></div>

            <div
              className={`flex items-center ${step === 'payment' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  step === 'payment'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Pago</span>
            </div>

            <div className="h-px w-16 bg-gray-300"></div>

            <div
              className={`flex items-center ${['processing', 'success'].includes(step) ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  ['processing', 'success'].includes(step)
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Confirmación</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {step === 'form' && (
              <CheckoutForm onSubmit={handleContactSubmit} loading={loading} />
            )}

            {step === 'payment' && (
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  Proceder con el Pago
                </h2>
                <p className="mb-6 text-gray-600">
                  Haz clic en el botón para abrir Mercado Pago y completar tu
                  pago de forma segura.
                </p>

                {contactInfo && (
                  <div className="mb-6 rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 font-medium">Datos de contacto:</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Nombre:</strong> {contactInfo.name}
                      <br />
                      <strong>Email:</strong> {contactInfo.email}
                      <br />
                      {contactInfo.phone && (
                        <>
                          <strong>Teléfono:</strong> {contactInfo.phone}
                        </>
                      )}
                    </p>
                  </div>
                )}

                <div className="space-x-4">
                  <Button
                    onClick={handlePayment}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Pagar con Mercado Pago
                  </Button>
                  <Button onClick={handleBackToForm} variant="outline">
                    Volver a Datos
                  </Button>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </Card>
            )}

            {['processing', 'success', 'error'].includes(step) && (
              <PaymentStatus
                step={step}
                orderId={paymentPreference?.orderId}
                onBackToGallery={handleBackToGallery}
              />
            )}
          </div>

          {/* Sidebar - Resumen */}
          <div>
            <PaymentSummary
              items={cartItems}
              total={calculateTotal()}
              step={step}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
