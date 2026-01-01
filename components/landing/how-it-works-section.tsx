'use client';

import { motion } from 'framer-motion';
import { UploadCloud, Settings, Share2 } from 'lucide-react';
import { PLACEHOLDER_IMAGES } from '@/lib/config/placeholder-images';

export function HowItWorksSection() {
  const steps = [
    {
      icon: UploadCloud,
      title: 'Subí tus fotos',
      description: 'Creá una galería, arrastrá tus fotos y organizalas por álbumes o eventos. Nosotros generamos las vistas previas.',
    },
    {
      icon: Settings,
      title: 'Configurá precios',
      description: 'Definí tus listas de precios para descargas digitales y productos impresos. Vos tenés el control total.',
    },
    {
      icon: Share2,
      title: 'Compartí y vendé',
      description: 'Enviá el link a tus clientes. Ellos eligen, pagan y reciben sus fotos automáticamente. Vos recibís el dinero.',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 px-6 py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900/3 via-white to-slate-100" />
      <div className="pointer-events-none absolute right-16 top-10 h-64 w-64 rounded-full bg-purple-200/40 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl"
          >
            Tu flujo de trabajo, <span className="text-blue-400">optimizado</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-300"
          >
            Olvidate de los pendrives, los WeTransfer y los cobros en efectivo.
            <br className="hidden md:block" />
            Lumina profesionaliza cada paso de tu venta.
          </motion.p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className="group relative rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:shadow-2xl hover:shadow-blue-500/10"
            >
              <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-lg transition-transform group-hover:scale-110">
                {index + 1}
              </div>

              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-colors group-hover:bg-blue-500/20 group-hover:text-blue-300">
                <step.icon className="h-8 w-8" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                {step.title}
              </h3>

              <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                {step.description}
              </p>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 opacity-0 transition-all duration-500 group-hover:from-blue-500/5 group-hover:to-purple-500/5 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>

        {/* Mobile App Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-20 flex justify-center"
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl" />
            <img
              src={PLACEHOLDER_IMAGES.mockups.galleryOnMobile}
              alt="LookEscolar en tu celular"
              className="relative h-[500px] w-auto drop-shadow-2xl"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
