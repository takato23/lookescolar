import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  QrCode,
  Palette,
  Share2,
  Package,
  CheckCircle2,
  Crown,
  Zap,
  Heart,
  Building2,
} from 'lucide-react';
import { EventFormData } from '../EventWizard';
import { cn } from '@/lib/utils';
import {
  GalleryThemeService,
  type GalleryTheme,
} from '@/lib/services/gallery-theme.service';

interface StepThemeProps {
  data: EventFormData;
  updateField: <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const getCategoryIcon = (category: GalleryTheme['category']) => {
  switch (category) {
    case 'premium':
      return <Crown className="h-3.5 w-3.5" />;
    case 'celebration':
      return <Zap className="h-3.5 w-3.5" />;
    case 'ceremony':
      return <Heart className="h-3.5 w-3.5" />;
    case 'professional':
    default:
      return <Building2 className="h-3.5 w-3.5" />;
  }
};

const getCategoryLabel = (category: GalleryTheme['category']) => {
  switch (category) {
    case 'premium':
      return 'Premium';
    case 'celebration':
      return 'Celebracion';
    case 'ceremony':
      return 'Ceremonia';
    case 'professional':
    default:
      return 'Profesional';
  }
};

export function StepTheme({
  data,
  updateField,
  onSubmit,
  onBack,
  isSubmitting,
}: StepThemeProps) {
  const themes = GalleryThemeService.getAllThemes();
  const deliveryLabel: Record<EventFormData['delivery_channel'], string> = {
    digital: 'Digital',
    physical: 'Fisico',
    hybrid: 'Hibrido',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-5xl space-y-10"
    >
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Paso 3 · Estilo
        </p>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Estilo visual y extras
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Personaliza la experiencia de tus clientes con el tema ideal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Tema de galeria
            </Label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {themes.map((theme) => {
                const isSelected = data.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateField('theme', theme.id)}
                    className={cn(
                      'group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5',
                      isSelected
                        ? 'border-violet-500 bg-violet-50/70 shadow-md ring-1 ring-violet-500/20 dark:border-violet-500/70 dark:bg-violet-500/10'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950'
                    )}
                  >
                    {/* Category Badge */}
                    <div
                      className={cn(
                        'absolute -top-2 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        theme.category === 'premium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : theme.category === 'celebration'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'
                            : theme.category === 'ceremony'
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}
                    >
                      {getCategoryIcon(theme.category)}
                      <span>{getCategoryLabel(theme.category)}</span>
                    </div>

                    {/* Theme Preview */}
                    <div
                      className="relative h-24 w-full overflow-hidden rounded-xl border border-white/30 shadow-inner"
                      style={{ background: theme.colors.background }}
                    >
                      {/* Simulated gallery cards */}
                      <div className="absolute inset-2 grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="rounded-md"
                            style={{
                              background: theme.colors.cardBackground,
                              border: `1px solid ${theme.colors.border}`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            }}
                          />
                        ))}
                      </div>
                      {/* Color dots */}
                      <div className="absolute bottom-2 left-2 flex gap-1.5">
                        <div
                          className="h-3 w-3 rounded-full ring-1 ring-white/50"
                          style={{ background: theme.colors.primary }}
                        />
                        <div
                          className="h-3 w-3 rounded-full ring-1 ring-white/50"
                          style={{ background: theme.colors.secondary }}
                        />
                        <div
                          className="h-3 w-3 rounded-full ring-1 ring-white/50"
                          style={{ background: theme.colors.accent }}
                        />
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {theme.name}
                        </p>
                        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {theme.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-violet-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Opciones avanzadas
            </Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Marca de agua
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Protege previews publicas con watermark.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={data.enable_watermark}
                  onCheckedChange={(c) => updateField('enable_watermark', c)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      QR tagging
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Detecta invitados automaticamente con QR.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={data.enable_qr_tagging}
                  onCheckedChange={(c) => updateField('enable_qr_tagging', c)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Resumen
              </p>
              <Palette className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {data.name || 'Tu evento'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data.date || 'Fecha por definir'}
              </p>
            </div>

            {/* Theme Preview in Summary */}
            {data.theme && (
              <div
                className="rounded-xl border p-3"
                style={{
                  background: GalleryThemeService.getTheme(data.theme).colors
                    .background,
                  borderColor: GalleryThemeService.getTheme(data.theme).colors
                    .border,
                }}
              >
                <p
                  className="mb-2 text-xs font-medium"
                  style={{
                    color: GalleryThemeService.getTheme(data.theme).colors
                      .textSecondary,
                  }}
                >
                  Vista previa del tema
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square flex-1 rounded-lg"
                      style={{
                        background: GalleryThemeService.getTheme(data.theme)
                          .colors.cardBackground,
                        border: `1px solid ${GalleryThemeService.getTheme(data.theme).colors.border}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span>
                  Estado {data.status === 'draft' ? 'Borrador' : 'Activo'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-slate-400" />
                <span>
                  Compartir{' '}
                  {data.sharing_mode === 'private' ? 'Privado' : 'Publico'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                <span>Entrega {deliveryLabel[data.delivery_channel]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Precio base
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ARS {data.price_per_photo || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Volver
        </Button>
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 px-10 py-6 text-white shadow-xl shadow-violet-500/30 transition-all hover:brightness-110"
        >
          {isSubmitting ? (
            <>Creando...</>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" /> Crear evento
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
