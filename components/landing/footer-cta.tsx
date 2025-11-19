'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export function FooterCTA() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="relative overflow-hidden bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-32"
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 filter" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-pink-600/90 mix-blend-multiply" />

      <div className="relative mx-auto max-w-4xl text-center text-white">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-xl">
            <Camera className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            ¿Listo para <span className="text-yellow-300">empezar?</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl opacity-90">
            Únete a miles de fotógrafos que ya transformaron su negocio con
            LookEscolar. Comienza gratis hoy mismo.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/admin">
            <Button
              size="lg"
              variant="secondary"
              className="h-14 rounded-2xl bg-white px-8 text-lg font-semibold text-indigo-600 shadow-xl transition-transform hover:scale-105 hover:bg-gray-50"
            >
              <Camera className="mr-2 h-5 w-5" />
              Empezar Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <Link href="#demo">
            <Button
              size="lg"
              variant="ghost"
              className="h-14 rounded-2xl border-2 border-white/20 px-8 text-lg font-semibold text-white hover:bg-white/10"
            >
              Ver Demo
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 border-t border-white/20 pt-8"
        >
          <p className="text-sm opacity-75">
            Sin compromiso • Cancelación gratuita • Soporte incluido
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
