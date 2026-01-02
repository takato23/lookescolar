'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WizardStepper } from './ui/WizardStepper';
import { StepBasics } from './steps/StepBasics';
import { StepDistribution } from './steps/StepDistribution';
import { StepTheme } from './steps/StepTheme';
import { StepSuccess } from './steps/StepSuccess';
import type { EventTheme } from '@/lib/services/gallery-theme.service';

export type DeliveryChannel = 'digital' | 'physical' | 'hybrid';
export type SharingMode = 'public' | 'private';
export type EventStatus = 'draft' | 'active';

export interface EventFormData {
  name: string;
  location: string;
  date: string;
  status: EventStatus;
  theme: EventTheme;
  price_per_photo: number;
  sharing_mode: SharingMode;
  delivery_channel: DeliveryChannel;
  enable_watermark: boolean;
  enable_qr_tagging: boolean;
  auto_publish: boolean;
}

const INITIAL_DATA: EventFormData = {
  name: '',
  location: '',
  date: '',
  status: 'active',
  theme: 'default',
  price_per_photo: 0,
  sharing_mode: 'public',
  delivery_channel: 'digital',
  enable_watermark: true,
  enable_qr_tagging: false,
  auto_publish: false,
};

export function EventWizard() {
  const router = useRouter();
  const steps = useMemo(
    () => [
      {
        num: 1,
        label: 'Detalles',
        description: 'Nombre y fecha',
      },
      {
        num: 2,
        label: 'Venta',
        description: 'Precio y entrega',
      },
      {
        num: 3,
        label: 'Estilo',
        description: 'Tema y extras',
      },
    ],
    []
  );
  const totalSteps = steps.length;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const updateField = <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          location: formData.location.trim() || null,
          date: formData.date,
          status: formData.status,
          price_per_photo: formData.price_per_photo || 0,
          theme: formData.theme,
          sharing_mode: formData.sharing_mode,
          delivery_channel: formData.delivery_channel,
          enable_watermark: formData.enable_watermark,
          enable_qr_tagging: formData.enable_qr_tagging,
          auto_publish: formData.auto_publish,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando evento');
      }

      const eventId = data?.event?.id ?? data?.id ?? null;
      if (eventId) {
        setCreatedEventId(eventId);
      } else {
        console.warn('[EventWizard] Missing event id in response', data);
      }
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el evento', {
        description:
          error instanceof Error ? error.message : 'Intenta nuevamente',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return <StepSuccess eventName={formData.name} eventId={createdEventId} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-[-120px] h-80 w-80 rounded-full bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-transparent blur-3xl" />
          <div className="absolute right-[-140px] top-[120px] h-72 w-72 rounded-full bg-gradient-to-br from-cyan-500/20 via-emerald-500/5 to-transparent blur-3xl" />
        </div>

        <div className="relative flex flex-col">
          <div className="sticky top-0 z-10 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto max-w-6xl px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Wizard de eventos
                  </p>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Crear nuevo evento
                  </h1>
                </div>
                <button
                  onClick={() => router.push('/admin/events')}
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-6">
                <WizardStepper currentStep={step} steps={steps} />
              </div>
            </div>
          </div>

          <div className="flex-1 px-6 py-10 md:py-14">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <StepBasics
                    key="step1"
                    data={formData}
                    updateField={updateField}
                    onNext={nextStep}
                  />
                )}
                {step === 2 && (
                  <StepDistribution
                    key="step2"
                    data={formData}
                    updateField={updateField}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                )}
                {step === 3 && (
                  <StepTheme
                    key="step3"
                    data={formData}
                    updateField={updateField}
                    onSubmit={handleSubmit}
                    onBack={prevStep}
                    isSubmitting={isSubmitting}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
