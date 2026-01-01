import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Download, Package, Layers, Check } from 'lucide-react';
import { EventFormData, DeliveryChannel } from '../EventWizard';
import { cn } from '@/lib/utils';

interface StepDistributionProps {
    data: EventFormData;
    updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
    onNext: () => void;
    onBack: () => void;
}

export function StepDistribution({ data, updateField, onNext, onBack }: StepDistributionProps) {

    const OPTIONS = [
        {
            id: 'digital' as DeliveryChannel,
            title: 'Solo Digital',
            desc: 'Descargas en alta resolución sin envío físico.',
            icon: Download,
            color: 'bg-blue-500'
        },
        {
            id: 'physical' as DeliveryChannel,
            title: 'Impresión y Envío',
            desc: 'Productos físicos entregados a domicilio.',
            icon: Package,
            color: 'bg-orange-500'
        },
        {
            id: 'hybrid' as DeliveryChannel,
            title: 'Híbrido (Recomendado)',
            desc: 'Lo mejor de ambos mundos. Digital + Productos.',
            icon: Layers,
            color: 'bg-violet-600'
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-3xl space-y-8"
        >
            <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    ¿Cómo entregarás las fotos?
                </h2>
                <p className="text-slate-500 text-lg">
                    Elige el modelo que mejor se adapte a este evento.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {OPTIONS.map((option) => {
                    const isSelected = data.delivery_channel === option.id;

                    return (
                        <motion.div
                            key={option.id}
                            onClick={() => updateField('delivery_channel', option.id)}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                "cursor-pointer relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-4 h-full",
                                isSelected
                                    ? "border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 shadow-lg ring-1 ring-violet-500"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute top-4 right-4 bg-violet-500 text-white p-1 rounded-full shadow-md animate-in fade-in zoom-in duration-200">
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                </div>
                            )}

                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2",
                                option.color,
                                isSelected ? "scale-110" : "opacity-80 grayscale-[0.5] group-hover:grayscale-0"
                            )}>
                                <option.icon className="w-8 h-8" />
                            </div>

                            <div>
                                <h3 className={cn("font-bold text-lg mb-1", isSelected ? "text-violet-900" : "text-slate-700")}>
                                    {option.title}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {option.desc}
                                </p>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <div className="pt-12 flex justify-between">
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={onBack}
                    className="text-slate-500 hover:text-slate-900"
                >
                    <ArrowLeft className="mr-2 w-5 h-5" /> Volver
                </Button>
                <Button
                    size="lg"
                    onClick={onNext}
                    className="rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all transform hover:scale-105"
                >
                    Continuar <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </motion.div>
    );
}
