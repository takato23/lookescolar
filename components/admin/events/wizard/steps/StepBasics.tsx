import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Calendar, Camera } from 'lucide-react';
import { EventFormData } from '../EventWizard';

interface StepBasicsProps {
    data: EventFormData;
    updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
    onNext: () => void;
}

export function StepBasics({ data, updateField, onNext }: StepBasicsProps) {
    const isValid = data.name.trim().length > 0 && data.date.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-lg space-y-8"
        >
            <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    ¡Empecemos por lo básico!
                </h2>
                <p className="text-slate-500 text-lg">
                    ¿Cómo llamaremos a esta nueva sesión increíble?
                </p>
            </div>

            <div className="space-y-6">
                {/* Name Input - Typeform style */}
                <div className="space-y-2">
                    <Label className="uppercase text-xs font-bold text-slate-400 tracking-wider ml-1">
                        Nombre del Evento
                    </Label>
                    <div className="relative group">
                        <Input
                            value={data.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="Ej. Graduación San Patricio 2025"
                            className="text-2xl py-6 px-4 pl-12 border-2 border-slate-200 focus-visible:ring-0 focus-visible:border-violet-500 rounded-xl bg-white shadow-sm transition-all group-hover:border-slate-300"
                            autoFocus
                        />
                        <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 group-focus-within:text-violet-500 transition-colors" />
                    </div>
                </div>

                {/* Date & Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="uppercase text-xs font-bold text-slate-400 tracking-wider ml-1">
                            Fecha
                        </Label>
                        <div className="relative group">
                            <Input
                                type="date"
                                value={data.date}
                                onChange={(e) => updateField('date', e.target.value)}
                                className="py-6 pl-10 border-2 rounded-xl bg-white focus-visible:ring-0 focus-visible:border-violet-500"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-violet-500 transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="uppercase text-xs font-bold text-slate-400 tracking-wider ml-1">
                            Ubicación (Opcional)
                        </Label>
                        <div className="relative group">
                            <Input
                                value={data.location}
                                onChange={(e) => updateField('location', e.target.value)}
                                placeholder="Ciudad o Lugar"
                                className="py-6 pl-10 border-2 rounded-xl bg-white focus-visible:ring-0 focus-visible:border-violet-500"
                            />
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-violet-500 transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 flex justify-end">
                <Button
                    size="lg"
                    onClick={onNext}
                    disabled={!isValid}
                    className="rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all transform hover:scale-105"
                >
                    Continuar <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </motion.div>
    );
}
