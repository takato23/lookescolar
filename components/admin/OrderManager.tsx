'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  AlertTriangle,
  RefreshCw,
  Loader2,
  Settings,
  MoreHorizontal,
  CheckSquare,
  Square,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  BarChart3,
  Workflow,
  Shield,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderDetail from './orders/OrderDetail';
import OrderAnalyticsDashboard from './orders/OrderAnalyticsDashboard';
import WorkflowManagementDashboard from './orders/WorkflowManagementDashboard';
import SecurityAuditDashboard from './orders/SecurityAuditDashboard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

// Enhanced Order interface with new fields
interface EnhancedOrder {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'failed' | 'cancelled';
  enhanced_status?: 'pending_overdue' | 'delivery_overdue' | string;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_preference_id?: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  delivered_at: string | null;
  total_amount_cents: number;
  total_items: number;
  priority_level: number | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  delivery_method: string | null;
  tracking_number: string | null;
  hours_since_created?: number;
  hours_since_status_change?: number;
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

interface EnhancedOrderStats {
  total: number;
  by_status: Record<string, number>;
  total_revenue_cents: number;
  overdue_pending: number;
  overdue_delivery: number;
  avg_processing_time_hours: number;
  priority_distribution: Record<number, number>;
}

type OrderStatus =
  | 'all'
  | 'pending'
  | 'approved'
  | 'delivered'
  | 'failed'
  | 'cancelled';
type SortField =
  | 'created_at'
  | 'status'
  | 'total_amount_cents'
  | 'priority_level'
  | 'contact_name';
type SortOrder = 'asc' | 'desc';
type Order = EnhancedOrder; // Type alias for compatibility

export default function OrderManager() {
  // Tab state
  const [activeTab, setActiveTab] = useState('orders');

  // State management
  const [orders, setOrders] = useState<EnhancedOrder[]>([]);
  const [stats, setStats] = useState<EnhancedOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<EnhancedOrder | null>(
    null
  );
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load orders with enhanced filtering
  const loadOrders = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        else setRefreshing(true);
        setError(null);

        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          status: filter,
          ...(eventId && { event_id: eventId }),
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/admin/orders?${params}`);
        if (!response.ok) {
          throw new Error('Error loading orders');
        }

        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats || null);
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Error loading orders:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        alert('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, filter, eventId, searchQuery]
  );

  // Auto-refresh logic
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadOrders(false); // Refresh without showing loading spinner
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadOrders]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    if (!orders.length) return [];

    return [...orders].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special sorting cases
      if (sortField === 'total_amount_cents') {
        aValue = a.total_amount_cents || 0;
        bValue = b.total_amount_cents || 0;
      } else if (sortField === 'priority_level') {
        aValue = a.priority_level || 1;
        bValue = b.priority_level || 1;
      } else if (sortField === 'created_at') {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [orders, sortField, sortOrder]);

  // Derived problem lists - MOVED BEFORE ANY RETURNS
  const problemOrders = useMemo(() => {
    const isPendingOver24h = (o: EnhancedOrder) =>
      o.status === 'pending' &&
      Date.now() - new Date(o.created_at).getTime() > 24 * 60 * 60 * 1000;

    const missingTotal = (o: EnhancedOrder) =>
      !o.total_amount_cents || o.total_amount_cents <= 0;
    const missingPreference = (o: EnhancedOrder) =>
      (o.mp_preference_id == null || o.mp_preference_id === '') &&
      Date.now() - new Date(o.created_at).getTime() > 60 * 60 * 1000; // older than 1h

    return {
      pendingOver24h: orders.filter(isPendingOver24h),
      missingTotal: orders.filter(missingTotal),
      missingPreference: orders.filter(missingPreference),
    };
  }, [orders]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  // Update order status with enhanced tracking
  const updateOrderStatus = async (
    orderId: string,
    newStatus: 'delivered' | 'cancelled',
    notes?: string
  ) => {
    try {
      setUpdatingOrders((prev) => new Set([...prev, orderId]));

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          admin_notes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Error updating order');
      }

      const result = await response.json();

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                admin_notes: notes || order.admin_notes,
                actual_delivery_date:
                  newStatus === 'delivered' ? new Date().toISOString() : null,
              }
            : order
        )
      );

      alert(`Order ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating order:', error);
      alert(error instanceof Error ? error.message : 'Error updating order');
    } finally {
      setUpdatingOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handle bulk operations
  const handleBulkUpdate = async (
    status: 'delivered' | 'cancelled',
    notes?: string
  ) => {
    if (selectedOrders.size === 0) {
      alert('Please select orders to update');
      return;
    }

    try {
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_ids: Array.from(selectedOrders),
          updates: {
            status,
            admin_notes: notes,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Error performing bulk update');
      }

      const result = await response.json();

      alert(`${result.result.successful_updates} orders updated successfully`);

      // Refresh orders
      loadOrders(false);
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Error in bulk update:', error);
      alert(
        error instanceof Error ? error.message : 'Error performing bulk update'
      );
    }
  };

  // Selection handlers
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(sortedOrders.map((order) => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  // Export functions and utilities

  // Get status badge variant
  const getStatusBadgeVariant = (status: string, enhancedStatus?: string) => {
    if (
      enhancedStatus === 'pending_overdue' ||
      enhancedStatus === 'delivery_overdue'
    ) {
      return 'destructive';
    }

    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'delivered':
        return 'success';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: number | null) => {
    if (!priority || priority === 1) return null;

    const variants = {
      2: 'secondary',
      3: 'default',
      4: 'destructive',
      5: 'destructive',
    } as const;

    return (
      <Badge
        variant={variants[priority as keyof typeof variants] || 'secondary'}
        className="text-xs"
      >
        P{priority}
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(cents / 100);
  };

  // Format relative time
  const formatRelativeTime = (hours: number) => {
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${Math.floor(hours)} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="orders" className="gap-2">
          <Package className="h-4 w-4" />
          Orders
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="workflows" className="gap-2">
          <Settings className="h-4 w-4" />
          Workflows
        </TabsTrigger>
        <TabsTrigger value="security" className="gap-2">
          <Shield className="h-4 w-4" />
          Security
        </TabsTrigger>
        <TabsTrigger value="problems" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Problemas
          {problemOrders.pendingOver24h.length +
            problemOrders.missingTotal.length +
            problemOrders.missingPreference.length >
            0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {problemOrders.pendingOver24h.length +
                problemOrders.missingTotal.length +
                problemOrders.missingPreference.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="mt-6">
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
                value={stats.by_status['pending'] || 0}
                icon={<Clock className="h-5 w-5" />}
                variant="glass"
                noise
              />
              <StatsCard
                title="Entregados"
                value={stats.by_status['delivered'] || 0}
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
                      onClick={() => loadOrders()}
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
                      {searchQuery
                        ? 'No se encontraron pedidos'
                        : 'No hay pedidos'}
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
                                    {new Date(
                                      order.delivered_at
                                    ).toLocaleString('es-AR')}
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
                                    <span className="ml-1">
                                      {order.mp_status}
                                    </span>
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
                              (Date.now() -
                                new Date(order.created_at).getTime()) /
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
                onClick={() => loadOrders()}
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
      </TabsContent>

      <TabsContent value="analytics" className="mt-6">
        <OrderAnalyticsDashboard />
      </TabsContent>

      <TabsContent value="workflows" className="mt-6">
        <WorkflowManagementDashboard />
      </TabsContent>

      <TabsContent value="security" className="mt-6">
        <SecurityAuditDashboard />
      </TabsContent>

      <TabsContent value="problems" className="mt-6">
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Órdenes pendientes {'>'} 24h
                <Badge variant="destructive" className="ml-2">
                  {problemOrders.pendingOver24h.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {problemOrders.pendingOver24h.length === 0 ? (
                <div className="text-muted-foreground text-sm">Sin casos</div>
              ) : (
                problemOrders.pendingOver24h.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        #{o.id.slice(-8)} • {o.contact_name}
                      </div>
                      <div className="text-muted-foreground">
                        Creada: {new Date(o.created_at).toLocaleString('es-AR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openOrderDetail(o)}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await fetch('/api/admin/orders/cleanup', {
                            method: 'POST',
                          });
                          loadOrders(false);
                        }}
                      >
                        Cancelar pendientes 24h
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Órdenes sin total_amount_cents
                <Badge variant="destructive" className="ml-2">
                  {problemOrders.missingTotal.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {problemOrders.missingTotal.length === 0 ? (
                <div className="text-muted-foreground text-sm">Sin casos</div>
              ) : (
                problemOrders.missingTotal.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-red-500/20 bg-red-500/5 p-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        #{o.id.slice(-8)} • {o.contact_name}
                      </div>
                      <div className="text-muted-foreground">
                        Estado: {o.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openOrderDetail(o)}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/admin/orders/${o.id}`, '_blank')
                        }
                      >
                        Abrir detalle
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Órdenes sin mp_preference_id
                <Badge variant="outline" className="ml-2">
                  {problemOrders.missingPreference.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {problemOrders.missingPreference.length === 0 ? (
                <div className="text-muted-foreground text-sm">Sin casos</div>
              ) : (
                problemOrders.missingPreference.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-orange-500/20 bg-orange-500/5 p-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        #{o.id.slice(-8)} • {o.contact_name}
                      </div>
                      <div className="text-muted-foreground">
                        Creada: {new Date(o.created_at).toLocaleString('es-AR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openOrderDetail(o)}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/admin/orders/${o.id}`, '_blank')
                        }
                      >
                        Abrir detalle
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
