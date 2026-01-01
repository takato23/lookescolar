'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  DollarSign,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingOrder {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  shipped_at: string | null;
  tracking_number: string | null;
  event_name: string | null;
  package_type: string | null;
  total_price: number;
  currency: string;
  contact_info: {
    name: string;
    email: string;
    phone?: string;
  };
  delivery_info?: {
    pickup_location?: string;
    pickup_instructions?: string;
  };
  timeline: Array<{
    status: string;
    label: string;
    timestamp: string | null;
    completed: boolean;
    current: boolean;
  }>;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
}> = {
  pending_payment: {
    label: 'Pago Pendiente',
    description: 'Esperando confirmacion del pago',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  paid: {
    label: 'Pago Confirmado',
    description: 'Tu pago fue recibido correctamente',
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  in_production: {
    label: 'En Produccion',
    description: 'Estamos preparando tu pedido',
    icon: Camera,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  shipped: {
    label: 'Enviado',
    description: 'Tu pedido esta en camino',
    icon: Truck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  delivered: {
    label: 'Entregado',
    description: 'Tu pedido fue entregado',
    icon: CheckCircle,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  cancelled: {
    label: 'Cancelado',
    description: 'Este pedido fue cancelado',
    icon: XCircle,
    color: 'text-neutral-500',
    bgColor: 'bg-neutral-50',
  },
};

const STATUS_FLOW = ['pending_payment', 'paid', 'in_production', 'shipped', 'delivered'];

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(price / 100);
}

export default function TrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/track/${orderId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Pedido no encontrado. Verifica el codigo e intenta nuevamente.');
          } else {
            setError('Error al cargar el pedido. Intenta nuevamente.');
          }
          return;
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError('Error de conexion. Verifica tu internet e intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">
            No pudimos encontrar tu pedido
          </h1>
          <p className="text-neutral-600 mb-6">
            {error || 'Verifica que el codigo sea correcto.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_CONFIG[order.status] || STATUS_CONFIG.cancelled;
  const CurrentIcon = currentStatus.icon;
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-xl', currentStatus.bgColor)}>
              <Package className={cn('h-6 w-6', currentStatus.color)} />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Seguimiento de pedido</p>
              <h1 className="text-xl font-semibold text-neutral-900">
                #{order.id.slice(0, 8).toUpperCase()}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Current Status Card */}
        <div className={cn(
          'rounded-2xl p-6 border-2',
          currentStatus.bgColor,
          isCancelled ? 'border-neutral-200' : 'border-transparent'
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'p-3 rounded-xl bg-white shadow-sm',
              currentStatus.color
            )}>
              <CurrentIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className={cn('text-lg font-semibold', currentStatus.color)}>
                {currentStatus.label}
              </h2>
              <p className="text-neutral-600 mt-1">
                {currentStatus.description}
              </p>
              {order.tracking_number && order.status === 'shipped' && (
                <div className="mt-3 p-3 bg-white rounded-lg">
                  <p className="text-sm text-neutral-500">Numero de seguimiento</p>
                  <p className="font-mono font-medium text-neutral-900">
                    {order.tracking_number}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h3 className="font-semibold text-neutral-900 mb-6">Progreso del pedido</h3>
            <div className="relative">
              {STATUS_FLOW.map((status, index) => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                const isComplete = index <= currentIndex;
                const isCurrent = index === currentIndex;

                return (
                  <div key={status} className="flex items-start gap-4 relative">
                    {/* Connector line */}
                    {index < STATUS_FLOW.length - 1 && (
                      <div
                        className={cn(
                          'absolute left-5 top-10 w-0.5 h-12',
                          index < currentIndex ? 'bg-emerald-500' : 'bg-neutral-200'
                        )}
                      />
                    )}

                    {/* Icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10',
                      isComplete
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-neutral-200 text-neutral-400'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className={cn(
                      'flex-1 pb-8',
                      !isComplete && 'opacity-50'
                    )}>
                      <p className={cn(
                        'font-medium',
                        isCurrent ? 'text-emerald-600' : 'text-neutral-900'
                      )}>
                        {config.label}
                      </p>
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {config.description}
                      </p>
                      {isCurrent && order.updated_at && (
                        <p className="text-xs text-neutral-400 mt-1">
                          {formatDate(order.updated_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-100">
            <h3 className="font-semibold text-neutral-900">Detalles del pedido</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {order.event_name && (
              <div className="flex justify-between p-4">
                <span className="text-neutral-500">Evento</span>
                <span className="font-medium text-neutral-900">{order.event_name}</span>
              </div>
            )}
            <div className="flex justify-between p-4">
              <span className="text-neutral-500">Paquete</span>
              <span className="font-medium text-neutral-900">{order.package_type || 'Basico'}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className="text-neutral-500">Fecha del pedido</span>
              <span className="font-medium text-neutral-900">{formatDate(order.created_at)}</span>
            </div>
            {order.delivered_at && (
              <div className="flex justify-between p-4">
                <span className="text-neutral-500">Fecha de entrega</span>
                <span className="font-medium text-emerald-600">{formatDate(order.delivered_at)}</span>
              </div>
            )}
            <div className="flex justify-between p-4 bg-neutral-50">
              <span className="font-semibold text-neutral-900">Total</span>
              <span className="font-semibold text-lg text-neutral-900">
                {formatPrice(order.total_price, order.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Pickup Info */}
        {order.delivery_info?.pickup_location && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Lugar de retiro</h3>
                <p className="text-neutral-600 mt-1">
                  {order.delivery_info.pickup_location}
                </p>
                {order.delivery_info.pickup_instructions && (
                  <p className="text-sm text-neutral-500 mt-2">
                    {order.delivery_info.pickup_instructions}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Necesitas ayuda?</h3>
          <p className="text-neutral-600 text-sm mb-4">
            Si tenes alguna consulta sobre tu pedido, contactanos mencionando el codigo{' '}
            <span className="font-mono font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <div className="flex gap-3">
            <a
              href={`mailto:${order.contact_info.email}?subject=Consulta pedido ${order.id.slice(0, 8).toUpperCase()}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm font-medium text-neutral-700"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
            {order.contact_info.phone && (
              <a
                href={`https://wa.me/${order.contact_info.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors text-sm font-medium text-emerald-700"
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-sm text-neutral-500">
          Gracias por tu compra
        </div>
      </footer>
    </div>
  );
}
