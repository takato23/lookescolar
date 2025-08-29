import Link from 'next/link';
import { Clock, Home, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: {
    token: string;
  };
  searchParams: {
    order?: string;
    payment_type?: string;
  };
}

export default function PaymentPendingPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = params;
  const orderId = searchParams.order;
  const paymentType = searchParams.payment_type;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-yellow-50 to-white p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Pending Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-yellow-100 p-4">
            <Clock className="h-16 w-16 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-center text-2xl font-bold">Pago Pendiente</h1>

        {/* Message */}
        <p className="mb-8 text-center text-gray-600">
          Tu pedido ha sido registrado y está pendiente de pago. Te
          notificaremos por email cuando se acredite.
        </p>

        {/* Order Info */}
        {orderId && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm text-gray-500">Número de pedido</p>
            <p className="font-mono font-semibold">{orderId}</p>
          </div>
        )}

        {/* Payment Type Info */}
        {paymentType === 'ticket' && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <p className="mb-1 text-sm font-medium text-blue-900">
                  Pago con boleta
                </p>
                <p className="text-sm text-blue-700">
                  Presenta el código de pago en cualquier punto de pago
                  habilitado. El pago puede demorar hasta 48hs en acreditarse.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-8 rounded-lg bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="mb-2 font-semibold text-yellow-900">
                ¿Qué sigue ahora?
              </h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-yellow-800">
                <li>Completa el pago siguiendo las instrucciones recibidas</li>
                <li>Espera la confirmación (puede demorar algunos minutos)</li>
                <li>Recibirás un email cuando el pago se acredite</li>
                <li>Las fotos quedarán disponibles para descarga</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href={`/f/${token}`} className="block">
            <Button className="w-full" size="lg">
              <Home className="mr-2 h-4 w-4" />
              Volver a la Galería
            </Button>
          </Link>

          {orderId && (
            <Link href={`/f/${token}/orders/${orderId}`} className="block">
              <Button variant="outline" className="w-full">
                Ver Estado del Pedido
              </Button>
            </Link>
          )}
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="mb-2 text-sm text-gray-600">
            ¿Tienes dudas sobre tu pago?
          </p>
          <p className="text-xs text-gray-500">
            Revisa tu email para ver las instrucciones de pago o contacta a la
            fotógrafa si necesitas ayuda.
          </p>
        </div>
      </div>
    </div>
  );
}
