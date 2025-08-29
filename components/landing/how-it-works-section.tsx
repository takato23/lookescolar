export function HowItWorksSection() {
  const steps = [
    {
      step: '1',
      title: 'Sube las fotos',
      description: 'Arrastra y suelta tus fotos en la plataforma',
    },
    {
      step: '2',
      title: 'Genera códigos QR',
      description: 'Crea códigos únicos para cada estudiante o familia',
    },
    {
      step: '3',
      title: 'Comparten y compran',
      description: 'Las familias acceden con QR y seleccionan sus fotos',
    },
  ];

  return (
    <section id="how-it-works" className="relative bg-gray-50 px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
            Cómo <span className="text-gradient">funciona</span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
            En solo 3 pasos simples, tendrás tu sistema funcionando.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600">
                {step.step}
              </div>
              <h3 className="mb-4 text-xl font-bold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
