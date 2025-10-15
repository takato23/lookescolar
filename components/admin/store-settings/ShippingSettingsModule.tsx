/**
 * 🚚 Módulo de configuración de envío
 * Maneja configuración de costos de envío
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DollarSign } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';

interface ShippingSettingsModuleProps {
  config: StoreConfig;
  onUpdate: (updates: Partial<StoreConfig>) => void;
  formatPrice: (price: number) => string;
}

export const ShippingSettingsModule: React.FC<ShippingSettingsModuleProps> = ({
  config,
  onUpdate,
  formatPrice
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Configuración de Envío
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label className="text-base">Habilitar envío</Label>
            <p className="text-sm text-muted-foreground0" id="shipping-enabled-description">
              Permite envío a domicilio de productos físicos
            </p>
          </div>
          <Switch
            checked={config.shipping_enabled}
            onCheckedChange={(shipping_enabled) => onUpdate({ shipping_enabled })}
            aria-label="Habilitar envío a domicilio"
            aria-describedby="shipping-enabled-description"
            role="switch"
          />
        </div>

        {config.shipping_enabled && (
          <div>
            <Label htmlFor="shipping-price">Costo de envío</Label>
            <Input
              id="shipping-price"
              type="number"
              min="0"
              step="0.01"
              value={config.shipping_price / 100}
              onChange={(e) => onUpdate({
                shipping_price: Math.round((parseFloat(e.target.value) || 0) * 100)
              })}
              placeholder="0.00"
              aria-label="Costo de envío"
            />
            <p className="text-xs text-muted-foreground0 mt-1">
              Costo actual: {formatPrice(config.shipping_price)}
            </p>
            <p className="text-xs text-muted-foreground0 mt-1">
              💡 El costo de envío se aplica automáticamente a todos los productos físicos
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
