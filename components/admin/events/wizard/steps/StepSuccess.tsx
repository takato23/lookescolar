import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface StepSuccessProps {
    eventName: string;
}

export function StepSuccess({ eventName }: StepSuccessProps) {
    const router = useRouter();

    useEffect(() => {
        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#7c3aed', '#4f46e5', '#ec4899']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#7c3aed', '#4f46e5', '#ec4899']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto min-h-screen"
        >
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
                <CheckCircle className="w-12 h-12" />
            </div>

            <h1 className="text-4xl font-bold text-slate-900 mb-2">¡Evento Creado!</h1>
            <p className="text-lg text-slate-500 mb-8">
                "<span className="font-semibold text-slate-800">{eventName}</span>" está listo para brillar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Button
                    onClick={() => router.push('/admin/events')}
                    variant="outline"
                    className="flex-1 py-6 text-base"
                >
                    Volver al listado
                </Button>
                <Button
                    onClick={() => router.push('/admin/photos')}
                    className="flex-1 py-6 text-base bg-slate-900 text-white hover:bg-slate-800"
                >
                    <Upload className="mr-2 w-4 h-4" /> Subir Fotos
                </Button>
            </div>
        </motion.div>
    );
}
