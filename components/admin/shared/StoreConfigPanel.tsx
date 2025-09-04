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
    id: 'photo_a',
    name: 'Foto Producto A',
    type: 'physical',
    enabled: true,
    price: 1500, // centavos
    description: 'Impresión estándar 10x15cm',
    options: {
      sizes: ['10x15cm', '13x18cm'],
      quality: 'standard'
    }
  },
  {
    id: 'photo_b',
    name: 'Foto Producto B',
    type: 'physical',
    enabled: true,
    price: 2000,
    description: 'Impresión premium 15x21cm',
    options: {
      sizes: ['15x21cm', '20x25cm'],
      quality: 'premium'
    }
  },
  {
    id: 'photo_c',
    name: 'Foto Producto C',
    type: 'physical',
    enabled: false,
    price: 2500,
    description: 'Impresión especial formato grande',
    options: {
      sizes: ['20x30cm', '30x40cm'],
      quality: 'premium'
    }
  },
  {
    id: 'digital_package',
    name: 'Paquete Digital',
    type: 'digital',
    enabled: false,
    price: 3000,
    description: 'Descarga digital alta resolución',
    options: {
      formats: ['JPG', 'PNG'],
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

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Configuración de Tienda</h3>
          <p className="text-gray-600">Configura productos y precios para el evento</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
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
