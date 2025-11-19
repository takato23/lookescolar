'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminFloatingNav } from '@/components/admin/AdminFloatingNav';
import {
  ArrowLeft,
  Home,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Download,
  Eye,
  Calendar,
  User,
  Image,
  TrendingUp,
  ShoppingBag,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Settings,
  Play,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  FileText,
  Truck,
} from 'lucide-react';
import {
  PremiumGlassButton,
  PremiumIconButton,
} from '@/components/ui/premium-glass-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function OrdersPage() {
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    | 'all'
    | 'pending_payment'
    | 'paid'
    | 'in_production'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
  >('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    total_revenue: 0,
    pending_payment: 0,
    paid: 0,
    in_production: 0,
    delivered: 0,
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(
          data.stats || {
            total: 0,
            total_revenue: 0,
            pending_payment: 0,
            paid: 0,
            in_production: 0,
            delivered: 0,
          }
        );
      } else {
        console.error('Error fetching orders');
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

  const viewOrderDetails = useCallback(async (orderId: string) => {
    try {
      console.log('Fetching order details for:', orderId);
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Order details received:', data);
        setOrderDetails(data.order);
        setShowOrderDetails(true);
      } else {
        console.error('Error fetching order details:', response.status);
        alert('Error al cargar los detalles de la orden');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('Error al cargar los detalles de la orden');
    }
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      try {
        setUpdating(orderId);
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          await fetchOrders(); // Refresh orders list
          alert('Orden actualizada exitosamente');
        } else {
          console.error('Error updating order:', response.status);
          alert('Error al actualizar la orden');
        }
      } catch (error) {
        console.error('Error updating order:', error);
        alert('Error al actualizar la orden');
      } finally {
        setUpdating(null);
      }
    },
    [fetchOrders]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const reason = prompt('Motivo de la cancelación:');
      if (!reason) return;

      try {
        setUpdating(orderId);
        const response = await fetch(
          `/api/admin/orders/${orderId}?reason=${encodeURIComponent(reason)}`,
          {
            method: 'DELETE',
          }
        );

        if (response.ok) {
          await fetchOrders(); // Refresh orders list
          alert('Orden cancelada exitosamente');
        } else {
          console.error('Error cancelling order:', response.status);
          alert('Error al cancelar la orden');
        }
      } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Error al cancelar la orden');
      } finally {
        setUpdating(null);
      }
    },
    [fetchOrders]
  );

  const viewSharedPhotos = useCallback((token: string) => {
    const url = `${window.location.origin}/store-unified/${token}`;
    window.open(url, '_blank');
  }, []);

  const formatPrice = (price: number, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const statsCards = [
    {
      label: 'Total de pedidos',
      description: 'Órdenes registradas en la plataforma',
      value: stats.total.toString(),
      icon: ShoppingBag,
      accent: 'from-sky-500/15 to-sky-500/5',
    },
    {
      label: 'Ingresos',
      description: 'Monto total confirmado',
      value: formatPrice(stats.total_revenue),
      icon: DollarSign,
      accent: 'from-emerald-500/15 to-emerald-500/5',
    },
    {
      label: 'Pagos pendientes',
      description: 'Órdenes aguardando confirmación',
      value: stats.pending_payment.toString(),
      icon: Clock,
      accent: 'from-amber-500/15 to-amber-500/5',
    },
    {
      label: 'Pedidos entregados',
      description: 'Marcados como finalizados',
      value: stats.delivered.toString(),
      icon: CheckCircle,
      accent: 'from-violet-500/15 to-violet-500/5',
    },
  ];

  const statusFilters = [
    { value: 'all', label: 'Todos', icon: Package },
    { value: 'pending_payment', label: 'Pago pendiente', icon: AlertCircle },
    { value: 'paid', label: 'Pagado', icon: DollarSign },
    { value: 'in_production', label: 'En producción', icon: Clock },
    { value: 'shipped', label: 'Enviado', icon: Truck },
    { value: 'delivered', label: 'Entregado', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelado', icon: XCircle },
  ] as const;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Entregado
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Package className="h-3 w-3" />
            Enviado
          </span>
        );
      case 'in_production':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            En Producción
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <DollarSign className="h-3 w-3" />
            Pagado
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <AlertCircle className="h-3 w-3" />
            Pago Pendiente
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            <AlertCircle className="h-3 w-3" />
            {status || 'Desconocido'}
          </span>
        );
    }
  };

  const filteredOrders = orders.filter((order) => {
    const customerName = order.contact_info?.name || '';
    const customerEmail = order.contact_info?.email || '';
    const eventName = order.event_name || 'Sin evento';

    const matchesSearch =
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eventName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-slate-50 pb-16 pt-10 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        {/* Admin Floating Navigation */}
        <div className="sticky top-6 z-30">
          <AdminFloatingNav />
        </div>

        {/* Header */}
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/admin" aria-label="Volver al panel principal">
                  <PremiumIconButton variant="default" size="md">
                    <ArrowLeft className="h-5 w-5" />
                  </PremiumIconButton>
                </Link>
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <span aria-hidden="true">/</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Pedidos
                  </span>
                </nav>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/15 to-rose-500/15 text-orange-600 dark:text-orange-300">
                  <Package className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                    Gestión de pedidos
                  </h1>
                  <p className="text-base text-muted-foreground dark:text-slate-300">
                    Supervisa pagos, entregas y seguimiento de tus ventas
                    fotográficas.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PremiumGlassButton
                variant="primary"
                size="lg"
                className="justify-center gap-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar
              </PremiumGlassButton>
              <PremiumGlassButton
                variant="secondary"
                size="lg"
                className="justify-center gap-2"
                onClick={fetchOrders}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Actualizar
              </PremiumGlassButton>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section aria-labelledby="orders-overview" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="orders-overview"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Resumen general
            </h2>
            <span className="text-sm text-muted-foreground">
              Datos actualizados automáticamente al cargar la página
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  className="border-slate-200/70 bg-white/80 shadow-sm backdrop-blur transition hover:border-slate-300 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/70"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent}`}
                    >
                      <Icon
                        className="h-5 w-5 text-slate-900 dark:text-white"
                        aria-hidden="true"
                      />
                    </span>
                    <TrendingUp
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {stat.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Search and Filters */}
        <section
          aria-labelledby="orders-filters"
          className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2
                id="orders-filters"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                Filtros y búsqueda
              </h2>
              <p className="text-sm text-muted-foreground">
                Busca rápidamente por cliente, identificador o evento y filtra
                según el estado de cada pedido.
              </p>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-xl">
                <label htmlFor="orders-search" className="sr-only">
                  Buscar pedidos
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="orders-search"
                  type="search"
                  placeholder="Buscar por nombre, ID o evento"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm font-medium text-slate-700 shadow-inner transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-800"
                />
              </div>
              <div className="w-full overflow-x-auto">
                <div className="flex w-full min-w-max gap-2">
                  {statusFilters.map(({ value, label, icon: Icon }) => (
                    <PremiumGlassButton
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      variant={statusFilter === value ? 'primary' : 'default'}
                      glow={statusFilter === value}
                      aria-pressed={statusFilter === value}
                      type="button"
                      className="h-11 gap-2 whitespace-nowrap px-4 text-sm font-medium"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </PremiumGlassButton>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Orders Table */}
        <section
          aria-labelledby="orders-table"
          className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="orders-table"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                Lista de pedidos
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} resultados después de aplicar filtros
                activos.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Tabla interactiva — haz clic para ver detalles completos
            </span>
          </div>
          {loading ? (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700"
              role="status"
              aria-live="polite"
            >
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-white" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-200">
                Cargando pedidos...
              </p>
              <p className="text-xs text-muted-foreground">
                Esto puede tardar unos segundos según la cantidad de datos.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
              <Package
                className="h-12 w-12 text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-200">
                No se encontraron pedidos
              </p>
              <p className="text-xs text-muted-foreground">
                Ajusta los filtros o verifica más tarde cuando se registren
                nuevas compras.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                  <thead className="bg-slate-100/80 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        ID pedido
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Cliente
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Evento
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Fotos
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Total
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-transparent">
                    {filteredOrders.map((order) => {
                      const customerName =
                        order.contact_info?.name || 'Cliente sin nombre';
                      const customerEmail =
                        order.contact_info?.email || 'Sin correo';
                      const eventName = order.event_name || 'Sin evento';
                      const itemCount =
                        (order.additional_copies?.length || 0) +
                        (order.selected_photos?.individual?.length || 0) +
                        (order.selected_photos?.group?.length || 0);

                      return (
                        <tr
                          key={order.id}
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          onClick={() => viewOrderDetails(order.id)}
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px] uppercase tracking-tight"
                              >
                                {order.id}
                              </Badge>
                              <PremiumGlassButton
                                variant="secondary"
                                size="sm"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(order.id);
                                }}
                                className="h-8 px-3 text-xs"
                              >
                                Copiar ID
                              </PremiumGlassButton>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User
                                  className="h-4 w-4 text-slate-500"
                                  aria-hidden="true"
                                />
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {customerName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="h-4 w-4" aria-hidden="true" />
                                <span>{customerEmail}</span>
                              </div>
                              {order.contact_info?.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  <span>{order.contact_info.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-slate-700 dark:text-slate-200">
                            {eventName}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                              <Calendar
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              <span>
                                {new Date(order.created_at).toLocaleDateString(
                                  'es-ES'
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                              <Image
                                className="h-4 w-4 text-slate-400"
                                aria-hidden="true"
                              />
                              <span>{itemCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {formatPrice(
                                Number(order.total_price || 0),
                                order.currency
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center justify-end gap-1">
                              <PremiumIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewOrderDetails(order.id);
                                }}
                                variant="primary"
                                size="sm"
                                title="Ver detalles"
                                disabled={updating === order.id}
                                aria-label="Ver detalles"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                                <span className="sr-only">Ver detalles</span>
                              </PremiumIconButton>

                              {order.token && (
                                <PremiumIconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewSharedPhotos(order.token!);
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  title="Ver fotos compartidas"
                                  aria-label="Ver fotos compartidas"
                                >
                                  <ExternalLink
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  <span className="sr-only">
                                    Ver fotos compartidas
                                  </span>
                                </PremiumIconButton>
                              )}

                              {order.status === 'pending_payment' && (
                                <PremiumIconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateOrderStatus(order.id, {
                                      status: 'paid',
                                      payment_status: 'paid',
                                    });
                                  }}
                                  variant="success"
                                  size="sm"
                                  title="Marcar como pagado"
                                  disabled={updating === order.id}
                                  aria-label="Marcar como pagado"
                                >
                                  <DollarSign
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  <span className="sr-only">
                                    Marcar como pagado
                                  </span>
                                </PremiumIconButton>
                              )}

                              {order.status === 'paid' && (
                                <PremiumIconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateOrderStatus(order.id, {
                                      status: 'in_production',
                                      production_status: 'printing',
                                    });
                                  }}
                                  variant="info"
                                  size="sm"
                                  title="Iniciar producción"
                                  disabled={updating === order.id}
                                  aria-label="Iniciar producción"
                                >
                                  <Play
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  <span className="sr-only">
                                    Iniciar producción
                                  </span>
                                </PremiumIconButton>
                              )}

                              {order.status === 'in_production' && (
                                <PremiumIconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateOrderStatus(order.id, {
                                      status: 'delivered',
                                      delivered_at: new Date().toISOString(),
                                    });
                                  }}
                                  variant="success"
                                  size="sm"
                                  title="Marcar entregado"
                                  disabled={updating === order.id}
                                  aria-label="Marcar como entregado"
                                >
                                  <Check
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  <span className="sr-only">
                                    Marcar como entregado
                                  </span>
                                </PremiumIconButton>
                              )}

                              {order.status !== 'cancelled' &&
                                order.status !== 'delivered' && (
                                  <PremiumIconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (
                                        confirm(
                                          '¿Estás seguro de que quieres cancelar esta orden?'
                                        )
                                      ) {
                                        cancelOrder(order.id);
                                      }
                                    }}
                                    variant="danger"
                                    size="sm"
                                    title="Cancelar orden"
                                    disabled={updating === order.id}
                                    aria-label="Cancelar orden"
                                  >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                    <span className="sr-only">
                                      Cancelar orden
                                    </span>
                                  </PremiumIconButton>
                                )}

                              {updating === order.id && (
                                <div
                                  className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-white"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Mostrando 1-{filteredOrders.length} de {orders.length} pedidos
          </p>
          <div className="flex gap-2">
            <PremiumGlassButton variant="default">Anterior</PremiumGlassButton>
            <PremiumGlassButton variant="default">Siguiente</PremiumGlassButton>
          </div>
        </div>

        {/* Order Details Modal */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Detalles de la Orden
                {orderDetails?.id && (
                  <Badge variant="outline" className="ml-2">
                    {orderDetails.id.length > 20
                      ? `${orderDetails.id.substring(0, 20)}...`
                      : orderDetails.id}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Información completa del pedido y gestión de estado
              </DialogDescription>
            </DialogHeader>

            {orderDetails && (
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Cliente y Contacto */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {orderDetails.contact_info.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{orderDetails.contact_info.email}</span>
                    </div>
                    {orderDetails.contact_info.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{orderDetails.contact_info.phone}</span>
                      </div>
                    )}
                    {orderDetails.contact_info.address && (
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-1 h-4 w-4 text-gray-500" />
                          <div className="text-sm">
                            <p>{orderDetails.contact_info.address.street}</p>
                            <p>
                              {orderDetails.contact_info.address.city},{' '}
                              {orderDetails.contact_info.address.state}
                            </p>
                            <p>
                              {orderDetails.contact_info.address.zipCode} -{' '}
                              {orderDetails.contact_info.address.country}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Estado y Pago */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="h-5 w-5" />
                      Estado del Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estado:</span>
                      {getStatusBadge(orderDetails.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pago:</span>
                      <Badge
                        variant={
                          orderDetails.payment_status === 'paid'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {orderDetails.payment_status === 'paid'
                          ? 'Pagado'
                          : orderDetails.payment_status === 'pending'
                            ? 'Pendiente'
                            : orderDetails.payment_status === 'failed'
                              ? 'Falló'
                              : 'Reembolsado'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Método:</span>
                      <span className="text-sm capitalize">
                        {orderDetails.payment_method === 'mercadopago'
                          ? 'MercadoPago'
                          : orderDetails.payment_method === 'transferencia'
                            ? 'Transferencia'
                            : orderDetails.payment_method === 'efectivo'
                              ? 'Efectivo'
                              : orderDetails.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fecha:</span>
                      <span className="text-sm">
                        {new Date(orderDetails.created_at).toLocaleDateString(
                          'es-ES',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>
                    {orderDetails.tracking_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tracking:</span>
                        <span className="font-mono text-sm">
                          {orderDetails.tracking_number}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Información del Evento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {orderDetails.event_name || 'Sin evento'}
                      </p>
                      {orderDetails.event_date && (
                        <p className="text-sm text-gray-500">
                          {new Date(orderDetails.event_date).toLocaleDateString(
                            'es-ES'
                          )}
                        </p>
                      )}
                      {orderDetails.token && (
                        <Button
                          onClick={() => viewSharedPhotos(orderDetails.token!)}
                          variant="outline"
                          size="sm"
                          className="mt-3"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Fotos Compartidas
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Paquete y Fotos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Image className="h-5 w-5" />
                      Paquete Seleccionado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">Tipo:</span>
                        <p className="capitalize">
                          {orderDetails.package_type || 'Básico'}
                        </p>
                      </div>
                      {orderDetails.selected_photos && (
                        <div>
                          <span className="text-sm font-medium">
                            Fotos seleccionadas:
                          </span>
                          <div className="mt-1 space-y-1">
                            {orderDetails.selected_photos.individual && (
                              <p className="text-sm">
                                • Individuales:{' '}
                                {orderDetails.selected_photos.individual.length}
                              </p>
                            )}
                            {orderDetails.selected_photos.group && (
                              <p className="text-sm">
                                • Grupales:{' '}
                                {orderDetails.selected_photos.group.length}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {orderDetails.additional_copies &&
                        orderDetails.additional_copies.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">
                              Copias adicionales:
                            </span>
                            <p className="text-sm">
                              {orderDetails.additional_copies.length} productos
                            </p>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>

                {/* Resumen de Precios */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="h-5 w-5" />
                      Resumen de Precios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>
                          {formatPrice(
                            orderDetails.total_price,
                            orderDetails.currency
                          )}
                        </span>
                      </div>
                      {orderDetails.production_notes && (
                        <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                          <div className="flex items-start gap-2">
                            <FileText className="mt-1 h-4 w-4 text-gray-500" />
                            <div>
                              <span className="text-sm font-medium">
                                Notas de producción:
                              </span>
                              <p className="mt-1 text-sm">
                                {orderDetails.production_notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Acciones Rápidas */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {orderDetails.status === 'pending_payment' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(orderDetails.id, {
                              status: 'paid',
                              payment_status: 'paid',
                            });
                            setShowOrderDetails(false);
                          }}
                          className="bg-green-600 text-white hover:bg-green-700"
                          disabled={updating === orderDetails.id}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Marcar como Pagado
                        </Button>
                      )}

                      {orderDetails.status === 'paid' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(orderDetails.id, {
                              status: 'in_production',
                              production_status: 'printing',
                            });
                            setShowOrderDetails(false);
                          }}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          disabled={updating === orderDetails.id}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Iniciar Producción
                        </Button>
                      )}

                      {orderDetails.status === 'in_production' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(orderDetails.id, {
                              status: 'delivered',
                              delivered_at: new Date().toISOString(),
                            });
                            setShowOrderDetails(false);
                          }}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                          disabled={updating === orderDetails.id}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Marcar Entregado
                        </Button>
                      )}

                      {orderDetails.status !== 'cancelled' &&
                        orderDetails.status !== 'delivered' && (
                          <Button
                            onClick={() => {
                              if (
                                confirm(
                                  '¿Estás seguro de que quieres cancelar esta orden?'
                                )
                              ) {
                                cancelOrder(orderDetails.id);
                                setShowOrderDetails(false);
                              }
                            }}
                            variant="danger"
                            disabled={updating === orderDetails.id}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar Orden
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
