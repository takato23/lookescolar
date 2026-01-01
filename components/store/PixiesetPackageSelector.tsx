'use client';

import React, { useMemo } from 'react';
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
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  resolveStoreDesign,
  getPaletteTokens,
  getTypographyPreset,
} from '@/lib/store/store-design';

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
  theme: legacyTheme,
}: PixiesetPackageSelectorProps) {

  // Resolve Design
  const design = useMemo(() => resolveStoreDesign(settings?.design), [settings?.design]);
  const palette = useMemo(() => getPaletteTokens(design.color.palette), [design.color.palette]);
  const typography = useMemo(() => getTypographyPreset(design.typography.preset), [design.typography.preset]);

  // CSS Variables for dynamic theming
  const themeStyle = {
    '--primary': palette.accent,
    '--secondary': palette.accentSoft,
    '--background': palette.background,
    '--surface': palette.surface,
    '--text': palette.text,
    '--text-secondary': palette.muted,
    '--border': palette.border,
  } as React.CSSProperties;

  const handlePackageSelect = (packageId: string) => {
    onSelectPackage(packageId);
  };

  return (
    <div
      className={cn('looke-store min-h-screen transition-colors duration-500', className, typography.baseClass)}
      style={{ ...themeStyle, backgroundColor: 'var(--background)', color: 'var(--text)' }}
    >
      <style jsx global>{`
           :root {
              --font-theme: ${design.typography.preset === 'serif' ? 'serif' : 'sans-serif'};
           }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: 'var(--text)' }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver a la galería
          </Button>
          <div
            className="hidden items-center gap-2 text-sm sm:flex"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            Pago seguro y acompañamiento LookEscolar
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge
                className="w-max backdrop-blur-md border transition-colors bg-opacity-20"
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--primary)',
                  borderColor: 'var(--border)'
                }}
              >
                Paso 2 · Elegí tu paquete
              </Badge>
              <h1 className={cn("text-4xl font-bold tracking-tight sm:text-5xl", typography.headingClass)} style={{ color: 'var(--text)' }}>
                Paquetes pensados <br className="hidden sm:block" /> para tus clientes
              </h1>
              <p className="max-w-xl text-lg" style={{ color: 'var(--text-secondary)' }}>
                Cada paquete está preparado para que tengas impresiones impecables y copias adicionales listas para compartir.
              </p>
            </div>

            <div
              className="grid gap-4 rounded-3xl border p-6 shadow-lg backdrop-blur-md"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--background)' }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>¿Cómo funciona?</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Elegí un paquete, seleccioná tus fotos y confirmá el pago.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {[
                  { icon: Star, text: 'Paquetes premium impresos en laboratorio profesional.' },
                  { icon: Gift, text: 'Incluyen copias adicionales para regalar.' },
                  { icon: ShieldCheck, text: 'Revisión manual y seguimiento personalizado.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-opacity-20"
                      style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                    >
                      <item.icon className="h-3 w-3" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {photo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5" />
              <div className="relative grid gap-4 p-6 sm:p-8">
                <div className="overflow-hidden rounded-2xl border shadow-lg" style={{ borderColor: 'var(--border)' }}>
                  <img
                    src={photo.preview_url || photo.url}
                    alt={photo.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div
                  className="rounded-xl border p-4 backdrop-blur-md"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                >
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                    {photo.student || 'Foto seleccionada'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {photo.subject || 'Podés cambiar la foto más adelante'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {packages.map((pkg, index) => {
            const isRecommended = index === 0;

            return (
              <motion.article
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className={cn(
                  'group relative flex flex-col gap-6 rounded-[2rem] border p-8 transition-all hover:-translate-y-1 hover:shadow-2xl'
                )}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: isRecommended ? 'var(--primary)' : 'var(--border)',
                  boxShadow: isRecommended ? `0 10px 40px -10px var(--secondary)` : ''
                }}
              >
                {isRecommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold shadow-lg"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--background)' }}
                  >
                    Más Popular
                  </div>
                )}

                <div className="space-y-2 text-center">
                  <h2 className={cn("text-2xl font-bold", typography.headingClass)} style={{ color: 'var(--text)' }}>{pkg.name}</h2>
                  <p className="text-sm leading-relaxed px-4" style={{ color: 'var(--text-secondary)' }}>{pkg.description}</p>
                </div>

                <div className="flex items-baseline justify-center gap-1 py-2">
                  <span className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                    {formatCurrency(pkg.price / 100)}
                  </span>
                </div>

                <div
                  className="space-y-4 rounded-2xl p-6"
                  style={{ backgroundColor: 'var(--background)' }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-center mb-4 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                    ¿Qué incluye?
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-opacity-20"
                        style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                      >
                        {FEATURE_ICONS.individualPhotos}
                      </div>
                      <span className="opacity-90" style={{ color: 'var(--text)' }}>
                        <strong className="font-semibold">{pkg.contents.individualPhotos}</strong> fotos individuales 15x21 premium
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-opacity-20"
                        style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                      >
                        {FEATURE_ICONS.copyPhotos}
                      </div>
                      <span className="opacity-90" style={{ color: 'var(--text)' }}>
                        <strong className="font-semibold">{pkg.contents.copyPhotos}</strong> copias 4x5 listas para regalar
                      </span>
                    </li>
                    {pkg.contents.groupPhotos ? (
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-opacity-20"
                          style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                        >
                          {FEATURE_ICONS.groupPhotos}
                        </div>
                        <span className="opacity-90" style={{ color: 'var(--text)' }}>
                          <strong className="font-semibold">{pkg.contents.groupPhotos}</strong> foto grupal 15x21 con toda la división
                        </span>
                      </li>
                    ) : null}
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-opacity-20"
                        style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                      >
                        <Sparkles className="h-3 w-3" />
                      </div>
                      <span className="opacity-90" style={{ color: 'var(--text)' }}>Archivo digital optimizado incluido</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-auto pt-4">
                  <Button
                    className={cn(
                      "w-full h-12 text-base shadow-lg transition-all hover:scale-[1.02]",
                    )}
                    style={{
                      backgroundColor: isRecommended ? 'var(--primary)' : 'var(--surface)',
                      color: isRecommended ? 'var(--background)' : 'var(--text)',
                      borderColor: 'var(--border)',
                      borderWidth: isRecommended ? 0 : 1
                    }}
                    onClick={() => handlePackageSelect(pkg.id)}
                  >
                    Elegir este paquete
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </section>

        <section
          className="rounded-3xl border p-8 shadow-lg backdrop-blur-md"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>¿Preferís una propuesta a medida?</h3>
              <p className="text-sm max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                Nuestro equipo puede ayudarte a combinar paquetes o sumar extras personalizados según tus necesidades.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Hablar con un asesor
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PixiesetPackageSelector;
