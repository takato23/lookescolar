import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowUpRight, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface StepSuccessProps {
  eventName: string;
  eventId: string | null;
}

export function StepSuccess({ eventName, eventId }: StepSuccessProps) {
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
        colors: ['#7c3aed', '#4f46e5', '#ec4899'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#7c3aed', '#4f46e5', '#ec4899'],
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
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center"
    >
      <div className="mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xl dark:bg-emerald-500/20 dark:text-emerald-300">
        <CheckCircle className="h-12 w-12" />
      </div>

      <h1 className="mb-2 text-4xl font-semibold text-slate-900 dark:text-white">
        Evento creado
      </h1>
      <p className="mb-8 max-w-lg text-lg text-slate-500 dark:text-slate-400">
        "
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {eventName}
        </span>
        " ya esta listo para cargar fotos y compartir.
      </p>

      <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => router.push('/admin/events')}
          variant="outline"
          className="flex-1 py-6 text-base"
        >
          Volver al listado
        </Button>
        <Button
          onClick={() =>
            router.push(eventId ? `/admin/events/${eventId}` : '/admin/events')
          }
          className="flex-1 bg-slate-900 py-6 text-base text-white hover:bg-slate-800"
        >
          Ver evento <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          onClick={() =>
            router.push(
              eventId ? `/admin/events/${eventId}/library` : '/admin/photos'
            )
          }
          className="flex-1 bg-violet-600 py-6 text-base text-white hover:bg-violet-700"
        >
          <Upload className="mr-2 h-4 w-4" /> Subir fotos
        </Button>
      </div>
    </motion.div>
  );
}
