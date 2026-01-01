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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  DollarSign,
  Settings,
  Save,
  Eye,
  EyeOff,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoreConfig, StoreProduct } from '@/lib/validations/store-config';
import { getDefaultConfig } from '@/lib/services/store-config.mappers';
import { ProductEditor } from './ProductEditor';
import { TemplateSelector } from '@/components/store/TemplateSelector';
import StoreDesignPanel from '@/components/admin/store-settings/StoreDesignPanel';
import { StorePreview } from '@/components/admin/preview';
import { nanoid } from 'nanoid';

type StoreConfigMode = 'event' | 'global';

interface StoreConfigPanelProps {
  mode: StoreConfigMode;
  eventId?: string;
  className?: string;
  onSave?: (config: StoreConfig) => void;
}

const STANDARD_PRODUCTS: Partial<StoreProduct>[] = [
  {
    name: 'Foto Impresa 10x15',
    type: 'physical',
    price: 150000,
    description: 'Impresión en papel fotográfico de alta calidad, tamaño 10x15 cm.',
    options: { sizes: ['10x15'], formats: ['Brillante', 'Mate'], quality: 'standard' }
  },
  {
    name: 'Foto Impresa 13x18',
    type: 'physical',
    price: 200000,
    description: 'Impresión en papel fotográfico de alta calidad, tamaño 13x18 cm.',
    options: { sizes: ['13x18'], formats: ['Brillante', 'Mate'], quality: 'standard' }
  },
  {
    name: 'Foto Impresa 15x21',
    type: 'physical',
    price: 250000,
    description: 'Impresión en papel fotográfico de alta calidad, tamaño 15x21 cm.',
    options: { sizes: ['15x21'], formats: ['Brillante', 'Mate'], quality: 'standard' }
  },
  {
    name: 'Foto Impresa 20x30',
    type: 'physical',
    price: 400000,
    description: 'Ampliación en papel fotográfico de alta calidad, tamaño 20x30 cm.',
    options: { sizes: ['20x30'], formats: ['Brillante', 'Mate'], quality: 'premium' }
  },
  {
    name: 'Descarga Digital',
    type: 'digital',
    price: 100000,
    description: 'Archivo digital en alta resolución, listo para descargar.',
    options: { sizes: ['Alta Resolución'], formats: ['JPG'], quality: 'premium' }
  },
  {
    name: 'Pack Digital Completo',
    type: 'digital',
    price: 1500000,
    description: 'Todas las fotos de la galería en formato digital de alta resolución.',
    options: { sizes: ['Todas las fotos'], formats: ['JPG'], quality: 'premium' }
  }
];

export function StoreConfigPanel({ mode, eventId, className, onSave }: StoreConfigPanelProps) {
  const [config, setConfig] = useState<StoreConfig>(() => getDefaultConfig());
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Product Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  const handleEditProduct = (product: StoreProduct) => {
    setEditingProduct(product);
    setIsEditorOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      setConfig((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
      setHasChanges(true);
    }
  };

  const handleSaveProduct = (product: StoreProduct) => {
    setConfig((prev) => {
      const existingIndex = prev.products.findIndex((p) => p.id === product.id);
      if (existingIndex >= 0) {
        const newProducts = [...prev.products];
        newProducts[existingIndex] = product;
        return { ...prev, products: newProducts };
      } else {
        return { ...prev, products: [...prev.products, product] };
      }
    });
    setHasChanges(true);
  };

  const handleAddStandardProduct = (template: Partial<StoreProduct>) => {
    const newProduct: StoreProduct = {
      id: `prod_${nanoid(8)}`,
      name: template.name || 'Nuevo Producto',
      description: template.description,
      price: template.price || 0,
      type: template.type || 'physical',
      enabled: true,
      options: template.options
    };

    setConfig((prev) => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
    setHasChanges(true);
  };

  const toggleProductEnabled = (productId: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, enabled } : p
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
      <div className={cn('max-w-6xl mx-auto space-y-6', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={cn('max-w-6xl mx-auto space-y-6', className)}>
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
    <div className={cn('max-w-6xl mx-auto space-y-6', className)}>
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
          {isEventMode && targetEventId && (
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Vista Previa
            </Button>
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

          <div className="space-y-2">
            <Label className="text-base">Plantilla de tienda</Label>
            <TemplateSelector
              currentTemplate={config.template}
              onTemplateChange={(template) => updateConfig({ template })}
            />
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

      <StoreDesignPanel
        design={config.design}
        bannerUrl={config.banner_url}
        logoUrl={config.logo_url}
        onChange={(design) => updateConfig({ design })}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Disponibles ({totalEnabledProducts}/{config.products.length})
          </CardTitle>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Estándares
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STANDARD_PRODUCTS.map((prod, idx) => (
                  <DropdownMenuItem key={idx} onClick={() => handleAddStandardProduct(prod)}>
                    {prod.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.products.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              No hay productos configurados. Agrega uno nuevo o usa un estándar.
            </div>
          ) : (
            config.products.map((product) => (
              <div key={product.id} className="border rounded-lg p-4 transition-all hover:border-blue-200 hover:bg-blue-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {product.enabled ? (
                        <Eye className="h-5 w-5 text-green-600" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-base">{product.name}</h4>
                        <Badge variant={product.type === 'digital' ? 'secondary' : 'outline'}>
                          {product.type === 'digital' ? 'Digital' : 'Físico'}
                        </Badge>
                        {product.options?.sizes && product.options.sizes.length > 0 && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {product.options.sizes.join(', ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                      <div className="flex items-center gap-4 text-sm font-medium text-gray-700 pt-1">
                        <span>${(product.price / 100).toLocaleString()}</span>
                        {product.options?.quality && (
                          <span className="text-gray-400 text-xs uppercase tracking-wider">
                            {product.options.quality}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={product.enabled}
                      onCheckedChange={(enabled) => toggleProductEnabled(product.id, enabled)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))
          )}
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

      <ProductEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      {/* Store Preview Modal */}
      {isEventMode && targetEventId && (
        <StorePreview
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          eventId={targetEventId}
          variant="modal"
          title="Vista Previa de Tienda"
          subtitle={isEventMode ? 'Configuracion del evento' : 'Configuracion global'}
        />
      )}
    </div>
  );
}

export default StoreConfigPanel;
