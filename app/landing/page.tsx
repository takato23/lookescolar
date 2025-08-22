import Link from 'next/link';
import ScrollHeader from '@/components/ui/scroll-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
                  variant="glass"
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
            <div className="glass-card inline-flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-lg">
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
                  variant="glass"
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
            <div className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2">
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
                variant="glass"
                className="noise hover-lift shadow-3d group p-8 transition-all duration-500 hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className="glass-card flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                    <Shield className="h-8 w-8 text-primary-500 transition-colors group-hover:text-primary-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary-500/20 to-secondary-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <h3 className="text-foreground group-hover:text-gradient-primary mb-4 text-2xl font-bold transition-all duration-300">
                  100% Seguro
                </h3>
                <p className="text-muted-foreground group-hover:text-foreground/80 leading-relaxed transition-colors">
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

            {/* Feature 2 - Simplicity */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Card
                variant="glass"
                className="noise hover-lift shadow-3d group p-8 transition-all duration-500 hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className="glass-card flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                    <Camera className="h-8 w-8 text-secondary-500 transition-colors group-hover:text-secondary-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-secondary-500/20 to-accent-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <h3 className="text-foreground group-hover:text-gradient-primary mb-4 text-2xl font-bold transition-all duration-300">
                  Proceso Simple
                </h3>
                <p className="text-muted-foreground group-hover:text-foreground/80 leading-relaxed transition-colors">
                  Subí fotos, generá QRs automáticamente, y las familias acceden
                  con su token único. <strong>Cero complicaciones.</strong>
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-secondary-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <Users className="h-4 w-4" />
                  <span>Setup en 3 minutos</span>
                </div>
              </Card>
            </div>

            {/* Feature 3 - Premium Experience */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Card
                variant="glass"
                className="noise hover-lift shadow-3d group p-8 transition-all duration-500 hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className="glass-card flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110">
                    <Heart className="h-8 w-8 text-accent-500 transition-colors group-hover:text-accent-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-accent-500/20 to-primary-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <h3 className="text-foreground group-hover:text-gradient-primary mb-4 text-2xl font-bold transition-all duration-300">
                  Experiencia Premium
                </h3>
                <p className="text-muted-foreground group-hover:text-foreground/80 leading-relaxed transition-colors">
                  Interfaz moderna y elegante que{' '}
                  <strong>invita a comprar</strong>. Las familias van a amar
                  navegar por sus recuerdos.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-accent-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <Sparkles className="h-4 w-4" />
                  <span>Diseño Award-Winning</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-20 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Card
              variant="glass-strong"
              className="noise shadow-3d-lg hover-lift mx-auto max-w-2xl p-12"
            >
              <h3 className="text-gradient mb-4 text-3xl font-bold">
                ¿Listo para transformar tu negocio?
              </h3>
              <p className="text-muted-foreground mb-8 text-xl">
                Únete a los fotógrafos que ya revolucionaron su flujo de trabajo
              </p>
              <Button
                variant="primary"
                size="xl"
                className="hover-magnetic rounded-2xl px-12 py-4 shadow-glow hover:shadow-glow-strong"
                aria-label="Empezar ahora, es gratis"
              >
                <Link href="/admin" className="flex items-center">
                  <Camera className="h-6 w-6" />
                  <span className="ml-2">Empezar Ahora - Es Gratis</span>
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <div className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <span className="text-sm font-medium">Cómo funciona</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
              3 pasos para <span className="text-gradient">empezar</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
              Creá un evento, generá QRs para los alumnos y compartí la galería
              con sus familias para vender de forma segura.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Card variant="glass" className="noise shadow-3d hover-lift p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
                  <span className="text-primary-600 text-2xl font-bold">1</span>
                </div>
                <h3 className="mb-2 text-2xl font-bold">Creá el evento</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Definí colegio, fecha y precios. Todo listo para subir tus
                  fotos.
                </p>
              </Card>
            </div>

            {/* Step 2 */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Card variant="glass" className="noise shadow-3d hover-lift p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-500/10">
                  <span className="text-secondary-600 text-2xl font-bold">2</span>
                </div>
                <h3 className="mb-2 text-2xl font-bold">Generá QRs</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cada alumno recibe un token único. Asigná fotos escaneando su
                  QR.
                </p>
              </Card>
            </div>

            {/* Step 3 */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Card variant="glass" className="noise shadow-3d hover-lift p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/10">
                  <span className="text-accent-600 text-2xl font-bold">3</span>
                </div>
                <h3 className="mb-2 text-2xl font-bold">Compartí y vendé</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Las familias ven solo sus fotos y pagan online. Seguridad total.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <div className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2">
              <Star className="h-4 w-4 text-accent-500" />
              <span className="text-sm font-medium">Testimonios reales</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold lg:text-6xl">
              Lo que dicen{' '}
              <span className="text-gradient-gold">nuestros clientes</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
              Profesionales que ya simplificaron su flujo y venden más con una
              experiencia premium.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: 'María, Buenos Aires',
                quote:
                  'Pasé de días a horas en la entrega. Las familias compran sin fricción y con total confianza.',
                role: 'Fotografía escolar profesional'
              },
              {
                name: 'Julián, Córdoba',
                quote:
                  'El tagging por QR es un antes y un después. La plataforma es rápida y hermosa.',
                role: 'Director de estudios fotográficos'
              },
              {
                name: 'Flor, Mendoza',
                quote:
                  'Mis ventas aumentaron y el soporte fue impecable. La seguridad es clave para mí.',
                role: 'Emprendedora fotógrafa'
              },
            ].map((t, idx) => (
              <div 
                key={idx} 
                className="animate-slide-up" 
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <Card
                  variant="glass"
                  className="noise shadow-3d hover-lift p-8"
                >
                  <div className="mb-4 flex items-center gap-1 text-accent-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 text-lg leading-relaxed">
                    “{t.quote}”
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-sm font-bold text-primary-700">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-muted-foreground text-sm">
                        {t.role}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* Secondary CTA */}
          <div className="mt-20 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link href="/admin">
              <Button
                variant="primary"
                size="lg"
                className="hover-magnetic rounded-2xl px-10 py-4 shadow-glow hover:shadow-glow-strong"
                aria-label="Probar ahora gratis"
              >
                <Sparkles className="h-5 w-5" />
                Probar ahora gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center animate-fade-in">
            <Card
              variant="glass-strong"
              className="noise shadow-3d-lg hover-lift mx-auto max-w-4xl p-12"
            >
              <div className="mb-8 flex justify-center">
                <CheckCircle className="h-16 w-16 text-accent-500" />
              </div>
              
              <h2 className="text-gradient mb-6 text-4xl font-bold lg:text-5xl">
                Todo lo que necesitas en un solo lugar
              </h2>
              
              <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[
                  '100% Seguridad',
                  'Proceso Simple',
                  'Diseño Premium',
                  'Soporte 24/7'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-foreground font-medium">{item}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-muted-foreground mb-8 text-xl">
                Unite a cientos de fotógrafos escolares que ya están transformando su negocio
              </p>
              
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/admin">
                  <Button
                    variant="primary"
                    size="xl"
                    className="hover-magnetic rounded-2xl px-8 py-4 shadow-glow hover:shadow-glow-strong"
                    aria-label="Comenzar gratis ahora"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="ml-2">Comenzar Gratis Ahora</span>
                  </Button>
                </Link>
                
                <Link href="#features">
                  <Button
                    variant="glass"
                    size="xl"
                    className="rounded-2xl px-8 py-4"
                    aria-label="Ver todas las características"
                  >
                    Ver Características
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-nav relative border-t border-glass-border px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 p-2 text-white">
                <Camera className="h-5 w-5" />
              </div>
              <span className="text-gradient-primary text-lg font-bold">
                Look Escolar
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8">
              <Link
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Características
              </Link>
              <Link
                href="#how-it-works"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cómo funciona
              </Link>
              <Link
                href="#testimonials"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Testimonios
              </Link>
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Comenzar en el panel de administración"
                >
                  Comenzar
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-12 border-t border-glass-border/50 pt-8 text-center">
            <p className="text-muted-foreground">
              © 2025 Look Escolar - Sistema de Fotografía Escolar Premium
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}