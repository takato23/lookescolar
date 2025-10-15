'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Clock,
  DollarSign,
  Calendar,
  User,
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  TrendingUp,
  Users,
  Receipt,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';

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
}

interface MobileOrdersManagerProps {
  orders: Order[];
  onOrderSelect?: (order: Order) => void;
  onOrderUpdate?: (orderId: string, updates: Partial<Order>) => void;
  onOrderCancel?: (orderId: string) => void;
  onViewSharedPhotos?: (token: string) => void;
  loading?: boolean;
  className?: string;
  stats?: {
    total: number;
    total_revenue: number;
    pending_payment: number;
    delivered: number;
  };
  onRefresh?: () => void;
}

type ViewMode = 'list' | 'grid';
type SortBy = 'date' | 'status' | 'amount' | 'customer';
type FilterBy = 'all' | 'pending_payment' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';

// Header premium con métricas visuales
const MobileOrdersHeader = ({
  stats,
  onRefresh
}: {
  stats: {
    total: number;
    total_revenue: number;
    pending_payment: number;
    delivered: number;
  };
  onRefresh: () => void;
}) => {
  const formatPrice = (price: number, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  type MobileDashboardStat = {
    label: string;
    value: string;
    icon: LucideIcon;
    description: string;
    accentGradient: string;
    pillBackground: string;
    iconTint: string;
    labelTint: string;
    valueColor: string;
    heroBackground?: string;
    heroRing?: string;
    isPrimary?: boolean;
  };

  const statsCards: MobileDashboardStat[] = [
    {
      label: 'Ingresos',
      value: formatPrice(stats.total_revenue),
      icon: TrendingUp,
      description: 'Monto total generado',
      accentGradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent dark:from-emerald-400/25 dark:via-emerald-500/15 dark:to-transparent',
      pillBackground: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconTint: 'text-emerald-500 dark:text-emerald-300',
      labelTint: 'text-emerald-600 dark:text-emerald-100',
      valueColor: 'text-emerald-500 dark:text-emerald-200',
      heroBackground: 'from-emerald-500/22 via-emerald-500/10 to-transparent dark:from-emerald-400/25 dark:via-emerald-500/15 dark:to-transparent',
      heroRing: 'ring-emerald-500/30',
      isPrimary: true,
    },
    {
      label: 'Total pedidos',
      value: stats.total.toString(),
      icon: ShoppingBag,
      description: 'Pedidos acumulados',
      accentGradient: 'from-purple-500/18 via-purple-500/10 to-transparent dark:from-purple-500/20 dark:via-purple-400/12 dark:to-transparent',
      pillBackground: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconTint: 'text-purple-500 dark:text-purple-300',
      labelTint: 'text-purple-600 dark:text-purple-100',
      valueColor: 'text-purple-600 dark:text-purple-200',
    },
    {
      label: 'Pendientes',
      value: stats.pending_payment.toString(),
      icon: Clock,
      description: 'Pagos por confirmar',
      accentGradient: 'from-amber-500/20 via-amber-400/15 to-transparent dark:from-amber-400/20 dark:via-amber-500/15 dark:to-transparent',
      pillBackground: 'bg-amber-400/15 dark:bg-amber-500/20',
      iconTint: 'text-amber-500 dark:text-amber-300',
      labelTint: 'text-amber-600 dark:text-amber-100',
      valueColor: 'text-amber-600 dark:text-amber-200',
    },
    {
      label: 'Entregados',
      value: stats.delivered.toString(),
      icon: CheckCircle,
      description: 'Pedidos completados',
      accentGradient: 'from-sky-500/20 via-sky-500/10 to-transparent dark:from-sky-400/20 dark:via-sky-500/15 dark:to-transparent',
      pillBackground: 'bg-sky-500/10 dark:bg-sky-500/20',
      iconTint: 'text-sky-500 dark:text-sky-300',
      labelTint: 'text-sky-600 dark:text-sky-100',
      valueColor: 'text-sky-600 dark:text-sky-200',
    },
  ];

  const primaryStat = statsCards.find((stat) => stat.isPrimary) ?? statsCards[0];
  const secondaryStats = statsCards.filter((stat) => stat !== primaryStat);

  const renderPrimaryStat = (stat: MobileDashboardStat) => {
    const Icon = stat.icon;
    return (
      <motion.div
        key={`hero-${stat.label}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`col-span-2 group relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-5 shadow-lg ring-1 ${stat.heroRing ?? 'ring-border/40'}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.heroBackground ?? stat.accentGradient} opacity-90 transition-opacity duration-500 group-hover:opacity-100`}
        />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${stat.pillBackground}`}>
              <Icon className={`h-3.5 w-3.5 ${stat.iconTint}`} />
              <span className={stat.labelTint}>{stat.label}</span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">Hoy</span>
          </div>
          <div className="space-y-1">
            <p className={`text-3xl font-semibold leading-tight ${stat.valueColor}`}>{stat.value}</p>
            <p className="text-sm text-muted-foreground/80">{stat.description}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSecondaryStat = (stat: MobileDashboardStat, index: number) => {
    const Icon = stat.icon;
    return (
      <motion.div
        key={stat.label}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 + index * 0.05 }}
        className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/90 p-3.5 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.accentGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        />
        <div className="relative z-10 space-y-2">
          <div className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${stat.pillBackground}`}>
            <Icon className={`h-3 w-3 ${stat.iconTint}`} />
            <span className={stat.labelTint}>{stat.label}</span>
          </div>
          <p className={`text-xl font-semibold leading-tight ${stat.valueColor}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground/80">{stat.description}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative sticky top-0 z-10 overflow-hidden border-b border-border/80 shadow-sm backdrop-blur-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-surface/85 to-surface/60 dark:from-background/90 dark:via-surface/70 dark:to-surface/45" />
      <div className="relative p-4 space-y-5">
        {/* Header principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80 dark:border-primary/30 dark:bg-primary/15 dark:text-primary/70">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(99,102,241,0.45)]" />
              Pedidos activos
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Panel de pedidos</h1>
            <p className="text-sm text-muted-foreground/90">Monitorea ventas, pagos y entregas en tiempo real.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="rounded-xl border border-border/60 bg-card/80 p-2 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 gap-3">
          {primaryStat && renderPrimaryStat(primaryStat)}
          {secondaryStats.map((stat, index) => renderSecondaryStat(stat, index))}
        </div>
      </div>
    </div>
  );
};

export function MobileOrdersManager({
  orders,
  onOrderSelect,
  onOrderUpdate,
  onOrderCancel,
  onViewSharedPhotos,
  loading = false,
  className,
  stats = { total: 0, total_revenue: 0, pending_payment: 0, delivered: 0 },
  onRefresh,
}: MobileOrdersManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filter and sort orders
  const filteredOrders = orders.filter(order => {
    const customerName = order.contact_info?.name || '';
    const customerEmail = order.contact_info?.email || '';
    const eventName = order.event_name || '';

    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eventName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterBy === 'all' || order.status === filterBy;

    return matchesSearch && matchesFilter;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      case 'amount':
        return b.total_price - a.total_price;
      case 'customer':
        return (a.contact_info?.name || '').localeCompare(b.contact_info?.name || '');
      default:
        return 0;
    }
  });

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    onOrderSelect?.(order.id);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string, additionalUpdates?: Partial<Order>) => {
    setUpdating(orderId);
    try {
      const updates: Partial<Order> = { status: newStatus, ...additionalUpdates };
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }
      onOrderUpdate?.(orderId, updates);
      setShowOrderDetails(false);
    } finally {
      setUpdating(null);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    onOrderCancel?.(orderId);
    setShowOrderDetails(false);
  };

  const handleViewOrderDetails = async (orderId: string) => {
    try {
      // Mostrar loading en el botón
      setUpdating(orderId);

      // Llamar a la API para obtener detalles del pedido
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data.order);
        setShowOrderDetails(true);
      } else {
        console.error('Error fetching order details:', response.status);
        alert('Error al cargar los detalles de la orden');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('Error al cargar los detalles de la orden');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm';

    switch (status) {
      case 'delivered':
        return (
          <span className={`${baseClasses} bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/35 dark:bg-emerald-500/18 dark:text-emerald-100`}>
            <CheckCircle className="h-3 w-3" />
            Entregado
          </span>
        );
      case 'shipped':
        return (
          <span className={`${baseClasses} bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/35 dark:bg-violet-500/18 dark:text-violet-100`}>
            <Package className="h-3 w-3" />
            Enviado
          </span>
        );
      case 'in_production':
        return (
          <span className={`${baseClasses} bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/35 dark:bg-sky-500/18 dark:text-sky-100`}>
            <Clock className="h-3 w-3" />
            Producción
          </span>
        );
      case 'paid':
        return (
          <span className={`${baseClasses} bg-green-500/12 text-green-600 ring-1 ring-green-500/35 dark:bg-green-500/18 dark:text-green-100`}>
            <DollarSign className="h-3 w-3" />
            Pagado
          </span>
        );
      case 'pending_payment':
        return (
          <span className={`${baseClasses} bg-amber-500/16 text-amber-600 ring-1 ring-amber-500/35 dark:bg-amber-500/22 dark:text-amber-100`}>
            <AlertCircle className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${baseClasses} bg-rose-500/12 text-rose-600 ring-1 ring-rose-500/35 dark:bg-rose-500/18 dark:text-rose-100`}>
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-muted text-foreground ring-1 ring-border/60 dark:bg-background/45 dark:text-muted-foreground`}>
            <AlertCircle className="h-3 w-3" />
            {status || 'Desconocido'}
          </span>
        );
    }
  };

  const formatPrice = (price: number, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const OrderCard = ({ order, index }: { order: Order; index: number }) => {
    const customerName = order.contact_info?.name || 'Sin nombre';
    const eventName = order.event_name || 'Sin evento';
    const itemCount = (order.additional_copies?.length || 0) +
                     (order.selected_photos?.individual?.length || 0) +
                     (order.selected_photos?.group?.length || 0);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{
          delay: index * 0.08,
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        whileTap={{ scale: 0.98 }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => handleOrderClick(order)}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-card/60 via-card/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-surface/80 dark:via-surface/60 dark:to-primary/10"
        />
        <div className="relative z-10 space-y-4">
          {/* Header con gradiente */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <p className="truncate font-semibold text-foreground">{customerName}</p>
              </div>
              <p className="truncate font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
                #{order.id.length > 12 ? `${order.id.substring(0, 12)}...` : order.id}
              </p>
            </div>
            <div className="ml-3">
              {getStatusBadge(order.status)}
            </div>
          </div>

          {/* Información del evento con ícono */}
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/70 p-2.5 dark:bg-surface/40">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {eventName}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {formatDate(order.created_at)}
              </span>
            </div>
          </div>

          {/* Detalles del pedido */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Package className="h-3 w-3" />
                <span>{itemCount}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">Total</span>
              <span className="text-xl font-semibold text-foreground">
                {formatPrice(order.total_price, order.currency)}
              </span>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10 dark:hover:bg-primary/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewOrderDetails(order.id);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
              {order.token && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-600 dark:hover:bg-green-500/20 dark:hover:text-green-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewSharedPhotos?.(order.token!);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setShowOrderDetails(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex-1 max-h-[90vh] overflow-hidden rounded-t-2xl border border-border/60 border-b-0 bg-card/95 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 bg-surface/80 px-4 py-4 dark:bg-surface/40">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Detalles del pedido</h2>
                  <p className="text-sm text-muted-foreground/80">{selectedOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="p-2 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {/* Customer Info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Cliente
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{selectedOrder.contact_info.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedOrder.contact_info.email}</span>
                  </div>
                  {selectedOrder.contact_info.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span className="font-medium">{selectedOrder.contact_info.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Status */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium">Estado del Pedido</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Método de pago:</span>
                    <span className="text-sm font-medium capitalize">
                      {selectedOrder.payment_method === 'mercadopago' ? 'MercadoPago' :
                       selectedOrder.payment_method === 'transferencia' ? 'Transferencia' :
                       selectedOrder.payment_method === 'efectivo' ? 'Efectivo' :
                       selectedOrder.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fecha:</span>
                    <span className="text-sm">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Event Info */}
              {selectedOrder.event_name && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Evento
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{selectedOrder.event_name}</span>
                    </div>
                    {selectedOrder.event_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span>{new Date(selectedOrder.event_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Package Info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium">Paquete Seleccionado</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium capitalize">{selectedOrder.package_type || 'Básico'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fotos:</span>
                    <span className="font-medium">
                      {(selectedOrder.selected_photos?.individual?.length || 0) +
                       (selectedOrder.selected_photos?.group?.length || 0)} fotos
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="rounded-xl border border-primary/20 bg-primary-50 p-4 space-y-3 dark:border-primary/30 dark:bg-primary/15">
                <h3 className="flex items-center gap-2 font-medium">
                  <CreditCard className="h-5 w-5" />
                  Resumen de Precios
                </h3>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary-600 dark:text-primary/80">
                    {formatPrice(selectedOrder.total_price, selectedOrder.currency)}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium">Acciones Rápidas</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedOrder.status === 'pending_payment' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'paid', { payment_status: 'paid' })}
                      disabled={updating === selectedOrder.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-green-500/40 bg-green-500/12 px-3 py-3 text-sm font-semibold text-green-600 transition-colors hover:bg-green-500/20 disabled:opacity-50 dark:bg-green-500/18 dark:text-green-100"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Marcar Pagado</span>
                    </button>
                  )}

                  {selectedOrder.status === 'paid' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'in_production')}
                      disabled={updating === selectedOrder.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/12 px-3 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 disabled:opacity-50 dark:bg-blue-500/18 dark:text-blue-100"
                    >
                      <Play className="h-4 w-4" />
                      <span className="text-sm">Iniciar Producción</span>
                    </button>
                  )}

                  {selectedOrder.status === 'in_production' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered')}
                      disabled={updating === selectedOrder.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/12 px-3 py-3 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-500/20 disabled:opacity-50 dark:bg-purple-500/18 dark:text-purple-100"
                    >
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Marcar Entregado</span>
                    </button>
                  )}

                  {selectedOrder.token && (
                    <button
                      onClick={() => onViewSharedPhotos?.(selectedOrder.token!)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm">Ver Fotos</span>
                    </button>
                  )}

                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <button
                      onClick={() => {
                        if (confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
                          handleCancelOrder(selectedOrder.id);
                        }
                      }}
                      disabled={updating === selectedOrder.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/12 px-3 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:bg-rose-500/18 dark:text-rose-100"
                    >
                      <X className="h-4 w-4" />
                      <span className="text-sm">Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className={clsx('w-full min-h-screen bg-background', className)}>
      {/* Header premium con métricas */}
      <MobileOrdersHeader
        stats={stats}
        onRefresh={onRefresh || (() => window.location.reload())}
      />

      {/* Search and Filters */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, ID o evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 mr-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-sm"
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="text-sm text-muted-foreground">
            {sortedOrders.length} pedido{sortedOrders.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todos los pedidos</option>
                  <option value="pending_payment">Pago pendiente</option>
                  <option value="paid">Pagado</option>
                  <option value="in_production">En producción</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="date">Por fecha</option>
                  <option value="status">Por estado</option>
                  <option value="amount">Por monto</option>
                  <option value="customer">Por cliente</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sortedOrders.length} pedido{sortedOrders.length !== 1 ? 's' : ''}
          {searchTerm && ` para "${searchTerm}"`}
        </span>
      </div>

      <div className="px-4 pt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70">
        Pedidos recientes
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando pedidos...</p>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                  <div className="h-6 bg-muted-foreground/20 rounded-full w-20"></div>
                </div>
                <div className="h-12 bg-muted-foreground/20 rounded-lg mb-3"></div>
                <div className="flex justify-between">
                  <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
                  <div className="h-6 bg-muted-foreground/20 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="bg-muted/30 rounded-2xl p-8 max-w-sm mx-auto">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No se encontraron pedidos' : 'Aún no hay pedidos'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Intenta con otros términos de búsqueda o verifica los filtros'
                  : 'Los pedidos de los usuarios aparecerán aquí cuando realicen compras'
                }
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm('')}
                  className="text-sm"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <AnimatePresence>
              {sortedOrders.map((order, index) => (
                <OrderCard key={order.id} order={order} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderDetails && <OrderDetailsModal />}
      </AnimatePresence>
    </div>
  );
}

