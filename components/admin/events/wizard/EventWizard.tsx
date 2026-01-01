'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WizardStepper } from './ui/WizardStepper';
import { StepBasics } from './steps/StepBasics';
import { StepDistribution } from './steps/StepDistribution';
import { StepTheme } from './steps/StepTheme';
import { StepSuccess } from './steps/StepSuccess';

import {
    Calendar,
    Package,
    Palette
} from 'lucide-react';

export type DeliveryChannel = 'digital' | 'physical' | 'hybrid';
export type SharingMode = 'public' | 'private';

export interface EventFormData {
    name: string;
    location: string;
    date: string;
    theme: string;
    photo_price: number;
    active: boolean;
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
    theme: 'default',
    photo_price: 0,
    active: true,
    sharing_mode: 'public',
    delivery_channel: 'digital',
    enable_watermark: true,
    enable_qr_tagging: false,
    auto_publish: false,
};

export function EventWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<EventFormData>(INITIAL_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const updateField = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const nextStep = () => setStep((s) => Math.min(s + 1, 4));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/events-simple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    location: formData.location.trim() || null,
                    date: formData.date,
                    photo_price: formData.photo_price || 0,
                    sharing_mode: formData.sharing_mode,
                    delivery_channel: formData.delivery_channel,
                    enable_qr_tagging: formData.enable_qr_tagging,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error creando evento');
            }

            if (data.success && data.event) {
                setIsSuccess(true);
            } else {
                throw new Error('Respuesta inesperada del servidor');
            }

        } catch (error) {
            console.error(error);
            toast.error('Error al crear el evento', {
                description: error instanceof Error ? error.message : 'Intenta nuevamente'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return <StepSuccess eventName={formData.name} />;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 flex flex-col">
            {/* Header / Stepper */}
            <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                            Nuevo Evento Creativo
                        </h1>
                        <button
                            onClick={() => router.push('/admin/events')}
                            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>

                    <WizardStepper currentStep={step} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-4xl mx-auto p-6 md:py-12 flex flex-col items-center justify-center min-h-[600px]">
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
    );
}
