/**
 * 🛍️ StoreConfigPanel - Configuración de tienda estilo PixieSet
 * 
 * Panel para configurar productos del evento (A, B, C, digitales)
 * Inspirado en PixieSet pero adaptado al sistema existente
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon,
  Download,
  Settings,
  Plus,
  X,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductConfig {
  id: string;
  name: string;
  type: 'physical' | 'digital';
  enabled: boolean;
  price: number;
  description?: string;
  options?: {
    sizes?: string[];
    formats?: string[];
    quality?: 'standard' | 'premium';
  };
}

interface StoreConfig {
  enabled: boolean;
  products: ProductConfig[];
  currency: string;
  tax_rate: number;
  shipping_enabled: boolean;
  shipping_price: number;
  payment_methods: string[];
}

interface StoreConfigPanelProps {
  eventId: string;
  currentConfig?: StoreConfig;
  onUpdate?: (config: StoreConfig) => void;
  className?: string;
}

const defaultProducts: ProductConfig[] = [
  {
    id: 'opcionA',
    name: 'Opción A',
    type: 'physical',
    enabled: true,
    price: 200000, // $2,000.00 ARS
    description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 1 foto INDIVIDUAL (15x21)+ 4 fotos 4x5 (de la misma que la individual elegida) + foto grupal (15x21)',
    options: {
      sizes: ['20x30', '15x21', '4x5'],
      formats: ['Carpeta Personalizada'],
      quality: 'premium'
    }
  },
  {
    id: 'opcionB',
    name: 'Opción B', 
    type: 'physical',
    enabled: true,
    price: 250000, // $2,500.00 ARS
    description: 'Carpeta impresa con diseño personalizado (20x30) Que contiene: 2 fotos INDIVIDUALES (15x21) + 8 fotos 4x5 (de las mismas que las individuales elegidas) + foto grupal (15x21)',
    options: {
      sizes: ['20x30', '15x21', '4x5'],
      formats: ['Carpeta Personalizada'],
      quality: 'premium'
    }
  },
  // COPIAS ADICIONALES (disponibles después de comprar paquete)
  {
    id: 'copy_4x5',
    name: '4x5 cm (4 fotitos)',
    type: 'physical',
    enabled: true,
    price: 60000, // $600.00 ARS
    description: 'Set de 4 fotos de la misma imagen en tamaño 4x5 cm',
    options: {
      sizes: ['4x5'],
      formats: ['Set de 4'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_10x15',
    name: '10x15 cm',
    type: 'physical',
    enabled: true,
    price: 80000, // $800.00 ARS
    description: 'Foto individual de 10x15 cm',
    options: {
      sizes: ['10x15'],
      formats: ['Impreso'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_13x18',
    name: '13x18 cm',
    type: 'physical',
    enabled: true,
    price: 100000, // $1,000.00 ARS
    description: 'Foto individual de 13x18 cm',
    options: {
      sizes: ['13x18'],
      formats: ['Impreso'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_15x21',
    name: '15x21 cm',
    type: 'physical',
    enabled: true,
    price: 120000, // $1,200.00 ARS
    description: 'Foto individual de 15x21 cm',
    options: {
      sizes: ['15x21'],
      formats: ['Impreso'],
      quality: 'standard'
    }
  },
  {
    id: 'copy_20x30',
    name: '20x30 cm',
    type: 'physical',
    enabled: true,
    price: 200000, // $2,000.00 ARS
    description: 'Foto individual de 20x30 cm',
    options: {
      sizes: ['20x30'],
      formats: ['Impreso'],
      quality: 'premium'
    }
  }
];

export function StoreConfigPanel({
  eventId,
  currentConfig,
  onUpdate,
  className
}: StoreConfigPanelProps) {
  const [config, setConfig] = useState<StoreConfig>({
    enabled: false,
    products: defaultProducts,
    currency: 'ARS',
    tax_rate: 0,
    shipping_enabled: true,
    shipping_price: 500,
    payment_methods: ['mercadopago'],
    ...currentConfig
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Cargar configuración existente al montar
  useEffect(() => {
    const loadExistingConfig = async () => {
      if (!eventId) return;
      
      try {
        const response = await fetch(`/api/admin/events/${eventId}/store-config`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            // Convertir de formato DB a formato UI
            const uiConfig = convertDbToUiConfig(data.config);
            setConfig(prev => ({ ...prev, ...uiConfig }));
          }
        }
      } catch (error) {
        console.error('Error loading store config:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadExistingConfig();
  }, [eventId]);

  // Función para convertir formato DB a UI
  const convertDbToUiConfig = (dbConfig: any): Partial<StoreConfig> => {
    const uiProducts = Object.entries(dbConfig.products || {}).map(([id, product]: [string, any]) => ({
      id,
      name: product.name,
      type: product.type === 'package' ? 'physical' as const : product.type as 'physical' | 'digital',
      enabled: product.enabled,
      price: product.price,
      description: product.description,
      options: product.features
    }));

    return {
      enabled: dbConfig.enabled || false,
      products: uiProducts,
      currency: dbConfig.currency || 'ARS',
      tax_rate: dbConfig.tax_rate || 0,
      shipping_enabled: dbConfig.shipping_enabled !== false,
      shipping_price: dbConfig.shipping_price || 150000,
      payment_methods: Object.keys(dbConfig.payment_methods || { mercadopago: true })
    };
  };

  const updateConfig = (updates: Partial<StoreConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateProduct = (productId: string, updates: Partial<ProductConfig>) => {
    setConfig(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === productId ? { ...p, ...updates } : p
      )
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setLoading(true);
    try {
      // API call para guardar configuración
      const response = await fetch(`/api/admin/events/${eventId}/store-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Error guardando configuración');
      }
      
      setHasChanges(false);
      onUpdate?.(config);
      
      // Toast notification
      try { 
        (await import('sonner')).toast.success('Configuración guardada'); 
      } catch {}
      
    } catch (error) {
      console.error('Error saving store config:', error);
      try { 
        (await import('sonner')).toast.error('Error guardando configuración'); 
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Configuración de Tienda</h3>
          <p className="text-gray-500 dark:text-gray-400">Configura productos y precios para el evento</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-primary-600 border-primary-200">
              Cambios sin guardar
            </Badge>
          )}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Configuración general */}
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
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                value={config.currency}
                onChange={(e) => updateConfig({ currency: e.target.value })}
                placeholder="ARS"
              />
            </div>
            <div>
              <Label htmlFor="tax">Impuestos (%)</Label>
              <Input
                id="tax"
                type="number"
                value={config.tax_rate}
                onChange={(e) => updateConfig({ tax_rate: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Disponibles
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
                <Switch
                  checked={product.enabled}
                  onCheckedChange={(enabled) => updateProduct(product.id, { enabled })}
                />
              </div>
              
              {product.enabled && (
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <div>
                    <Label htmlFor={`price-${product.id}`}>Precio ($)</Label>
                    <Input
                      id={`price-${product.id}`}
                      type="number"
                      value={product.price / 100}
                      onChange={(e) => updateProduct(product.id, { 
                        price: Math.round((parseFloat(e.target.value) || 0) * 100)
                      })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`desc-${product.id}`}>Descripción</Label>
                    <Input
                      id={`desc-${product.id}`}
                      value={product.description || ''}
                      onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                      placeholder="Descripción del producto"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Envío */}
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
                onChange={(e) => updateConfig({ 
                  shipping_price: Math.round((parseFloat(e.target.value) || 0) * 100)
                })}
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
