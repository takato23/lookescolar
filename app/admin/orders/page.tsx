'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  FileText
} from 'lucide-react';
import { PremiumGlassButton, PremiumIconButton } from '@/components/ui/premium-glass-button';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_payment' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    total_revenue: 0,
    pending_payment: 0,
    paid: 0,
    in_production: 0,
    delivered: 0
  });

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
          delivered: 0
        });
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

  const updateOrderStatus = useCallback(async (orderId: string, updates: Partial<Order>) => {
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
  }, [fetchOrders]);

  const cancelOrder = useCallback(async (orderId: string) => {
    const reason = prompt('Motivo de la cancelación:');
    if (!reason) return;
    
    try {
      setUpdating(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      });
      
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
  }, [fetchOrders]);

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
      label: 'Total Pedidos', 
      value: stats.total.toString(), 
      icon: ShoppingBag, 
      color: 'blue' 
    },
    { 
      label: 'Ingresos', 
      value: formatPrice(stats.total_revenue), 
      icon: DollarSign, 
      color: 'green' 
    },
    { 
      label: 'Pendientes', 
      value: stats.pending_payment.toString(), 
      icon: Clock, 
      color: 'orange' 
    },
    { 
      label: 'Completados', 
      value: stats.delivered.toString(), 
      icon: CheckCircle, 
      color: 'purple' 
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Entregado
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Package className="h-3 w-3" />
            Enviado
          </span>
        );
      case 'in_production':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            En Producción
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <DollarSign className="h-3 w-3" />
            Pagado
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <AlertCircle className="h-3 w-3" />
            Pago Pendiente
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            <AlertCircle className="h-3 w-3" />
            {status || 'Desconocido'}
          </span>
        );
    }
  };

  const filteredOrders = orders.filter(order => {
    const customerName = order.contact_info?.name || '';
    const customerEmail = order.contact_info?.email || '';
    const eventName = order.event_name || 'Sin evento';
    
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eventName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="glass-card-ios26 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Link href="/admin">
                    <PremiumIconButton variant="default" size="md">
                      <ArrowLeft className="h-5 w-5" />
                    </PremiumIconButton>
                  </Link>
                  <nav className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Link href="/admin" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-foreground dark:text-white font-medium">Pedidos</span>
                  </nav>
                </div>
                <div className="flex items-center gap-3">
                  <div className="glass-button-ios26 rounded-2xl p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10">
                    <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      Gestión de Pedidos
                    </h1>
                    <p className="text-muted-foreground dark:text-gray-400 text-lg mt-1">
                      Administra las ventas y entregas de fotografías
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <PremiumGlassButton variant="primary" size="lg">
                  <Download className="h-4 w-4" />
                  Exportar
                </PremiumGlassButton>
                <PremiumGlassButton 
                  variant="secondary" 
                  size="lg"
                  onClick={fetchOrders}
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </PremiumGlassButton>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl hover:scale-105 transition-transform">
                <div className="flex items-start justify-between mb-4">
                  <div className={`glass-button-ios26 rounded-xl p-3 bg-gradient-to-r ${
                    stat.color === 'blue' ? 'from-blue-500/10 to-cyan-500/10' :
                    stat.color === 'green' ? 'from-green-500/10 to-emerald-500/10' :
                    stat.color === 'orange' ? 'from-orange-500/10 to-amber-500/10' :
                    'from-purple-500/10 to-pink-500/10'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      stat.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      stat.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      stat.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                      'text-purple-600 dark:text-purple-400'
                    }`} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground dark:text-white">{stat.value}</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="glass-card-ios26 rounded-2xl p-6 backdrop-blur-xl mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, ID o evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-button-ios26 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
                <PremiumGlassButton
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  variant={statusFilter === status ? 'primary' : 'default'}
                  glow={statusFilter === status}
                >
                  {status === 'all' ? 'Todos' :
                   status === 'pending_payment' ? 'Pago Pendiente' :
                   status === 'paid' ? 'Pagado' :
                   status === 'in_production' ? 'En Producción' :
                   status === 'shipped' ? 'Enviado' :
                   status === 'delivered' ? 'Entregado' : 'Cancelado'}
                </PremiumGlassButton>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass-card-ios26 rounded-2xl backdrop-blur-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Cargando pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron pedidos</p>
              <p className="text-sm text-gray-400 mt-2">Los pedidos aparecerán aquí cuando los usuarios hagan compras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border dark:border-gray-700">
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">ID Pedido</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Cliente</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Evento</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Fecha</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Estado</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Items</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Total</th>
                    <th className="text-left p-4 font-medium text-foreground dark:text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const customerName = order.contact_info?.name || 'Sin nombre';
                    const customerEmail = order.contact_info?.email || 'Sin email';
                    const eventName = order.event_name || 'Sin evento';
                    const itemCount = (order.additional_copies?.length || 0) + (order.selected_photos?.individual?.length || 0) + (order.selected_photos?.group?.length || 0);
                    
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-muted dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                        onClick={() => {
                          void viewOrderDetails(order.id);
                        }}
                      >
                        <td className="p-4">
                          <span className="font-medium text-foreground dark:text-white">
                            {order.id.length > 20 ? `${order.id.substring(0, 20)}...` : order.id}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-foreground dark:text-white">{customerName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{customerEmail}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-foreground dark:text-gray-300">{eventName}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {new Date(order.created_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4 text-gray-500" />
                            <span className="text-foreground dark:text-gray-300">{itemCount}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-foreground dark:text-white">
                            {formatPrice(Number(order.total_price || 0), order.currency)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {/* Ver detalles */}
                            <PremiumIconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                viewOrderDetails(order.id);
                              }}
                              variant="primary"
                              size="sm"
                              title="Ver detalles"
                              disabled={updating === order.id}
                            >
                              <Eye className="h-4 w-4" />
                            </PremiumIconButton>

                            {/* Ver fotos compartidas */}
                            {order.token && (
                              <PremiumIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewSharedPhotos(order.token!);
                                }}
                                variant="secondary"
                                size="sm"
                                title="Ver fotos compartidas"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </PremiumIconButton>
                            )}

                            {/* Acciones rápidas basadas en estado */}
                            {order.status === 'pending_payment' && (
                              <PremiumIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(order.id, { status: 'paid', payment_status: 'paid' });
                                }}
                                variant="success"
                                size="sm"
                                title="Marcar como pagado"
                                disabled={updating === order.id}
                              >
                                <DollarSign className="h-4 w-4" />
                              </PremiumIconButton>
                            )}

                            {order.status === 'paid' && (
                              <PremiumIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(order.id, { status: 'in_production', production_status: 'printing' });
                                }}
                                variant="info"
                                size="sm"
                                title="Iniciar producción"
                                disabled={updating === order.id}
                              >
                                <Play className="h-4 w-4" />
                              </PremiumIconButton>
                            )}

                            {order.status === 'in_production' && (
                              <PremiumIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(order.id, { status: 'delivered', delivered_at: new Date().toISOString() });
                                }}
                                variant="success"
                                size="sm"
                                title="Marcar entregado"
                                disabled={updating === order.id}
                              >
                                <Check className="h-4 w-4" />
                              </PremiumIconButton>
                            )}

                            {/* Cancelar orden */}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <PremiumIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
                                    cancelOrder(order.id);
                                  }
                                }}
                                variant="danger"
                                size="sm"
                                title="Cancelar orden"
                                disabled={updating === order.id}
                              >
                                <X className="h-4 w-4" />
                              </PremiumIconButton>
                            )}

                            {updating === order.id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 ml-2"></div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Mostrando 1-{filteredOrders.length} de {orders.length} pedidos
          </p>
          <div className="flex gap-2">
            <PremiumGlassButton variant="default">
              Anterior
            </PremiumGlassButton>
            <PremiumGlassButton variant="default">
              Siguiente
            </PremiumGlassButton>
          </div>
        </div>

        {/* Order Details Modal */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Detalles de la Orden
                {orderDetails?.id && (
                  <Badge variant="outline" className="ml-2">
                    {orderDetails.id.length > 20 ? `${orderDetails.id.substring(0, 20)}...` : orderDetails.id}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Información completa del pedido y gestión de estado
              </DialogDescription>
            </DialogHeader>

            {orderDetails && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
                      <span className="font-medium">{orderDetails.contact_info.name}</span>
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
                          <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                          <div className="text-sm">
                            <p>{orderDetails.contact_info.address.street}</p>
                            <p>{orderDetails.contact_info.address.city}, {orderDetails.contact_info.address.state}</p>
                            <p>{orderDetails.contact_info.address.zipCode} - {orderDetails.contact_info.address.country}</p>
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
                      <Badge variant={orderDetails.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {orderDetails.payment_status === 'paid' ? 'Pagado' : 
                         orderDetails.payment_status === 'pending' ? 'Pendiente' :
                         orderDetails.payment_status === 'failed' ? 'Falló' : 'Reembolsado'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Método:</span>
                      <span className="text-sm capitalize">
                        {orderDetails.payment_method === 'mercadopago' ? 'MercadoPago' :
                         orderDetails.payment_method === 'transferencia' ? 'Transferencia' :
                         orderDetails.payment_method === 'efectivo' ? 'Efectivo' : orderDetails.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fecha:</span>
                      <span className="text-sm">
                        {new Date(orderDetails.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {orderDetails.tracking_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tracking:</span>
                        <span className="text-sm font-mono">{orderDetails.tracking_number}</span>
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
                      <p className="font-medium">{orderDetails.event_name || 'Sin evento'}</p>
                      {orderDetails.event_date && (
                        <p className="text-sm text-gray-500">
                          {new Date(orderDetails.event_date).toLocaleDateString('es-ES')}
                        </p>
                      )}
                      {orderDetails.token && (
                        <Button
                          onClick={() => viewSharedPhotos(orderDetails.token!)}
                          variant="outline"
                          size="sm"
                          className="mt-3"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
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
                        <p className="capitalize">{orderDetails.package_type || 'Básico'}</p>
                      </div>
                      {orderDetails.selected_photos && (
                        <div>
                          <span className="text-sm font-medium">Fotos seleccionadas:</span>
                          <div className="mt-1 space-y-1">
                            {orderDetails.selected_photos.individual && (
                              <p className="text-sm">• Individuales: {orderDetails.selected_photos.individual.length}</p>
                            )}
                            {orderDetails.selected_photos.group && (
                              <p className="text-sm">• Grupales: {orderDetails.selected_photos.group.length}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {orderDetails.additional_copies && orderDetails.additional_copies.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Copias adicionales:</span>
                          <p className="text-sm">{orderDetails.additional_copies.length} productos</p>
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
                        <span>{formatPrice(orderDetails.total_price, orderDetails.currency)}</span>
                      </div>
                      {orderDetails.production_notes && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-gray-500 mt-1" />
                            <div>
                              <span className="text-sm font-medium">Notas de producción:</span>
                              <p className="text-sm mt-1">{orderDetails.production_notes}</p>
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
                            updateOrderStatus(orderDetails.id, { status: 'paid', payment_status: 'paid' });
                            setShowOrderDetails(false);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={updating === orderDetails.id}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Marcar como Pagado
                        </Button>
                      )}
                      
                      {orderDetails.status === 'paid' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(orderDetails.id, { status: 'in_production', production_status: 'printing' });
                            setShowOrderDetails(false);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={updating === orderDetails.id}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar Producción
                        </Button>
                      )}
                      
                      {orderDetails.status === 'in_production' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(orderDetails.id, { status: 'delivered', delivered_at: new Date().toISOString() });
                            setShowOrderDetails(false);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={updating === orderDetails.id}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Marcar Entregado
                        </Button>
                      )}
                      
                      {orderDetails.status !== 'cancelled' && orderDetails.status !== 'delivered' && (
                        <Button
                          onClick={() => {
                            if (confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
                              cancelOrder(orderDetails.id);
                              setShowOrderDetails(false);
                            }
                          }}
                          variant="danger"
                          disabled={updating === orderDetails.id}
                        >
                          <X className="h-4 w-4 mr-2" />
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
    </div>
  );
}
