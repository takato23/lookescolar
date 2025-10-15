import { Shield, Camera, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: '100% Seguro',
      description:
        'Las fotos originales nunca se suben. Solo previews con watermark.',
    },
    {
      icon: Camera,
      title: 'Profesional',
      description: 'Diseñado por fotógrafos, para fotógrafos profesionales.',
    },
    {
      icon: Zap,
      title: 'Rápido',
      description: 'Setup en 3 segundos. Procesamiento instantáneo.',
    },
  ];

  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            ¿Por qué <span className="text-gradient">elegirnos?</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mx-auto max-w-3xl text-xl">
            Características diseñadas para fotógrafos escolares profesionales.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-8 transition-all duration-500 hover:scale-105"
            >
              <div className="mb-6">
                <feature.icon className="h-12 w-12 text-primary-500" />
              </div>
              <h3 className="mb-4 text-2xl font-bold">{feature.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
