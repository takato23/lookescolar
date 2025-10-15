export function HowItWorksSection() {
  const steps = [
    {
      step: 'Paso 1',
      title: 'Escuela comparte el código',
      description: 'La fotógrafa publica la galería y envía el código único a cada familia.',
    },
    {
      step: 'Paso 2',
      title: 'Familias exploran',
      description: 'Ingresan en LookEscolar, marcan favoritos y eligen formatos impresos o digitales.',
    },
    {
      step: 'Paso 3',
      title: 'Descarga y entrega',
      description: 'Pagos confirmados, descargas disponibles al instante y pedidos impresos coordinados.',
    },
  ];

  return (
    <section id="how-it-works" className="relative overflow-hidden px-6 py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900/3 via-white to-slate-100" />
      <div className="pointer-events-none absolute right-16 top-10 h-64 w-64 rounded-full bg-purple-200/40 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="font-display text-3xl font-semibold text-slate-900 lg:text-5xl">
            Tres pasos sencillos para familias y escuelas
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
            LookEscolar acompaña todo el recorrido: desde recibir el código hasta descargar las fotos favoritas.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative flex flex-col justify-between rounded-[28px] border border-[#D4DAFF] bg-white/95 p-8 shadow-[0_30px_70px_-40px_rgba(16,24,40,0.28)] backdrop-blur transition-all hover:-translate-y-2 hover:border-[#CBD3FF] hover:shadow-[0_45px_90px_-40px_rgba(16,24,40,0.38)]"
            >
              <div className="absolute -left-3 top-8 hidden h-12 w-12 items-center justify-center rounded-full bg-[#4B64FF] text-white md:flex">
                {index + 1}
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E9ECFF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#2B3EBF]">
                {step.step}
              </span>
              <h3 className="mt-6 text-2xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-700">{step.description}</p>
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 group-hover:bg-gradient-to-br group-hover:from-blue-100/40 group-hover:via-fuchsia-100/30 group-hover:to-transparent" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
