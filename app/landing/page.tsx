'use client';

import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { BellRing, DownloadCloud, HeartHandshake, MessageSquareHeart, ShieldCheck, Sparkles } from 'lucide-react';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { FAQSection } from '@/components/landing/faq-section';
import { FooterCTA } from '@/components/landing/footer-cta';
import { ProductGrid } from '@/components/ui/product-grid';
import { FamilyAccessCard } from '@/components/ui/family-access-card';
import { AdminLoginModal } from '@/components/ui/admin-login-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LookEscolarLogo } from '@/components/ui/branding/LookEscolarLogo';

const NAV_ITEMS = [
  { label: 'Ingresar', href: '#ingresar' },
  { label: 'Ecosistema', href: '#ecosistema' },
  { label: 'Cómo funciona', href: '#how-it-works' },
  { label: 'Familias', href: '#familias' },
  { label: 'Testimonios', href: '#testimonials' },
  { label: 'Precios', href: '#pricing' },
  { label: 'Preguntas', href: '#faq' },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNewsletterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    try {
      console.log('Newsletter signup:', email);
      alert('¡Gracias por suscribirte! Te mantendremos informado.');
      setEmail('');
    } catch (error) {
      console.error('Newsletter signup error:', error);
      alert('Error al suscribirse. Por favor intenta nuevamente.');
    }
  };

  const handleAdminLogin = (loginEmail: string, password: string) => {
    console.log('Admin login:', { email: loginEmail, password });
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNavigation isScrolled={isScrolled} onAdminLogin={handleAdminLogin} />

      <main className="pt-24">
        <HeroAccessSection />
        <ProductShowcaseSection />
        <HowItWorksSection />
        <FamiliesHighlightsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <NewsletterSection
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleNewsletterSubmit}
        />
        <FooterCTA />
      </main>

      <LandingFooter />
    </div>
  );
}

