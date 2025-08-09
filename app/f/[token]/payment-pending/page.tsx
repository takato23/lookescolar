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

export default function PaymentPendingPage({ params, searchParams }: PageProps) {
  const { token } = params;
  const orderId = searchParams.order;
  const paymentType = searchParams.payment_type;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Pending Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 rounded-full p-4">
            <Clock className="h-16 w-16 text-yellow-600" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-4">
          Pago Pendiente
        </h1>
        
        {/* Message */}
        <p className="text-gray-600 text-center mb-8">
          Tu pedido ha sido registrado y está pendiente de pago.
          Te notificaremos por email cuando se acredite.
        </p>
        
        {/* Order Info */}
        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Número de pedido</p>
            <p className="font-mono font-semibold">{orderId}</p>
          </div>
        )}
        
        {/* Payment Type Info */}
        {paymentType === 'ticket' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Pago con boleta
                </p>
                <p className="text-sm text-blue-700">
                  Presenta el código de pago en cualquier punto de pago habilitado.
                  El pago puede demorar hasta 48hs en acreditarse.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">
                ¿Qué sigue ahora?
              </h3>
              <ol className="list-decimal list-inside text-sm text-yellow-800 space-y-1">
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
              <Home className="h-4 w-4 mr-2" />
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
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 mb-2">
            ¿Tienes dudas sobre tu pago?
          </p>
          <p className="text-xs text-gray-500">
            Revisa tu email para ver las instrucciones de pago o
            contacta a la fotógrafa si necesitas ayuda.
          </p>
        </div>
      </div>
    </div>
  );
}