'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

function PaymentErrorContent() {
  const searchParams = useSearchParams();

  const paymentId = searchParams.get('payment_id');
  const merchantOrderId = searchParams.get('merchant_order_id');
  const preferenceId = searchParams.get('preference_id');
  const externalReference = searchParams.get('external_reference');

  const handleRetryPayment = () => {
    // Redirect back to checkout for retry
    if (externalReference) {
      window.location.href = `/f/${externalReference}/checkout`;
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <div className="text-center">
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h1 className="mb-2 text-2xl font-bold text-red-800">
              Pago Cancelado
            </h1>
            <p className="mb-6 text-gray-600">
              El pago no pudo completarse. Esto puede deberse a:
            </p>

            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
              <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                <li>Cancelación voluntaria del pago</li>
                <li>Problemas con el método de pago</li>
                <li>Fondos insuficientes</li>
                <li>Error temporal del sistema</li>
              </ul>
            </div>

            {externalReference && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                <h3 className="mb-2 font-semibold text-gray-800">
                  Información del pedido:
                </h3>
                <p className="text-sm">
                  <strong>ID del pedido:</strong>{' '}
                  {externalReference.slice(0, 8)}...
                </p>
                {paymentId && (
                  <p className="text-sm">
                    <strong>ID de pago MP:</strong> {paymentId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  onClick={handleRetryPayment}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar Pago
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Volver al Inicio
                  </Link>
                </Button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="mb-2 text-sm text-gray-500">¿Necesitas ayuda?</p>
                <Button variant="link" asChild className="text-sm">
                  <Link href="/contacto">Contactar Soporte</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <Card className="p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600"></div>
                <h1 className="mb-2 text-xl font-semibold">Cargando...</h1>
              </div>
            </Card>
          </div>
        </div>
      }
    >
      <PaymentErrorContent />
    </Suspense>
  );
}
