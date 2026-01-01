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
  Play,
  Check,
  X,
  Truck,
  FileText,
  MoreHorizontal,
  Search,
  Filter,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  Trash2,
  ChevronRight,
  TrendingUp,
  Send,
  MessageCircle,
  Edit2,
  Link,
  Copy,
  History,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

// Pixieset-inspired Status configuration with high contrast
const STATUS_CONFIG: Record<string, {
  label: string;
  icon: any;
  className: string;
  dotColor: string;
}> = {
  pending_payment: {
    label: 'Pago Pendiente',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    dotColor: 'bg-amber-500'
  },
  paid: {
    label: 'Pagado',
    icon: DollarSign,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    dotColor: 'bg-emerald-500'
  },
  in_production: {
    label: 'En Producción',
    icon: Clock,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    dotColor: 'bg-blue-500'
  },
  shipped: {
    label: 'Enviado',
    icon: Truck,
    className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
    dotColor: 'bg-violet-500'
  },
  delivered: {
    label: 'Entregado',
    icon: CheckCircle,
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
    dotColor: 'bg-teal-500'
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
    dotColor: 'bg-neutral-400'
  },
};

const STATUS_FLOW = ['pending_payment', 'paid', 'in_production', 'shipped', 'delivered'];

// Format helpers
function formatPrice(price: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(price / 100);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// High-contrast avatar with softer colors (Pixieset style)
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = [
    'bg-slate-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-violet-600',
  ];
  const index = name.charCodeAt(0) % colors.length;
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-medium text-white',
      sizeClasses[size],
      colors[index]
    )}>
      {getInitials(name)}
    </div>
  );
}

// Clean Status Badge (Pixieset style - pill with dot)
function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.cancelled;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border',
      config.className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
}

