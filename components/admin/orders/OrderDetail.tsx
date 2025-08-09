'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  Printer,
  Download,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';

interface OrderDetailProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (orderId: string, newStatus: 'delivered') => void;
  embedded?: boolean; // New prop for embedded mode (not modal)
}

interface OrderDetailData {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'failed';
  mp_payment_id: string | null;
  mp_status: string | null;
  notes: string | null;
  created_at: string;
  delivered_at: string | null;
  subjects?: {
    id: string;
    first_name: string;
    last_name: string | null;
    type: 'student' | 'couple' | 'family';
    events?: {
      id: string;
      name: string;
      school: string;
      date: string;
    };
  };
  order_items: Array<{
    id: string;
    quantity: number;
    photos?: {
      id: string;
      storage_path: string;
    };
    price_list_items?: {
      id: string;
      label: string;
      price_cents: number;
    };
  }>;
}

export default function OrderDetail({
  orderId,
  isOpen,
  onClose,
  onStatusUpdate,
  embedded = false,
}: OrderDetailProps) {
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());

  const loadOrderDetail = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Error cargando detalles del pedido');
      }

      const data = await response.json();
      setOrder(data.order);

      // Load photo URLs for items with photos
      if (data.order?.order_items) {
        for (const item of data.order.order_items) {
          if (item.photos && item.photos.storage_path) {
            loadPhotoUrl(item.photos.id, item.photos.storage_path);
          }
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoUrl = async (photoId: string, storagePath: string) => {
    if (photoUrls.has(photoId)) return;

    try {
      setLoadingPhotos((prev) => new Set([...prev, photoId]));
      try {
        const resp = await fetch('/api/admin/storage/batch-signed-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoIds: [photoId] }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const url = (data.signedUrls || {})[photoId];
          if (url) {
            setPhotoUrls((prev) => new Map([...prev, [photoId, url]]));
          }
        }
      } catch (e) {
        console.error('Batch signed URLs error:', e);
      }
    } catch (error) {
      console.error('Error loading photo URL:', error);
    } finally {
      setLoadingPhotos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    alert('Función de exportar PDF próximamente');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      delivered: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      failed: 'bg-red-500/10 text-red-700 border-red-500/20',
    };

    const labels = {
      pending: 'Pendiente',
      approved: 'Pagado',
      delivered: 'Entregado',
      failed: 'Fallido',
    };

    const icons = {
      pending: <Clock className="h-4 w-4" />,
      approved: <CheckCircle className="h-4 w-4" />,
      delivered: <Package className="h-4 w-4" />,
      failed: <XCircle className="h-4 w-4" />,
    };

    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm ${styles[status as keyof typeof styles] || 'border-gray-500/20 bg-gray-500/10 text-gray-700'}`}
      >
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels] || status}
      </div>
    );
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const calculateTotal = () => {
    return (
      order?.order_items?.reduce(
        (total, item) =>
          total + (item.price_list_items?.price_cents || 0) * item.quantity,
        0
      ) || 0
    );
  };

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderDetail();
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  // Content component
  const DetailContent = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-1/3 rounded bg-gray-200"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 rounded bg-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <Card variant="glass" className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="mb-1 font-medium text-red-800">
                  Error cargando detalles
                </h3>
                <p className="mb-3 text-sm text-red-700">{error}</p>
                <Button
                  onClick={loadOrderDetail}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : order ? (
        <>
          {/* Order Summary */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {order.contact_name}
                </CardTitle>
                <div className="flex items-center gap-4">
                  {getStatusBadge(order.status)}
                  <div className="text-right">
                    <div className="text-gradient-primary text-2xl font-bold">
                      {formatPrice(calculateTotal())}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {order.order_items.length}{' '}
                      {order.order_items.length === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Mail className="h-4 w-4" />
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="text-muted-foreground h-4 w-4" />
                      <span>{order.contact_email}</span>
                    </div>
                    {order.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="text-muted-foreground h-4 w-4" />
                        <span>{order.contact_phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <span>
                        Creado:{' '}
                        {new Date(order.created_at).toLocaleString('es-AR')}
                      </span>
                    </div>
                    {order.delivered_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-600">
                          Entregado:{' '}
                          {new Date(order.delivered_at).toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject & Event Information */}
              {order.subjects && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Package className="h-4 w-4" />
                    Información del Evento
                  </h3>
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <div className="font-medium">
                        {order.subjects.first_name} {order.subjects.last_name}
                      </div>
                      <div className="text-muted-foreground capitalize">
                        {order.subjects.type}
                      </div>
                    </div>
                    {order.subjects.events && (
                      <div className="space-y-1">
                        <div className="font-medium">
                          {order.subjects.events.name}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {order.subjects.events.school}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(
                            order.subjects.events.date
                          ).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Items del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="border-border/50 flex items-center gap-4 rounded-lg border bg-surface/50 p-4"
                  >
                    {/* Photo Thumbnail */}
                    {item.photos && (
                      <div className="bg-muted h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                        {item.photos && loadingPhotos.has(item.photos.id) ? (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                          </div>
                        ) : item.photos && photoUrls.has(item.photos.id) ? (
                          <Image
                            src={photoUrls.get(item.photos.id) ?? ''}
                            alt="Foto del pedido"
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="text-muted-foreground h-8 w-8" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.price_list_items?.label || 'Item'}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Cantidad: {item.quantity}
                      </div>
                      <div className="text-sm font-medium">
                        {formatPrice(
                          (item.price_list_items?.price_cents || 0) *
                            item.quantity
                        )}
                      </div>
                    </div>

                    {/* Photo Action */}
                    {item.photos && photoUrls.has(item.photos.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye className="h-4 w-4" />}
                        onClick={() =>
                          window.open(photoUrls.get(item.photos.id), '_blank')
                        }
                      >
                        Ver
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-border mt-6 border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-gradient-primary">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          {order.mp_payment_id && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Información de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">ID de Pago:</span>
                      <div className="font-mono font-medium">
                        {order.mp_payment_id}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado MP:</span>
                      <div className="font-medium">{order.mp_status}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {order.status === 'approved' && onStatusUpdate && (
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex justify-center">
                  <Button
                    onClick={() => onStatusUpdate(order.id, 'delivered')}
                    variant="success"
                    size="lg"
                    icon={<CheckCircle className="h-5 w-5" />}
                  >
                    Marcar como Entregado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );

  // Modal mode
  if (!embedded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="bg-background max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b bg-gradient-to-r from-primary-50/50 to-secondary-50/50 p-6">
            <div>
              <h2 className="text-gradient-primary text-2xl font-bold">
                Detalles del Pedido
              </h2>
              {order && (
                <p className="text-muted-foreground">#{order.id.slice(-8)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                icon={<Printer className="h-4 w-4" />}
              >
                Imprimir
              </Button>
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                icon={<Download className="h-4 w-4" />}
              >
                PDF
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                icon={<X className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[calc(90vh_-_80px)] overflow-y-auto p-6">
            <DetailContent />
          </div>
        </div>
      </div>
    );
  }

  // Embedded mode - just return the content
  return <DetailContent />;
}
