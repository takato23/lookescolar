'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface EnhancedOrder {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'failed' | 'cancelled';
  mp_payment_id: string | null;
  mp_status: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  delivered_at: string | null;
  total_amount_cents: number;
  total_items: number;
  event: {
    id: string;
    name: string;
    school: string;
    date: string;
  } | null;
  subject: {
    id: string;
    name: string;
    type: 'student' | 'couple' | 'family';
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price_cents: number;
    label: string;
    photo: {
      id: string;
      storage_path: string;
    } | null;
  }>;
}

interface OrderDetailProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (
    orderId: string,
    status: 'delivered' | 'cancelled',
    notes?: string
  ) => void;
  embedded?: boolean;
}

export default function OrderDetail({
  orderId,
  isOpen,
  onClose,
  onStatusUpdate,
  embedded = false,
}: OrderDetailProps) {
  const [order, setOrder] = useState<EnhancedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load order details
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const loadOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('Error loading order details');
        }
        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, isOpen]);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(cents / 100);
  };

  const header = (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-lg font-semibold">
        Detalle del Pedido {order ? `#${order.id.slice(-8)}` : ''}
      </h2>
      {!embedded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-auto p-1"
          aria-label="Cerrar detalle de pedido"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  const content = (
    <>
      {header}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando detalles...</span>
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-red-600">Error: {error}</div>
      )}

      {order && (
        <div className="space-y-6">
          {/* Order Header */}
          <Card>
            <CardHeader>
              <CardTitle>Pedido #{order.id.slice(-8)}</CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Cliente
                    </label>
                    <p className="text-lg font-semibold">
                      {order.contact_name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {order.contact_email}
                    </p>
                    {order.contact_phone && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {order.contact_phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Estado
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          order.status === 'approved'
                            ? 'default'
                            : order.status === 'delivered'
                              ? 'secondary'
                              : order.status === 'pending'
                                ? 'outline'
                                : 'destructive'
                        }
                      >
                        {order.status === 'pending'
                          ? 'Pendiente'
                          : order.status === 'approved'
                            ? 'Pagado'
                            : order.status === 'delivered'
                              ? 'Entregado'
                              : order.status === 'failed'
                                ? 'Fallido'
                                : 'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Total
                    </label>
                    <p className="text-xl font-bold">
                      {formatCurrency(order.total_amount_cents)}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {order.total_items}{' '}
                      {order.total_items === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Fecha
                    </label>
                    <p className="text-sm">
                      {new Date(order.created_at).toLocaleDateString('es-AR')}
                    </p>
                    {order.delivered_at && (
                      <p className="text-sm text-emerald-600">
                        Entregado:{' '}
                        {new Date(order.delivered_at).toLocaleDateString(
                          'es-AR'
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Event and Subject Info */}
                {(order.event || order.subject) && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 font-medium">Información del Evento</h4>
                    {order.event && (
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Evento:</span>{' '}
                          {order.event.name}
                        </p>
                        <p>
                          <span className="font-medium">Colegio:</span>{' '}
                          {order.event.school}
                        </p>
                        <p>
                          <span className="font-medium">Fecha:</span>{' '}
                          {new Date(order.event.date).toLocaleDateString(
                            'es-AR'
                          )}
                        </p>
                      </div>
                    )}
                    {order.subject && (
                      <div className="mt-2 text-sm">
                        <p>
                          <span className="font-medium">Sujeto:</span>{' '}
                          {order.subject.name}
                        </p>
                        <p>
                          <span className="font-medium">Tipo:</span>{' '}
                          {order.subject.type === 'student'
                            ? 'Estudiante'
                            : order.subject.type === 'couple'
                              ? 'Pareja'
                              : 'Familia'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Info */}
                {order.mp_payment_id && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 font-medium">Información de Pago</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">ID Pago MP:</span>{' '}
                        {order.mp_payment_id}
                      </p>
                      <p>
                        <span className="font-medium">Estado MP:</span>{' '}
                        {order.mp_status}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Items del Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium">{item.label}</p>
                          {item.photo && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              Foto ID: {item.photo.id.slice(-8)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">x {item.quantity}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {formatCurrency(item.price_cents * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(order.notes || order.admin_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.notes && (
                    <div>
                      <label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        Notas del Cliente:
                      </label>
                      <p className="bg-muted/50 mt-1 rounded p-2 text-sm">
                        {order.notes}
                      </p>
                    </div>
                  )}
                  {order.admin_notes && (
                    <div>
                      <label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        Notas del Admin:
                      </label>
                      <p className="bg-muted/50 mt-1 rounded p-2 text-sm">
                        {order.admin_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {onStatusUpdate && order.status === 'approved' && (
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  onClick={() => onStatusUpdate(order.id, 'delivered')}
                  variant="default"
                >
                  Marcar como Entregado
                </Button>
              </div>
            )}
          </div>
        )}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
}
