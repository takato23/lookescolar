'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Heart,
  ShoppingCart,
  Share2,
  ImageIcon,
  Eye,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import type { StoreConfig } from '@/lib/validations/store-config';
import {
  getGridClasses,
  getPaletteTokens,
  getTypographyPreset,
  resolveStoreDesign,
} from '@/lib/store/store-design';

interface LiveStorePreviewProps {
  config: StoreConfig;
  device: 'desktop' | 'tablet' | 'mobile';
  onRefresh: () => void;
  className?: string;
}

export function LiveStorePreview({
  config,
  device,
  onRefresh,
  className,
}: LiveStorePreviewProps) {
  const design = useMemo(
    () => resolveStoreDesign(config.design ?? null),
    [config.design]
  );

  const palette = useMemo(
    () => getPaletteTokens(design.color.palette),
    [design.color.palette]
  );

  const typography = useMemo(
    () => getTypographyPreset(design.typography.preset),
    [design.typography.preset]
  );

  const grid = useMemo(() => getGridClasses(design.grid), [design.grid]);

  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  const deviceScales = {
    desktop: 'scale-100',
    tablet: 'scale-90',
    mobile: 'scale-75',
  };

  const previewPadding =
    design.app.density === 'compact'
      ? 'p-4'
      : design.app.density === 'airy'
      ? 'p-8'
      : 'p-6';

  const heroLayout =
    design.cover.style === 'center' || design.cover.style === 'joy'
      ? 'grid-cols-1'
      : 'md:grid-cols-3';

  const heroTextAlign =
    design.cover.style === 'center' || design.cover.style === 'joy'
      ? 'text-center items-center'
      : 'text-left items-start';

  const coverFrameClass = cn(
    'relative overflow-hidden',
    design.cover.style === 'frame' && 'rounded-3xl border-4',
    design.cover.style === 'stripe' && 'rounded-2xl p-3',
    design.cover.style === 'divider' && 'rounded-2xl border-l-4',
    design.cover.variant === 'journal' && 'border border-dashed',
    design.cover.variant === 'stamp' && 'border-2 border-dotted',
    design.cover.variant === 'outline' && 'border',
    design.cover.variant === 'border' && 'border-4',
    design.cover.variant === 'album' && 'rounded-3xl shadow-lg',
    design.cover.variant === 'cliff' && 'rounded-t-[2.5rem] rounded-b-2xl',
    design.cover.variant === 'split' && 'rounded-2xl',
    design.cover.variant === 'none' && 'rounded-2xl'
  );

  const showCoverImage = design.cover.style !== 'none';
  const showCoverLabel = design.cover.variant === 'label';
  const showNavText = design.grid.nav === 'icons_text';

  // Sample photos for preview
  const samplePhotos = Array.from({ length: 12 }, (_, i) => ({
    id: `sample-${i}`,
    placeholder: true,
  }));

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Preview header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Vista previa en vivo</span>
          <Badge variant="outline" className="text-xs">
            {device === 'desktop'
              ? 'Escritorio'
              : device === 'tablet'
              ? 'Tablet'
              : 'Móvil'}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview viewport */}
      <div className="flex min-h-[600px] justify-center overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div
          className={cn(
            'transition-all duration-300 origin-top',
            deviceWidths[device],
            deviceScales[device]
          )}
        >
          <div
            className={cn(
              'overflow-hidden rounded-lg border-2 border-border bg-white shadow-2xl',
              typography.baseClass
            )}
            style={{
              backgroundColor: palette.background,
              color: palette.text,
            }}
          >
            <div className={cn('space-y-6', previewPadding)}>
              {/* Header */}
              <div
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3',
                  design.app.header === 'minimal' ? 'text-xs' : 'text-sm'
                )}
                style={{
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: palette.accentSoft,
                      color: palette.accent,
                    }}
                  >
                    {config.logo_url ? (
                      <img
                        src={config.logo_url}
                        alt="Logo"
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="font-semibold">
                    {config.texts?.hero_title || 'LookEscolar Studio'}
                  </div>
                </div>

                <div
                  className={cn(
                    'flex items-center gap-3 md:gap-4',
                    design.grid.nav === 'icons' ? 'text-xs' : 'text-xs'
                  )}
                  style={{ color: palette.muted }}
                >
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    {showNavText && (
                      <span className="hidden sm:inline">Favoritos</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    {showNavText && (
                      <span className="hidden sm:inline">Carrito</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Share2 className="h-4 w-4" />
                    {showNavText && (
                      <span className="hidden sm:inline">Compartir</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hero section */}
              <div
                className={cn('grid gap-5 rounded-3xl border', heroLayout)}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                }}
              >
                <div className={cn('space-y-3 p-6', heroTextAlign)}>
                  <div
                    className={cn(
                      'text-xs uppercase tracking-[0.3em]',
                      typography.headingClass
                    )}
                    style={{ color: palette.muted }}
                  >
                    {config.texts?.hero_subtitle || 'Colección escolar'}
                  </div>
                  <h4
                    className={cn('text-2xl font-semibold', typography.headingClass)}
                  >
                    {config.texts?.hero_title || 'Gala Primavera'}
                  </h4>
                  <p className="text-sm" style={{ color: palette.muted }}>
                    Ordena tus recuerdos en una experiencia premium.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: palette.accent,
                      color: palette.background,
                    }}
                  >
                    Ver galería
                  </button>
                </div>

                {showCoverImage && (
                  <div
                    className={cn(
                      'p-6',
                      design.cover.style === 'center' ? '' : 'md:col-span-2'
                    )}
                  >
                    <div className={coverFrameClass} style={{ borderColor: palette.border }}>
                      {showCoverLabel && (
                        <div
                          className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                          style={{
                            backgroundColor: palette.surface,
                            color: palette.text,
                          }}
                        >
                          Especial
                        </div>
                      )}
                      {design.cover.variant === 'split' && (
                        <div
                          className="absolute inset-y-0 left-1/2 w-px"
                          style={{ backgroundColor: palette.border }}
                        />
                      )}
                      {config.banner_url ? (
                        <img
                          src={config.banner_url}
                          alt="Portada"
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-48 w-full"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${palette.accentSoft} 0%, ${palette.accent} 60%, ${palette.text} 100%)`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Gallery section */}
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between text-xs uppercase tracking-[0.25em]"
                  style={{ color: palette.muted }}
                >
                  <span>Galería</span>
                  <span>42 fotos</span>
                </div>

                <div className={cn('grid', grid.colsClass, grid.gapClass)}>
                  {samplePhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={cn(
                        'group relative overflow-hidden rounded-xl border transition-all',
                        grid.aspectClass
                      )}
                      style={{
                        backgroundColor: palette.accentSoft,
                        borderColor: palette.border,
                      }}
                    >
                      {/* Photo placeholder with gradient */}
                      <div
                        className="h-full w-full"
                        style={{
                          backgroundImage: `linear-gradient(${
                            135 + index * 15
                          }deg, ${palette.accentSoft} 0%, ${
                            palette.accent
                          } 60%, ${palette.muted} 100%)`,
                        }}
                      />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                        <Button
                          size="sm"
                          className="rounded-full"
                          style={{
                            backgroundColor: palette.accent,
                            color: palette.background,
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Product badge */}
                      <div
                        className="absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          backgroundColor: palette.surface,
                          color: palette.text,
                        }}
                      >
                        ${config.products?.[0]?.price || '2000'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load more button */}
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    className="rounded-full border px-6 py-2 text-sm font-medium transition-colors hover:bg-opacity-90"
                    style={{
                      borderColor: palette.border,
                      color: palette.text,
                      backgroundColor: palette.surface,
                    }}
                  >
                    Cargar más fotos
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div
                className="mt-8 border-t pt-6 text-center text-xs"
                style={{
                  borderColor: palette.border,
                  color: palette.muted,
                }}
              >
                <p>{config.texts?.footer_text || '© 2024 LookEscolar'}</p>
                {config.texts?.contact_email && (
                  <p className="mt-1">{config.texts.contact_email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview info footer */}
      <div className="border-t border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Plantilla: {config.template}</span>
          <span>Actualización en tiempo real</span>
        </div>
      </div>
    </Card>
  );
}

export default LiveStorePreview;
