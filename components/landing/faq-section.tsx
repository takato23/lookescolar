'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: '¿Cómo funciona la seguridad de las fotos?',
      answer:
        'Las fotos originales nunca se suben a nuestros servidores. Solo se crean previews con watermark y URLs temporales que expiran automáticamente.',
    },
    {
      question: '¿Puedo personalizar los códigos QR?',
      answer:
        'Sí, puedes personalizar completamente el diseño de los códigos QR con tu logo, colores y estilo de marca.',
    },
    {
      question: '¿Hay límite en el número de fotos?',
      answer:
        'En el plan gratuito hay un límite de 100 fotos por evento. En los planes de pago no hay límites.',
    },
    {
      question: '¿Cómo funcionan los pagos?',
      answer:
        'Integramos con Mercado Pago para procesar los pagos de manera segura. Los clientes pueden pagar directamente en la plataforma.',
    },
    {
      question: '¿Ofrecen soporte técnico?',
      answer:
        'Sí, ofrecemos soporte por email en todos los planes, y soporte prioritario 24/7 en el plan empresarial.',
    },
  ];

  return (
    <section id="faq" className="relative px-6 py-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 text-4xl font-bold lg:text-6xl"
          >
            Preguntas <span className="text-gradient">frecuentes</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 dark:text-gray-400 text-xl"
          >
            Encuentra respuestas a las preguntas más comunes.
          </motion.p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="overflow-hidden rounded-lg border border-gray-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
              >
                <span className="font-semibold">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${openIndex === index ? 'rotate-180' : ''
                    }`}
                />
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-gray-500 dark:text-gray-400 px-6 pb-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
