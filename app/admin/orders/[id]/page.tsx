'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OrderDetail from '@/components/admin/orders/OrderDetail';

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (id: string, newStatus: 'delivered') => {
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error actualizando pedido');
      }

      // Redirect back to orders list after successful update
      router.push('/admin/orders');
    } catch (error) {
      console.error('Error actualizando pedido:', error);
      alert(
        error instanceof Error ? error.message : 'Error actualizando pedido'
      );
    }
  };

  const handleClose = () => {
    router.push('/admin/orders');
  };

  if (loading) {
    return (
      <div className="gradient-mesh flex min-h-screen items-center justify-center">
        <Card variant="glass" className="p-8">
          <div className="flex items-center space-x-4">
            <div className="spinner-glass"></div>
            <span className="text-foreground text-lg font-medium">
              Cargando detalles del pedido...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs */}
            <nav className="text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <Link
                href="/admin/orders"
                className="transition-colors hover:text-primary-600"
              >
                Pedidos
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">
                #{orderId.slice(-8)}
              </span>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-gradient-primary mb-2 text-3xl font-bold md:text-4xl">
                  Detalle del Pedido
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Información completa y gestión del pedido #{orderId.slice(-8)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Detail Content - Embedded directly in page */}
        <Card
          variant="glass"
          className="noise animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <CardContent className="p-8">
            <OrderDetail
              orderId={orderId}
              isOpen={true}
              onClose={handleClose}
              onStatusUpdate={handleStatusUpdate}
              embedded={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