// Clean Stat Card (Pixieset style)
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accentColor = 'text-slate-600 dark:text-slate-400',
  loading
}: {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  accentColor?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800', accentColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// Order Timeline (Pixieset style - horizontal stepper)
function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center py-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
        <div className="flex items-center gap-2 text-neutral-500">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Pedido Cancelado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 dark:bg-neutral-700" />
        {/* Progress line */}
        <div
          className="absolute top-4 left-6 h-0.5 bg-emerald-500 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (STATUS_FLOW.length - 1)) * 100}% - 48px)` }}
        />

        {STATUS_FLOW.map((status, index) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const isComplete = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={status} className="relative z-10 flex flex-col items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                isComplete
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 text-neutral-400',
                isCurrent && 'ring-4 ring-emerald-100 dark:ring-emerald-900/50'
              )}>
                {isComplete && index < currentIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className={cn(
                'text-xs font-medium text-center max-w-[60px]',
                isComplete ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
              )}>
                {config.label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
        <Package className="h-8 w-8 text-neutral-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        {hasFilter ? 'No hay resultados' : 'Sin pedidos'}
      </h3>
      <p className="text-sm text-neutral-500 text-center max-w-sm">
        {hasFilter
          ? 'Prueba cambiando los filtros o términos de búsqueda.'
          : 'Los pedidos aparecerán aquí cuando los clientes realicen compras.'
        }
      </p>
    </div>
  );
}

// Bulk Actions Bar
function BulkActionsBar({ selectedCount, onClear, onMarkDelivered }: {
  selectedCount: number;
  onClear: () => void;
  onMarkDelivered: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl">
        <span className="text-sm font-medium">
          {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="h-4 w-px bg-neutral-700 dark:bg-neutral-300" />
        <button
          className="text-sm font-medium hover:text-emerald-400 dark:hover:text-emerald-600 transition-colors"
          onClick={onMarkDelivered}
        >
          Marcar Entregados
        </button>
        <button
          className="p-1 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded transition-colors"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Check if order is urgent (pending > 48h)
function isUrgent(order: Order): boolean {
  if (order.status !== 'pending_payment') return false;
  const hoursOld = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
  return hoursOld > 48;
}

// Communication types
interface Communication {
  id: string;
  type: 'email' | 'whatsapp' | 'sms';
  channel: string;
  recipient: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  errorMessage?: string | null;
  messageId?: string | null;
  createdAt: string;
  sentAt?: string | null;
}

export default function CleanOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    total_revenue: 0,
    pending_payment: 0,
    paid: 0,
    in_production: 0,
    delivered: 0,
  });
  // New state for enhanced features
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [editedContact, setEditedContact] = useState<Order['contact_info'] | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loadingComms, setLoadingComms] = useState(false);
  const [showCommsHistory, setShowCommsHistory] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats || { total: 0, total_revenue: 0, pending_payment: 0, paid: 0, in_production: 0, delivered: 0 });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredOrders.length ? new Set() : new Set(filteredOrders.map(o => o.id)));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const bulkMarkDelivered = useCallback(async () => { alert(`Marcando ${selectedIds.size} pedidos...`); clearSelection(); }, [selectedIds, clearSelection]);

  const viewOrderDetails = useCallback(async (orderId: string) => {
    const existingOrder = orders.find(o => o.id === orderId);
    if (existingOrder) setSelectedOrder(existingOrder);
    setSheetOpen(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (response.ok) { const data = await response.json(); setSelectedOrder(data.order); }
    } catch (error) { console.error('Error:', error); }
  }, [orders]);

  const updateOrderStatus = useCallback(async (orderId: string, updates: Partial<Order>) => {
    try {
      setUpdating(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      if (response.ok) { await fetchOrders(); if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, ...updates } : null); }
    } catch (error) { console.error('Error:', error); } finally { setUpdating(null); }
  }, [fetchOrders, selectedOrder]);

  const cancelOrder = useCallback(async (orderId: string) => {
    const reason = prompt('Motivo de la cancelación:');
    if (!reason) return;
    try {
      setUpdating(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' });
      if (response.ok) { await fetchOrders(); if (selectedOrder?.id === orderId) setSheetOpen(false); }
    } catch (error) { console.error('Error:', error); } finally { setUpdating(null); }
  }, [fetchOrders, selectedOrder]);

  const viewSharedPhotos = useCallback((token: string) => {
    window.open(`${window.location.origin}/store-unified/${token}`, '_blank');
  }, []);

  // Send notification (email or WhatsApp)
  const sendNotification = useCallback(async (orderId: string, type: 'email' | 'whatsapp', channel?: string) => {
    try {
      setSendingNotification(`${type}-${orderId}`);
      const response = await fetch(`/api/admin/orders/${orderId}/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, channel: channel || 'order_confirmation', recipient: 'customer' }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`${type === 'email' ? 'Email' : 'WhatsApp'} enviado correctamente`);
        // Refresh communications
        if (selectedOrder) fetchCommunications(selectedOrder.id);
      } else {
        alert(`Error: ${data.error || data.message || 'No se pudo enviar'}`);
      }
    } catch (error) {
      alert('Error al enviar notificacion');
    } finally {
      setSendingNotification(null);
    }
  }, [selectedOrder]);

  // Fetch communications history
  const fetchCommunications = useCallback(async (orderId: string) => {
    try {
      setLoadingComms(true);
      const response = await fetch(`/api/admin/orders/${orderId}/communications`);
      if (response.ok) {
        const data = await response.json();
        setCommunications(data.communications || []);
      }
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoadingComms(false);
    }
  }, []);

  // Update contact info
  const saveContactInfo = useCallback(async (orderId: string) => {
    if (!editedContact) return;
    try {
      setUpdating(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}/contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedContact),
      });
      if (response.ok) {
        await fetchOrders();
        if (selectedOrder) {
          setSelectedOrder({ ...selectedOrder, contact_info: editedContact });
        }
        setEditingContact(false);
        alert('Contacto actualizado correctamente');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'No se pudo actualizar'}`);
      }
    } catch (error) {
      alert('Error al actualizar contacto');
    } finally {
      setUpdating(null);
    }
  }, [editedContact, fetchOrders, selectedOrder]);

  // Copy tracking link
  const copyTrackingLink = useCallback((orderId: string) => {
    const link = `${window.location.origin}/track/${orderId.slice(0, 8)}`;
    navigator.clipboard.writeText(link);
    alert('Link de seguimiento copiado al portapapeles');
  }, []);

  // Open tracking page
  const openTrackingPage = useCallback((orderId: string) => {
    window.open(`${window.location.origin}/track/${orderId.slice(0, 8)}`, '_blank');
  }, []);

  // Load communications when sheet opens
  useEffect(() => {
    if (sheetOpen && selectedOrder) {
      fetchCommunications(selectedOrder.id);
      setEditingContact(false);
      setEditedContact(null);
      setShowCommsHistory(false);
    }
  }, [sheetOpen, selectedOrder, fetchCommunications]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const name = order.contact_info?.name || '';
      const email = order.contact_info?.email || '';
      const event = order.event_name || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase()) || event.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (statusFilter === 'all' || order.status === statusFilter);
    });
  }, [orders, searchTerm, statusFilter]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Pedidos</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Gestiona y realiza seguimiento de las ventas.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchOrders} loading={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualizar
            </Button>
            <Button variant="default" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Pedidos" value={stats.total} icon={Package} loading={loading} accentColor="text-violet-600 dark:text-violet-400" />
          <StatCard label="Ingresos" value={formatPrice(stats.total_revenue)} icon={DollarSign} loading={loading} trend="+12% vs mes anterior" accentColor="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Pendientes" value={stats.pending_payment} icon={Clock} loading={loading} accentColor="text-amber-600 dark:text-amber-400" />
          <StatCard label="Entregados" value={stats.delivered} icon={CheckCircle} loading={loading} accentColor="text-teal-600 dark:text-teal-400" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border-0 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:bg-white dark:focus:bg-neutral-900 transition-all"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-48 h-10 bg-neutral-50 dark:bg-neutral-800 border-0 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4 text-neutral-400" />
                <SelectValue placeholder="Filtrar por estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="in_production">En Producción</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="delivered">Entregado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-neutral-500 whitespace-nowrap">{filteredOrders.length} resultados</span>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                <TableHead className="w-12 pl-4">
                  <Checkbox checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length} onCheckedChange={selectAll} />
                </TableHead>
                <TableHead className="font-semibold text-neutral-700 dark:text-neutral-300">Cliente</TableHead>
                <TableHead className="font-semibold text-neutral-700 dark:text-neutral-300">Evento</TableHead>
                <TableHead className="font-semibold text-neutral-700 dark:text-neutral-300">Estado</TableHead>
                <TableHead className="font-semibold text-neutral-700 dark:text-neutral-300">Fecha</TableHead>
                <TableHead className="font-semibold text-neutral-700 dark:text-neutral-300 text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="w-4 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" /></TableCell>
                    <TableCell><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" /><div className="space-y-1"><div className="w-24 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" /><div className="w-32 h-3 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" /></div></div></TableCell>
                    <TableCell><div className="w-20 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" /></TableCell>
                    <TableCell><div className="w-24 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" /></TableCell>
                    <TableCell><div className="w-20 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" /></TableCell>
                    <TableCell><div className="w-16 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const urgent = isUrgent(order);
                  const isSelected = selectedIds.has(order.id);
                  return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        "cursor-pointer transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0",
                        "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                        isSelected && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                      onClick={() => viewOrderDetails(order.id)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(order.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar name={order.contact_info?.name || 'U'} />
                            {urgent && (
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-neutral-900 flex items-center justify-center">
                                <AlertTriangle className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-white truncate">{order.contact_info?.name || 'Unknown'}</p>
                            <p className="text-sm text-neutral-500 truncate">{order.contact_info?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-600 dark:text-neutral-400">{order.event_name || '—'}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-neutral-600 dark:text-neutral-400">{formatDate(order.created_at)}</TableCell>
                      <TableCell className="text-right font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatPrice(order.total_price, order.currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => viewOrderDetails(order.id)}><Eye className="mr-2 h-4 w-4" /> Ver detalles</DropdownMenuItem>
                            {order.token && <DropdownMenuItem onClick={() => viewSharedPhotos(order.token!)}><ExternalLink className="mr-2 h-4 w-4" /> Ver fotos</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            {order.status !== 'cancelled' && <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); cancelOrder(order.id); }}><Trash2 className="mr-2 h-4 w-4" /> Cancelar</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={7}><EmptyState hasFilter={hasActiveFilters} /></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <BulkActionsBar selectedCount={selectedIds.size} onClear={clearSelection} onMarkDelivered={bulkMarkDelivered} />

        {/* Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3">
                {selectedOrder && <Avatar name={selectedOrder.contact_info?.name || 'U'} size="lg" />}
                <div>
                  <SheetTitle className="text-neutral-900 dark:text-white">{selectedOrder?.contact_info?.name}</SheetTitle>
                  <SheetDescription>Pedido #{selectedOrder?.id?.slice(0, 8)}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {selectedOrder && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <OrderTimeline currentStatus={selectedOrder.status} />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-2">
                  {selectedOrder.status === 'pending_payment' && (
                    <Button onClick={() => updateOrderStatus(selectedOrder.id, { status: 'paid', payment_status: 'paid' })} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <DollarSign className="mr-2 h-4 w-4" /> Marcar como Pagado
                    </Button>
                  )}
                  {selectedOrder.status === 'paid' && (
                    <Button onClick={() => updateOrderStatus(selectedOrder.id, { status: 'in_production', production_status: 'printing' })}>
                      <Play className="mr-2 h-4 w-4" /> Iniciar Produccion
                    </Button>
                  )}
                  {selectedOrder.status === 'in_production' && (
                    <Button onClick={() => updateOrderStatus(selectedOrder.id, { status: 'delivered', delivered_at: new Date().toISOString() })} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Check className="mr-2 h-4 w-4" /> Marcar Entregado
                    </Button>
                  )}
                </div>

                {/* Send Notification Buttons */}
                <section className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Enviar Notificacion</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendNotification(selectedOrder.id, 'email', 'order_confirmation')}
                      disabled={sendingNotification === `email-${selectedOrder.id}` || !selectedOrder.contact_info?.email}
                    >
                      {sendingNotification === `email-${selectedOrder.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendNotification(selectedOrder.id, 'whatsapp')}
                      disabled={sendingNotification === `whatsapp-${selectedOrder.id}` || !selectedOrder.contact_info?.phone}
                      className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                    >
                      {sendingNotification === `whatsapp-${selectedOrder.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="mr-2 h-4 w-4" />
                      )}
                      WhatsApp
                    </Button>
                  </div>
                  {/* Email type selector */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      onClick={() => sendNotification(selectedOrder.id, 'email', 'order_ready')}
                    >
                      Listo para retirar
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      onClick={() => sendNotification(selectedOrder.id, 'email', 'order_shipped')}
                    >
                      Enviado
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      onClick={() => sendNotification(selectedOrder.id, 'email', 'download_ready')}
                    >
                      Descarga lista
                    </button>
                  </div>
                </section>

                {/* Tracking Link */}
                <section className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Link de Seguimiento</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg overflow-hidden text-ellipsis">
                      {window.location.origin}/track/{selectedOrder.id.slice(0, 8)}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyTrackingLink(selectedOrder.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openTrackingPage(selectedOrder.id)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </section>

                {/* Contact - Editable */}
                <section className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Contacto</h4>
                    {!editingContact ? (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        onClick={() => {
                          setEditingContact(true);
                          setEditedContact({ ...selectedOrder.contact_info });
                        }}
                      >
                        <Edit2 className="h-3 w-3" /> Editar
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          className="text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => saveContactInfo(selectedOrder.id)}
                        >
                          Guardar
                        </button>
                        <button
                          className="text-xs text-neutral-500 hover:text-neutral-700"
                          onClick={() => { setEditingContact(false); setEditedContact(null); }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                  {editingContact && editedContact ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={editedContact.name || ''}
                        onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editedContact.email || ''}
                        onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      />
                      <input
                        type="tel"
                        placeholder="Telefono"
                        value={editedContact.phone || ''}
                        onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                        <User className="h-4 w-4 text-neutral-400" /> {selectedOrder.contact_info?.name || 'Sin nombre'}
                      </p>
                      <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                        <Mail className="h-4 w-4 text-neutral-400" /> {selectedOrder.contact_info?.email || 'Sin email'}
                      </p>
                      {selectedOrder.contact_info?.phone && (
                        <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                          <Phone className="h-4 w-4 text-neutral-400" /> {selectedOrder.contact_info.phone}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* Summary */}
                <section className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                    <h4 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Resumen</h4>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <div className="flex justify-between p-4 text-sm"><span className="text-neutral-500">Paquete</span><span className="font-medium text-neutral-900 dark:text-white">{selectedOrder.package_type || 'Basico'}</span></div>
                    <div className="flex justify-between p-4 text-sm"><span className="text-neutral-500">Fotos</span><span className="font-medium text-neutral-900 dark:text-white">{(selectedOrder.selected_photos?.individual?.length || 0) + (selectedOrder.selected_photos?.group?.length || 0)}</span></div>
                    <div className="flex justify-between p-4 text-sm"><span className="text-neutral-500">Evento</span><span className="font-medium text-neutral-900 dark:text-white">{selectedOrder.event_name || '—'}</span></div>
                    <div className="flex justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50"><span className="font-semibold text-neutral-900 dark:text-white">Total</span><span className="font-semibold text-lg text-neutral-900 dark:text-white">{formatPrice(selectedOrder.total_price, selectedOrder.currency)}</span></div>
                  </div>
                </section>

                {/* Communications History */}
                <section className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    onClick={() => setShowCommsHistory(!showCommsHistory)}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-neutral-400" />
                      <h4 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                        Historial de Comunicaciones
                      </h4>
                      {communications.length > 0 && (
                        <span className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                          {communications.length}
                        </span>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 text-neutral-400 transition-transform",
                      showCommsHistory && "rotate-90"
                    )} />
                  </button>
                  {showCommsHistory && (
                    <div className="border-t border-neutral-100 dark:border-neutral-800">
                      {loadingComms ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-neutral-400" />
                        </div>
                      ) : communications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-neutral-500">
                          No hay comunicaciones registradas
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-64 overflow-y-auto">
                          {communications.map((comm) => (
                            <div key={comm.id} className="p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {comm.type === 'email' ? (
                                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                                  ) : (
                                    <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  )}
                                  <span className="font-medium capitalize">{comm.channel.replace(/_/g, ' ')}</span>
                                </div>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  comm.status === 'sent' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                  comm.status === 'failed' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                  comm.status === 'pending' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                )}>
                                  {comm.status === 'sent' ? 'Enviado' : comm.status === 'failed' ? 'Fallido' : 'Pendiente'}
                                </span>
                              </div>
                              <div className="text-xs text-neutral-500">
                                <span>{comm.recipient === 'customer' ? 'Cliente' : 'Fotografo'}</span>
                                <span className="mx-1">•</span>
                                <span>{new Date(comm.createdAt).toLocaleString('es-AR')}</span>
                              </div>
                              {comm.errorMessage && (
                                <p className="text-xs text-red-500 mt-1">{comm.errorMessage}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Footer */}
                <div className="flex gap-3">
                  {selectedOrder.token && <Button variant="outline" className="flex-1" onClick={() => viewSharedPhotos(selectedOrder.token!)}><ExternalLink className="mr-2 h-4 w-4" /> Ver Fotos</Button>}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && <Button variant="destructive" className="flex-1" onClick={() => cancelOrder(selectedOrder.id)}>Cancelar</Button>}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
