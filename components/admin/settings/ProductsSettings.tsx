'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Package,
  Download,
  ShoppingCart,
  DollarSign,
  Clock,
  Save,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// TYPES
// =============================================================================

interface DigitalPackage {
  id: string;
  name: string;
  photo_count: number | 'all';
  price_cents: number;
  discount_percentage?: number;
}

interface ProductConfig {
  physical_enabled: boolean;
  digital_enabled: boolean;
  digital_price_base_cents: number;
  digital_packages: DigitalPackage[];
  download_limit: number;
  download_expiry_hours: number;
}

interface ProductsSettingsProps {
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProductsSettings({ className }: ProductsSettingsProps) {
  const [config, setConfig] = useState<ProductConfig>({
    physical_enabled: true,
    digital_enabled: false,
    digital_price_base_cents: 0,
    digital_packages: [],
    download_limit: 3,
    download_expiry_hours: 48,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/admin/settings/products');
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setConfig(data.config);
          }
        }
      } catch (error) {
        console.error('Error fetching product config:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  // Update config field
  const updateField = useCallback(<K extends keyof ProductConfig>(
    field: K,
    value: ProductConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Save config
  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      toast.success('Configuracion de productos guardada');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error al guardar la configuracion');
    } finally {
      setSaving(false);
    }
  }, [config]);

  // Format price for display
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Physical Products Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle>Productos Fisicos</CardTitle>
              <CardDescription>
                Venta de impresiones y productos impresos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="physical_enabled">Habilitar venta fisica</Label>
              <p className="text-sm text-muted-foreground">
                Permite a los clientes comprar impresiones de fotos
              </p>
            </div>
            <Switch
              id="physical_enabled"
              checked={config.physical_enabled}
              onCheckedChange={(checked) => updateField('physical_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digital Products Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Productos Digitales</CardTitle>
              <CardDescription>
                Venta de fotos en alta resolucion para descargar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="digital_enabled">Habilitar venta digital</Label>
              <p className="text-sm text-muted-foreground">
                Permite a los clientes comprar y descargar fotos HD
              </p>
            </div>
            <Switch
              id="digital_enabled"
              checked={config.digital_enabled}
              onCheckedChange={(checked) => updateField('digital_enabled', checked)}
            />
          </div>

          {config.digital_enabled && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="digital_price">Precio base por foto digital</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="digital_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.digital_price_base_cents / 100}
                      onChange={(e) =>
                        updateField('digital_price_base_cents', Math.round(parseFloat(e.target.value || '0') * 100))
                      }
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Precio en ARS por cada foto digital HD
                  </p>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Label htmlFor="download_limit" className="flex items-center gap-1">
                      Limite de descargas
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cantidad maxima de veces que se puede descargar cada foto</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                  </TooltipProvider>
                  <Input
                    id="download_limit"
                    type="number"
                    min="1"
                    max="10"
                    value={config.download_limit}
                    onChange={(e) =>
                      updateField('download_limit', parseInt(e.target.value || '3', 10))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <TooltipProvider>
                  <Label htmlFor="download_expiry" className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Expiracion de enlaces (horas)
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tiempo en horas antes de que los enlaces de descarga expiren</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                </TooltipProvider>
                <Input
                  id="download_expiry"
                  type="number"
                  min="1"
                  max="168"
                  value={config.download_expiry_hours}
                  onChange={(e) =>
                    updateField('download_expiry_hours', parseInt(e.target.value || '48', 10))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Despues de este tiempo, los enlaces dejan de funcionar (maximo 168 horas / 7 dias)
                </p>
              </div>

              {/* Digital Packages Preview */}
              {config.digital_packages.length > 0 && (
                <div className="space-y-2">
                  <Label>Paquetes digitales configurados</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {config.digital_packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{pkg.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(pkg.price_cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Como funcionan las descargas digitales</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Los clientes pueden comprar fotos digitales junto con impresiones</li>
              <li>Despues del pago, reciben un email con enlaces de descarga unicos</li>
              <li>Cada enlace tiene un limite de descargas y fecha de expiracion</li>
              <li>Las fotos descargadas son la version original sin marca de agua</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
