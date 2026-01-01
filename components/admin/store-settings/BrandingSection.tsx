'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Palette,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandingSectionProps {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  welcomeMessage?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  onLogoUpload: (url: string) => void;
  onBannerUpload: (url: string) => void;
  onWelcomeMessageChange?: (message: string) => void;
  onBrandColorsChange?: (colors: { primary?: string; secondary?: string; accent?: string }) => void;
  className?: string;
}

export function BrandingSection({
  logoUrl,
  bannerUrl,
  welcomeMessage,
  brandColors,
  onLogoUpload,
  onBannerUpload,
  onWelcomeMessageChange,
  onBrandColorsChange,
  className,
}: BrandingSectionProps) {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    type: 'logo' | 'banner'
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/admin/upload/branding', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error subiendo archivo');
    }

    const data = await response.json();
    return data.url;
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 2MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // For now, create a local URL (in production, upload to Supabase Storage)
      const url = URL.createObjectURL(file);
      onLogoUpload(url);
      toast.success('Logo actualizado');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error subiendo logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5MB');
      return;
    }

    setIsUploadingBanner(true);
    try {
      const url = URL.createObjectURL(file);
      onBannerUpload(url);
      toast.success('Banner actualizado');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Error subiendo banner');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveLogo = () => {
    onLogoUpload('');
    toast.info('Logo eliminado');
  };

  const handleRemoveBanner = () => {
    onBannerUpload('');
    toast.info('Banner eliminado');
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Logo upload */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Logo de la tienda
        </Label>
        <div className="flex items-start gap-4">
          {logoUrl ? (
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-lg border-2 border-border bg-muted">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                onClick={handleRemoveLogo}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {logoUrl ? 'Cambiar logo' : 'Subir logo'}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG, SVG o JPG. Tamaño recomendado: 200x200px. Máximo 2MB.
            </p>
          </div>
        </div>
      </div>

      {/* Banner upload */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Banner de portada
        </Label>
        <div className="flex items-start gap-4">
          {bannerUrl ? (
            <div className="relative">
              <div className="h-24 w-48 overflow-hidden rounded-lg border-2 border-border bg-muted">
                <img
                  src={bannerUrl}
                  alt="Banner"
                  className="h-full w-full object-cover"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                onClick={handleRemoveBanner}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex h-24 w-48 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {bannerUrl ? 'Cambiar banner' : 'Subir banner'}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG o PNG. Tamaño recomendado: 1920x600px. Máximo 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Welcome message */}
      {onWelcomeMessageChange && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            Mensaje de bienvenida
          </Label>
          <Textarea
            value={welcomeMessage || ''}
            onChange={(e) => onWelcomeMessageChange(e.target.value)}
            placeholder="Bienvenidos a nuestra galería de fotos escolares..."
            maxLength={500}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {welcomeMessage?.length || 0} / 500 caracteres
          </p>
        </div>
      )}

      {/* Brand colors */}
      {onBrandColorsChange && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Colores de marca
          </Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-xs text-muted-foreground">
                Color primario
              </Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={brandColors?.primary || '#1f2937'}
                  onChange={(e) =>
                    onBrandColorsChange({
                      ...brandColors,
                      primary: e.target.value,
                    })
                  }
                  className="h-10 w-16 cursor-pointer"
                />
                <Input
                  type="text"
                  value={brandColors?.primary || '#1f2937'}
                  onChange={(e) =>
                    onBrandColorsChange({
                      ...brandColors,
                      primary: e.target.value,
                    })
                  }
                  className="flex-1 font-mono text-xs"
                  placeholder="#1f2937"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-xs text-muted-foreground">
                Color secundario
              </Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={brandColors?.secondary || '#6b7280'}
                  onChange={(e) =>
                    onBrandColorsChange({
                      ...brandColors,
                      secondary: e.target.value,
                    })
                  }
                  className="h-10 w-16 cursor-pointer"
                />
                <Input
                  type="text"
                  value={brandColors?.secondary || '#6b7280'}
                  onChange={(e) =>
                    onBrandColorsChange({
                      ...brandColors,
                      secondary: e.target.value,
                    })
                  }
                  className="flex-1 font-mono text-xs"
                  placeholder="#6b7280"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color" className="text-xs text-muted-foreground">
                Color de acento
              </Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={brandColors?.accent || '#3b82f6'}
                  onChange={(e) =>
                    onBrandColorsChange({
                      ...brandColors,
                      accent: e.target.value,
                    })
                  }
                  className="h-10 w-16 cursor-pointer"
                />
                <Input
                  type="text"
                  value={brandColors?.accent || '#3b82f6'}
                  onChange={(e) =>
                    onBrandColorsChange({
                      ...brandColors,
                      accent: e.target.value,
                    })
                  }
                  className="flex-1 font-mono text-xs"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estos colores se aplicarán a botones, enlaces y elementos de marca.
          </p>
        </div>
      )}
    </div>
  );
}

export default BrandingSection;
