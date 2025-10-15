'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  User,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Filter,
  Search,
  Download,
  Phone,
  Mail,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  eventName: string;
  eventDate: Date;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

interface OrderItem {
  id: string;
  type: 'photo' | 'album' | 'digital' | 'print';
  quantity: number;
  price: number;
  description: string;
}

interface OrderStatusMonitorProps {
  orders: Order[];
  onOrderSelect?: (order: Order) => void;
  onOrderUpdate?: (order: Order) => void;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

const statusConfig = {
  pending: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: Clock,
    label: 'Pendiente',
  },
  processing: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: Package,
    label: 'Procesando',
  },
  shipped: {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    icon: Truck,
    label: 'Enviado',
  },
  delivered: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Entregado',
  },
  cancelled: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Cancelado',
  },
};

const priorityConfig = {
  low: {
    color: 'bg-muted text-muted-foreground',
    label: 'Baja',
  },
  normal: {
    color: 'bg-blue-100 text-blue-600',
    label: 'Normal',
  },
  high: {
    color: 'bg-orange-100 text-orange-600',
    label: 'Alta',
  },
  urgent: {
    color: 'bg-red-100 text-red-600',
    label: 'Urgente',
  },
};

export function OrderStatusMonitor({
  orders,
  onOrderSelect,
  onOrderUpdate,
  onRefresh,
  className,
  compact = false,
}: OrderStatusMonitorProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'priority' | 'customer'>('date');

  // Filter and sort orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    const matchesSearch = searchTerm === '' ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.eventName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'status':
        const statusOrder = { pending: 0, processing: 1, shipped: 2, delivered: 3, cancelled: 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'customer':
        return a.customerName.localeCompare(b.customerName);
      default:
        return 0;
    }
  });

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    onOrderSelect?.(order);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalRevenue = () => {
    return orders
      .filter(order => order.status === 'delivered')
      .reduce((total, order) => total + order.total, 0);
  };

  if (orders.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <div className="rounded-full bg-muted p-6 mx-auto w-fit mb-4">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          No hay pedidos
        </h3>
        <p className="text-muted-foreground">
          Los pedidos aparecerán aquí cuando los clientes realicen compras
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Summary Cards */}
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center ring-1 ring-yellow-200/50"
          >
            <div className="text-2xl font-bold text-yellow-700">{pendingOrders}</div>
            <div className="text-xs text-yellow-600">Pendientes</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center ring-1 ring-blue-200/50"
          >
            <div className="text-2xl font-bold text-blue-700">{processingOrders}</div>
            <div className="text-xs text-blue-600">Procesando</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center ring-1 ring-purple-200/50"
          >
            <div className="text-2xl font-bold text-purple-700">{shippedOrders}</div>
            <div className="text-xs text-purple-600">Enviados</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center ring-1 ring-green-200/50"
          >
            <div className="text-2xl font-bold text-green-700">{formatCurrency(getTotalRevenue())}</div>
            <div className="text-xs text-green-600">Facturado</div>
          </motion.div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Pedidos ({orders.length})
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="mobile-touch-target p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Actualizar pedidos"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviados</option>
            <option value="delivered">Entregados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground"
        >
          <option value="all">Todas las prioridades</option>
          <option value="urgent">Urgentes</option>
          <option value="high">Altas</option>
          <option value="normal">Normales</option>
          <option value="low">Bajas</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground"
        >
          <option value="date">Por fecha</option>
          <option value="status">Por estado</option>
          <option value="priority">Por prioridad</option>
          <option value="customer">Por cliente</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por cliente, pedido o evento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {sortedOrders.map((order, index) => {
            const statusInfo = statusConfig[order.status];
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleOrderClick(order)}
                className={clsx(
                  'bg-background rounded-xl p-4 shadow-sm ring-1 transition-all duration-200',
                  'hover:shadow-md hover:ring-border/80 active:scale-[0.98]',
                  'mobile-touch-target',
                  selectedOrder?.id === order.id && 'ring-2 ring-primary-500 shadow-md'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        #{order.orderNumber}
                      </h3>
                      <span className={clsx(
                        'inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        statusInfo.color,
                        statusInfo.textColor
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{statusInfo.label}</span>
                      </span>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        priorityConfig[order.priority].color
                      )}>
                        {priorityConfig[order.priority].label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{order.customerName}</span>
                      <span>•</span>
                      <span>{order.eventName}</span>
                    </div>
                  </div>

                  <div className="text-right ml-2">
                    <div className="text-lg font-bold text-foreground">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="text-foreground">{item.description}</span>
                        <span className="text-muted-foreground ml-2">
                          (x{item.quantity})
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Contact */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center space-x-3">
                    {order.customerPhone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${order.customerPhone}`);
                        }}
                        className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary-600 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Llamar</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`mailto:${order.customerEmail}`);
                      }}
                      className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary-600 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOrderUpdate?.(order);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-primary-600 text-foreground text-sm rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver Detalles</span>
                  </button>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      <strong>Nota:</strong> {order.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* No Results */}
      {sortedOrders.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No se encontraron pedidos con los filtros aplicados
          </p>
        </div>
      )}
    </div>
  );
}
