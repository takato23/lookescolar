import Link from 'next/link';
import { XCircle, RefreshCw, Home, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: {
    token: string;
  };
  searchParams: {
    order?: string;
    error?: string;
  };
}

export default function PaymentFailurePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = params;
  const orderId = searchParams.order;
  const errorMessage = searchParams.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-center text-2xl font-bold">
          Pago No Completado
        </h1>

        {/* Message */}
        <p className="mb-8 text-center text-gray-600">
          No se pudo procesar tu pago. No te preocupes, no se realizó ningún
          cargo a tu cuenta y tu carrito sigue disponible.
        </p>

        {/* Error Details */}
        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <p className="mb-1 text-sm font-medium text-red-900">
                  Detalle del error:
                </p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Common Issues */}
        <div className="mb-8 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-900">Posibles causas:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>Fondos insuficientes en la tarjeta</li>
            <li>Límite de crédito excedido</li>
            <li>Datos de la tarjeta incorrectos</li>
            <li>Transacción rechazada por el banco</li>
            <li>Sesión de pago expirada</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href={`/f/${token}`} className="block">
            <Button className="w-full" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Intentar Nuevamente
            </Button>
          </Link>

          <Link href={`/f/${token}`} className="block">
            <Button variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Volver a la Galería
            </Button>
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="mb-2 text-sm text-gray-600">¿Necesitas ayuda?</p>
          <p className="text-xs text-gray-500">
            Contacta a la fotógrafa o intenta con otro medio de pago. Tu carrito
            quedará guardado para cuando quieras continuar.
          </p>
        </div>
      </div>
    </div>
  );
}
