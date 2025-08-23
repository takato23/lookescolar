import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export function PricingSection() {
  const plans = [
    {
      name: 'Básico',
      price: '$0',
      period: '/mes',
      description: 'Perfecto para empezar',
      features: [
        'Hasta 100 fotos por evento',
        'Códigos QR ilimitados', 
        'Soporte básico',
      ],
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/mes',
      description: 'Para fotógrafos profesionales',
      features: [
        'Fotos ilimitadas',
        'Analytics avanzados',
        'Soporte prioritario',
        'Branding personalizado',
      ],
      featured: true,
    },
    {
      name: 'Empresarial',
      price: 'Contactar',
      period: '',
      description: 'Para grandes volúmenes',
      features: [
        'Todo en Pro',
        'API dedicada',
        'Soporte 24/7',
        'Integración personalizada',
      ],
    },
  ];

  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            Precios <span className="text-gradient">simples</span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
            Elige el plan que mejor se adapte a tu negocio.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative p-8 ${plan.featured ? 'border-primary-500 shadow-lg scale-105' : ''}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white">
                  Más popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.featured ? 'default' : 'outline'} 
                className="w-full"
              >
                {plan.name === 'Empresarial' ? 'Contactar' : 'Empezar'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}