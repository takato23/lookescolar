'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Camera,
  Gift,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Star,
} from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  preview_url?: string;
  alt: string;
  student?: string;
  subject?: string;
  isGroupPhoto?: boolean;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  itemCount: number;
  contents: {
    individualPhotos: number;
    groupPhotos: number;
    copyPhotos: number;
  };
}

interface PixiesetPackageSelectorProps {
  photo: Photo | null;
  packages: PackageOption[];
  onBack: () => void;
  onSelectPackage: (packageId: string) => void;
  onAddToCart: (packageId: string) => void;
  className?: string;
  settings?: any;
  theme?: any;
}

const FEATURE_ICONS = {
  individualPhotos: <Camera className="h-4 w-4" />,
  groupPhotos: <Layers className="h-4 w-4" />,
  copyPhotos: <Gift className="h-4 w-4" />,
};

export function PixiesetPackageSelector({
  photo,
  packages,
  onBack,
  onSelectPackage,
  onAddToCart,
  className,
  settings,
  theme,
}: PixiesetPackageSelectorProps) {
  const primaryColor = theme?.colors?.primary || '#2F6FED';
  const accentColor = theme?.colors?.accent || '#F7B731';

  const handlePackageSelect = (packageId: string) => {
    onSelectPackage(packageId);
  };

  return (
    <div className={cn('looke-store min-h-screen bg-background text-foreground', className)}>
      <header className="border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a la galería
          </Button>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Pago seguro y acompañamiento LookEscolar
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge className="w-max bg-primary/10 text-primary border-primary/20">
                Paso 2 · Elegí tu paquete
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">Paquetes pensados para tu familia</h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                Cada paquete está preparado para que tengas impresiones impecables y copias adicionales listas para compartir con la familia. Elegí el que mejor se adapte a tu necesidad y continuá para seleccionar las fotos.
              </p>
            </div>

            <div className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">¿Cómo funciona?</p>
                  <p className="text-xs text-muted-foreground">
                    Elegí un paquete, seleccioná tus fotos y confirmá el pago. Nosotros nos encargamos del resto.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-accent" />
                  Paquetes premium impresos en laboratorio profesional.
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  Incluyen copias adicionales para regalar.
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Revisión manual y seguimiento personalizado.
                </div>
              </div>
            </div>
          </div>

          {photo ? (
            <div className="relative overflow-hidden rounded-4xl border border-border bg-card/80 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent" />
              <div className="relative grid gap-4 p-6 sm:p-8">
                <div className="overflow-hidden rounded-3xl border border-border/60">
                  <img
                    src={photo.preview_url || photo.url}
                    alt={photo.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {photo.student || 'Foto seleccionada'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {photo.subject || 'Podés cambiar la foto más adelante'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {packages.map((pkg, index) => {
            const isRecommended = index === 0;

            return (
              <article
                key={pkg.id}
                className={cn(
                  'group relative flex flex-col gap-6 rounded-4xl border bg-card p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl',
                  isRecommended
                    ? 'border-primary/40 bg-gradient-to-br from-primary/6 via-card to-accent/5'
                    : 'border-border'
                )}
              >
                {isRecommended ? (
                  <Badge className="absolute right-6 top-6 bg-primary text-primary-foreground">Recomendado</Badge>
                ) : null}

                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">{pkg.name}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pkg.description}</p>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/60 bg-surface p-4">
                  <p className="text-3xl font-semibold text-primary">
                    {formatCurrency(pkg.price / 100)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Incluye:</p>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    <li className="flex items-center gap-2">
                      {FEATURE_ICONS.individualPhotos}
                      {pkg.contents.individualPhotos} fotos individuales 15x21 premium
                    </li>
                    <li className="flex items-center gap-2">
                      {FEATURE_ICONS.copyPhotos}
                      {pkg.contents.copyPhotos} copias 4x5 listas para regalar
                    </li>
                    {pkg.contents.groupPhotos ? (
                      <li className="flex items-center gap-2">
                        {FEATURE_ICONS.groupPhotos}
                        {pkg.contents.groupPhotos} foto grupal 15x21 con toda la división
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Archivo digital optimizado incluido
                    </li>
                  </ul>
                </div>

                <div className="mt-auto space-y-3">
                  <Button
                    className="w-full justify-center gap-2"
                    onClick={() => handlePackageSelect(pkg.id)}
                  >
                    Elegir este paquete
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center text-sm"
                    onClick={() => onAddToCart(pkg.id)}
                  >
                    Agregar al carrito
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">¿Preferís una propuesta a medida?</h3>
              <p className="text-sm text-muted-foreground">
                Nuestro equipo puede ayudarte a combinar paquetes o sumar extras personalizados según tus necesidades.
              </p>
            </div>
            <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto">
              Hablar con un asesor
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PixiesetPackageSelector;
