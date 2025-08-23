import Link from 'next/link';
import ScrollHeader from '@/components/ui/scroll-header';
import { Button } from '@/components/ui/button';
import { Card, StatsCard } from '@/components/ui/card';
import { 
  Camera, 
  Heart, 
  Shield, 
  Sparkles, 
  Play, 
  Star, 
  Users, 
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { TokenAccessForm } from '@/components/landing/TokenAccessForm';

export default function LandingPage() {
  return (
    <div className="gradient-mesh relative min-h-screen overflow-hidden">
      {/* Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-1/2 -top-1/2 h-full w-full rounded-full bg-gradient-to-br from-primary-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 h-full w-full rounded-full bg-gradient-to-tr from-secondary-500/5 to-transparent blur-3xl" />
      </div>

      {/* Navigation */}
      <ScrollHeader>
        <nav className="relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              aria-label="Ir al inicio - LookEscolar"
              className="flex items-center gap-3"
            >
              <div className="rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 p-2 text-white">
                <Camera className="h-6 w-6" />
              </div>
              <span className="text-gradient text-xl font-bold">
                Look Escolar
              </span>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link
                href="#features"
                aria-label="Ver características"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Características
              </Link>
              <Link
                href="#how-it-works"
                aria-label="Ver cómo funciona"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cómo funciona
              </Link>
              <Link
                href="#testimonials"
                aria-label="Ver testimonios"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Testimonios
              </Link>
              <Link href="/admin">
                <Button
                  variant="glass-ios26"
                  size="sm"
                  aria-label="Abrir panel de administración"
                >
                  Comenzar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </ScrollHeader>

      {/* Hero Section */}
      <section className="relative z-10 flex items-center justify-center px-6 py-20 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          {/* Left Content */}
          <div className="animate-fade-in space-y-8 text-center lg:text-left">
            <div className="liquid-glass-button-ios26 inline-flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-lg">
              <Sparkles className="h-4 w-4 text-accent-500" />
              <span className="text-foreground text-sm font-medium">
                Sistema de Fotografía Escolar Profesional
              </span>
            </div>

            <h1 className="text-display text-5xl font-bold leading-tight lg:text-8xl">
              <span className="text-gradient">Momentos</span>
              <br />
              <span className="text-shadow-soft">que perduran</span>
            </h1>

            <p className="text-muted-foreground max-w-2xl text-xl leading-relaxed">
              La plataforma más avanzada y segura para compartir recuerdos
              escolares.
              <span className="text-foreground font-medium">
                Diseñada por fotógrafos, para fotógrafos.
              </span>
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link href="/admin">
                <Button
                  variant="primary"
                  size="lg"
                  className="hover-magnetic rounded-2xl px-8 py-4 shadow-glow hover:shadow-glow-strong"
                  aria-label="Empezar gratis en el panel de administración"
                >
                  <Camera className="h-5 w-5" />
                  Empezar Gratis
                </Button>
              </Link>

              <Link href="#demo">
                <Button
                  variant="glass-ios26"
                  size="lg"
                  className="hover-glow group rounded-2xl px-8 py-4"
                  aria-label="Ver demo"
                >
                  <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                  Ver Demo
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 pt-8 lg:justify-start">
              <div className="text-center lg:text-left">
                <div className="text-gradient text-3xl font-bold">100%</div>
                <div className="text-muted-foreground text-sm">Seguridad</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-gradient text-3xl font-bold">3s</div>
                <div className="text-muted-foreground text-sm">Setup</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-gradient text-3xl font-bold">∞</div>
                <div className="text-muted-foreground text-sm">Eventos</div>
              </div>
            </div>
          </div>

          {/* Right Content - Token Access Form */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <TokenAccessForm />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <div className="liquid-glass-button-ios26 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2">
              <Star className="h-4 w-4 text-accent-500" />
              <span className="text-sm font-medium">
                Características Premium
              </span>
            </div>
            <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
              ¿Por qué <span className="text-gradient-gold">elegirnos?</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
              Diseñado específicamente para fotógrafos escolares profesionales
              que buscan eficiencia, seguridad y elegancia.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 - Security */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Card
                variant="glass-ios26"
                className="noise hover-lift shadow-3d group p-8 transition-all duration-500 hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className="liquid-glass-button-ios26 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                    <Shield className="h-8 w-8 text-primary-500 transition-colors group-hover:text-primary-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary-500/20 to-secondary-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <h3 className="text-foreground group-hover:text-gradient-primary mb-4 text-2xl font-bold transition-all duration-300">
                  100% Seguro
                </h3>
                <p className="text-foreground/80 group-hover:text-foreground/80 leading-relaxed transition-colors">
                  Las fotos originales <strong>nunca</strong> se suben. Solo
                  previews con watermark y URLs temporales que expiran
                  automáticamente.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-primary-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <Zap className="h-4 w-4" />
                  <span>Seguridad nivel bancario</span>
                </div>
              </Card>
            </div>

            {/* Feature 2 - Speed */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Card
                variant="glass-ios26"
                className="noise hover-lift shadow-3d group p-8 transition-all duration-500 hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className="liquid-glass-button-ios26 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                    <Zap className="h-8 w-8 text-accent-500 transition-colors group-hover:text-accent-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-accent-500/20 to-yellow-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <h3 className="text-foreground group-hover:text-gradient-gold mb-4 text-2xl font-bold transition-all duration-300">
                  Ultra Rápido
                </h3>
                <p className="text-foreground/80 leading-relaxed">
                  Setup en menos de 3 minutos. Subida masiva de fotos con
                  reconocimiento automático de rostros.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-accent-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <Heart className="h-4 w-4" />
                  <span>Optimizado para fotógrafos</span>
                </div>
              </Card>
            </div>

            {/* Feature 3 - Experience */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Card
                variant="glass-ios26"
                className="noise hover-lift shadow-3d group p-8 transition-all duration-500 hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className="liquid-glass-button-ios26 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                    <Users className="h-8 w-8 text-secondary-500 transition-colors group-hover:text-secondary-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-secondary-500/20 to-purple-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <h3 className="text-foreground group-hover:text-gradient-purple mb-4 text-2xl font-bold transition-all duration-300">
                  Experiencia Premium
                </h3>
                <p className="text-foreground/80 leading-relaxed">
                  Familias felices con una interfaz intuitiva, selección de fotos
                  fácil y proceso de compra simplificado.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-secondary-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <Star className="h-4 w-4" />
                  <span>+98% satisfacción</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              variant="glass-ios26"
              title="Eventos Activos"
              value="1,240"
              description="Fotógrafos confían en nosotros"
              trend="up"
              trendValue="+12%"
              icon={<Camera className="h-6 w-6" />}
            />
            <StatsCard
              variant="glass-ios26"
              title="Fotos Procesadas"
              value="2.4M"
              description="Fotos subidas este mes"
              trend="up"
              trendValue="+24%"
              icon={<Sparkles className="h-6 w-6" />}
            />
            <StatsCard
              variant="glass-ios26"
              title="Familias Felices"
              value="89K"
              description="Clientes satisfechos"
              trend="up"
              trendValue="+8%"
              icon={<Heart className="h-6 w-6" />}
            />
            <StatsCard
              variant="glass-ios26"
              title="Tiempo de Setup"
              value="3 min"
              description="Promedio por evento"
              trend="down"
              trendValue="-40%"
              icon={<Zap className="h-6 w-6" />}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Card
            variant="glass-ios26"
            className="noise overflow-hidden p-12 backdrop-blur-xl"
          >
            <div className="max-w-2xl">
              <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
                Listo para <span className="text-gradient">transformar</span> tu negocio?
              </h2>
              <p className="text-foreground/80 mb-10 text-xl">
                Únete a cientos de fotógrafos escolares que ya están ofreciendo
                una experiencia premium a sus clientes.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/admin">
                  <Button
                    variant="primary"
                    size="lg"
                    className="rounded-2xl px-8 py-4 shadow-glow hover:shadow-glow-strong"
                    aria-label="Comenzar gratis ahora"
                  >
                    Comenzar Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button
                    variant="glass-ios26"
                    size="lg"
                    className="rounded-2xl px-8 py-4"
                    aria-label="Agendar demo"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Ver Demo
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}