'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    'checking' | 'pending' | 'approved' | 'failed'
  >('checking');
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  const paymentId = searchParams.get('payment_id');
  const merchantOrderId = searchParams.get('merchant_order_id');
  const preferenceId = searchParams.get('preference_id');
  const externalReference = searchParams.get('external_reference');

  const checkPaymentStatus = async () => {
    if (!externalReference) {
      setStatus('failed');
      return;
    }

    try {
      const response = await fetch(
        `/api/family/order/status?orderId=${externalReference}`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setOrderInfo(data.order);

        if (data.order.status === 'approved') {
          setStatus('approved');
          // Redirect to success page after 2 seconds
          setTimeout(() => {
            router.push(`/f/success?${searchParams.toString()}`);
          }, 2000);
        } else if (data.order.status === 'failed') {
          setStatus('failed');
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('failed');
    }
  };

  useEffect(() => {
    checkPaymentStatus();
  }, [externalReference]);

  // Auto-refresh every 10 seconds for up to 30 times (5 minutes)
  useEffect(() => {
    if (status === 'pending' && pollCount < 30) {
      const timeout = setTimeout(() => {
        setPollCount((prev) => prev + 1);
        checkPaymentStatus();
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [status, pollCount]);

  const handleManualRefresh = () => {
    setPollCount(0);
    setStatus('checking');
    checkPaymentStatus();
  };

  if (status === 'checking') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <h1 className="mb-2 text-xl font-semibold">
                Verificando estado del pago...
              </h1>
              <p className="text-gray-600">
                Estamos consultando el estado de tu pago.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <h1 className="mb-2 text-2xl font-bold text-green-800">
                ¡Pago Aprobado!
              </h1>
              <p className="mb-6 text-gray-600">
                Tu pago ha sido aprobado exitosamente. Serás redirigido en unos
                segundos...
              </p>

              <div className="animate-pulse">
                <div className="h-1 rounded bg-green-200">
                  <div className="h-1 animate-pulse rounded bg-green-500"></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h1 className="mb-2 text-2xl font-bold text-red-800">
                Pago Rechazado
              </h1>
              <p className="mb-6 text-gray-600">
                Tu pago no pudo ser procesado. Por favor, intenta de nuevo con
                otro método de pago.
              </p>

              <div className="space-x-4">
                <Button asChild>
                  <Link href={`/f/error?${searchParams.toString()}`}>
                    Ver Detalles del Error
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Pending state
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <div className="text-center">
            <Clock className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
            <h1 className="mb-2 text-2xl font-bold text-yellow-800">
              Pago en Proceso
            </h1>
            <p className="mb-6 text-gray-600">
              Tu pago está siendo procesado. Esto puede tardar unos minutos.
            </p>

            {orderInfo && (
              <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left">
                <h3 className="mb-2 font-semibold text-yellow-800">
                  Información del pago:
                </h3>
                <p className="text-sm">
                  <strong>ID del pedido:</strong> {orderInfo.id.slice(0, 8)}...
                </p>
                <p className="text-sm">
                  <strong>Total:</strong> $
                  {(orderInfo.total_amount_cents / 100).toFixed(2)}
                </p>
                {paymentId && (
                  <p className="text-sm">
                    <strong>ID de pago MP:</strong> {paymentId}
                  </p>
                )}
                <p className="text-sm">
                  <strong>Estado:</strong> Procesando
                </p>
              </div>
            )}

            <div className="mb-6">
              <div className="mb-2 flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"></div>
                <span>Actualizando automáticamente cada 10 segundos</span>
              </div>
              <p className="text-xs text-gray-400">
                Verificaciones realizadas: {pollCount}/30
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  onClick={handleManualRefresh}
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar Ahora
                </Button>
                <Button asChild>
                  <Link
                    href={`/f/${orderInfo?.subject?.tokens?.[0]?.token || ''}`}
                  >
                    Volver a la Galería
                  </Link>
                </Button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="mb-2 text-sm text-gray-500">
                  Los pagos en efectivo pueden tardar hasta 48 horas en
                  procesarse.
                </p>
                <Button variant="link" asChild className="text-sm">
                  <Link href="/contacto">
                    ¿Necesitas ayuda? Contacta soporte
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <h1 className="mb-2 text-xl font-semibold">
                Cargando...
              </h1>
            </div>
          </Card>
        </div>
      </div>
    }>
      <PaymentPendingContent />
    </Suspense>
  );
}
