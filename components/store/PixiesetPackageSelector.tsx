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
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  const handlePackageSelect = (packageId: string) => {
    onSelectPackage(packageId);
  };

  return (
    <div className={cn('looke-store min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100', className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 dark:border-slate-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver a la galería
          </Button>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Pago seguro y acompañamiento LookEscolar
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge className="w-max bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                Paso 2 · Elegí tu paquete
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Paquetes pensados <br className="hidden sm:block" /> para tu familia
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Cada paquete está preparado para que tengas impresiones impecables y copias adicionales listas para compartir.
              </p>
            </div>

            <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/60 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">¿Cómo funciona?</p>
                  <p className="text-xs text-muted-foreground">
                    Elegí un paquete, seleccioná tus fotos y confirmá el pago.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Star className="h-3 w-3" />
                  </div>
                  Paquetes premium impresos en laboratorio profesional.
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <Gift className="h-3 w-3" />
                  </div>
                  Incluyen copias adicionales para regalar.
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <ShieldCheck className="h-3 w-3" />
                  </div>
                  Revisión manual y seguimiento personalizado.
                </div>
              </div>
            </div>
          </div>

          {photo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/30 shadow-2xl backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-800/30"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10" />
              <div className="relative grid gap-4 p-6 sm:p-8">
                <div className="overflow-hidden rounded-2xl border border-white/20 shadow-lg">
                  <img
                    src={photo.preview_url || photo.url}
                    alt={photo.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="rounded-xl border border-white/30 bg-white/50 p-4 backdrop-blur-md dark:bg-slate-900/50">
                  <p className="text-sm font-bold text-foreground">
                    {photo.student || 'Foto seleccionada'}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                  'group relative flex flex-col gap-6 rounded-[2rem] border p-8 transition-all hover:-translate-y-1 hover:shadow-2xl',
                  isRecommended
                    ? 'border-blue-200 bg-gradient-to-b from-white to-blue-50/50 shadow-xl dark:border-blue-800 dark:from-slate-900 dark:to-blue-900/20'
                    : 'border-white/40 bg-white/60 shadow-lg backdrop-blur-md hover:bg-white/80 dark:border-slate-700/50 dark:bg-slate-900/60 dark:hover:bg-slate-900/80'
                )}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                    Más Popular
                  </div>
                )}

                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold text-foreground">{pkg.name}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed px-4">{pkg.description}</p>
                </div>

                <div className="flex items-baseline justify-center gap-1 py-2">
                  <span className="text-4xl font-bold text-foreground tracking-tight">
                    {formatCurrency(pkg.price / 100)}
                  </span>
                </div>

                <div className="space-y-4 rounded-2xl bg-white/50 p-6 dark:bg-slate-900/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center mb-4">
                    ¿Qué incluye?
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {FEATURE_ICONS.individualPhotos}
                      </div>
                      <span className="text-foreground/90">
                        <strong className="font-semibold text-foreground">{pkg.contents.individualPhotos}</strong> fotos individuales 15x21 premium
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        {FEATURE_ICONS.copyPhotos}
                      </div>
                      <span className="text-foreground/90">
                        <strong className="font-semibold text-foreground">{pkg.contents.copyPhotos}</strong> copias 4x5 listas para regalar
                      </span>
                    </li>
                    {pkg.contents.groupPhotos ? (
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {FEATURE_ICONS.groupPhotos}
                        </div>
                        <span className="text-foreground/90">
                          <strong className="font-semibold text-foreground">{pkg.contents.groupPhotos}</strong> foto grupal 15x21 con toda la división
                        </span>
                      </li>
                    ) : null}
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <Sparkles className="h-3 w-3" />
                      </div>
                      <span className="text-foreground/90">Archivo digital optimizado incluido</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-auto pt-4">
                  <Button
                    className={cn(
                      "w-full h-12 text-base shadow-lg transition-all hover:scale-[1.02]",
                      isRecommended
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        : "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    )}
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

        <section className="rounded-3xl border border-white/40 bg-white/60 p-8 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/60">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">¿Preferís una propuesta a medida?</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Nuestro equipo puede ayudarte a combinar paquetes o sumar extras personalizados según tus necesidades.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
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