function LandingNavigation({
  isScrolled,
  onAdminLogin,
}: {
  isScrolled: boolean;
  onAdminLogin: (email: string, password: string) => void;
}) {
  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-white/80 shadow-[0_18px_48px_-28px_rgba(16,24,40,0.35)] backdrop-blur-2xl'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div
          className={clsx(
            'relative flex items-center justify-between gap-6 rounded-full border px-6 py-3 transition-all',
            isScrolled
              ? 'border-[#D4DAFF] bg-white/90 shadow-[0_20px_44px_-26px_rgba(16,24,40,0.28)] backdrop-blur-xl'
              : 'border-white/35 bg-white/15 shadow-[0_24px_70px_-40px_rgba(16,24,40,0.5)] backdrop-blur-lg'
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div
              className={clsx(
                'h-full w-full bg-gradient-to-r from-white/55 via-white/25 to-transparent transition-opacity',
                isScrolled ? 'opacity-80' : 'opacity-95'
              )}
            />
          </div>
          <div className="relative flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3 text-slate-900 transition-opacity hover:opacity-90"
            >
              <LookEscolarLogo size="sm" variant="gradient" className="drop-shadow-sm" />
              <span className="font-display text-xs font-semibold uppercase tracking-[0.32em]">
                LookEscolar
              </span>
            </Link>
          </div>

          <nav className="relative hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={clsx(
                  'font-display text-[11px] uppercase tracking-[0.32em] transition-colors',
                  isScrolled
                    ? 'text-[#2B3EBF] hover:text-[#101428]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="relative flex items-center gap-3">
            <Link href="/demo" className="hidden md:block">
              <Button
                size="sm"
                className={clsx(
                  'rounded-full px-5 text-[11px] font-semibold uppercase tracking-[0.32em] shadow-[0_12px_30px_-20px_rgba(16,24,40,0.38)] backdrop-blur transition-transform hover:-translate-y-0.5',
                  isScrolled
                    ? 'border-transparent bg-[#FF9F6A] text-[#101428] hover:bg-[#FF8B4A]'
                    : 'border-white/40 bg-white/25 text-white hover:bg-white/35'
                )}
              >
                Ver demo
              </Button>
            </Link>
            <AdminLoginModal onLogin={onAdminLogin} />
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroAccessSection() {
  const heroHighlights = [
    {
      icon: ShieldCheck,
      label: 'Acceso privado',
      description: 'Solo con el código asignado por la escuela.',
    },
    {
      icon: Sparkles,
      label: 'Experiencia guiada',
      description: 'Favoritos, compra y descargas en un mismo lugar.',
    },
    {
      icon: DownloadCloud,
      label: 'Descarga inmediata',
      description: 'Archivos digitales listos al instante.',
    },
  ];

  const heroGalleryPreviews = [
    {
      src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1000&q=80',
      alt: 'Graduación con birretes en el aire',
      position: 'top-0 left-0',
      rotation: '-rotate-6',
      zIndex: 'z-30',
    },
    {
      src: 'https://images.unsplash.com/photo-1522582203244-d0fad7632413?auto=format&fit=crop&w=1000&q=80',
      alt: 'Alumno sonriendo con su diploma',
      position: 'top-12 right-2',
      rotation: 'rotate-4',
      zIndex: 'z-20',
    },
    {
      src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80',
      alt: 'Familia celebrando con cámara en mano',
      position: 'bottom-0 left-16',
      rotation: '-rotate-2',
      zIndex: 'z-10',
    },
  ];

  return (
    <section
      id="ingresar"
      className="relative overflow-hidden bg-gradient-to-br from-[#0A1029] via-[#12193A] to-[#101428] px-6 py-24 text-white lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#FF80D0]/35 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-40px] h-96 w-96 rounded-full bg-[#4B64FF]/28 blur-[180px]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-[11px] uppercase tracking-[0.34em] text-white/80 shadow-lg shadow-black/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Acceso familiar LookEscolar
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Ingresá el código de tu escuela y reviví el evento
          </h1>
          <p className="text-lg leading-relaxed text-white/90 sm:text-xl">
            Cada familia cuenta con un código único. Usalo para entrar a tu galería privada,
            elegir tus fotos favoritas y descargar recuerdos al instante.
          </p>
          <dl className="grid gap-4 text-sm text-white/90 sm:grid-cols-3">
            {heroHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-5 backdrop-blur"
              >
                <item.icon className="mb-3 h-5 w-5 text-white/80" />
                <dt className="font-semibold text-white">{item.label}</dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[32px] border border-white/20 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/90 p-6 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.55)]">
            <FamilyAccessCard className="border border-slate-200/60 bg-white text-slate-900 shadow-none backdrop-blur-none" />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/0 via-white/30 to-white/0" />
          </div>
          <div className="relative mt-6 hidden h-56 w-full md:block">
            <div className="absolute inset-0 -z-10 rounded-[40px] bg-gradient-to-br from-[#4B64FF]/15 via-[#FF80D0]/20 to-transparent blur-3xl" />
            {heroGalleryPreviews.map((preview, index) => (
              <div
                key={preview.src}
                className={clsx(
                  'absolute h-40 w-40 overflow-hidden rounded-3xl border border-white/25 bg-white/60 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur',
                  preview.position,
                  preview.rotation,
                  preview.zIndex
                )}
              >
                <Image
                  src={preview.src}
                  alt={preview.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 18vw"
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-white/80">
            ¿Perdiste tu código? Escribinos a{' '}
            <a href="mailto:hola@lookescolar.com" className="underline">
              hola@lookescolar.com
            </a>{' '}
            y te ayudamos.
          </p>
        </div>
      </div>
    </section>
  );
}

function ProductShowcaseSection() {
  return (
    <section id="ecosistema" className="relative overflow-hidden px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(75,100,255,0.22),transparent_65%)]" />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-72 w-72 rounded-full bg-[#FF9F6A]/25 blur-[140px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E9ECFF] px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#2B3EBF]">
            Ecosistema completo
          </span>
          <h2 className="font-display mt-6 text-4xl font-semibold text-[#101428] lg:text-6xl">
            Todo lo que necesitás para compartir recuerdos
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
            LookEscolar integra herramientas para capturar, organizar y distribuir fotos
            escolares con un lenguaje visual coherente para familias.
          </p>
        </div>

        <div className="rounded-[36px] border border-[#D4DAFF] bg-[#F4F6FF]/90 p-6 shadow-[0_40px_120px_-40px_rgba(16,24,40,0.22)] backdrop-blur">
          <ProductGrid className="overflow-hidden rounded-[28px] border border-[#E3E8FF] shadow-sm" />
        </div>
      </div>
    </section>
  );
}

function FamiliesHighlightsSection() {
  const highlights = [
    {
      icon: HeartHandshake,
      title: 'Galerías privadas',
      description:
        'Cada aula o evento tiene su espacio exclusivo. Solo vos y tu familia pueden verlo.',
    },
    {
      icon: BellRing,
      title: 'Recordatorios automáticos',
      description:
        'Te avisamos por mail o WhatsApp cuando hay nuevas fotos listas para descargar.',
    },
    {
      icon: MessageSquareHeart,
      title: 'Ayuda en vivo',
      description:
        'Contactate con el equipo de la fotógrafa o con LookEscolar ante cualquier duda.',
    },
  ];

  return (
    <section id="familias" className="relative overflow-hidden px-6 py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-rose-200/35 blur-[130px]" />
      <div className="pointer-events-none absolute -right-16 bottom-[-80px] h-80 w-80 rounded-full bg-sky-200/35 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="font-display text-3xl font-semibold text-slate-900 lg:text-4xl">
            Diseñado para que las familias disfruten el proceso
          </h2>
          <p className="mt-4 text-lg text-slate-700">
            Cada interacción está pensada para que el acceso sea simple, seguro y cálido desde el
            primer ingreso.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-[#E3E8FF] bg-white/90 p-8 shadow-[0_25px_70px_-45px_rgba(16,24,40,0.4)] backdrop-blur-sm transition-all hover:-translate-y-1.5 hover:border-[#CBD3FF] hover:shadow-[0_35px_90px_-40px_rgba(16,24,40,0.45)]"
            >
              <item.icon className="mb-4 h-6 w-6 text-[#4B64FF]" />
              <h3 className="mb-3 text-xl font-semibold text-[#101428]">{item.title}</h3>
              <p className="text-slate-700">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({
  email,
  onEmailChange,
  onSubmit,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
}) {
  return (
    <section id="newsletter" className="relative overflow-hidden px-6 py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="pointer-events-none absolute left-12 top-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-[140px]" />
      <div className="pointer-events-none absolute right-16 bottom-[-80px] h-72 w-72 rounded-full bg-sky-500/30 blur-[150px]" />

      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[36px] border border-white/15 bg-white/8 p-12 text-white shadow-[0_50px_120px_-45px_rgba(8,47,73,0.8)] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h2 className="font-display mb-4 text-3xl font-semibold lg:text-4xl">
            Mantente al día con <span className="text-white/80">novedades</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            Historias de familias, nuevas funciones y guías prácticas para aprovechar LookEscolar
            al máximo.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto flex w-full max-w-xl flex-col gap-4 sm:flex-row"
        >
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="h-12 flex-1 rounded-full border border-white/40 bg-white/90 text-center text-base text-slate-900 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60"
            required
          />
          <Button
            type="submit"
            className="h-12 rounded-full bg-[#FF9F6A] px-8 text-sm font-semibold uppercase tracking-[0.25em] text-[#101428] transition-transform hover:-translate-y-0.5 hover:bg-[#FF8B4A]"
          >
            Suscribirme
          </Button>
        </form>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center text-sm text-slate-500 md:flex-row md:text-left">
        <div className="flex items-center gap-3">
          <LookEscolarLogo size="sm" variant="blue" />
          <div className="text-slate-600">
            <div className="uppercase tracking-[0.3em]">LookEscolar</div>
            <div>Gestión fotográfica profesional • Argentina</div>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            © {new Date().getFullYear()} LookEscolar. Todos los derechos reservados.
          </div>
          <div className="flex justify-center gap-4 text-xs uppercase tracking-[0.25em] text-slate-400 md:justify-end">
            <a href="#ingresar" className="hover:text-slate-600">
              Ingresar
            </a>
            <a href="#ecosistema" className="hover:text-slate-600">
              Ecosistema
            </a>
            <a href="#familias" className="hover:text-slate-600">
              Familias
            </a>
            <a href="#pricing" className="hover:text-slate-600">
              Precios
            </a>
            <a href="#faq" className="hover:text-slate-600">
              FAQ
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
