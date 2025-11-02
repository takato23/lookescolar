import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, Download, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    order?: string;
    payment_id?: string;
  }>;
}

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  const orderId = resolvedSearchParams.order;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-center text-2xl font-bold">¡Pago Aprobado!</h1>

        {/* Message */}
        <p className="mb-8 text-center text-gray-600">
          Tu pago ha sido procesado exitosamente. Recibirás un email de
          confirmación con los detalles de tu pedido.
        </p>

        {/* Order Info */}
        {orderId && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm text-gray-500">Número de pedido</p>
            <p className="font-mono font-semibold">{orderId}</p>
          </div>
        )}

        {/* Next Steps */}
        <div className="mb-8 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Próximos pasos:</h3>
          <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
            <li>Recibirás un email con la confirmación del pago</li>
            <li>La fotógrafa preparará tu pedido</li>
            <li>Te contactaremos para coordinar la entrega</li>
            <li>Recibirás las fotos originales sin marca de agua</li>
          </ol>
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
                Ver Detalles del Pedido
              </Button>
            </Link>
          )}
        </div>

        {/* Support */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Si tienes alguna pregunta, contacta a la fotógrafa a través del email
          proporcionado en la confirmación.
        </p>
      </div>
    </div>
  );
}
