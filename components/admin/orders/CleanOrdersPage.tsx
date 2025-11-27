'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Eye,
  ExternalLink,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Image,
  Play,
  Check,
  X,
  Truck,
  FileText,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FilterChip,
  CleanStatCard,
  CleanPageHeader,
  CleanEmptyState,
  CleanSearchInput,
  CleanAvatar,
  CleanGrid,
  CleanModal,
  CleanLoadingSpinner,
  CleanStatusBadge,
  CleanSkeletonGrid,
  CleanSkeletonStat,
  CleanTooltip,
  CleanIconButton,
  CleanAnimatedCard,
} from '@/components/admin/shared/CleanComponents';

// Types
interface Order {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  contact_info: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  delivery_info?: Record<string, unknown>;
  event_name?: string;
  event_date?: string;
  package_type?: string;
  selected_photos?: {
    individual?: string[];
    group?: string[];
  };
  additional_copies?: Record<string, unknown>[];
  total_price: number;
  currency: string;
  production_notes?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  token?: string;
  production_status?: string;
  delivered_at?: string;
}

type StatusFilter =
  | 'all'
  | 'pending_payment'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

interface OrderStats {
  total: number;
  total_revenue: number;
  pending_payment: number;
  paid: number;
  in_production: number;
  delivered: number;
}

// Status configuration
const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'muted'; label: string }> = {
  delivered: { variant: 'success', label: 'Entregado' },
  shipped: { variant: 'info', label: 'Enviado' },
  in_production: { variant: 'info', label: 'En Producción' },
  paid: { variant: 'success', label: 'Pagado' },
  pending_payment: { variant: 'warning', label: 'Pago Pendiente' },
  cancelled: { variant: 'error', label: 'Cancelado' },
};

// Format price helper
function formatPrice(price: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(price / 100);
}

