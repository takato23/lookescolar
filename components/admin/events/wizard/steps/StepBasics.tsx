import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, MapPin, Calendar, Camera } from 'lucide-react';
import { EventFormData } from '../EventWizard';
import { cn } from '@/lib/utils';

interface StepBasicsProps {
  data: EventFormData;
  updateField: <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => void;
  onNext: () => void;
}

export function StepBasics({ data, updateField, onNext }: StepBasicsProps) {
  const isValid = data.name.trim().length > 0 && data.date.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-3xl space-y-10"
    >
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Paso 1 · Detalles
        </p>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
          Definamos la base del evento
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Nombre, fecha y estado para tener todo listo desde el inicio.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Nombre del evento
          </Label>
          <div className="group relative">
            <Input
              value={data.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej. Boda García-López, Conferencia Tech 2025"
              className="h-14 rounded-xl border-2 border-slate-200 bg-white pl-11 text-lg font-medium focus-visible:border-violet-500 focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-950"
              autoFocus
            />
            <Camera className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-violet-500" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Fecha
            </Label>
            <div className="group relative">
              <Input
                type="date"
                value={data.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="h-14 rounded-xl border-2 border-slate-200 bg-white pl-10 text-sm font-semibold focus-visible:border-violet-500 focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-950"
              />
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-violet-500" />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Ubicacion (opcional)
            </Label>
            <div className="group relative">
              <Input
                value={data.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="Ciudad o lugar"
                className="h-14 rounded-xl border-2 border-slate-200 bg-white pl-10 text-sm font-semibold focus-visible:border-violet-500 focus-visible:ring-0 dark:border-slate-800 dark:bg-slate-950"
              />
              <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-violet-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Estado inicial
          </Label>
          <RadioGroup
            value={data.status}
            onValueChange={(value) =>
              updateField('status', value as EventFormData['status'])
            }
            className="grid gap-4 md:grid-cols-2"
          >
            {[
              {
                value: 'active',
                title: 'Activo',
                description:
                  'Visible para el equipo y listo para cargar fotos.',
              },
              {
                value: 'draft',
                title: 'Borrador',
                description: 'Guarda todo y termina detalles mas tarde.',
              },
            ].map((option) => (
              <Label
                key={option.value}
                htmlFor={`status-${option.value}`}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-950/60',
                  data.status === option.value &&
                    'border-violet-400 bg-violet-50/80 shadow-sm dark:border-violet-500/70 dark:bg-violet-500/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {option.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {option.description}
                    </p>
                  </div>
                  <RadioGroupItem
                    id={`status-${option.value}`}
                    value={option.value}
                    className="h-5 w-5 border-2 border-slate-300 data-[state=checked]:border-violet-500 data-[state=checked]:text-violet-500 dark:border-slate-700"
                  />
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!isValid}
          className="rounded-full bg-slate-900 px-8 text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 hover:shadow-slate-900/30 disabled:bg-slate-400"
        >
          Continuar <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
