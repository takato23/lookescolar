import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'María González',
      role: 'Fotógrafa Escolar',
      company: 'Recuerdos Felices',
      content:
        'LookEscolar transformó completamente mi negocio. Ahora puedo manejar 10 veces más eventos con la misma calidad.',
      rating: 5,
    },
    {
      name: 'Carlos Martínez',
      role: 'Director',
      company: 'Colegio San José',
      content:
        'Las familias están encantadas con la facilidad para acceder a las fotos. El sistema es muy intuitivo.',
      rating: 5,
    },
    {
      name: 'Ana Rodriguez',
      role: 'Madre de Familia',
      company: '',
      content:
        'Súper fácil encontrar las fotos de mi hijo. El código QR funciona perfectamente y la calidad es excelente.',
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="relative overflow-hidden px-6 py-28 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
      <div className="pointer-events-none absolute left-12 top-10 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-120px] right-24 h-80 w-80 rounded-full bg-cyan-400/25 blur-[160px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            Historias reales
          </span>
          <h2 className="font-display mt-6 text-4xl font-semibold lg:text-5xl">
            Familias y escuelas hablan de LookEscolar
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-white/80">
            Experiencias que muestran cómo la plataforma simplifica el acceso a recuerdos
            importantes.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="flex h-full flex-col justify-between rounded-3xl border border-white/15 bg-white/10 p-8 text-white shadow-[0_35px_90px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl"
            >
              <div>
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-300 text-amber-300" />
                  ))}
                </div>

                <blockquote className="mb-6 text-white/80">
                  “{testimonial.content}”
                </blockquote>
              </div>

              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  {testimonial.role}
                  {testimonial.company && ` • ${testimonial.company}`}
                </div>
                <div className="text-lg font-semibold text-white">{testimonial.name}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
