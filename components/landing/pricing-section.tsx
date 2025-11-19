'use client';

import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export function PricingSection() {
  const plans = [
    {
      name: 'Inicial',
      price: '0',
      description: 'Ideal para probar la plataforma sin riesgos.',
      features: [
        'Hasta 3 eventos activos',
        '500 fotos de almacenamiento',
        'Comisión del 10% por venta',
        'Soporte por email',
      ],
      cta: 'Empezar Gratis',
      popular: false,
    },
    {
      name: 'Pro',
      price: '29',
      description: 'Para fotógrafos en crecimiento constante.',
      features: [
        'Eventos ilimitados',
        '10.000 fotos de almacenamiento',
        'Comisión del 5% por venta',
        'Dominio personalizado',
        'Soporte prioritario por WhatsApp',
      ],
      cta: 'Prueba de 14 días',
      popular: true,
    },
    {
      name: 'Estudio',
      price: '79',
      description: 'Potencia máxima para grandes volúmenes.',
      features: [
        'Todo lo de Pro',
        'Almacenamiento ilimitado',
        '0% de comisión por venta',
        'Múltiples usuarios',
        'API de integración',
        'Account Manager dedicado',
      ],
      cta: 'Contactar Ventas',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="relative overflow-hidden px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(75,100,255,0.05),transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl"
          >
            Planes simples, <span className="text-blue-600">sin sorpresas</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600"
          >
            Empezá gratis y escalá a medida que tu negocio crece.
            <br />
            Sin tarjetas de crédito para comenzar.
          </motion.p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:items-center">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className={clsx(
                'relative flex flex-col rounded-[32px] p-8 transition-all duration-500',
                plan.popular
                  ? 'z-10 border-2 border-blue-500 bg-white shadow-[0_20px_80px_-20px_rgba(59,130,246,0.3)] scale-105 md:p-10'
                  : 'border border-slate-200 bg-white/50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-0 right-0 mx-auto w-fit rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-500/30">
                  Más Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className={clsx("text-xl font-bold", plan.popular ? "text-blue-600" : "text-slate-900")}>
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    ${plan.price}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">/mes</span>
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className={clsx("h-5 w-5 flex-shrink-0", plan.popular ? "text-blue-500" : "text-slate-400")} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={clsx(
                  'h-12 w-full rounded-xl text-sm font-bold transition-all hover:-translate-y-1',
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                )}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
