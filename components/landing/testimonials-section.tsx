import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'María González',
      role: 'Fotógrafa Escolar',
      company: 'Recuerdos Felices',
      content: 'LookEscolar transformó completamente mi negocio. Ahora puedo manejar 10 veces más eventos con la misma calidad.',
      rating: 5,
    },
    {
      name: 'Carlos Martínez',
      role: 'Director',
      company: 'Colegio San José',
      content: 'Las familias están encantadas con la facilidad para acceder a las fotos. El sistema es muy intuitivo.',
      rating: 5,
    },
    {
      name: 'Ana Rodriguez',
      role: 'Madre de Familia',
      company: '',
      content: 'Súper fácil encontrar las fotos de mi hijo. El código QR funciona perfectamente y la calidad es excelente.',
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="relative px-6 py-32 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            Lo que dicen <span className="text-gradient">nuestros usuarios</span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
            Miles de fotógrafos y familias confían en nuestra plataforma.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-8">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <blockquote className="mb-6 text-gray-700">
                "{testimonial.content}"
              </blockquote>
              
              <div>
                <div className="font-semibold">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground">
                  {testimonial.role}
                  {testimonial.company && ` • ${testimonial.company}`}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}