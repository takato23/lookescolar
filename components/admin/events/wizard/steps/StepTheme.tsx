import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, Sparkles, Image as ImageIcon, QrCode } from 'lucide-react';
import { EventFormData } from '../EventWizard';
import { cn } from '@/lib/utils';
import { GalleryThemeService } from '@/lib/services/gallery-theme.service';

interface StepThemeProps {
    data: EventFormData;
    updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
}

export function StepTheme({ data, updateField, onSubmit, onBack, isSubmitting }: StepThemeProps) {
    const themes = GalleryThemeService.getThemeOptions();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl space-y-8"
        >
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Estilo y Configuración
                </h2>
                <p className="text-slate-500 text-lg">
                    Dale personalidad a tu galería.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Config (Left) */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Theme Selection */}
                    <div className="space-y-4">
                        <Label className="uppercase text-xs font-bold text-slate-400 tracking-wider">
                            Tema de la Galería
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                            {themes.map((theme) => (
                                <div
                                    key={theme.value}
                                    onClick={() => updateField('theme', theme.value)}
                                    className={cn(
                                        "cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-2 transition-all",
                                        data.theme === theme.value
                                            ? "border-violet-500 bg-violet-50"
                                            : "border-slate-100 hover:border-slate-300"
                                    )}
                                >
                                    <div className="w-full aspect-video bg-slate-200 rounded-lg overflow-hidden relative">
                                        {/* Mockup Preview Placeholder */}
                                        <div className={cn("absolute inset-0 bg-slate-300", theme.value === 'editorial' && "bg-slate-800")} />
                                    </div>
                                    <span className="font-medium text-sm">{theme.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-4 pt-4">
                        <Label className="uppercase text-xs font-bold text-slate-400 tracking-wider">
                            Opciones Avanzadas
                        </Label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Marca de Agua</p>
                                        <p className="text-xs text-slate-500">Protege las imágenes antes de la compra</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={data.enable_watermark}
                                    onCheckedChange={(c) => updateField('enable_watermark', c)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <QrCode className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Etiquetado QR Inteligente</p>
                                        <p className="text-xs text-slate-500">Clasificación automática por invitado</p>
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

                {/* Preview Panel (Right) */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24 bg-slate-900 text-white rounded-3xl p-6 shadow-2xl skew-y-1 transform hover:skew-y-0 transition-transform duration-500">
                        <div className="pointer-events-none select-none">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Vista Previa</p>
                            <h3 className="text-2xl font-serif italic mb-1">{data.name || 'Tu Evento'}</h3>
                            <p className="text-slate-400 text-sm mb-6">{data.date || 'Fecha por definir'}</p>

                            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/10 space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <span>Modo {data.sharing_mode === 'private' ? 'Privado' : 'Público'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-12 flex justify-between items-center">
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
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="rounded-full px-10 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xl shadow-violet-500/30 transition-all transform hover:scale-105"
                >
                    {isSubmitting ? (
                        <>Creando...</>
                    ) : (
                        <>
                            <Sparkles className="mr-2 w-5 h-5" /> Crear Evento Mágico
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}
