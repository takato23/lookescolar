/**
 * 🛍️ StoreConfigPanel - Editor unificado para configuración de tienda
 * Permite administrar configuración global o por evento segun el modo recibido.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  DollarSign,
  Settings,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoreConfig, StoreProduct } from '@/lib/validations/store-config';
import { getDefaultConfig } from '@/lib/services/store-config.mappers';

type StoreConfigMode = 'event' | 'global';

interface StoreConfigPanelProps {
  mode: StoreConfigMode;
  eventId?: string;
  className?: string;
  onSave?: (config: StoreConfig) => void;
}

export function StoreConfigPanel({ mode, eventId, className, onSave }: StoreConfigPanelProps) {
  const [config, setConfig] = useState<StoreConfig>(() => getDefaultConfig());
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isEventMode = mode === 'event';
  const targetEventId = isEventMode ? eventId : undefined;

  useEffect(() => {
    const controller = new AbortController();

    const loadConfig = async () => {
      if (isEventMode && !targetEventId) {
        setFetchError('Falta el ID del evento.');
        setInitialLoading(false);
        return;
      }

      try {
        setFetchError(null);
        const response = await fetch(
          isEventMode ? `/api/admin/events/${targetEventId}/store-config` : '/api/admin/store-settings',
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();
      if (data?.success && data?.config) {
        setConfig(data.config as StoreConfig);
      } else {
        setConfig(getDefaultConfig());
      }
        setHasChanges(false);
        setFetchError(null);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error loading store config:', error);
        setFetchError('No se pudo cargar la configuración de la tienda.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadConfig();
    return () => controller.abort();
  }, [isEventMode, targetEventId, reloadKey]);

  const updateConfig = (updates: Partial<StoreConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateProduct = (productId: string, updates: Partial<StoreProduct>) => {
    setConfig((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.id === productId ? { ...product, ...updates } : product
      )
    }));
    setHasChanges(true);
  };

  const totalEnabledProducts = useMemo(
    () => config.products.filter((product) => product.enabled).length,
    [config.products]
  );

  const handleSave = async () => {
    if (!hasChanges) return;
    if (isEventMode && !targetEventId) {
      setFetchError('No se puede guardar sin un evento válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        isEventMode ? `/api/admin/events/${targetEventId}/store-config` : '/api/admin/store-settings',
        {
          method: isEventMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        }
      );

      if (!response.ok) {
        throw new Error('Error guardando configuración');
      }

      const data = await response.json();
      if (data?.success && data?.config) {
        setConfig(data.config as StoreConfig);
        onSave?.(data.config as StoreConfig);
      }

      setHasChanges(false);
      try {
        (await import('sonner')).toast.success('Configuración guardada');
      } catch (toastError) {
        console.warn('Toast not available:', toastError);
      }
    } catch (error) {
      console.error('Error saving store config:', error);
      setFetchError('No se pudo guardar la configuración.');
      try {
        (await import('sonner')).toast.error('Error guardando configuración');
      } catch (toastError) {
        console.warn('Toast not available:', toastError);
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <h3 className="text-lg font-semibold text-destructive">No se pudo cargar la configuración</h3>
            <p className="text-sm text-muted-foreground">{fetchError}</p>
            <Button
              variant="outline"
              onClick={() => {
                setInitialLoading(true);
                setFetchError(null);
                setReloadKey((prev) => prev + 1);
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            {isEventMode ? 'Configuración de Tienda' : 'Configuración Global de Tienda'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isEventMode
              ? 'Configura productos y precios específicos del evento'
              : 'Define los valores por defecto para nuevos eventos'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-primary-600 border-primary-200">
              Cambios sin guardar
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || loading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Habilitar tienda</Label>
              <p className="text-sm text-gray-500">Permite que los usuarios compren fotos</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(enabled) => updateConfig({ enabled })} />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                value={config.currency}
                onChange={(event) => updateConfig({ currency: event.target.value })}
                placeholder="ARS"
              />
            </div>
            <div>
              <Label htmlFor="tax">Impuestos (%)</Label>
              <Input
                id="tax"
                type="number"
                value={config.tax_rate}
                onChange={(event) => updateConfig({ tax_rate: parseFloat(event.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Disponibles ({totalEnabledProducts}/{config.products.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.products.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {product.enabled ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-500">{product.description}</p>
                  </div>
                  <Badge variant={product.type === 'digital' ? 'secondary' : 'default'}>
                    {product.type === 'digital' ? 'Digital' : 'Físico'}
                  </Badge>
                </div>
                <Switch checked={product.enabled} onCheckedChange={(enabled) => updateProduct(product.id, { enabled })} />
              </div>

              {product.enabled && (
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <div>
                    <Label htmlFor={`price-${product.id}`}>Precio ($)</Label>
                    <Input
                      id={`price-${product.id}`}
                      type="number"
                      value={product.price / 100}
                      onChange={(event) =>
                        updateProduct(product.id, {
                          price: Math.round((parseFloat(event.target.value) || 0) * 100)
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`desc-${product.id}`}>Descripción</Label>
                    <Input
                      id={`desc-${product.id}`}
                      value={product.description || ''}
                      onChange={(event) => updateProduct(product.id, { description: event.target.value })}
                      placeholder="Descripción del producto"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuración de Envío
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Habilitar envío</Label>
              <p className="text-sm text-gray-500">Permite envío a domicilio</p>
            </div>
            <Switch
              checked={config.shipping_enabled}
              onCheckedChange={(shipping_enabled) => updateConfig({ shipping_enabled })}
            />
          </div>

          {config.shipping_enabled && (
            <div>
              <Label htmlFor="shipping-price">Costo de envío ($)</Label>
              <Input
                id="shipping-price"
                type="number"
                value={config.shipping_price / 100}
                onChange={(event) =>
                  updateConfig({
                    shipping_price: Math.round((parseFloat(event.target.value) || 0) * 100)
                  })
                }
                placeholder="0.00"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StoreConfigPanel;
