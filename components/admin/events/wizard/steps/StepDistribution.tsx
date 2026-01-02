import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Package,
  Layers,
  Check,
  Globe,
  Lock,
  Receipt,
} from 'lucide-react';
import { EventFormData, DeliveryChannel } from '../EventWizard';
import { cn } from '@/lib/utils';

interface StepDistributionProps {
  data: EventFormData;
  updateField: <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDistribution({
  data,
  updateField,
  onNext,
  onBack,
}: StepDistributionProps) {
  const OPTIONS = [
    {
      id: 'digital' as DeliveryChannel,
      title: 'Solo Digital',
      desc: 'Descargas en alta resolución sin envío físico.',
      icon: Download,
      color: 'bg-cyan-500',
    },
    {
      id: 'physical' as DeliveryChannel,
      title: 'Impresión y Envío',
      desc: 'Productos físicos entregados a domicilio.',
      icon: Package,
      color: 'bg-orange-500',
    },
    {
      id: 'hybrid' as DeliveryChannel,
      title: 'Híbrido (Recomendado)',
      desc: 'Lo mejor de ambos mundos. Digital + Productos.',
      icon: Layers,
      color: 'bg-violet-600',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-4xl space-y-10"
    >
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Paso 2 · Venta
        </p>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Precio, entrega y visibilidad
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Define como vendes las fotos y quien puede acceder a la galeria.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Precio por foto
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                ARS
              </span>
              <Input
                type="number"
                min={0}
                value={data.price_per_photo}
                onChange={(e) => {
                  const value =
                    e.target.value === '' ? 0 : Number(e.target.value);
                  updateField(
                    'price_per_photo',
                    Number.isNaN(value) ? 0 : value
                  );
                }}
                className="h-14 rounded-xl border-2 border-slate-200 bg-white pl-16 text-lg font-semibold focus-visible:border-violet-500 focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Este valor se usa como precio base para compras individuales.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Modo de compartir
            </Label>
            <div className="grid gap-4">
              {[
                {
                  id: 'public',
                  title: 'Publico',
                  description: 'Cualquier invitado con el link puede acceder.',
                  icon: Globe,
                },
                {
                  id: 'private',
                  title: 'Privado',
                  description: 'Solo con invitacion o permisos manuales.',
                  icon: Lock,
                },
              ].map((option) => {
                const isSelected = data.sharing_mode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      updateField(
                        'sharing_mode',
                        option.id as EventFormData['sharing_mode']
                      )
                    }
                    className={cn(
                      'group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition',
                      isSelected
                        ? 'border-violet-500 bg-violet-50/80 shadow-sm dark:border-violet-500/70 dark:bg-violet-500/10'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 flex h-8 w-8 items-center justify-center rounded-full text-white',
                        isSelected
                          ? 'bg-violet-600'
                          : 'bg-slate-400/80 group-hover:bg-slate-500'
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {option.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Auto-publicar al crear
                </span>
              </div>
              <Switch
                checked={data.auto_publish}
                onCheckedChange={(value) => updateField('auto_publish', value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Canal de entrega
            </Label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {OPTIONS.map((option) => {
                const isSelected = data.delivery_channel === option.id;

                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    onClick={() => updateField('delivery_channel', option.id)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'group relative flex h-full flex-col items-center gap-4 rounded-2xl border-2 p-5 text-center transition-all duration-300',
                      isSelected
                        ? 'border-violet-500 bg-violet-50/50 shadow-lg ring-1 ring-violet-500/40 dark:bg-violet-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute right-4 top-4 rounded-full bg-violet-500 p-1 text-white shadow-md">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg',
                        option.color,
                        isSelected
                          ? 'scale-110'
                          : 'opacity-80 grayscale-[0.4] group-hover:grayscale-0'
                      )}
                    >
                      <option.icon className="h-7 w-7" />
                    </div>

                    <div>
                      <h3
                        className={cn(
                          'text-base font-semibold',
                          isSelected
                            ? 'text-violet-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-200'
                        )}
                      >
                        {option.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {option.desc}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
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
          onClick={onNext}
          className="rounded-full bg-slate-900 px-8 text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 hover:shadow-slate-900/30"
        >
          Continuar <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
