'use client';

import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import {
  BellRing,
  DownloadCloud,
  HeartHandshake,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { FAQSection } from '@/components/landing/faq-section';
import { FooterCTA } from '@/components/landing/footer-cta';
import dynamic from 'next/dynamic';
import { FamilyAccessCard } from '@/components/ui/family-access-card';
import { AdminLoginModal } from '@/components/ui/admin-login-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LookEscolarLogo } from '@/components/ui/branding/LookEscolarLogo';
import { MagneticButton } from '@/components/ui/magnetic-button';

// Dynamic import to avoid Vercel issues
const ProductGrid = dynamic(
  () =>
    import('@/components/ui/product-grid').then((mod) => ({
      default: mod.ProductGrid,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="h-64 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded bg-gray-200" />
      </div>
    ),
  }
);

const NAV_ITEMS = [
  { label: 'Características', href: '#features' },
  { label: 'Cómo funciona', href: '#how-it-works' },
  { label: 'Precios', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
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
    // Redirect to admin - actual authentication handled server-side
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNavigation
        isScrolled={isScrolled}
        onAdminLogin={handleAdminLogin}
      />

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
        isScrolled ? 'py-2' : 'py-4'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={clsx(
            'relative flex items-center justify-between gap-6 rounded-full border px-6 transition-all duration-500',
            isScrolled
              ? 'liquid-glass-intense border-white/20 py-2.5 shadow-[0_8px_32px_-8px_rgba(16,24,40,0.12)]'
              : 'liquid-glass border-white/10 py-3 shadow-[0_4px_24px_-4px_rgba(16,24,40,0.08)]'
          )}
        >
          {/* Background Gradient Overlay */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div
              className={clsx(
                'h-full w-full bg-gradient-to-r from-white/40 via-white/10 to-transparent mix-blend-overlay transition-opacity duration-500',
                isScrolled ? 'opacity-100' : 'opacity-60'
              )}
            />
          </div>

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-3 text-slate-900 transition-opacity hover:opacity-90"
            >
              <LookEscolarLogo
                size="sm"
                variant="gradient"
                className="drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
              />
              <span className="chromatic-text font-display text-xs font-bold uppercase tracking-[0.32em] text-slate-800/90">
                LookEscolar
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="relative hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={clsx(
                  'rounded-full px-4 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300',
                  isScrolled
                    ? 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    : 'text-slate-600 hover:bg-white/20 hover:text-slate-900'
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="relative flex items-center gap-3">
            <Link href="/demo" className="hidden md:block">
              <MagneticButton>
                <Button
                  size="sm"
                  className={clsx(
                    'rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.25em] shadow-sm backdrop-blur transition-all hover:-translate-y-0.5',
                    isScrolled
                      ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                      : 'liquid-glass-premium border border-white/20 text-slate-900 hover:bg-white/40'
                  )}
                >
                  Ver demo
                </Button>
              </MagneticButton>
            </Link>
            <AdminLoginModal onLogin={onAdminLogin} />
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroAccessSection() {
  const heroGalleryPreviews = [
    {
      src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1000&q=80',
      alt: 'Graduación con birretes en el aire',
      position: 'top-0 left-0',
      rotation: '-rotate-6',
      zIndex: 'z-30',
    },
    {
      src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=80',
      alt: 'Niños en graduación sonriendo',
      position: 'top-12 right-10',
      rotation: 'rotate-3',
      zIndex: 'z-20',
    },
    {
      src: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80',
      alt: 'Grupo escolar festejando',
      position: 'bottom-0 left-16',
      rotation: 'rotate-2',
      zIndex: 'z-10',
    },
  ];

  return (
    <section
      id="ingresar"
      className="relative overflow-hidden bg-[#0A1029] px-8 py-32"
    >
      {/* Premium Animated Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] animate-pulse rounded-full bg-blue-600/20 blur-[120px] duration-[4s]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50vw] w-[50vw] animate-pulse rounded-full bg-purple-600/20 blur-[120px] duration-[5s]" />
        <div className="absolute left-[20%] top-[20%] h-[30vw] w-[30vw] animate-pulse rounded-full bg-indigo-500/10 blur-[100px] duration-[7s]" />
      </div>

      {/* Noise Texture Overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("/noise.png")' }} />

      <div className="relative mx-auto max-w-7xl">
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
              </span>
              <span className="text-xs font-medium tracking-wide text-indigo-200/90">
                La plataforma para fotógrafos modernos
              </span>
            </motion.div>

            <h1 className="mb-8 font-display text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl">
              Tu negocio de fotografía,{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  simplificado.
                </span>
                <span className="absolute -bottom-2 left-0 h-[10px] w-full bg-indigo-500/20 blur-lg filter" />
              </span>
            </h1>

            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-300/90 md:text-xl">
              Galerías privadas, ventas automatizadas y distribución sin estrés.
              <br className="hidden md:block" />
              Dedicate a sacar fotos, nosotros nos ocupamos del resto.
            </p>

            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
              <MagneticButton>
                <Link
                  href="/register"
                  className="group relative flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-8 text-base font-bold tracking-wide text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:scale-[1.02]"
                >
                  <span className="relative z-10">Empezar prueba gratis</span>
                  <Sparkles className="relative z-10 h-4 w-4 text-indigo-600 transition-transform group-hover:rotate-12" />
                  <div className="absolute inset-0 -z-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </Link>
              </MagneticButton>

              <MagneticButton>
                <Link
                  href="#demo"
                  className="group flex h-14 items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-8 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
                >
                  <span>Ver demo clientes</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform group-hover:translate-x-0.5 group-hover:bg-white/20">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              </MagneticButton>
            </div>
          </motion.div>
        </div>

        {/* Demo Context Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-28 mb-10 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/40">
            Así ven tus clientes su acceso 👇
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-2xl perspective-1000"
        >
          <div className="relative z-20 transform-gpu transition-transform duration-500 hover:scale-[1.01]">
            <FamilyAccessCard variant="minimal" />
          </div>

          {/* Enhanced Glow behind card */}
          <div className="absolute -inset-1 -z-10 rounded-[32px] bg-gradient-to-b from-white/10 to-transparent blur-xl opacity-50" />
          <div className="absolute -inset-20 -z-20 rounded-[50%] bg-indigo-500/20 blur-[80px] opacity-40" />

          {/* Floating Preview Images */}
          {heroGalleryPreviews.map((preview, index) => (
            <motion.div
              key={preview.src}
              initial={{ opacity: 0, y: 40, rotate: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: index === 0 ? -8 : index === 1 ? 6 : -4,
              }}
              transition={{
                duration: 0.8,
                delay: 0.6 + index * 0.15,
                ease: [0.34, 1.56, 0.64, 1], // Spring-like ease
              }}
              whileHover={{ scale: 1.1, rotate: 0, zIndex: 50 }}
              className={clsx(
                'absolute h-32 w-32 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl md:h-44 md:w-44',
                preview.position,
                preview.zIndex
              )}
            >
              <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/0 to-black/20" />
              <Image
                src={preview.src}
                alt={preview.alt}
                fill
                sizes="(max-width: 768px) 50vw, 18vw"
                className="object-cover transition-transform duration-700 hover:scale-110"
                priority={index === 0}
              />
            </motion.div>
          ))}

          <p className="mt-6 text-center text-xs font-medium text-indigo-200/40">
            * Esta es una demostración interactiva de la experiencia de tus clientes.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function ProductShowcaseSection() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  return (
    <section id="ecosistema" className="relative overflow-hidden px-6 py-32">
      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(75,100,255,0.15),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -left-24 top-48 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/30 bg-blue-50/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-600 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Ecosistema completo
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-6xl"
          >
            Todo lo que necesitás para <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">compartir recuerdos</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600"
          >
            LookEscolar integra herramientas para capturar, organizar y
            distribuir fotos escolares con un lenguaje visual coherente y profesional.
          </motion.p>
        </div>

        <motion.div
          style={{ rotateX, rotateY, perspective: 1000 }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => {
            x.set(0);
            y.set(0);
          }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="group relative rounded-[40px] border border-white/60 bg-white/40 p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-shadow hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] md:p-8"
        >
          {/* Inner Border/Glow */}
          <div className="absolute inset-0 rounded-[40px] border border-white/50 mix-blend-overlay pointer-events-none" />
          <div className="absolute -inset-px rounded-[40px] bg-gradient-to-b from-white/80 to-transparent opacity-50 pointer-events-none" />

          <div className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white shadow-sm">
            <ProductGrid />

            {/* Overlay Gradient for depth */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>
        </motion.div>
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
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl"
          >
            Diseñado para que las familias <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">disfruten el proceso</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600"
          >
            Cada interacción está pensada para que el acceso sea simple, seguro
            y cálido desde el primer ingreso.
          </motion.p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="group relative rounded-3xl border border-white/60 bg-white/40 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]"
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 text-rose-500 shadow-inner transition-transform group-hover:scale-110">
                <item.icon className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-slate-900">
                {item.title}
              </h3>

              <p className="text-slate-600 leading-relaxed">
                {item.description}
              </p>

              {/* Warm Glow on Hover */}
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-rose-100/0 via-orange-100/0 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
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
      <div className="pointer-events-none absolute bottom-[-80px] right-16 h-72 w-72 rounded-full bg-sky-500/30 blur-[150px]" />

      <div className="bg-white/8 relative mx-auto max-w-4xl overflow-hidden rounded-[36px] border border-white/15 p-12 text-white shadow-[0_50px_120px_-45px_rgba(8,47,73,0.8)] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold lg:text-4xl">
            Mantente al día con <span className="text-white/80">novedades</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            Historias de familias, nuevas funciones y guías prácticas para
            aprovechar LookEscolar al máximo.
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
            © {new Date().getFullYear()} LookEscolar. Todos los derechos
            reservados.
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
