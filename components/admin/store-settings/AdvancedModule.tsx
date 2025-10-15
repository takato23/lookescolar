/**
 * ⚙️ Módulo de configuración avanzada
 * Opciones avanzadas como descuentos, límites, políticas, etc.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Percent, Download, Shield, Tag } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';

interface AdvancedModuleProps {
  config: StoreConfig;
  onUpdate: (updates: Partial<StoreConfig>) => void;
}

export const AdvancedModule: React.FC<AdvancedModuleProps> = ({
  config,
  onUpdate
}) => {
  const updateAdvanced = (field: string, value: any) => {
    onUpdate({
      advanced_settings: {
        ...config.advanced_settings,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración Avanzada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Descuentos y promociones */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <Label className="text-base">Descuentos y promociones</Label>
          </div>

          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="discount-percentage">Descuento global (%)</Label>
              <Input
                id="discount-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={config.advanced_settings?.global_discount || 0}
                onChange={(e) => updateAdvanced('global_discount', parseFloat(e.target.value) || 0)}
                placeholder="0"
                aria-label="Porcentaje de descuento global"
              />
              <p className="text-xs text-muted-foreground0">
                Descuento aplicado a todos los productos
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-discount">Descuento por volumen</Label>
              <Input
                id="bulk-discount"
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={config.advanced_settings?.bulk_discount || 0}
                onChange={(e) => updateAdvanced('bulk_discount', parseFloat(e.target.value) || 0)}
                placeholder="0"
                aria-label="Porcentaje de descuento por volumen"
              />
              <p className="text-xs text-muted-foreground0">
                Descuento adicional para compras grandes
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Límites de descarga */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <Label className="text-base">Límites de descarga</Label>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Habilitar límites de descarga</Label>
                <p className="text-xs text-muted-foreground0">
                  Controla cuántas veces se pueden descargar las fotos
                </p>
              </div>
              <Switch
                checked={config.advanced_settings?.download_limits?.enabled ?? false}
                onCheckedChange={(checked) => updateAdvanced('download_limits', {
                  ...config.advanced_settings?.download_limits,
                  enabled: checked
                })}
                aria-label="Habilitar límites de descarga"
              />
            </div>

            {config.advanced_settings?.download_limits?.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-downloads-photo">Máximo por foto</Label>
                  <Input
                    id="max-downloads-photo"
                    type="number"
                    min="1"
                    max="100"
                    value={config.advanced_settings?.download_limits?.max_downloads_per_photo || 10}
                    onChange={(e) => updateAdvanced('download_limits', {
                      ...config.advanced_settings?.download_limits,
                      max_downloads_per_photo: parseInt(e.target.value) || 10
                    })}
                    placeholder="10"
                    aria-label="Máximo de descargas por foto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-downloads-user">Máximo por usuario</Label>
                  <Input
                    id="max-downloads-user"
                    type="number"
                    min="1"
                    max="500"
                    value={config.advanced_settings?.download_limits?.max_downloads_per_user || 50}
                    onChange={(e) => updateAdvanced('download_limits', {
                      ...config.advanced_settings?.download_limits,
                      max_downloads_per_user: parseInt(e.target.value) || 50
                    })}
                    placeholder="50"
                    aria-label="Máximo de descargas por usuario"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Expiración de descargas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <Label className="text-base">Expiración de acceso</Label>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Habilitar expiración</Label>
                <p className="text-xs text-muted-foreground0">
                  Las fotos expiran después de un tiempo determinado
                </p>
              </div>
              <Switch
                checked={config.advanced_settings?.download_expiry?.enabled ?? false}
                onCheckedChange={(checked) => updateAdvanced('download_expiry', {
                  ...config.advanced_settings?.download_expiry,
                  enabled: checked
                })}
                aria-label="Habilitar expiración de descargas"
              />
            </div>

            {config.advanced_settings?.download_expiry?.enabled && (
              <div className="space-y-2">
                <Label htmlFor="expiry-days">Días hasta expiración</Label>
                <Input
                  id="expiry-days"
                  type="number"
                  min="1"
                  max="365"
                  value={config.advanced_settings?.download_expiry?.expiry_days || 30}
                  onChange={(e) => updateAdvanced('download_expiry', {
                    ...config.advanced_settings?.download_expiry,
                    expiry_days: parseInt(e.target.value) || 30
                  })}
                  placeholder="30"
                  aria-label="Días hasta expiración"
                />
                <p className="text-xs text-muted-foreground0">
                  Días después de la compra hasta que expiren las descargas
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Configuración de SEO */}
        <div className="space-y-4">
          <Label className="text-base">Optimización SEO</Label>

          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="meta-title">Título para SEO</Label>
              <Input
                id="meta-title"
                value={config.advanced_settings?.seo?.meta_title || ''}
                onChange={(e) => updateAdvanced('seo', {
                  ...config.advanced_settings?.seo,
                  meta_title: e.target.value
                })}
                placeholder="Fotos Escolares 2024 - Escuela Primaria"
                aria-label="Título para SEO"
              />
              <p className="text-xs text-muted-foreground0">
                Título que aparece en los resultados de búsqueda
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-description">Descripción para SEO</Label>
              <Input
                id="meta-description"
                value={config.advanced_settings?.seo?.meta_description || ''}
                onChange={(e) => updateAdvanced('seo', {
                  ...config.advanced_settings?.seo,
                  meta_description: e.target.value
                })}
                placeholder="Galería de fotos del evento escolar 2024. Compra tus fotos favoritas online."
                aria-label="Descripción para SEO"
              />
              <p className="text-xs text-muted-foreground0">
                Descripción que aparece en los resultados de búsqueda
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configuración de seguridad */}
        <div className="space-y-4">
          <Label className="text-base">Seguridad y privacidad</Label>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Protección con contraseña</Label>
                <p className="text-xs text-muted-foreground0">
                  Requiere contraseña para acceder a la tienda
                </p>
              </div>
              <Switch
                checked={config.advanced_settings?.security?.password_protection ?? false}
                onCheckedChange={(checked) => updateAdvanced('security', {
                  ...config.advanced_settings?.security,
                  password_protection: checked
                })}
                aria-label="Habilitar protección con contraseña"
              />
            </div>

            {config.advanced_settings?.security?.password_protection && (
              <div className="space-y-2">
                <Label htmlFor="store-password">Contraseña de la tienda</Label>
                <Input
                  id="store-password"
                  type="password"
                  value={config.advanced_settings?.security?.store_password || ''}
                  onChange={(e) => updateAdvanced('security', {
                    ...config.advanced_settings?.security,
                    store_password: e.target.value
                  })}
                  placeholder="Contraseña segura"
                  aria-label="Contraseña de la tienda"
                />
                <p className="text-xs text-muted-foreground0">
                  Los usuarios necesitarán esta contraseña para acceder
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm">Configuración por evento</Label>
                <p className="text-xs text-muted-foreground0">
                  Usar configuraciones específicas por evento
                </p>
              </div>
              <Switch
                checked={config.advanced_settings?.security?.per_event_settings ?? true}
                onCheckedChange={(checked) => updateAdvanced('security', {
                  ...config.advanced_settings?.security,
                  per_event_settings: checked
                })}
                aria-label="Habilitar configuración por evento"
              />
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">💡 Funcionalidades avanzadas</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Sistema de descuentos globales y por volumen</li>
            <li>• Control de límites de descarga por foto y usuario</li>
            <li>• Expiración automática de accesos</li>
            <li>• Optimización SEO con meta tags personalizables</li>
            <li>• Protección con contraseña opcional</li>
            <li>• Configuraciones específicas por evento</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
