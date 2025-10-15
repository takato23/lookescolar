/**
 * 📊 Vista general de tiendas y configuraciones
 * Muestra todas las tiendas existentes con sus configuraciones
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Store, Settings, Eye, ShoppingCart, DollarSign, Users, Plus } from 'lucide-react';
import Link from 'next/link';

interface StoreConfig {
  id: string;
  event_id: string;
  event_name?: string;
  enabled: boolean;
  currency: string;
  products_count: number;
  active_products_count: number;
  total_value: number;
  last_updated: string;
}

interface StoreOverviewProps {
  stores: StoreConfig[];
  isLoading?: boolean;
}

export const StoreOverview: React.FC<StoreOverviewProps> = ({
  stores,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No hay tiendas configuradas
          </h3>
          <p className="text-muted-foreground0 mb-6 max-w-md">
            Aún no se han configurado tiendas para ningún evento.
            Ve a un evento específico y configura su tienda.
          </p>
          <Link href="/admin/events">
            <Button>
              Ver eventos
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const totalStores = stores.length;
  const enabledStores = stores.filter(store => store.enabled).length;
  const totalProducts = stores.reduce((sum, store) => sum + store.products_count, 0);
  const totalValue = stores.reduce((sum, store) => sum + store.total_value, 0);

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Store className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground0">Total de tiendas</p>
              <p className="text-2xl font-bold">{totalStores}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Eye className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground0">Tiendas activas</p>
              <p className="text-2xl font-bold text-green-600">{enabledStores}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <ShoppingCart className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground0">Productos totales</p>
              <p className="text-2xl font-bold">{totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground0">Valor total</p>
              <p className="text-2xl font-bold">
                ${totalValue.toLocaleString('es-AR')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de tiendas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <Card key={store.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{store.event_name || 'Evento sin nombre'}</CardTitle>
                <Badge variant={store.enabled ? 'default' : 'secondary'}>
                  {store.enabled ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información básica */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground0">Productos:</span>
                  <span className="font-medium">
                    {store.active_products_count}/{store.products_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground0">Moneda:</span>
                  <span className="font-medium">{store.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground0">Valor total:</span>
                  <span className="font-medium">
                    ${store.total_value.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Progreso de completitud */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground0">Completitud:</span>
                  <span className="font-medium">
                    {Math.round((store.active_products_count / Math.max(store.products_count, 1)) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(store.active_products_count / Math.max(store.products_count, 1)) * 100}
                  className="h-2"
                />
              </div>

              {/* Última actualización */}
              <div className="text-xs text-muted-foreground0">
                Actualizada: {new Date(store.last_updated).toLocaleDateString('es-AR')}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <Link href={`/admin/store-settings?eventId=${store.event_id}`} className="flex-1">
                  <Button size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </Link>
                <Link href={`/admin/events/${store.event_id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver evento
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Acciones adicionales */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold">Gestión de tiendas</h3>
            <p className="text-sm text-muted-foreground0">
              Configura productos, precios y apariencia para cada evento
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/events">
              <Button variant="outline">
                Ver todos los eventos
              </Button>
            </Link>
            <Link href="/admin/events/new">
              <Button>
                Crear nuevo evento
              </Button>
            </Link>
            <Link href="/admin/store-settings?global=true">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configuración global
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
