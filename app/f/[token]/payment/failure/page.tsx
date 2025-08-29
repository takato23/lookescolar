'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft, RefreshCw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentFailurePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params?.token as string;

  const status = searchParams.get('status');
  const statusDetail = searchParams.get('status_detail');
  const externalReference = searchParams.get('external_reference');

  const handleBackToGallery = () => {
    router.push(`/f/${token}`);
  };

  const handleRetryPayment = () => {
    router.push(`/f/${token}/store`);
  };

  const getErrorMessage = () => {
    switch (statusDetail) {
      case 'cc_rejected_insufficient_amount':
        return 'Tu tarjeta no tiene fondos suficientes.';
      case 'cc_rejected_bad_filled_card_number':
        return 'Revisa el número de tu tarjeta.';
      case 'cc_rejected_bad_filled_date':
        return 'Revisa la fecha de vencimiento.';
      case 'cc_rejected_bad_filled_security_code':
        return 'Revisa el código de seguridad de tu tarjeta.';
      case 'cc_rejected_bad_filled_other':
        return 'Revisa los datos de tu tarjeta.';
      case 'cc_rejected_call_for_authorize':
        return 'Debes autorizar ante tu banco el pago.';
      case 'cc_rejected_card_disabled':
        return 'Tu tarjeta está deshabilitada. Llama a tu banco.';
      case 'cc_rejected_duplicate_payment':
        return 'Ya hiciste un pago por ese valor. Si necesitas volver a pagar usa otra tarjeta u otro medio de pago.';
      case 'cc_rejected_high_risk':
        return 'Tu pago fue rechazado. Elige otro medio de pago.';
      case 'cc_rejected_max_attempts':
        return 'Llegaste al límite de intentos permitidos. Elige otra tarjeta u otro medio de pago.';
      default:
        return 'Hubo un problema procesando tu pago. Por favor, intenta nuevamente.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto space-y-6 mt-20">
        {/* Error Header */}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <XCircle className="h-20 w-20 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pago rechazado
            </h1>
            <p className="text-gray-600 mb-4">
              {getErrorMessage()}
            </p>
            
            {externalReference && (
              <p className="text-sm text-gray-500">
                Referencia: {externalReference.slice(-8).toUpperCase()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">¿Qué puedes hacer?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Verifica que los datos de tu tarjeta sean correctos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Asegúrate de tener fondos suficientes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Intenta con otra tarjeta o método de pago
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Contacta a tu banco si el problema persiste
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleRetryPayment} 
            className="w-full"
            size="lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Intentar nuevamente
          </Button>
          
          <Button 
            onClick={handleBackToGallery} 
            variant="outline"
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la galería
          </Button>
        </div>

        {/* Help */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              ¿Necesitas ayuda?
            </p>
            <p className="text-xs text-gray-500">
              Contacta al fotógrafo o administrador del evento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
