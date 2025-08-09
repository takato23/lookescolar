'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PaymentStatusProps {
  step: 'processing' | 'success' | 'error';
  orderId?: string;
  onBackToGallery: () => void;
}

export default function PaymentStatus({
  step,
  orderId,
  onBackToGallery,
}: PaymentStatusProps) {
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verificar estado del pedido periódicamente si está en processing
  useEffect(() => {
    if (step !== 'processing' || !orderId) return;

    const checkOrderStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/family/order/status?orderId=${orderId}`
        );
        if (response.ok) {
          const data = await response.json();
          setOrderStatus(data.status);

          // Si el estado cambió, actualizar el step
          if (data.status === 'approved') {
            window.location.href = window.location.href.replace(
              'processing',
              'success'
            );
          } else if (['failed', 'cancelled'].includes(data.status)) {
            window.location.href = window.location.href.replace(
              'processing',
              'error'
            );
          }
        }
      } catch (error) {
        console.error('Error verificando estado del pedido:', error);
      } finally {
        setLoading(false);
      }
    };

    // Verificar inmediatamente
    checkOrderStatus();

    // Verificar cada 3 segundos
    const interval = setInterval(checkOrderStatus, 3000);

    // Limpiar interval después de 5 minutos para evitar requests infinitos
    const timeout = setTimeout(
      () => {
        clearInterval(interval);
      },
      5 * 60 * 1000
    );

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step, orderId]);

  if (step === 'processing') {
    return (
      <Card className="p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>

        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Procesando tu pago
        </h2>

        <p className="mb-6 text-gray-600">
          Estamos verificando tu pago con Mercado Pago. Esto puede tomar unos
          momentos.
        </p>

        {orderId && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              <strong>Número de pedido:</strong> #{orderId.slice(-8)}
            </p>
            {orderStatus && (
              <p className="mt-1 text-sm text-gray-600">
                <strong>Estado actual:</strong> {orderStatus}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-600">
          <p>• No cierres esta ventana</p>
          <p>• El pago puede tardar hasta 5 minutos en confirmarse</p>
          <p>• Recibirás un email de confirmación cuando esté listo</p>
        </div>

        <div className="mt-8">
          <Button onClick={onBackToGallery} variant="outline">
            Volver a la Galería
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <span className="text-3xl text-green-600">✓</span>
          </div>
        </div>

        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          ¡Pago exitoso!
        </h2>

        <p className="mb-6 text-gray-600">
          Tu compra ha sido procesada correctamente. Pronto recibirás un email
          con las instrucciones para descargar tus fotos.
        </p>

        {orderId && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              <strong>Número de pedido:</strong> #{orderId.slice(-8)}
            </p>
            <p className="mt-1 text-sm text-green-800">
              Guarda este número para futuras consultas
            </p>
          </div>
        )}

        <div className="mb-8 space-y-3 text-sm text-gray-600">
          <p>• Recibirás un email de confirmación en los próximos minutos</p>
          <p>• Las fotos estarán disponibles sin marca de agua</p>
          <p>• Tienes 30 días para descargarlas</p>
        </div>

        <div className="space-x-4">
          <Button
            onClick={onBackToGallery}
            className="bg-green-600 hover:bg-green-700"
          >
            Ver mis Fotos
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className="p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl text-red-600">✕</span>
          </div>
        </div>

        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Error en el pago
        </h2>

        <p className="mb-6 text-gray-600">
          Hubo un problema procesando tu pago. No te preocupes, no se realizó
          ningún cargo.
        </p>

        {orderId && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              <strong>Referencia del pedido:</strong> #{orderId.slice(-8)}
            </p>
          </div>
        )}

        <div className="mb-8 space-y-3 text-sm text-gray-600">
          <p>• Verifica que tengas fondos suficientes en tu medio de pago</p>
          <p>• Asegúrate de que los datos de la tarjeta sean correctos</p>
          <p>• Si el problema persiste, contacta a tu banco</p>
        </div>

        <div className="space-x-4">
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Intentar de Nuevo
          </Button>
          <Button onClick={onBackToGallery} variant="outline">
            Volver a la Galería
          </Button>
        </div>

        {/* Contacto para ayuda */}
        <div className="mt-8 rounded-lg bg-gray-50 p-4">
          <h4 className="mb-2 font-medium text-gray-900">¿Necesitas ayuda?</h4>
          <p className="mb-2 text-sm text-gray-600">
            Si sigues teniendo problemas, contáctanos:
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">📧 contacto@lookescolar.com</p>
            <p className="text-blue-600">📱 +54 11 1234-5678</p>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
