'use client';

import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { PLACEHOLDER_IMAGES, getAvatarByIndex } from '@/lib/config/placeholder-images';

export function TestimonialsSection() {
  const testimonials = [
    {
      content:
        'Antes pasaba horas organizando pedidos por WhatsApp. Con Lumina, todo es automático y mis ventas aumentaron un 40% el primer mes.',
      author: 'Sofía M.',
      role: 'Fotógrafa Escolar',
      company: 'Independiente',
      image: PLACEHOLDER_IMAGES.avatars.warm,
    },
    {
      content:
        'La plataforma es súper intuitiva. A los padres les encanta poder ver y comprar las fotos desde el celular. El soporte es excelente.',
      author: 'Martín G.',
      role: 'Director',
      company: 'Estudio Enfoque',
      image: PLACEHOLDER_IMAGES.avatars.cool,
    },
    {
      content:
        'Lo que más valoro es la privacidad. Cada cliente ve solo sus fotos. Eso me dio mucha confianza con los colegios nuevos.',
      author: 'Laura R.',
      role: 'Fotógrafa',
      company: 'Click Escolar',
      image: PLACEHOLDER_IMAGES.avatars.sage,
    },
    {
      content:
        'La integración con Mercado Pago me solucionó la vida. Ya no tengo que perseguir cobros. El dinero entra directo a mi cuenta.',
      author: 'Pablo D.',
      role: 'Fotógrafo de Eventos',
      company: 'PD Fotografía',
      image: PLACEHOLDER_IMAGES.avatars.rose,
    },
  ];

  // Duplicate for marquee effect
  const marqueeContent = [...testimonials, ...testimonials];

  return (
    <section className="relative overflow-hidden bg-[#0A1029] py-32">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl"
          >
            Confiado por <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">fotógrafos profesionales</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-400"
          >
            Sumate a la comunidad de creadores que están modernizando su negocio.
          </motion.p>
        </div>

        <div className="relative">
          {/* Gradient Masks for Marquee */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#0A1029] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#0A1029] to-transparent" />

          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                repeat: Infinity,
                ease: 'linear',
                duration: 40,
              }}
              className="flex gap-6 py-4"
            >
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <div
                  key={index}
                  className="group relative w-[400px] flex-shrink-0 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-colors hover:bg-white/10"
                >
                  <div className="mb-6 flex gap-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>

                  <p className="mb-8 text-lg leading-relaxed text-slate-300">
                    "{testimonial.content}"
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={testimonial.image}
                        alt={testimonial.author}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-white">{testimonial.author}</div>
                      <div className="text-sm text-slate-400">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
