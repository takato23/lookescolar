'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  DollarSign,
  Package,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface PricingPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  includes: string[];
  photoRequirements: {
    individual: number;
    group: number;
  };
}

interface ExtraCopy {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface PricingData {
  packages: PricingPackage[];
  extraCopies: ExtraCopy[];
  lastUpdated: string;
  updatedBy: string;
}

export function PricingManagement() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pricing');
      if (!response.ok) {
        throw new Error('Error cargando precios');
      }
      const data = await response.json();
      setPricing(data);
    } catch (error) {
      console.error('Error loading pricing:', error);
      // Initialize with default structure if loading fails
      setPricing({
        packages: [
          {
            id: 'option-a',
            name: 'OPCIÓN A',
            price: 0,
            description: 'Carpeta impresa con diseño personalizado (20x30)',
            includes: [
              '1 foto INDIVIDUAL (15x21)',
              '4 fotos 4x5 (de la misma individual elegida)',
              '1 foto grupal (15x21)',
            ],
            photoRequirements: { individual: 1, group: 1 },
          },
          {
            id: 'option-b',
            name: 'OPCIÓN B',
            price: 0,
            description: 'Carpeta impresa con diseño personalizado (20x30)',
            includes: [
              '2 fotos INDIVIDUALES (15x21)',
              '8 fotos 4x5 (de las mismas individuales elegidas)',
              '1 foto grupal (15x21)',
            ],
            photoRequirements: { individual: 2, group: 1 },
          },
        ],
        extraCopies: [
          { id: 'extra-4x5', name: '4x5 (4 fotitos)', price: 0 },
          { id: 'extra-10x15', name: 'Foto 10x15', price: 0 },
          { id: 'extra-13x18', name: 'Foto 13x18', price: 0 },
          { id: 'extra-15x21', name: 'Foto 15x21', price: 0 },
          { id: 'extra-20x30', name: 'Poster 20x30', price: 0 },
        ],
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Sistema',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePricing = async () => {
    if (!pricing) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      });

      if (!response.ok) {
        throw new Error('Error guardando precios');
      }

      setHasChanges(false);
      alert('Precios actualizados correctamente');

      // Reload to get updated timestamps
      await loadPricing();
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('No se pudieron guardar los precios');
    } finally {
      setSaving(false);
    }
  };

  const updatePackagePrice = (packageId: string, price: number) => {
    if (!pricing) return;

    setPricing({
      ...pricing,
      packages: pricing.packages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, price } : pkg
      ),
    });
    setHasChanges(true);
  };

  const updateExtraPrice = (extraId: string, price: number) => {
    if (!pricing) return;

    setPricing({
      ...pricing,
      extraCopies: pricing.extraCopies.map((extra) =>
        extra.id === extraId ? { ...extra, price } : extra
      ),
    });
    setHasChanges(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los precios</p>
        <Button onClick={loadPricing} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Precios
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Configura los precios de los paquetes y copias adicionales
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge
              variant="outline"
              className="border-primary-600 text-primary-600"
            >
              Cambios sin guardar
            </Badge>
          )}

          <Button
            onClick={savePricing}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Last Updated Info */}
      {pricing.lastUpdated && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <AlertCircle className="h-4 w-4" />
              <span>
                Última actualización:{' '}
                {new Date(pricing.lastUpdated).toLocaleString('es-AR')}
                por {pricing.updatedBy}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Paquetes Principales
          </CardTitle>
          <CardDescription>
            Configura los precios de los paquetes base (Opción A y B)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pricing.packages.map((pkg, index) => (
            <div key={pkg.id}>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{pkg.name}</Badge>
                    <h3 className="text-lg font-semibold">{pkg.description}</h3>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Incluye:
                    </p>
                    <ul className="space-y-1">
                      {pkg.includes.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor={`price-${pkg.id}`}
                      className="text-base font-medium"
                    >
                      Precio del Paquete
                    </Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        id={`price-${pkg.id}`}
                        type="number"
                        min="0"
                        step="100"
                        value={pkg.price}
                        onChange={(e) =>
                          updatePackagePrice(
                            pkg.id,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="pl-10 text-lg font-semibold"
                        placeholder="0"
                      />
                    </div>
                    {pkg.price > 0 && (
                      <p className="mt-1 text-sm text-green-600">
                        Precio: {formatCurrency(pkg.price)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted p-3 text-sm text-gray-500">
                    <p className="font-medium">Requisitos de fotos:</p>
                    <p>
                      • {pkg.photoRequirements.individual} foto(s)
                      individual(es)
                    </p>
                    <p>• {pkg.photoRequirements.group} foto(s) grupal(es)</p>
                  </div>
                </div>
              </div>

              {index < pricing.packages.length - 1 && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Extra Copies Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Copias Adicionales
          </CardTitle>
          <CardDescription>
            Precios para copias sueltas de distintos tamaños
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pricing.extraCopies.map((extra) => (
              <div key={extra.id} className="space-y-3 rounded-lg border p-4">
                <div>
                  <h4 className="text-base font-medium">{extra.name}</h4>
                  {extra.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{extra.description}</p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor={`extra-price-${extra.id}`}
                    className="text-sm"
                  >
                    Precio
                  </Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id={`extra-price-${extra.id}`}
                      type="number"
                      min="0"
                      step="50"
                      value={extra.price}
                      onChange={(e) =>
                        updateExtraPrice(
                          extra.id,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                  {extra.price > 0 && (
                    <p className="mt-1 text-xs text-green-600">
                      {formatCurrency(extra.price)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
            <h4 className="mb-2 font-medium text-blue-900">
              💡 Consejos para configurar precios:
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>
                • Los precios se muestran automáticamente a las familias en la
                galería
              </li>
              <li>• Los cambios se aplican inmediatamente a nuevos pedidos</li>
              <li>• Los pedidos existentes mantienen los precios originales</li>
              <li>• Puedes actualizar los precios las veces que necesites</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
