'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Clock, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PaymentPendingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params?.token as string;

  const paymentType = searchParams.get('payment_type');
  const externalReference = searchParams.get('external_reference');
  const merchantOrderId = searchParams.get('merchant_order_id');

  const handleBackToGallery = () => {
    router.push(`/f/${token}`);
  };

  const getPaymentMessage = () => {
    switch (paymentType) {
      case 'ticket':
        return {
          title: 'Pago en efectivo pendiente',
          description: 'Debes completar el pago en un punto de pago autorizado.',
          instructions: [
            'Guarda el comprobante que recibiste por email',
            'Dirígete a un punto de pago autorizado (Rapipago, Pago Fácil, etc.)',
            'Presenta el comprobante y realiza el pago',
            'El proceso de confirmación puede tardar hasta 48 horas'
          ]
        };
      case 'bank_transfer':
        return {
          title: 'Transferencia bancaria pendiente',
          description: 'Debes completar la transferencia desde tu banco.',
          instructions: [
            'Revisa tu email para los datos de la transferencia',
            'Realiza la transferencia desde tu banco',
            'Guarda el comprobante de la transferencia',
            'La confirmación puede tardar 1-2 días hábiles'
          ]
        };
      default:
        return {
          title: 'Pago pendiente de confirmación',
          description: 'Tu pago está siendo procesado.',
          instructions: [
            'Conserva el número de referencia',
            'Te notificaremos por email cuando se confirme',
            'El proceso puede tardar unos minutos',
            'Si tienes dudas, contacta al soporte'
          ]
        };
    }
  };

  const paymentInfo = getPaymentMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 mt-10">
        {/* Pending Header */}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-yellow-600 mb-4">
              <Clock className="h-20 w-20 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {paymentInfo.title}
            </h1>
            <p className="text-gray-600 mb-4">
              {paymentInfo.description}
            </p>
            
            {externalReference && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Pedido #{externalReference.slice(-8).toUpperCase()}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Instrucciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {paymentInfo.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-gray-700">{instruction}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Información importante
                </h3>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• Te hemos enviado un email con todos los detalles</li>
                  <li>• Conserva tu número de referencia para seguimiento</li>
                  <li>• Una vez confirmado el pago, comenzaremos la producción</li>
                  <li>• Te notificaremos por email sobre el estado de tu pedido</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        {merchantOrderId && (
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Orden de pago</p>
                  <p className="font-medium">{merchantOrderId}</p>
                </div>
                <div>
                  <p className="text-gray-600">Método de pago</p>
                  <p className="font-medium capitalize">
                    {paymentType === 'ticket' ? 'Efectivo' :
                     paymentType === 'bank_transfer' ? 'Transferencia' : 
                     paymentType || 'Otro'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleBackToGallery} 
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
              ¿Tienes dudas sobre tu pago?
            </p>
            <p className="text-xs text-gray-500">
              Contacta al fotógrafo o revisa tu email para más información
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
