export function HeroSection() {
  return (
    <section className="relative z-10 flex items-center justify-center px-6 py-20 lg:py-32">
      <div className="mx-auto max-w-7xl text-center">
        <h1 className="text-5xl font-bold leading-tight lg:text-8xl mb-6">
          <span className="text-gradient">Momentos</span>
          <br />
          <span className="text-shadow-soft">que perduran</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-xl leading-relaxed">
          La plataforma más avanzada y segura para compartir recuerdos escolares.
        </p>
      </div>
    </section>
  );
}