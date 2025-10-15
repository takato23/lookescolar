/**
 * 🎨 Módulo de configuración de branding
 * Maneja logos, colores personalizados y apariencia de la tienda
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ImageIcon, Upload, Palette } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';

interface BrandingModuleProps {
  config: StoreConfig;
  onUpdate: (updates: Partial<StoreConfig>) => void;
}

export const BrandingModule: React.FC<BrandingModuleProps> = ({
  config,
  onUpdate
}) => {
  const handleImageUpload = (field: 'logo_url' | 'banner_url') => {
    // TODO: Implementar upload de imágenes
    console.log(`Upload image for ${field}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Branding y Apariencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="text-base">Logo de la tienda</Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
              {config.logo_url ? (
                <img
                  src={config.logo_url}
                  alt="Logo de la tienda"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Input
                value={config.logo_url || ''}
                onChange={(e) => onUpdate({ logo_url: e.target.value })}
                placeholder="URL del logo (https://...)"
                aria-label="URL del logo de la tienda"
              />
              <p className="text-xs text-muted-foreground0 mt-1">
                Recomendado: 200x200px, formato PNG o JPG
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImageUpload('logo_url')}
              aria-label="Subir logo"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir
            </Button>
          </div>
        </div>

        <Separator />

        {/* Banner/Header */}
        <div className="space-y-3">
          <Label className="text-base">Imagen de cabecera</Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
              {config.banner_url ? (
                <img
                  src={config.banner_url}
                  alt="Banner de la tienda"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Input
                value={config.banner_url || ''}
                onChange={(e) => onUpdate({ banner_url: e.target.value })}
                placeholder="URL del banner (https://...)"
                aria-label="URL del banner de la tienda"
              />
              <p className="text-xs text-muted-foreground0 mt-1">
                Recomendado: 1200x300px, formato PNG o JPG
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImageUpload('banner_url')}
              aria-label="Subir banner"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir
            </Button>
          </div>
        </div>

        <Separator />

        {/* Colores personalizados */}
        <div className="space-y-4">
          <Label className="text-base">Colores del tema</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color" className="text-sm">Color primario</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="primary-color"
                  type="color"
                  value={config.colors?.primary || '#1f2937'}
                  onChange={(e) => onUpdate({
                    colors: { ...config.colors, primary: e.target.value }
                  })}
                  className="w-10 h-8 border border-border rounded cursor-pointer"
                  aria-label="Color primario del tema"
                />
                <Input
                  value={config.colors?.primary || '#1f2937'}
                  onChange={(e) => onUpdate({
                    colors: { ...config.colors, primary: e.target.value }
                  })}
                  placeholder="#1f2937"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent-color" className="text-sm">Color de acento</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="accent-color"
                  type="color"
                  value={config.colors?.accent || '#3b82f6'}
                  onChange={(e) => onUpdate({
                    colors: { ...config.colors, accent: e.target.value }
                  })}
                  className="w-10 h-8 border border-border rounded cursor-pointer"
                  aria-label="Color de acento del tema"
                />
                <Input
                  value={config.colors?.accent || '#3b82f6'}
                  onChange={(e) => onUpdate({
                    colors: { ...config.colors, accent: e.target.value }
                  })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
