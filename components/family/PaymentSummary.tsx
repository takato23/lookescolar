'use client';

import { Card } from '@/components/ui/card';

interface CartItem {
  photoId: string;
  priceListItemId: string;
  quantity: number;
  label: string;
  price: number;
}

interface PaymentSummaryProps {
  items: CartItem[];
  total: number;
  step: 'form' | 'payment' | 'processing' | 'success' | 'error';
}

export default function PaymentSummary({
  items,
  total,
  step,
}: PaymentSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStepIcon = (currentStep: string) => {
    switch (currentStep) {
      case 'form':
        return '📝';
      case 'payment':
        return '💳';
      case 'processing':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📋';
    }
  };

  const getStepText = (currentStep: string) => {
    switch (currentStep) {
      case 'form':
        return 'Completando datos';
      case 'payment':
        return 'Listo para pagar';
      case 'processing':
        return 'Procesando pago';
      case 'success':
        return 'Pago exitoso';
      case 'error':
        return 'Error en el pago';
      default:
        return 'Resumen del pedido';
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado actual */}
      <Card className="p-4">
        <div className="text-center">
          <div className="mb-2 text-3xl">{getStepIcon(step)}</div>
          <h3 className="font-medium text-gray-900">{getStepText(step)}</h3>
        </div>
      </Card>

      {/* Resumen del pedido */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold text-gray-900">Resumen del Pedido</h3>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.photoId}-${item.priceListItemId}`}
              className="flex items-start justify-between"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">
                  Foto #{index + 1} × {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatPrice(item.price * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-gray-500">
                    {formatPrice(item.price)} c/u
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-200"></div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(total)}
          </span>
        </div>

        {/* Detalles del pago */}
        <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400">💳</span>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Pago seguro con Mercado Pago
            </span>
          </div>
        </div>
      </Card>

      {/* Información adicional */}
      <Card className="p-4">
        <h4 className="mb-3 font-medium text-gray-900">
          ¿Qué incluye tu compra?
        </h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-green-600">✓</span>
            <span>Fotos en alta resolución sin marca de agua</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-green-600">✓</span>
            <span>Descarga inmediata tras confirmar el pago</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-green-600">✓</span>
            <span>Disponible por 30 días para descargar</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="mt-0.5 text-green-600">✓</span>
            <span>Confirmación por email</span>
          </li>
        </ul>
      </Card>

      {/* Ayuda */}
      <Card className="p-4">
        <h4 className="mb-2 font-medium text-gray-900">¿Necesitas ayuda?</h4>
        <p className="mb-3 text-sm text-gray-600">
          Si tienes problemas con tu compra, contáctanos:
        </p>
        <div className="space-y-1 text-sm">
          <p className="flex items-center space-x-2">
            <span>📧</span>
            <span className="text-blue-600 dark:text-blue-400">contacto@lookescolar.com</span>
          </p>
          <p className="flex items-center space-x-2">
            <span>📱</span>
            <span className="text-blue-600 dark:text-blue-400">+54 11 1234-5678</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
