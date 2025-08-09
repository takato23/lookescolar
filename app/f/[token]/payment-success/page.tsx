import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, Download, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: {
    token: string;
  };
  searchParams: {
    order?: string;
    payment_id?: string;
  };
}

export default function PaymentSuccessPage({ params, searchParams }: PageProps) {
  const { token } = params;
  const orderId = searchParams.order;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-4">
          ¡Pago Aprobado!
        </h1>
        
        {/* Message */}
        <p className="text-gray-600 text-center mb-8">
          Tu pago ha sido procesado exitosamente. Recibirás un email de confirmación
          con los detalles de tu pedido.
        </p>
        
        {/* Order Info */}
        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Número de pedido</p>
            <p className="font-mono font-semibold">{orderId}</p>
          </div>
        )}
        
        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">Próximos pasos:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
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
              <Home className="h-4 w-4 mr-2" />
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
        <p className="text-xs text-gray-500 text-center mt-6">
          Si tienes alguna pregunta, contacta a la fotógrafa a través del email
          proporcionado en la confirmación.
        </p>
      </div>
    </div>
  );
}