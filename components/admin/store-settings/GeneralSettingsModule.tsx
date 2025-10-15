/**
 * ⚙️ Módulo de configuración general
 * Maneja configuración básica de la tienda
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';

interface GeneralSettingsModuleProps {
  config: StoreConfig;
  onUpdate: (updates: Partial<StoreConfig>) => void;
}

export const GeneralSettingsModule: React.FC<GeneralSettingsModuleProps> = ({
  config,
  onUpdate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración General
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label className="text-base">Habilitar tienda</Label>
            <p className="text-sm text-muted-foreground0" id="store-enabled-description">
              Permite que los usuarios compren fotos y productos del evento actual
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
            aria-label="Habilitar tienda del evento"
            aria-describedby="store-enabled-description"
            role="switch"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <select
              id="currency"
              value={config.currency}
              onChange={(e) => onUpdate({ currency: e.target.value as StoreConfig['currency'] })}
              className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Seleccionar moneda"
            >
              <option value="ARS">Peso Argentino (ARS)</option>
              <option value="USD">Dólar Estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="BRL">Real Brasileño (BRL)</option>
              <option value="CLP">Peso Chileno (CLP)</option>
              <option value="PEN">Sol Peruano (PEN)</option>
              <option value="COP">Peso Colombiano (COP)</option>
              <option value="MXN">Peso Mexicano (MXN)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="tax">Impuestos (%)</Label>
            <Input
              id="tax"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.tax_rate}
              onChange={(e) => onUpdate({ tax_rate: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              aria-label="Porcentaje de impuestos"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
