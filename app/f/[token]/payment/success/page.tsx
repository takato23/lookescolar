'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Package,
  Truck,
  Mail,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface PaymentResult {
  collection_id: string;
  collection_status: string;
  payment_id: string;
  status: string;
  external_reference: string;
  payment_type: string;
  merchant_order_id: string;
  preference_id: string;
}

interface OrderDetails {
  id: string;
  status: string;
  total_price: number;
  base_package: {
    name: string;
  };
  contact_info: {
    name: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  created_at: string;
}

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get payment details from URL params
  const paymentResult: PaymentResult = {
    collection_id: searchParams.get('collection_id') || '',
    collection_status: searchParams.get('collection_status') || '',
    payment_id: searchParams.get('payment_id') || '',
    status: searchParams.get('status') || '',
    external_reference: searchParams.get('external_reference') || '',
    payment_type: searchParams.get('payment_type') || '',
    merchant_order_id: searchParams.get('merchant_order_id') || '',
    preference_id: searchParams.get('preference_id') || '',
  };

  useEffect(() => {
    if (paymentResult.external_reference) {
      loadOrderDetails();
    } else {
      setError('No se encontró información del pedido');
      setLoading(false);
    }
  }, [paymentResult.external_reference]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/store/orders/${paymentResult.external_reference}`
      );

      if (!response.ok) {
        throw new Error('Error cargando detalles del pedido');
      }

      const data = await response.json();
      setOrderDetails(data.order);
    } catch (err) {
      console.error('Error loading order:', err);
      setError(err instanceof Error ? err.message : 'Error cargando el pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToGallery = () => {
    router.push(`/f/${token}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-green-600"></div>
          <p className="text-lg font-medium text-gray-700">
            Verificando tu pago...
          </p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mb-4 text-red-600">
              <AlertCircle className="mx-auto h-16 w-16" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Error verificando el pago
            </h2>
            <p className="mb-4 text-gray-600">
              {error || 'No se pudo cargar la información del pedido'}
            </p>
            <Button onClick={handleBackToGallery} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la galería
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved =
    paymentResult.status === 'approved' ||
    paymentResult.collection_status === 'approved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Success Header */}
        <Card className="text-center">
          <CardContent className="p-8">
            <div className="mb-4 text-green-600">
              <CheckCircle className="mx-auto h-20 w-20" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              ¡Pago exitoso!
            </h1>
            <p className="mb-4 text-lg text-gray-600">
              Tu pedido ha sido procesado correctamente
            </p>
            <Badge variant="secondary" className="px-4 py-2 text-lg">
              Pedido #{orderDetails.id.slice(-8).toUpperCase()}
            </Badge>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalles del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Paquete</p>
                <p className="font-medium">{orderDetails.base_package.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total pagado</p>
                <p className="text-lg font-medium">
                  {formatCurrency(orderDetails.total_price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Método de pago</p>
                <p className="font-medium capitalize">
                  {paymentResult.payment_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ID de pago</p>
                <p className="font-medium">{paymentResult.payment_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Información de Envío
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{orderDetails.contact_info.name}</p>
              <p className="text-gray-600">
                {orderDetails.contact_info.address.street}
              </p>
              <p className="text-gray-600">
                {orderDetails.contact_info.address.city},{' '}
                {orderDetails.contact_info.address.state}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Próximos Pasos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                  1
                </div>
                <div>
                  <p className="font-medium">Confirmación por email</p>
                  <p className="text-sm text-gray-600">
                    Te enviamos los detalles del pedido a{' '}
                    {orderDetails.contact_info.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  2
                </div>
                <div>
                  <p className="font-medium">Producción</p>
                  <p className="text-sm text-gray-600">
                    Comenzamos a imprimir tu carpeta personalizada (2-3 días
                    hábiles)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                  3
                </div>
                <div>
                  <p className="font-medium">Envío</p>
                  <p className="text-sm text-gray-600">
                    Te enviamos tu pedido a la dirección indicada (1-2 días
                    hábiles)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handleBackToGallery}
            className="flex-1"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la galería
          </Button>

          <Button onClick={() => window.print()} className="flex-1">
            Imprimir comprobante
          </Button>
        </div>
      </div>
    </div>
  );
}
