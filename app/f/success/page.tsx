'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [orderStatus, setOrderStatus] = useState<
    'loading' | 'approved' | 'pending' | 'error'
  >('loading');
  const [orderInfo, setOrderInfo] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');
  const merchantOrderId = searchParams.get('merchant_order_id');
  const preferenceId = searchParams.get('preference_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    const checkOrderStatus = async () => {
      if (!externalReference) {
        setOrderStatus('error');
        return;
      }

      try {
        const response = await fetch(
          `/api/family/order/status?orderId=${externalReference}`
        );
        const data = await response.json();

        if (response.ok && data.success && data.orders?.length > 0) {
          const order = data.orders[0]; // Get the first order
          setOrderInfo(order);
          if (order.status === 'approved') {
            setOrderStatus('approved');
          } else if (order.status === 'pending') {
            setOrderStatus('pending');
          } else {
            setOrderStatus('error');
          }
        } else {
          setOrderStatus('error');
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        setOrderStatus('error');
      }
    };

    checkOrderStatus();

    // Poll for status updates if pending
    if (orderStatus === 'pending') {
      const interval = setInterval(checkOrderStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [externalReference, orderStatus]);

  if (orderStatus === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <h1 className="mb-2 text-xl font-semibold">
                Verificando pago...
              </h1>
              <p className="text-gray-600">
                Estamos confirmando el estado de tu pago.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (orderStatus === 'approved') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <h1 className="mb-2 text-2xl font-bold text-green-800">
                ¡Pago Exitoso!
              </h1>
              <p className="mb-6 text-gray-600">
                Tu pago ha sido procesado correctamente. Recibirás un email de
                confirmación en breve.
              </p>

              {orderInfo && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-left">
                  <h3 className="mb-2 font-semibold text-green-800">
                    Detalles del pedido:
                  </h3>
                  <p>
                    <strong>ID del pedido:</strong>{' '}
                    {orderInfo.orderId.slice(0, 8)}...
                  </p>
                  <p>
                    <strong>Total:</strong> $
                    {orderInfo.totalAmount?.toLocaleString('es-AR')}
                  </p>
                  <p>
                    <strong>Estado:</strong> {orderInfo.statusDisplay}
                  </p>
                  <p>
                    <strong>Comprador:</strong> {orderInfo.contactName}
                  </p>
                  {orderInfo.event && (
                    <p>
                      <strong>Evento:</strong> {orderInfo.event.name} -{' '}
                      {orderInfo.event.school}
                    </p>
                  )}
                  {orderInfo.payment?.mpPaymentId && (
                    <p>
                      <strong>ID de pago:</strong>{' '}
                      {orderInfo.payment.mpPaymentId}
                    </p>
                  )}
                </div>
              )}

              <div className="space-x-4">
                <Button asChild>
                  <Link
                    href={`/f/${orderInfo?.subject?.tokens?.[0]?.token || ''}`}
                  >
                    Volver a la Galería
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (orderStatus === 'pending') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <Clock className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
              <h1 className="mb-2 text-2xl font-bold text-yellow-800">
                Pago Pendiente
              </h1>
              <p className="mb-6 text-gray-600">
                Tu pago está siendo procesado. Te notificaremos cuando se
                complete.
              </p>

              {orderInfo && (
                <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left">
                  <h3 className="mb-2 font-semibold text-yellow-800">
                    Detalles del pedido:
                  </h3>
                  <p>
                    <strong>ID del pedido:</strong>{' '}
                    {orderInfo.orderId.slice(0, 8)}...
                  </p>
                  <p>
                    <strong>Total:</strong> $
                    {orderInfo.totalAmount?.toLocaleString('es-AR')}
                  </p>
                  <p>
                    <strong>Estado:</strong> {orderInfo.statusDisplay}
                  </p>
                  <p>
                    <strong>Comprador:</strong> {orderInfo.contactName}
                  </p>
                  {orderInfo.nextSteps?.length > 0 && (
                    <div className="mt-2">
                      <strong>Próximos pasos:</strong>
                      <ul className="ml-2 list-inside list-disc">
                        {orderInfo.nextSteps
                          .slice(0, 2)
                          .map((step: string, index: number) => (
                            <li key={index} className="text-sm">
                              {step}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="space-x-4">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Actualizar Estado
                </Button>
                <Button asChild>
                  <Link
                    href={`/f/${orderInfo?.subject?.tokens?.[0]?.token || ''}`}
                  >
                    Volver a la Galería
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <div className="text-center">
            <div className="mb-4 text-6xl text-red-500">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold text-red-800">
              Error en el Pago
            </h1>
            <p className="mb-6 text-gray-600">
              Hubo un problema procesando tu pago. Por favor, intenta de nuevo.
            </p>

            <div className="space-x-4">
              <Button variant="outline" asChild>
                <Link href="/contacto">Contactar Soporte</Link>
              </Button>
              <Button asChild>
                <Link href="/">Volver al Inicio</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
