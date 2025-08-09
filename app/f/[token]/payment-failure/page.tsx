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

export default function PaymentFailurePage({ params, searchParams }: PageProps) {
  const { token } = params;
  const orderId = searchParams.order;
  const errorMessage = searchParams.error;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-4">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-4">
          Pago No Completado
        </h1>
        
        {/* Message */}
        <p className="text-gray-600 text-center mb-8">
          No se pudo procesar tu pago. No te preocupes, no se realizó ningún cargo
          a tu cuenta y tu carrito sigue disponible.
        </p>
        
        {/* Error Details */}
        {errorMessage && (
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Detalle del error:
                </p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Common Issues */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-gray-900 mb-2">Posibles causas:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
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
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar Nuevamente
            </Button>
          </Link>
          
          <Link href={`/f/${token}`} className="block">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Volver a la Galería
            </Button>
          </Link>
        </div>
        
        {/* Support */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 mb-2">
            ¿Necesitas ayuda?
          </p>
          <p className="text-xs text-gray-500">
            Contacta a la fotógrafa o intenta con otro medio de pago.
            Tu carrito quedará guardado para cuando quieras continuar.
          </p>
        </div>
      </div>
    </div>
  );
}