// Format date helper
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CleanOrdersPage() {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    total_revenue: 0,
    pending_payment: 0,
    paid: 0,
    in_production: 0,
    delivered: 0,
  });

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats || {
          total: 0,
          total_revenue: 0,
          pending_payment: 0,
          paid: 0,
          in_production: 0,
          delivered: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // View order details
  const viewOrderDetails = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data.order);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, updates: Partial<Order>) => {
    try {
      setUpdating(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchOrders();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setUpdating(null);
    }
  }, [fetchOrders]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    const reason = prompt('Motivo de la cancelación:');
    if (!reason) return;

    try {
      setUpdating(orderId);
      const response = await fetch(
        `/api/admin/orders/${orderId}?reason=${encodeURIComponent(reason)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchOrders();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setUpdating(null);
    }
  }, [fetchOrders]);

  // View shared photos
  const viewSharedPhotos = useCallback((token: string) => {
    const url = `${window.location.origin}/store-unified/${token}`;
    window.open(url, '_blank');
  }, []);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const customerName = order.contact_info?.name || '';
      const customerEmail = order.contact_info?.email || '';
      const eventName = order.event_name || '';

      const matchesSearch =
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eventName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  return (
    <div className="clean-orders">
      {/* Page Header */}
      <CleanPageHeader title="Pedidos">
        <button className="clean-btn clean-btn--secondary" onClick={fetchOrders}>
          <RefreshCw className={cn('clean-btn-icon', loading && 'animate-spin')} />
          Actualizar
        </button>
        <button className="clean-btn clean-btn--primary">
          <Download className="clean-btn-icon" />
          Exportar
        </button>
      </CleanPageHeader>

      {/* Stats Grid */}
      <div className="clean-stats-grid">
        {loading ? (
          <>
            <CleanSkeletonStat />
            <CleanSkeletonStat />
            <CleanSkeletonStat />
            <CleanSkeletonStat />
          </>
        ) : (
          <>
            <CleanStatCard
              label="Total pedidos"
              value={stats.total}
              icon={Package}
            />
            <CleanStatCard
              label="Ingresos"
              value={formatPrice(stats.total_revenue)}
              icon={DollarSign}
            />
            <CleanStatCard
              label="Pendientes"
              value={stats.pending_payment}
              icon={Clock}
            />
            <CleanStatCard
              label="Entregados"
              value={stats.delivered}
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Search */}
      <CleanSearchInput
        placeholder="Buscar por nombre, email, ID o evento..."
        value={searchTerm}
        onChange={setSearchTerm}
        className="mb-5"
      />

      {/* Filters */}
      <div className="clean-filters">
        <FilterChip
          label="Todos"
          count={statusCounts.all}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterChip
          label="Pago pendiente"
          count={statusCounts.pending_payment}
          active={statusFilter === 'pending_payment'}
          onClick={() => setStatusFilter('pending_payment')}
          icon={AlertCircle}
        />
        <FilterChip
          label="Pagado"
          count={statusCounts.paid}
          active={statusFilter === 'paid'}
          onClick={() => setStatusFilter('paid')}
          icon={DollarSign}
        />
        <FilterChip
          label="En producción"
          count={statusCounts.in_production}
          active={statusFilter === 'in_production'}
          onClick={() => setStatusFilter('in_production')}
          icon={Clock}
        />
        <FilterChip
          label="Enviado"
          count={statusCounts.shipped}
          active={statusFilter === 'shipped'}
          onClick={() => setStatusFilter('shipped')}
          icon={Truck}
        />
        <FilterChip
          label="Entregado"
          count={statusCounts.delivered}
          active={statusFilter === 'delivered'}
          onClick={() => setStatusFilter('delivered')}
          icon={CheckCircle}
        />
        <FilterChip
          label="Cancelado"
          count={statusCounts.cancelled}
          active={statusFilter === 'cancelled'}
          onClick={() => setStatusFilter('cancelled')}
          icon={XCircle}
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--clean-text-muted)] mb-5">
        {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
      </p>

      {/* Orders Grid */}
      {loading ? (
        <CleanSkeletonGrid count={6} cols={3} />
      ) : filteredOrders.length > 0 ? (
        <CleanGrid cols={3} gap="md">
          {filteredOrders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              index={index}
              onView={() => viewOrderDetails(order.id)}
              onStatusChange={updateOrderStatus}
              onCancel={() => cancelOrder(order.id)}
              onViewPhotos={() => order.token && viewSharedPhotos(order.token)}
              updating={updating === order.id}
            />
          ))}
        </CleanGrid>
      ) : (
        <CleanEmptyState
          icon={Package}
          title={orders.length > 0 ? 'No hay pedidos con este filtro' : 'No hay pedidos'}
          description={
            orders.length > 0
              ? 'Prueba cambiando los filtros o términos de búsqueda.'
              : 'Los pedidos aparecerán aquí cuando las familias realicen compras.'
          }
        />
      )}

      {/* Order Details Modal */}
      <CleanModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Detalles del Pedido"
        size="lg"
      >
        {selectedOrder && (
          <OrderDetails
            order={selectedOrder}
            onStatusChange={updateOrderStatus}
            onCancel={() => cancelOrder(selectedOrder.id)}
            onViewPhotos={() => selectedOrder.token && viewSharedPhotos(selectedOrder.token)}
            updating={updating === selectedOrder.id}
          />
        )}
      </CleanModal>
    </div>
  );
}

// =============================================================================
// ORDER CARD COMPONENT
// =============================================================================

interface OrderCardProps {
  order: Order;
  index?: number;
  onView: () => void;
  onStatusChange: (orderId: string, updates: Partial<Order>) => void;
  onCancel: () => void;
  onViewPhotos: () => void;
  updating: boolean;
}

function OrderCard({ order, index, onView, onStatusChange, onCancel, onViewPhotos, updating }: OrderCardProps) {
  const customerName = order.contact_info?.name || 'Cliente sin nombre';
  const customerEmail = order.contact_info?.email || 'Sin correo';
  const eventName = order.event_name || 'Sin evento';
  const itemCount =
    (order.additional_copies?.length || 0) +
    (order.selected_photos?.individual?.length || 0) +
    (order.selected_photos?.group?.length || 0);

  const statusInfo = STATUS_CONFIG[order.status] || { variant: 'muted' as const, label: order.status };

  return (
    <CleanAnimatedCard index={index} hover className="clean-order-card" onClick={onView}>
      {/* Header with avatar and status */}
      <div className="clean-order-card-header">
        <CleanAvatar name={customerName} size="md" />
        <div className="clean-order-card-header-info">
          <span className="clean-order-card-name">{customerName}</span>
          <span className="clean-order-card-email">{customerEmail}</span>
        </div>
        <CleanStatusBadge status={statusInfo.variant} label={statusInfo.label} />
      </div>

      {/* Order details */}
      <div className="clean-order-card-body">
        <div className="clean-order-card-row">
          <span className="clean-order-card-label">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(order.created_at)}
          </span>
          <span className="clean-order-card-label">
            <Image className="w-3.5 h-3.5" />
            {itemCount} {itemCount === 1 ? 'foto' : 'fotos'}
          </span>
        </div>
        <div className="clean-order-card-row">
          <span className="clean-order-card-event">{eventName}</span>
        </div>
      </div>

      {/* Footer with price and actions */}
      <div className="clean-order-card-footer">
        <span className="clean-order-card-price">
          {formatPrice(order.total_price, order.currency)}
        </span>
        <div className="clean-order-card-actions" onClick={(e) => e.stopPropagation()}>
          <CleanIconButton
            icon={Eye}
            tooltip="Ver detalles"
            onClick={onView}
            variant="ghost"
            size="sm"
          />
          {order.token && (
            <CleanIconButton
              icon={ExternalLink}
              tooltip="Ver fotos"
              onClick={onViewPhotos}
              variant="ghost"
              size="sm"
            />
          )}
          {order.status === 'pending_payment' && (
            <CleanIconButton
              icon={DollarSign}
              tooltip="Marcar como pagado"
              onClick={() => onStatusChange(order.id, { status: 'paid', payment_status: 'paid' })}
              variant="success"
              size="sm"
              disabled={updating}
              animated
            />
          )}
          {order.status === 'paid' && (
            <CleanIconButton
              icon={Play}
              tooltip="Iniciar producción"
              onClick={() => onStatusChange(order.id, { status: 'in_production', production_status: 'printing' })}
              variant="primary"
              size="sm"
              disabled={updating}
              animated
            />
          )}
          {order.status === 'in_production' && (
            <CleanIconButton
              icon={Check}
              tooltip="Marcar entregado"
              onClick={() => onStatusChange(order.id, { status: 'delivered', delivered_at: new Date().toISOString() })}
              variant="success"
              size="sm"
              disabled={updating}
              animated
            />
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <CleanIconButton
              icon={X}
              tooltip="Cancelar pedido"
              onClick={onCancel}
              variant="danger"
              size="sm"
              disabled={updating}
            />
          )}
        </div>
      </div>
    </CleanAnimatedCard>
  );
}

// =============================================================================
// ORDER DETAILS COMPONENT (Modal content)
// =============================================================================

interface OrderDetailsProps {
  order: Order;
  onStatusChange: (orderId: string, updates: Partial<Order>) => void;
  onCancel: () => void;
  onViewPhotos: () => void;
  updating: boolean;
}

function OrderDetails({ order, onStatusChange, onCancel, onViewPhotos, updating }: OrderDetailsProps) {
  const statusInfo = STATUS_CONFIG[order.status] || { variant: 'muted' as const, label: order.status };

  return (
    <div className="clean-order-details">
      {/* Customer Info */}
      <div className="clean-order-section">
        <h4 className="clean-order-section-title">
          <User className="w-4 h-4" />
          Información del Cliente
        </h4>
        <div className="clean-order-section-content">
          <div className="clean-order-info-row">
            <User className="w-4 h-4 text-[var(--clean-text-muted)]" />
            <span className="font-medium">{order.contact_info.name}</span>
          </div>
          <div className="clean-order-info-row">
            <Mail className="w-4 h-4 text-[var(--clean-text-muted)]" />
            <span>{order.contact_info.email}</span>
          </div>
          {order.contact_info.phone && (
            <div className="clean-order-info-row">
              <Phone className="w-4 h-4 text-[var(--clean-text-muted)]" />
              <span>{order.contact_info.phone}</span>
            </div>
          )}
          {order.contact_info.address && (
            <div className="clean-order-info-row">
              <MapPin className="w-4 h-4 text-[var(--clean-text-muted)]" />
              <div className="text-sm">
                <p>{order.contact_info.address.street}</p>
                <p>{order.contact_info.address.city}, {order.contact_info.address.state}</p>
                <p>{order.contact_info.address.zipCode} - {order.contact_info.address.country}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Status */}
      <div className="clean-order-section">
        <h4 className="clean-order-section-title">
          <Package className="w-4 h-4" />
          Estado del Pedido
        </h4>
        <div className="clean-order-section-content">
          <div className="clean-order-status-row">
            <span>Estado:</span>
            <CleanStatusBadge status={statusInfo.variant} label={statusInfo.label} />
          </div>
          <div className="clean-order-status-row">
            <span>Método de pago:</span>
            <span className="capitalize">
              {order.payment_method === 'mercadopago' ? 'MercadoPago' : order.payment_method}
            </span>
          </div>
          <div className="clean-order-status-row">
            <span>Fecha:</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          {order.tracking_number && (
            <div className="clean-order-status-row">
              <span>Tracking:</span>
              <span className="font-mono">{order.tracking_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Info */}
      <div className="clean-order-section">
        <h4 className="clean-order-section-title">
          <Calendar className="w-4 h-4" />
          Evento
        </h4>
        <div className="clean-order-section-content">
          <p className="font-medium">{order.event_name || 'Sin evento'}</p>
          {order.event_date && (
            <p className="text-sm text-[var(--clean-text-muted)]">
              {formatDate(order.event_date)}
            </p>
          )}
          {order.token && (
            <button
              className="clean-btn clean-btn--secondary mt-3"
              onClick={onViewPhotos}
            >
              <ExternalLink className="clean-btn-icon" />
              Ver Fotos
            </button>
          )}
        </div>
      </div>

      {/* Package Info */}
      <div className="clean-order-section">
        <h4 className="clean-order-section-title">
          <Image className="w-4 h-4" />
          Paquete
        </h4>
        <div className="clean-order-section-content">
          <p className="capitalize">{order.package_type || 'Básico'}</p>
          {order.selected_photos && (
            <div className="text-sm mt-2 space-y-1">
              {order.selected_photos.individual && (
                <p>• Individuales: {order.selected_photos.individual.length}</p>
              )}
              {order.selected_photos.group && (
                <p>• Grupales: {order.selected_photos.group.length}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price Summary */}
      <div className="clean-order-section">
        <h4 className="clean-order-section-title">
          <CreditCard className="w-4 h-4" />
          Total
        </h4>
        <div className="clean-order-section-content">
          <span className="text-xl font-bold text-[var(--clean-text)]">
            {formatPrice(order.total_price, order.currency)}
          </span>
        </div>
      </div>

      {/* Production Notes */}
      {order.production_notes && (
        <div className="clean-order-section">
          <h4 className="clean-order-section-title">
            <FileText className="w-4 h-4" />
            Notas de Producción
          </h4>
          <div className="clean-order-notes">
            <p>{order.production_notes}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="clean-order-actions">
        {order.status === 'pending_payment' && (
          <button
            className="clean-btn clean-btn--success"
            onClick={() => onStatusChange(order.id, { status: 'paid', payment_status: 'paid' })}
            disabled={updating}
          >
            <DollarSign className="clean-btn-icon" />
            Marcar como Pagado
          </button>
        )}
        {order.status === 'paid' && (
          <button
            className="clean-btn clean-btn--primary"
            onClick={() => onStatusChange(order.id, { status: 'in_production', production_status: 'printing' })}
            disabled={updating}
          >
            <Play className="clean-btn-icon" />
            Iniciar Producción
          </button>
        )}
        {order.status === 'in_production' && (
          <button
            className="clean-btn clean-btn--success"
            onClick={() => onStatusChange(order.id, { status: 'delivered', delivered_at: new Date().toISOString() })}
            disabled={updating}
          >
            <Check className="clean-btn-icon" />
            Marcar Entregado
          </button>
        )}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button
            className="clean-btn clean-btn--danger"
            onClick={onCancel}
            disabled={updating}
          >
            <X className="clean-btn-icon" />
            Cancelar Orden
          </button>
        )}
      </div>
    </div>
  );
}
