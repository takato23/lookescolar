'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatsCard,
} from '@/components/ui/card';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  Filter,
  Download,
  Eye,
  Printer,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import OrderDetail from './orders/OrderDetail';

interface Order {
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

interface OrderStats {
  total: number;
  by_status: {
    pending: number;
    approved: number;
    delivered: number;
    failed: number;
  };
  total_revenue_cents: number;
}

type OrderStatus = 'all' | 'pending' | 'approved' | 'delivered' | 'failed';

export default function OrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        throw new Error('Error cargando pedidos');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'delivered') => {
    try {
      setUpdatingOrders((prev) => new Set([...prev, orderId]));

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error actualizando pedido');
      }

      // Actualizar estado local
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                delivered_at:
                  newStatus === 'delivered' ? new Date().toISOString() : null,
              }
            : order
        )
      );
    } catch (error) {
      console.error('Error actualizando pedido:', error);
      alert(
        error instanceof Error ? error.message : 'Error actualizando pedido'
      );
    } finally {
      setUpdatingOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const exportOrders = async () => {
    try {
      const url = new URL('/api/admin/orders/export', window.location.origin);
      if (eventId) url.searchParams.set('eventId', eventId);
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Error exportando pedidos');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error exportando pedidos');
    }
  };

  const exportLabels = async () => {
    try {
      const url = new URL('/api/admin/orders/labels', window.location.origin);
      if (eventId) url.searchParams.set('eventId', eventId);
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Error generando etiquetas');
      }

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = pdfUrl;
      a.download = `etiquetas-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error('Error etiquetas PDF:', error);
      alert('Error generando etiquetas');
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const e = params.get('event');
      if (e) setEventId(e);
    } catch {}
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    // Status filter
    const matchesStatus = filter === 'all' || order.status === filter;

    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      order.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.subject?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.event?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.event?.school.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending:
        'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400',
      approved:
        'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
      delivered:
        'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400',
      failed: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400',
    };

    const labels = {
      pending: 'Pendiente',
      approved: 'Pagado',
      delivered: 'Entregado',
      failed: 'Fallido',
    };

    const icons = {
      pending: <Clock className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      delivered: <Package className="h-3 w-3" />,
      failed: <XCircle className="h-3 w-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${styles[status as keyof typeof styles] || 'border-gray-500/20 bg-gray-500/10 text-gray-700'}`}
      >
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="glass" className="animate-pulse p-6">
              <div className="mb-3 h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-600"></div>
              <div className="mb-2 h-8 w-3/4 rounded bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-3 w-full rounded bg-gray-300 dark:bg-gray-600"></div>
            </Card>
          ))}
        </div>

        {/* Orders Skeleton */}
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Statistics Dashboard */}
      {stats && (
        <div
          className="grid animate-slide-up grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: '0.1s' }}
        >
          <StatsCard
            title="Total Pedidos"
            value={stats.total}
            icon={<Package className="h-5 w-5" />}
            variant="glass"
            noise
          />
          <StatsCard
            title="Pendientes"
            value={stats.by_status.pending}
            icon={<Clock className="h-5 w-5" />}
            variant="glass"
            noise
          />
          <StatsCard
            title="Entregados"
            value={stats.by_status.delivered}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="glass"
            noise
          />
          <StatsCard
            title="Ingresos Totales"
            value={formatPrice(stats.total_revenue_cents)}
            description="Aprobados y entregados"
            icon={<DollarSign className="h-5 w-5" />}
            variant="glass"
            noise
          />
        </div>
      )}

      {/* Header and Controls */}
      <Card
        variant="glass"
        className="noise animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        <CardHeader className="pb-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-gradient text-2xl">
                Gestión de Pedidos
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Administra los pedidos de fotos y marca como entregados
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={exportOrders}
                variant="outline"
                size="md"
                icon={<Download className="h-4 w-4" />}
                className="rounded-full"
                aria-label="Exportar CSV"
              >
                Exportar CSV
              </Button>
                <Button
                  onClick={exportLabels}
                  variant="outline"
                  size="md"
                  icon={<Printer className="h-4 w-4" />}
                  className="rounded-full"
                  aria-label="Descargar etiquetas PDF"
                >
                  Etiquetas PDF
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, ID de pedido, evento o colegio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border text-foreground placeholder-muted-foreground w-full rounded-lg border bg-surface/50 py-3 pl-10 pr-4 backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform rounded-full p-1 transition-colors hover:bg-surface/80"
              >
                <XCircle className="text-muted-foreground h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(
              [
                'all',
                'pending',
                'approved',
                'delivered',
                'failed',
              ] as OrderStatus[]
            ).map((status) => {
              const count =
                status === 'all'
                  ? orders.length
                  : orders.filter((o) => o.status === status).length;
              return (
                <Button
                  key={status}
                  onClick={() => setFilter(status)}
                  variant={filter === status ? 'primary' : 'ghost'}
                  size="sm"
                  className="rounded-full transition-all duration-200"
                >
                  {status === 'all'
                    ? 'Todos'
                    : status === 'pending'
                      ? 'Pendientes'
                      : status === 'approved'
                        ? 'Pagados'
                        : status === 'delivered'
                          ? 'Entregados'
                          : 'Fallidos'}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      filter === status
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card
          variant="glass"
          className="animate-slide-up border-red-500/20 bg-red-500/5"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="mb-1 font-medium text-red-800">
                  Error cargando pedidos
                </h3>
                <p className="mb-3 text-sm text-red-700">{error}</p>
                <Button
                  onClick={loadOrders}
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
      )}

      {/* Orders List */}
      <div
        className="scrollbar-elevated max-h-[65vh] animate-slide-up space-y-4 overflow-auto pr-1"
        style={{ animationDelay: '0.3s' }}
      >
        {filteredOrders.length === 0 ? (
          <Card variant="glass" className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Package className="text-muted-foreground h-12 w-12" />
              <div>
                <h3 className="text-foreground mb-1 text-lg font-medium">
                  {searchQuery ? 'No se encontraron pedidos' : 'No hay pedidos'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? `No hay pedidos que coincidan con "${searchQuery}"`
                    : filter === 'all'
                      ? 'Aún no hay pedidos registrados'
                      : `No hay pedidos con estado "${filter}"`}
                </p>
              </div>
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  size="sm"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <Card
                key={order.id}
                variant="glass"
                className="hover:shadow-glow-soft animate-slide-up transition-all duration-300"
                style={{ animationDelay: `${0.4 + index * 0.05}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                    {/* Main Order Info */}
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="text-foreground flex items-center gap-2 text-lg font-semibold">
                              <User className="text-muted-foreground h-4 w-4" />
                              {order.contact_name}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              #{order.id.slice(-8)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.status)}
                          <div className="text-right">
                            <p className="text-foreground text-xl font-bold">
                              {formatPrice(order.total_amount_cents)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {order.total_items}{' '}
                              {order.total_items === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact & Event Info */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Contact Details */}
                        <div className="space-y-2">
                          <h4 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                            Contacto
                          </h4>
                          <div className="space-y-1.5">
                            <div className="text-foreground flex items-center gap-2 text-sm">
                              <Mail className="text-muted-foreground h-3 w-3" />
                              {order.contact_email}
                            </div>
                            {order.contact_phone && (
                              <div className="text-foreground flex items-center gap-2 text-sm">
                                <Phone className="text-muted-foreground h-3 w-3" />
                                {order.contact_phone}
                              </div>
                            )}
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleString(
                                'es-AR'
                              )}
                            </div>
                            {order.delivered_at && (
                              <div className="flex items-center gap-2 text-sm text-emerald-600">
                                <CheckCircle className="h-3 w-3" />
                                Entregado:{' '}
                                {new Date(order.delivered_at).toLocaleString(
                                  'es-AR'
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subject & Event Info */}
                        {(order.subject || order.event) && (
                          <div className="space-y-2">
                            <h4 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                              Evento
                            </h4>
                            <div className="space-y-1.5">
                              {order.subject && (
                                <div className="text-foreground text-sm">
                                  <span className="font-medium">
                                    {order.subject.name}
                                  </span>
                                  <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
                                    {order.subject.type === 'student'
                                      ? 'Estudiante'
                                      : order.subject.type === 'couple'
                                        ? 'Pareja'
                                        : 'Familia'}
                                  </span>
                                </div>
                              )}
                              {order.event && (
                                <div className="space-y-0.5">
                                  <div className="text-foreground text-sm font-medium">
                                    {order.event.name}
                                  </div>
                                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <MapPin className="h-3 w-3" />
                                    {order.event.school}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {new Date(
                                      order.event.date
                                    ).toLocaleDateString('es-AR')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Order Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="border-border border-t pt-4">
                          <h4 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
                            Items del Pedido
                          </h4>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg bg-surface/50 p-2"
                              >
                                <span className="text-foreground text-sm font-medium">
                                  {item.label}
                                </span>
                                <div className="text-right">
                                  <span className="text-foreground text-sm">
                                    × {item.quantity}
                                  </span>
                                  <div className="text-muted-foreground text-xs">
                                    {formatPrice(
                                      item.price_cents * item.quantity
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment Info */}
                      {order.mp_payment_id && (
                        <div className="border-border border-t pt-4">
                          <div className="mb-2 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <h4 className="text-foreground text-sm font-medium">
                              Información de Pago
                            </h4>
                          </div>
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                              <div>
                                <span className="text-muted-foreground">
                                  ID Pago:
                                </span>
                                <span className="ml-1 font-mono">
                                  {order.mp_payment_id}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Estado MP:
                                </span>
                                <span className="ml-1">{order.mp_status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex min-w-[200px] flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button
                          onClick={() => openOrderDetail(order)}
                          variant="outline"
                          size="sm"
                          icon={<Eye className="h-4 w-4" />}
                          className="w-full rounded-full"
                        >
                          Ver Detalles
                        </Button>

                        {order.status === 'approved' && (
                          <Button
                            onClick={() =>
                              updateOrderStatus(order.id, 'delivered')
                            }
                            disabled={updatingOrders.has(order.id)}
                            variant="success"
                            size="sm"
                            loading={updatingOrders.has(order.id)}
                            className="w-full rounded-full"
                          >
                            {updatingOrders.has(order.id)
                              ? 'Actualizando...'
                              : 'Marcar Entregado'}
                          </Button>
                        )}
                      </div>

                      <div className="text-muted-foreground mt-2 text-center text-xs">
                        Hace{' '}
                        {Math.floor(
                          (Date.now() - new Date(order.created_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        días
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Refresh and Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
        <div className="text-muted-foreground text-sm">
          Mostrando {filteredOrders.length} de {orders.length} pedidos
          {searchQuery && ` (filtrado por "${searchQuery}")`}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadOrders}
            variant="outline"
            size="sm"
            disabled={loading}
            loading={loading}
            icon={!loading ? <Clock className="h-4 w-4" /> : undefined}
            className="rounded-full"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetail
        orderId={selectedOrder?.id || ''}
        isOpen={showOrderDetail}
        onClose={() => {
          setShowOrderDetail(false);
          setSelectedOrder(null);
        }}
        onStatusUpdate={updateOrderStatus}
      />
    </div>
  );
}
